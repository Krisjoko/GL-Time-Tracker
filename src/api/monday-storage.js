/**
 * Approval storage backed by Monday.com board updates.
 * Works both inside Monday.com (via SDK) and externally (via API token on Vercel).
 *
 * Approvals are written as updates on a hidden storage item (__GLTV_STORAGE__)
 * on the time tracking board. Each update body is a structured string:
 *   GLTV|<key>|<json-value>
 *
 * On read, the latest update matching the key is returned.
 */
import monday from './monday.js';

const BOARD_ID = 9965000395;
const STORAGE_ITEM_NAME = '__GLTV_STORAGE__';
const LS_ITEM_ID_KEY = 'gltv_storage_item_id';
const PREFIX = 'GLTV|';

let _cachedItemId = null;

async function getStorageItemId() {
  if (_cachedItemId) return _cachedItemId;

  const lsCached = localStorage.getItem(LS_ITEM_ID_KEY);
  if (lsCached) {
    _cachedItemId = lsCached;
    return lsCached;
  }

  // Search the board for the storage item by name
  const res = await monday.api(`
    query {
      boards(ids: [${BOARD_ID}]) {
        items_page(limit: 10, query_params: {
          rules: [{ column_id: "name", compare_value: ["${STORAGE_ITEM_NAME}"] }]
        }) {
          items { id }
        }
      }
    }
  `);

  const found = res.data?.boards?.[0]?.items_page?.items?.[0]?.id;
  if (found) {
    _cachedItemId = found;
    localStorage.setItem(LS_ITEM_ID_KEY, found);
    return found;
  }

  // Create the storage item if it doesn't exist
  const createRes = await monday.api(`
    mutation {
      create_item(board_id: ${BOARD_ID}, item_name: "${STORAGE_ITEM_NAME}") { id }
    }
  `);
  const created = createRes.data?.create_item?.id;
  if (!created) throw new Error('Failed to create GLTV storage item on board');
  _cachedItemId = created;
  localStorage.setItem(LS_ITEM_ID_KEY, created);
  return created;
}

class StorageKey {
  constructor(key) {
    this._key = key;
  }

  async get() {
    // Fast path: try localStorage first (handles offline / fallback)
    const lsRaw = localStorage.getItem(`gltv_${this._key}`);

    try {
      const itemId = await getStorageItemId();
      const res = await monday.api(`
        query {
          items(ids: [${itemId}]) {
            updates(limit: 100) { body }
          }
        }
      `);

      const updates = res.data?.items?.[0]?.updates || [];
      const keyPrefix = `${PREFIX}${this._key}|`;

      // Updates are returned newest-first — return the first match
      for (const update of updates) {
        if (update.body.startsWith(keyPrefix)) {
          try {
            return { value: JSON.parse(update.body.slice(keyPrefix.length)) };
          } catch {
            continue;
          }
        }
      }
      return { value: null };
    } catch (err) {
      console.warn('Monday storage read failed, falling back to localStorage:', err.message);
      if (!lsRaw) return { value: null };
      try {
        return { value: JSON.parse(lsRaw) };
      } catch {
        return { value: lsRaw };
      }
    }
  }

  async set(value) {
    const serialized = JSON.stringify(value);
    // Always write to localStorage as a local cache
    localStorage.setItem(`gltv_${this._key}`, serialized);

    // Write to Monday.com as a board update on the storage item
    const keyPrefix = `${PREFIX}${this._key}|`;
    const body = `${keyPrefix}${serialized}`;
    const escaped = body
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/\n/g, '\\n');

    const itemId = await getStorageItemId();
    const result = await monday.api(`
      mutation {
        create_update(item_id: ${itemId}, body: "${escaped}") { id }
      }
    `);
    if (result.errors?.length) {
      throw new Error(result.errors.map(e => e.message).join('; '));
    }
  }
}

export const storage = () => ({
  key: (key) => new StorageKey(key),
});
