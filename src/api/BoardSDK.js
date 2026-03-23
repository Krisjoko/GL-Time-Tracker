/**
 * BoardSDK — fluent API wrapper around the Monday.com GraphQL API.
 *
 * Board: ⏰ Time Tracking_X, bigly  (id: 9965000395)
 * Column ID map (logical name → actual Monday column id):
 *   date         → date4
 *   hourStarted  → hour
 *   timeTracking → time_tracking9
 */
import monday from './monday.js';

const BOARD_ID = 9965000395;

const COLUMN_ID_MAP = {
  date: 'date4',
  hourStarted: 'hour',
  timeTracking: 'time_tracking9',
};

// Cache subitem metadata so we avoid extra round-trips when updating status.
// key: subitemId (string) → { boardId: string, statusColumnId: string|null }
const subitemMetaCache = new Map();

// ─── Column value parsers ────────────────────────────────────────────────────

function parseColumnValue(columnId, rawValue) {
  if (rawValue === null || rawValue === undefined || rawValue === '') return null;
  try {
    const parsed = JSON.parse(rawValue);
    switch (columnId) {
      case 'date4': {
        if (!parsed.date) return null;
        // Parse as local date to avoid UTC timezone shift
        const [y, m, d] = parsed.date.split('-').map(Number);
        return new Date(y, m - 1, d);
      }
      case 'hour':
        return { hour: parsed.hour ?? 0, minute: parsed.minute ?? 0 };
      case 'time_tracking9':
        return {
          durationInSeconds: parsed.duration ?? 0,
          isRunning: parsed.running ?? false,
          startedAt: parsed.startTime ?? null,
        };
      default:
        return parsed;
    }
  } catch {
    return null;
  }
}

// ─── Item transformer ────────────────────────────────────────────────────────

function transformItem(rawItem) {
  // Index column values by column id
  const cvById = {};
  for (const cv of rawItem.column_values || []) {
    cvById[cv.id] = cv;
  }

  // Transform subitems and cache their metadata
  const subitems = (rawItem.subitems || []).map((sub) => {
    const statusCV = sub.column_values?.find(
      (cv) => cv.type === 'color' || cv.type === 'status'
    );
    const dateCV = sub.column_values?.find((cv) => cv.type === 'date');

    // Cache metadata for later updates
    subitemMetaCache.set(String(sub.id), {
      boardId: sub.board?.id ?? null,
      statusColumnId: statusCV?.id ?? null,
    });

    let dateVal = null;
    if (dateCV?.value) {
      try {
        const d = JSON.parse(dateCV.value)?.date;
        if (d) dateVal = d; // "YYYY-MM-DD"
      } catch { /* ignore */ }
    }

    return {
      id: sub.id,
      name: sub.name,
      status: statusCV?.text ?? null,
      date: dateVal,
    };
  });

  return {
    id: rawItem.id,
    name: rawItem.name,
    date: parseColumnValue('date4', cvById['date4']?.value),
    hourStarted: parseColumnValue('hour', cvById['hour']?.value),
    timeTracking:
      parseColumnValue('time_tracking9', cvById['time_tracking9']?.value) ?? {
        durationInSeconds: 0,
        isRunning: false,
      },
    subitems,
  };
}

// ─── Items query builder ─────────────────────────────────────────────────────

class ItemsQueryBuilder {
  constructor() {
    this._columns = [];
    this._withSubitems = false;
    this._where = null;
  }

  withColumns(cols) {
    this._columns = cols;
    return this;
  }

  withSubItems(/* cols */) {
    this._withSubitems = true;
    return this;
  }

  where(conditions) {
    this._where = conditions;
    return this;
  }

