// Veritabanı soyutlaması. İş mantığı (logic.ts) yalnızca bu arayüzü kullanır;
// böylece aynı mantık hem Firestore'da hem de yerel geliştirmedeki bellek içi veritabanında çalışır.
//
// Firestore yapısı:
//   meta/state                 -> MetaState (toplam yükseklik, sayaçlar)
//   chunks/{000000}            -> { entries: PoleEntry[] }   (en fazla CHUNK_SIZE kayıt)
//   claims/{h:kimlik | a:form} -> bir kahraman veya ünvan formunun kim tarafından, hangi sırada kazındığı
//   citizens/{000000123}       -> vatandaş adı (1000. katılımcıda açılır)
//   citdup/{özet}              -> aynı bağlantıdan aynı adın tekrar gönderilmesini önler
//   rl/{özet}                  -> hız sınırı sayaçları
//   anma/{kimlik}              -> "Saygıyla an" sayacı

export interface Tx {
  get<T>(path: string): Promise<T | null>;
  set(path: string, data: Record<string, unknown>): void;
  /** Bir belgenin dizisine eleman ekler (yoksa belgeyi oluşturur) */
  append(path: string, field: string, value: unknown): void;
}

export interface Db {
  kind: 'firestore' | 'memory';
  run<T>(fn: (tx: Tx) => Promise<T>): Promise<T>;
  get<T>(path: string): Promise<T | null>;
  increment(path: string, field: string, by: number): Promise<void>;
  /** citizens koleksiyonunu belge kimliğine göre sırayla listeler */
  listCitizens(afterId: string | null, limit: number): Promise<{ id: string; data: Record<string, unknown> }[]>;
}

// ——— Bellek içi veritabanı (yalnızca yerel geliştirme ve testler için) ———

export function createMemoryDb(): Db {
  const store = new Map<string, Record<string, unknown>>();
  let lock: Promise<unknown> = Promise.resolve();
  const clone = <T>(v: T): T => (v === undefined ? v : structuredClone(v));

  return {
    kind: 'memory',
    async run<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
      const job = lock.then(async () => {
        const writes: (() => void)[] = [];
        const tx: Tx = {
          async get<U>(path: string) {
            return (clone(store.get(path)) as U) ?? null;
          },
          set(path, data) {
            writes.push(() => store.set(path, clone(data)));
          },
          append(path, field, value) {
            writes.push(() => {
              const doc = store.get(path) ?? {};
              const arr = Array.isArray(doc[field]) ? (doc[field] as unknown[]) : [];
              store.set(path, { ...doc, [field]: [...arr, clone(value)] });
            });
          },
        };
        const result = await fn(tx);
        writes.forEach((w) => w());
        return result;
      });
      lock = job.catch(() => undefined);
      return job;
    },
    async get<T>(path: string) {
      return (clone(store.get(path)) as T) ?? null;
    },
    async increment(path, field, by) {
      const doc = store.get(path) ?? {};
      store.set(path, { ...doc, [field]: (Number(doc[field]) || 0) + by });
    },
    async listCitizens(afterId, limit) {
      return [...store.entries()]
        .filter(([p]) => p.startsWith('citizens/'))
        .map(([p, data]) => ({ id: p.slice('citizens/'.length), data: clone(data) }))
        .sort((a, b) => (a.id < b.id ? -1 : 1))
        .filter((d) => afterId === null || d.id > afterId)
        .slice(0, limit);
    },
  };
}

// ——— Firestore ———

export async function createFirestoreDb(): Promise<Db> {
  const { initializeApp, getApps, cert } = await import('firebase-admin/app');
  const { getFirestore, FieldValue, FieldPath } = await import('firebase-admin/firestore');

  const projectId = process.env.FIREBASE_PROJECT_ID;
  if (!getApps().length) {
    if (process.env.FIRESTORE_EMULATOR_HOST) {
      initializeApp({ projectId: projectId || 'demo-gondere' });
    } else {
      const privateKey = (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n').replace(/^"|"$/g, '');
      initializeApp({
        credential: cert({ projectId, clientEmail: process.env.FIREBASE_CLIENT_EMAIL, privateKey }),
        projectId,
      });
    }
  }
  const fs = getFirestore();
  const ref = (path: string) => fs.doc(path);

  return {
    kind: 'firestore',
    run<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
      return fs.runTransaction(
        async (t) => {
          const tx: Tx = {
            async get<U>(path: string) {
              const snap = await t.get(ref(path));
              return snap.exists ? (snap.data() as U) : null;
            },
            set(path, data) {
              t.set(ref(path), data);
            },
            append(path, field, value) {
              t.set(ref(path), { [field]: FieldValue.arrayUnion(value) }, { merge: true });
            },
          };
          return fn(tx);
        },
        { maxAttempts: 8 },
      );
    },
    async get<T>(path: string) {
      const snap = await ref(path).get();
      return snap.exists ? (snap.data() as T) : null;
    },
    async increment(path, field, by) {
      await ref(path).set({ [field]: FieldValue.increment(by) }, { merge: true });
    },
    async listCitizens(afterId, limit) {
      let q = fs.collection('citizens').orderBy(FieldPath.documentId()).limit(limit);
      if (afterId) q = q.startAfter(afterId);
      const snap = await q.get();
      return snap.docs.map((d) => ({ id: d.id, data: d.data() }));
    },
  };
}

// ——— Seçim ———

let dbPromise: Promise<Db> | null = null;

export class ConfigError extends Error {}

export function isFirestoreConfigured(): boolean {
  return Boolean(
    process.env.FIREBASE_PROJECT_ID &&
      (process.env.FIRESTORE_EMULATOR_HOST || (process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY)),
  );
}

export function getDb(): Promise<Db> {
  if (!dbPromise) {
    if (isFirestoreConfigured()) {
      dbPromise = createFirestoreDb().catch((err) => {
        dbPromise = null;
        throw err;
      });
    } else if (process.env.NODE_ENV !== 'production' || process.env.ALLOW_MEMORY_DB === '1') {
      const g = globalThis as unknown as { __gondereMemDb?: Db };
      g.__gondereMemDb ??= createMemoryDb();
      dbPromise = Promise.resolve(g.__gondereMemDb);
    } else {
      return Promise.reject(new ConfigError('Firebase ortam değişkenleri eksik.'));
    }
  }
  return dbPromise;
}
