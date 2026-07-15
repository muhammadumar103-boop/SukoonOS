type SeedRecord = Record<string, string>;

export function createMemoryStorage(seed: SeedRecord = {}) {
  const backing = new Map(Object.entries(seed));

  return {
    getItem(key: string) {
      return backing.has(key) ? backing.get(key) ?? null : null;
    },
    removeItem(key: string) {
      backing.delete(key);
    },
    setItem(key: string, value: string) {
      backing.set(key, value);
    },
    snapshot() {
      return Object.fromEntries(backing.entries());
    },
  };
}