  async execute() {
    const columnIds = this._columns
      .map((c) => COLUMN_ID_MAP[c] ?? c)
      .filter(Boolean);

    // Build query_params string for date filtering
    let queryParamsStr = '';
    if (this._where?.date?.between) {
      const { from, to } = this._where.date.between;
      queryParamsStr =
        `query_params: { rules: [{ column_id: "date4", compare_value: ["${from}", "${to}"], operator: between }] }`;
    }

    const subitemsFragment = this._withSubitems
      ? `subitems {
          id
          name
          board { id }
          column_values { id type value text }
        }`
      : '';

    const colIdsStr = columnIds.map((id) => `"${id}"`).join(', ');

    const buildQuery = (cursor) => {
      const params = ['limit: 500'];
      if (cursor) {
        params.push(`cursor: "${cursor}"`);
      } else if (queryParamsStr) {
        params.push(queryParamsStr);
      }
      return `
        query {
          boards(ids: [${BOARD_ID}]) {
            items_page(${params.join(', ')}) {
              cursor
              items {
                id
                name
                column_values(ids: [${colIdsStr}]) { id value text }
                ${subitemsFragment}
              }
            }
          }
        }
      `;
    };

    let allItems = [];
    let cursor = null;
    do {
      const result = await monday.api(buildQuery(cursor));
      if (result.errors?.length) {
        throw new Error(result.errors.map((e) => e.message).join('; '));
      }
      const page = result.data?.boards?.[0]?.items_page;
      allItems = allItems.concat(page?.items ?? []);
      cursor = page?.cursor ?? null;
    } while (cursor);

    return { items: allItems.map(transformItem) };
  }
}

// ─── Subitem updater ─────────────────────────────────────────────────────────

class SubitemUpdater {
  constructor(parentItemId, subitemId) {
    this._parentItemId = parentItemId;
    this._subitemId = String(subitemId);
    this._updates = {};
  }

  update(updates) {
    this._updates = updates;
    return this;
  }

  // Kept for API compatibility — return columns are read back via re-fetch
  returnColumns(/* cols */) {
    return this;
  }

  async execute() {
    // Resolve subitem metadata (boardId, statusColumnId)
    let meta = subitemMetaCache.get(this._subitemId);
    if (!meta?.boardId) {
      const q = `query {
        items(ids: [${this._subitemId}]) {
          board { id }
          column_values { id type }
        }
      }`;
      const r = await monday.api(q);
      const raw = r.data?.items?.[0];
      const statusCV = raw?.column_values?.find(
        (cv) => cv.type === 'color' || cv.type === 'status'
      );
      meta = {
        boardId: raw?.board?.id ?? null,
        statusColumnId: statusCV?.id ?? null,
      };
      subitemMetaCache.set(this._subitemId, meta);
    }

    if (!meta?.boardId) {
      throw new Error(`Cannot determine board ID for subitem ${this._subitemId}`);
    }

    const parts = Object.entries(this._updates).map(([logicalName, value], i) => {
      const columnId =
        logicalName === 'status'
          ? (meta.statusColumnId ?? 'status')
          : (COLUMN_ID_MAP[logicalName] ?? logicalName);

      const escaped = String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
      return `m${i}: change_simple_column_value(
        board_id: ${meta.boardId},
        item_id: ${this._subitemId},
        column_id: "${columnId}",
        value: "${escaped}"
      ) { id }`;
    });

    if (!parts.length) return {};

    const mutation = `mutation { ${parts.join('\n')} }`;
    const result = await monday.api(mutation);
    if (result.errors?.length) {
      throw new Error(result.errors.map((e) => e.message).join('; '));
    }
    return result.data;
  }
}

// ─── Post (update/comment) builder ───────────────────────────────────────────

class PostBuilder {
  constructor(itemId) {
    this._itemId = itemId;
  }

  create(message) {
    const escaped = message
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/\n/g, '\\n');
    return {
      execute: async () => {
        const mutation = `mutation {
          create_update(item_id: ${this._itemId}, body: "${escaped}") { id }
        }`;
        const result = await monday.api(mutation);
        if (result.errors?.length) {
          throw new Error(result.errors.map((e) => e.message).join('; '));
        }
        return result.data;
      },
    };
  }
}

// ─── Item actions ─────────────────────────────────────────────────────────────

class ItemActions {
  constructor(itemId) {
    this._itemId = itemId;
  }

  subitem(subitemId) {
    return new SubitemUpdater(this._itemId, subitemId);
  }

  post() {
    return new PostBuilder(this._itemId);
  }
}

// ─── Users SDK ────────────────────────────────────────────────────────────────

class UsersSDK {
  me() {
    return {
      execute: async () => {
        const result = await monday.api(`query { me { id name } }`);
        if (result.errors?.length) {
          throw new Error(result.errors.map((e) => e.message).join('; '));
        }
        return result.data?.me;
      },
    };
  }
}

// ─── Main export ──────────────────────────────────────────────────────────────

class BoardSDK {
  constructor() {
    this.users = new UsersSDK();
  }

  items() {
    return new ItemsQueryBuilder();
  }

  item(itemId) {
    return new ItemActions(itemId);
  }
}

export default BoardSDK;
