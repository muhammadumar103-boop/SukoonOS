type IndexedDbStoreRecord = {
  keyPath: string;
  records: Map<string, unknown>;
};

type IndexedDbState = {
  version: number;
  stores: Map<string, IndexedDbStoreRecord>;
};

type BrowserStorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

function cloneValue<T>(value: T): T {
  return typeof structuredClone === "function" ? structuredClone(value) : value;
}

function queue(callback: () => void) {
  queueMicrotask(callback);
}

export function installIndexedDbTestEnv(storage: BrowserStorageLike) {
  const databases = new Map<string, IndexedDbState>();
  const previousWindow = globalThis.window;
  const previousIndexedDb = (globalThis as typeof globalThis & { indexedDB?: unknown }).indexedDB;
  const previousFileReader = (globalThis as typeof globalThis & { FileReader?: unknown }).FileReader;

  class MockFileReader {
    error: Error | null = null;
    onerror: null | (() => void) = null;
    onload: null | (() => void) = null;
    result: string | null = null;

    readAsDataURL(blob: Blob) {
      blob
        .arrayBuffer()
        .then((buffer) => {
          const bytes = Buffer.from(buffer);
          this.result = `data:${blob.type || "application/octet-stream"};base64,${bytes.toString("base64")}`;
          this.onload?.();
        })
        .catch((error) => {
          this.error = error instanceof Error ? error : new Error(String(error));
          this.onerror?.();
        });
    }
  }

  const indexedDB = {
    open(name: string, version?: number) {
      const request: {
        error: Error | null;
        onerror: null | (() => void);
        onsuccess: null | (() => void);
        onupgradeneeded: null | (() => void);
        result?: ReturnType<typeof createDatabase>;
      } = {
        error: null,
        onerror: null,
        onsuccess: null,
        onupgradeneeded: null,
      };

      queue(() => {
        const existing = databases.get(name);
        const nextVersion = version ?? existing?.version ?? 1;
        const state =
          existing ??
          {
            version: nextVersion,
            stores: new Map<string, IndexedDbStoreRecord>(),
          };
        const needsUpgrade = !existing || nextVersion > existing.version;

        state.version = nextVersion;
        databases.set(name, state);
        request.result = createDatabase(state);

        if (needsUpgrade) {
          request.onupgradeneeded?.();
        }

        request.onsuccess?.();
      });

      return request;
    },
  };

  function createDatabase(state: IndexedDbState) {
    return {
      objectStoreNames: {
        contains(storeName: string) {
          return state.stores.has(storeName);
        },
      },
      close() {},
      createObjectStore(storeName: string, options?: { keyPath?: string }) {
        const store = {
          keyPath: options?.keyPath ?? "id",
          records: new Map<string, unknown>(),
        };
        state.stores.set(storeName, store);

        return {
          createIndex() {},
        };
      },
      transaction() {
        const transaction: {
          error: Error | null;
          oncomplete: null | (() => void);
          onerror: null | (() => void);
          objectStore: (name: string) => {
            put: (value: Record<string, unknown>) => { error: Error | null; onsuccess: null | (() => void); onerror: null | (() => void) };
            get: (key: string) => { error: Error | null; onsuccess: null | (() => void); onerror: null | (() => void); result?: unknown };
            delete: (key: string) => { error: Error | null; onsuccess: null | (() => void); onerror: null | (() => void) };
          };
        } = {
          error: null,
          oncomplete: null,
          onerror: null,
          objectStore(name: string) {
            let store = state.stores.get(name);
            if (!store) {
              store = {
                keyPath: "id",
                records: new Map<string, unknown>(),
              };
              state.stores.set(name, store);
            }

            return {
              put(value: Record<string, unknown>) {
                const request = {
                  error: null as Error | null,
                  onsuccess: null as null | (() => void),
                  onerror: null as null | (() => void),
                };
                queue(() => {
                  try {
                    const key = String(value[store.keyPath]);
                    store.records.set(key, cloneValue(value));
                    request.onsuccess?.();
                    transaction.oncomplete?.();
                  } catch (error) {
                    request.error = error instanceof Error ? error : new Error(String(error));
                    transaction.error = request.error;
                    request.onerror?.();
                    transaction.onerror?.();
                  }
                });
                return request;
              },
              get(key: string) {
                const request = {
                  error: null as Error | null,
                  onsuccess: null as null | (() => void),
                  onerror: null as null | (() => void),
                  result: undefined as unknown,
                };
                queue(() => {
                  request.result = cloneValue(store.records.get(key));
                  request.onsuccess?.();
                  transaction.oncomplete?.();
                });
                return request;
              },
              delete(key: string) {
                const request = {
                  error: null as Error | null,
                  onsuccess: null as null | (() => void),
                  onerror: null as null | (() => void),
                };
                queue(() => {
                  store.records.delete(key);
                  request.onsuccess?.();
                  transaction.oncomplete?.();
                });
                return request;
              },
            };
          },
        };

        return transaction;
      },
    };
  }

  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      localStorage: storage,
      indexedDB,
    },
  });

  Object.defineProperty(globalThis, "indexedDB", {
    configurable: true,
    value: indexedDB,
  });

  Object.defineProperty(globalThis, "FileReader", {
    configurable: true,
    value: MockFileReader,
  });

  return {
    restore() {
      if (previousWindow === undefined) {
        Reflect.deleteProperty(globalThis, "window");
      } else {
        Object.defineProperty(globalThis, "window", {
          configurable: true,
          value: previousWindow,
        });
      }

      if (previousIndexedDb === undefined) {
        Reflect.deleteProperty(globalThis, "indexedDB");
      } else {
        Object.defineProperty(globalThis, "indexedDB", {
          configurable: true,
          value: previousIndexedDb,
        });
      }

      if (previousFileReader === undefined) {
        Reflect.deleteProperty(globalThis, "FileReader");
      } else {
        Object.defineProperty(globalThis, "FileReader", {
          configurable: true,
          value: previousFileReader,
        });
      }
    },
  };
}
