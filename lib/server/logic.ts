import { createHash, randomBytes } from 'node:crypto';
import type { Db, Tx } from './db.ts';
import type { MetaState, PoleEntry, SubmitInput, SubmitResult, ChunkResponse, LiveResponse, CitizenListResponse, ErrorCode } from '../types.ts';
import { CHUNK_SIZE, CITIZEN_CM, CITIZEN_REVEAL_AT, ENTRY_RATE, ANMA_RATE, HERO_CM } from '../config.ts';
import { HERO_BY_ID } from '../heroes.ts';
import { FORM_BY_ID, matchAtaturkForm, type AtaturkForm } from '../ataturk.ts';
import { validateCitizenName } from '../validate.ts';

// Tüm yazma işlemleri tek bir transaction içinde yapılır:
// 1) önce bütün okumalar (Firestore kuralı), 2) sonra bütün yazmalar.
// Yükseklik her zaman toplam cm'den hesaplanır; bayrak ile direk aynı sayıdan çizildiği için kopuk olamaz.

export class AppError extends Error {
  code: ErrorCode;
  status: number;
  hint?: string;
  constructor(code: ErrorCode, message: string, status = 400, hint?: string) {
    super(message);
    this.code = code;
    this.status = status;
    this.hint = hint;
  }
}

export const EMPTY_STATE: MetaState = {
  totalCm: 0,
  count: 0,
  citizenCount: 0,
  chunkCount: 0,
  honors: [],
  v: 0,
  updatedAt: 0,
};

const STATE = 'meta/state';
const pad = (n: number, len: number) => String(n).padStart(len, '0');
export const chunkPath = (index: number) => `chunks/${pad(index, 6)}`;
const citizenPath = (i: number) => `citizens/${pad(i, 9)}`;
const sha = (s: string) => createHash('sha256').update(s).digest('hex');

function normalizeState(s: Partial<MetaState> | null): MetaState {
  return { ...EMPTY_STATE, ...(s ?? {}), honors: s?.honors ?? [] };
}

async function checkRate(tx: Tx, key: string, rule: { windowMs: number; max: number }, now: number) {
  const path = `rl/${sha(key).slice(0, 40)}`;
  const doc = await tx.get<{ w: number; c: number }>(path);
  const fresh = !doc || now - doc.w > rule.windowMs;
  const count = fresh ? 0 : doc!.c;
  if (count >= rule.max) {
    throw new AppError('RATE_LIMITED', 'Kısa sürede çok fazla işlem yapıldı. Lütfen birkaç dakika sonra yeniden deneyin.', 429);
  }
  return () => tx.set(path, { w: fresh ? now : doc!.w, c: count + 1 });
}

function appendEntry(tx: Tx, state: MetaState, partial: Omit<PoleEntry, 'i' | 'ts'>, now: number) {
  const entry: PoleEntry = { i: state.count, ts: now, ...partial };
  const chunkIndex = Math.floor(entry.i / CHUNK_SIZE);
  tx.append(chunkPath(chunkIndex), 'entries', entry);
  const next: MetaState = {
    ...state,
    totalCm: state.totalCm + entry.cm,
    count: state.count + 1,
    citizenCount: state.citizenCount + (entry.k === 'V' ? 1 : 0),
    chunkCount: Math.max(state.chunkCount, chunkIndex + 1),
    v: state.v + 1,
    updatedAt: now,
  };
  return { entry, next };
}

export interface Ctx {
  ipHash: string;
  now?: number;
}

