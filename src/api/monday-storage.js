import monday from './monday.js';

/**
 * Thin wrapper around Monday.com platform storage.
 * Falls back to localStorage for local development outside Monday.com.
 *
 * Usage:
 *   const { value } = await storage().key('my_key').get();
 *   await storage().key('my_key').set({ foo: 'bar' });
 */
class StorageKey {
  constructor(key) {
    this._key = key;
  }

  async get() {
    // Try Monday platform storage first
    try {
      const res = await monday.storage.instance.getItem(this._key);
      const raw = res?.data?.value ?? res?.value;
      if (raw === null || raw === undefined || raw === '') return { value: null };
      try {
        return { value: JSON.parse(raw) };
      } catch {
        return { value: raw };
      }
    } catch {
      // Fallback: localStorage for local dev
      const raw = localStorage.getItem(`glt_${this._key}`);
      if (!raw) return { value: null };
      try {
        return { value: JSON.parse(raw) };
      } catch {
        return { value: raw };
      }
    }
  }

  async set(value) {
    const serialized = JSON.stringify(value);
    try {
      await monday.storage.instance.setItem(this._key, serialized);
    } catch {
      // Fallback: localStorage for local dev
      localStorage.setItem(`glt_${this._key}`, serialized);
    }
  }
}

export const storage = () => ({
  key: (key) => new StorageKey(key),
});
