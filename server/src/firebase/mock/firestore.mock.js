// server/src/firebase/mock/firestore.mock.js
//
// Bellek içi, gerçek Firestore'un kullandığımız alt kümesiyle AYNI zincirli
// arayüzü sunan sahte veritabanı: collection().where().orderBy().limit().get()
// BaseRepository (ve üstündeki her şey) hangisiyle konuştuğunu bilmez.
const collections = new Map();

function getStore(name) {
  if (!collections.has(name)) collections.set(name, new Map());
  return collections.get(name);
}

function getByPath(obj, path) {
  return path.split(".").reduce((acc, key) => (acc == null ? undefined : acc[key]), obj);
}

function matchesFilter(data, { field, op, value }) {
  const actual = getByPath(data, field);
  switch (op) {
    case "==":
      return actual === value;
    case "!=":
      return actual !== value;
    case "<":
      return actual < value;
    case "<=":
      return actual <= value;
    case ">":
      return actual > value;
    case ">=":
      return actual >= value;
    case "array-contains":
      return Array.isArray(actual) && actual.includes(value);
    case "in":
      return Array.isArray(value) && value.includes(actual);
    default:
      throw new Error(`mock firestore: desteklenmeyen operatör "${op}"`);
  }
}

function makeSnapshot(docs) {
  return {
    docs: docs.map((d) => ({ id: d.id, data: () => ({ ...d.data }), exists: true })),
    empty: docs.length === 0,
    size: docs.length,
  };
}

function buildQuery(storeName, filters, sort, limitCount, cursor) {
  return {
    where(field, op, value) {
      return buildQuery(storeName, [...filters, { field, op, value }], sort, limitCount, cursor);
    },
    orderBy(field, direction = "asc") {
      return buildQuery(storeName, filters, [...sort, { field, direction }], limitCount, cursor);
    },
    limit(n) {
      return buildQuery(storeName, filters, sort, n, cursor);
    },
    startAfter(afterId) {
      return buildQuery(storeName, filters, sort, limitCount, afterId);
    },
    async get() {
      const store = getStore(storeName);
      let docs = [...store.values()].filter((d) => filters.every((f) => matchesFilter(d.data, f)));

      for (const { field, direction } of [...sort].reverse()) {
        docs.sort((a, b) => {
          const av = getByPath(a.data, field);
          const bv = getByPath(b.data, field);
          const cmp = av < bv ? -1 : av > bv ? 1 : 0;
          return direction === "desc" ? -cmp : cmp;
        });
      }

      if (cursor) {
        const cursorIndex = docs.findIndex((d) => d.id === cursor);
        docs = cursorIndex === -1 ? docs : docs.slice(cursorIndex + 1);
      }
      if (limitCount != null) docs = docs.slice(0, limitCount);

      return makeSnapshot(docs);
    },
  };
}

function docRef(storeName, id) {
  return {
    id,
    async get() {
      const store = getStore(storeName);
      const found = store.get(id);
      return { id, exists: !!found, data: () => (found ? { ...found.data } : undefined) };
    },
    async set(data, options = {}) {
      const store = getStore(storeName);
      const existing = store.get(id);
      const merged = options.merge && existing ? { ...existing.data, ...data } : { ...data };
      store.set(id, { id, data: merged });
    },
    async update(data) {
      const store = getStore(storeName);
      const existing = store.get(id);
      if (!existing) throw new Error(`mock firestore: "${storeName}/${id}" bulunamadı (update)`);
      store.set(id, { id, data: { ...existing.data, ...data } });
    },
    async delete() {
      getStore(storeName).delete(id);
    },
  };
}

function collection(name) {
  return {
    ...buildQuery(name, [], [], null, null),
    doc(id) {
      const finalId = id ?? crypto.randomUUID();
      return docRef(name, finalId);
    },
  };
}

/**
 * Gerçek Firestore'daki `runTransaction`'ın basitleştirilmiş hâli — tek
 * process, gerçek eşzamanlılık/optimistic-lock yok, ama aynı `get`/`set`
 * arayüzünü sunar (bkz. counter.repository.js'in referenceCode üretimi).
 */
async function runTransaction(updateFunction) {
  const tx = {
    async get(ref) {
      return ref.get();
    },
    set(ref, data, options) {
      ref.set(data, options);
    },
    update(ref, data) {
      ref.update(data);
    },
    delete(ref) {
      ref.delete();
    },
  };
  return updateFunction(tx);
}

/** Testler arası temiz durum için — sadece tests/helpers'tan çağrılır. */
export function resetMockFirestore() {
  collections.clear();
}

export const mockFirestore = { collection, runTransaction };