export async function submit(db: Db, input: SubmitInput, ctx: Ctx): Promise<SubmitResult> {
  const now = ctx.now ?? Date.now();
  if (!input || typeof input !== 'object') throw new AppError('BAD_REQUEST', 'Geçersiz istek.');

  if (input.kind === 'hero') {
    const hero = typeof input.refId === 'string' ? HERO_BY_ID[input.refId] : undefined;
    if (!hero || !hero.enabled) throw new AppError('NOT_FOUND', 'Bu isim listemizde bulunamadı.', 404);
    return claimAndAppend(db, ctx.ipHash, now, `h:${hero.id}`, 'H', { k: 'H', r: hero.id, n: hero.displayName, cm: HERO_CM });
  }

  if (input.kind === 'text') {
    const text = typeof input.text === 'string' ? input.text.slice(0, 120) : '';
    const form = matchAtaturkForm(text);
    if (form) return submitAtaturk(db, ctx.ipHash, now, form);
    const check = validateCitizenName(text);
    if (!check.ok) throw new AppError(check.code, check.message);
    if (input.consent !== true) throw new AppError('CONSENT_REQUIRED', 'Katılmak için beyan ve onay kutusunu işaretleyin.');
    return submitCitizen(db, ctx.ipHash, now, check.display, check.norm, null);
  }

  if (input.kind === 'honor') {
    const form = typeof input.formId === 'string' ? FORM_BY_ID[input.formId] : undefined;
    if (!form || typeof input.honorToken !== 'string') throw new AppError('HONOR_INVALID', 'Bu bağlantının süresi dolmuş.');
    const check = validateCitizenName(typeof input.text === 'string' ? input.text : '');
    if (!check.ok) throw new AppError(check.code, check.message);
    if (input.consent !== true) throw new AppError('CONSENT_REQUIRED', 'Adınızın eklenmesi için beyan ve onay kutusunu işaretleyin.');
    return submitCitizen(db, ctx.ipHash, now, check.display, check.norm, { form, token: input.honorToken });
  }

  throw new AppError('BAD_REQUEST', 'Geçersiz istek.');
}

async function claimAndAppend(
  db: Db,
  ipHash: string,
  now: number,
  claimKey: string,
  refKind: 'H' | 'A',
  partial: Omit<PoleEntry, 'i' | 'ts'>,
  onFirst?: (claimDoc: Record<string, unknown>) => void,
): Promise<SubmitResult> {
  return db.run(async (tx) => {
    const claimPath = `claims/${claimKey}`;
    // — okumalar —
    const claim = await tx.get<{ entryIndex: number }>(claimPath);
    if (claim) {
      return { ok: true, result: 'ALREADY', refKind, refId: partial.r!, entryIndex: claim.entryIndex } as const;
    }
    const commitRate = await checkRate(tx, `e:${ipHash}`, ENTRY_RATE, now);
    const state = normalizeState(await tx.get<MetaState>(STATE));
    // — yazmalar —
    const { entry, next } = appendEntry(tx, state, partial, now);
    const claimDoc: Record<string, unknown> = { entryIndex: entry.i, ts: now };
    onFirst?.(claimDoc);
    tx.set(claimPath, claimDoc);
    tx.set(STATE, next as unknown as Record<string, unknown>);
    commitRate();
    return { ok: true, result: 'ADDED', entry, state: publicState(next) } as const;
  });
}

async function submitAtaturk(db: Db, ipHash: string, now: number, form: AtaturkForm): Promise<SubmitResult> {
  const honorToken = randomBytes(16).toString('hex');
  const res = await claimAndAppend(
    db,
    ipHash,
    now,
    `a:${form.id}`,
    'A',
    { k: 'A', r: form.id, n: form.form, cm: form.cm },
    (doc) => {
      doc.honorHash = sha(honorToken);
      doc.honorUsed = false;
    },
  );
  if (res.ok && res.result === 'ADDED') {
    return { ok: true, result: 'ATATURK_FIRST', entry: res.entry, state: res.state, formId: form.id, honorToken };
  }
  return res;
}

async function submitCitizen(
  db: Db,
  ipHash: string,
  now: number,
  display: string,
  norm: string,
  honor: { form: AtaturkForm; token: string } | null,
): Promise<SubmitResult> {
  return db.run(async (tx) => {
    // — okumalar —
    const dupPath = `citdup/${sha(`${ipHash}:${norm}`).slice(0, 40)}`;
    const claimPath = honor ? `claims/a:${honor.form.id}` : null;
    const claim = claimPath ? await tx.get<{ honorHash?: string; honorUsed?: boolean }>(claimPath) : null;
    if (honor) {
      if (!claim || claim.honorUsed || claim.honorHash !== sha(honor.token)) {
        throw new AppError('HONOR_INVALID', 'Bu onurlu kayıt zaten tamamlanmış ya da bağlantının süresi dolmuş.');
      }
    }
    const dup = await tx.get(dupPath);
    if (dup) {
      throw new AppError('DUPLICATE', 'Bu isimle bu bağlantıdan zaten katıldınız. Kahramanlarımızın adlarını kazımaya devam edebilirsiniz.', 409);
    }
    const commitRate = await checkRate(tx, `e:${ipHash}`, ENTRY_RATE, now);
    const state = normalizeState(await tx.get<MetaState>(STATE));

    // — yazmalar —
    const { entry, next } = appendEntry(tx, state, { k: 'V', cm: CITIZEN_CM }, now);
    if (honor) {
      next.honors = [...state.honors, { formId: honor.form.id, name: display }];
      tx.set(claimPath!, { ...(claim as Record<string, unknown>), honorUsed: true, honorName: display });
    }
    tx.set(citizenPath(entry.i), {
      name: display,
      norm,
      i: entry.i,
      ts: now,
      status: 'VISIBLE',
      ...(honor ? { honor: honor.form.id } : {}),
    });
    tx.set(dupPath, { ts: now });
    tx.set(STATE, next as unknown as Record<string, unknown>);
    commitRate();
    return { ok: true, result: 'ADDED', entry, state: publicState(next) } as const;
  });
}

// ——— Okuma ———

export async function getLive(db: Db): Promise<LiveResponse> {
  const state = normalizeState(await db.get<MetaState>(STATE));
  let lastChunk: LiveResponse['lastChunk'] = null;
  if (state.chunkCount > 0) {
    const index = state.chunkCount - 1;
    const doc = await db.get<{ entries: PoleEntry[] }>(chunkPath(index));
    lastChunk = { index, entries: sortEntries(doc?.entries ?? []) };
  }
  return { state: publicState(state), lastChunk, serverTime: Date.now() };
}

/** Vatandaş isimleri (onur listesi dahil) 1000. katılımcıya kadar dışarıya verilmez. */
export function publicState(state: MetaState): MetaState {
  return state.citizenCount >= CITIZEN_REVEAL_AT ? state : { ...state, honors: [] };
}

export async function getChunk(db: Db, index: number): Promise<ChunkResponse> {
  const state = normalizeState(await db.get<MetaState>(STATE));
  if (!Number.isInteger(index) || index < 0 || index >= state.chunkCount) {
    throw new AppError('NOT_FOUND', 'Parça bulunamadı.', 404);
  }
  const doc = await db.get<{ entries: PoleEntry[] }>(chunkPath(index));
  const sealed = index < state.chunkCount - 1;
  return { index, sealed, entries: sortEntries(doc?.entries ?? []) };
}

function sortEntries(entries: PoleEntry[]): PoleEntry[] {
  return [...entries].sort((a, b) => a.i - b.i);
}

export async function remember(db: Db, refId: string, ipHash: string): Promise<void> {
  const valid = (refId.startsWith('h:') && HERO_BY_ID[refId.slice(2)]?.enabled) || (refId.startsWith('a:') && FORM_BY_ID[refId.slice(2)]);
  if (!valid) throw new AppError('NOT_FOUND', 'Bu isim listemizde bulunamadı.', 404);
  const now = Date.now();
  await db.run(async (tx) => {
    const commit = await checkRate(tx, `a:${ipHash}`, ANMA_RATE, now);
    commit();
  });
  await db.increment(`anma/${refId}`, 'c', 1);
}

export async function getRememberCount(db: Db, refId: string): Promise<number> {
  const doc = await db.get<{ c: number }>(`anma/${refId}`);
  return doc?.c ?? 0;
}

export async function listCitizens(db: Db, cursor: number | null, limit = 300): Promise<CitizenListResponse> {
  const state = normalizeState(await db.get<MetaState>(STATE));
  const base = { citizenCount: state.citizenCount, revealAt: CITIZEN_REVEAL_AT, honors: state.honors };
  if (state.citizenCount < CITIZEN_REVEAL_AT) {
    return { ...base, locked: true, names: [], nextCursor: null };
  }
  const afterId = cursor === null ? null : pad(cursor, 9);
  const docs = await db.listCitizens(afterId, limit);
  const names = docs
    .filter((d) => d.data.status === 'VISIBLE' && !d.data.honor)
    .map((d) => ({ i: Number(d.data.i), name: String(d.data.name) }));
  const last = docs.at(-1);
  return { ...base, locked: false, names, nextCursor: docs.length === limit && last ? Number(last.id) : null };
}
