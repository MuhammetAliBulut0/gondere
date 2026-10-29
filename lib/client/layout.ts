import type { PoleEntry } from '../types.ts';
import { CITIZEN_GROUP_SIZE, PX_PER_M } from '../config.ts';
import { HERO_BY_ID, type Hero } from '../heroes.ts';
import { FORM_BY_ID, type AtaturkForm } from '../ataturk.ts';

// Direğin çizim planı. Bayrak ile direk aynı kayıt listesinden hesaplanır:
// direğin kazınmış boyu = tüm kayıtların toplam cm'si; bayrak her zaman bu boyun tepesindedir.

export type Block =
  | { key: string; type: 'hero'; startCm: number; cm: number; entry: PoleEntry; hero: Hero | null; side: Side; label: boolean }
  | { key: string; type: 'ata'; startCm: number; cm: number; entry: PoleEntry; form: AtaturkForm | null; side: Side; label: boolean }
  | { key: string; type: 'ataFinal'; startCm: number; cm: number; entry: PoleEntry; form: AtaturkForm | null; side: Side; label: boolean }
  | { key: string; type: 'citizens'; startCm: number; cm: number; firstI: number; lastI: number; count: number; side: Side; label: boolean };

export type Side = 'L' | 'R';

export interface PoleLayout {
  blocks: Block[];
  totalCm: number;
  /** Kayıt sıra numarası -> blok indeksi */
  blockOfEntry: Map<number, number>;
  /** Kayıt sıra numarası -> kaydın başladığı yükseklik (cm) */
  startOfEntry: Map<number, number>;
  /** refId ("h:..." / "a:...") -> kayıt sıra numarası */
  claimed: Map<string, number>;
}

const LABEL_H = 88; // px, bir isim levhasının yaklaşık yüksekliği
const SMALL_LABEL_H = 44;

export const cmToPx = (cm: number) => (cm / 100) * PX_PER_M;

export function buildLayout(entries: PoleEntry[]): PoleLayout {
  const sorted = [...entries].sort((a, b) => a.i - b.i);
  const finalIdx = sorted.findIndex((e) => e.k === 'A' && e.r === 'final');
  // Ulu Önderimizin son ünvanlı adı her zaman direğin en tepesinde, bayrağın hemen altında durur.
  const ordered = finalIdx >= 0 ? [...sorted.slice(0, finalIdx), ...sorted.slice(finalIdx + 1), sorted[finalIdx]] : sorted;

  const blocks: Block[] = [];
  const blockOfEntry = new Map<number, number>();
  const startOfEntry = new Map<number, number>();
  const claimed = new Map<string, number>();
  let cursor = 0;
  let run: Extract<Block, { type: 'citizens' }> | null = null;

  for (const e of ordered) {
    startOfEntry.set(e.i, cursor);
    if (e.k === 'V') {
      if (!run || run.count >= CITIZEN_GROUP_SIZE) {
        run = { key: `v${e.i}`, type: 'citizens', startCm: cursor, cm: 0, firstI: e.i, lastI: e.i, count: 0, side: 'L', label: false };
        blocks.push(run);
      }
      run.cm += e.cm;
      run.count += 1;
      run.lastI = e.i;
      blockOfEntry.set(e.i, blocks.length - 1);
    } else {
      run = null;
      if (e.k === 'H') {
        claimed.set(`h:${e.r}`, e.i);
        blocks.push({ key: `h${e.i}`, type: 'hero', startCm: cursor, cm: e.cm, entry: e, hero: HERO_BY_ID[e.r ?? ''] ?? null, side: 'R', label: true });
      } else {
        claimed.set(`a:${e.r}`, e.i);
        const form = FORM_BY_ID[e.r ?? ''] ?? null;
        blocks.push({
          key: `a${e.i}`,
          type: e.r === 'final' ? 'ataFinal' : 'ata',
          startCm: cursor,
          cm: e.cm,
          entry: e,
          form,
          side: 'R',
          label: true,
        });
      }
      blockOfEntry.set(e.i, blocks.length - 1);
    }
    cursor += e.cm;
  }

  placeLabels(blocks);
  return { blocks, totalCm: cursor, blockOfEntry, startOfEntry, claimed };
}

/** İsim levhalarını direğin iki yanına, üst üste binmeyecek şekilde yerleştirir. */
function placeLabels(blocks: Block[]) {
  const lastTop: Record<Side, number> = { L: -Infinity, R: -Infinity };
  let prefer: Side = 'R';
  for (const b of blocks) {
    if (b.type === 'ataFinal') {
      b.side = 'R';
      b.label = true;
      continue;
    }
    const center = cmToPx(b.startCm + b.cm / 2);
    const h = b.type === 'citizens' ? SMALL_LABEL_H : LABEL_H;
    const bottom = center - h / 2;
    const fits = (s: Side) => bottom >= lastTop[s] + 4;
    if (b.type === 'citizens') {
      const side: Side | null = fits('L') ? 'L' : fits('R') ? 'R' : null;
      b.label = side !== null;
      if (side) {
        b.side = side;
        lastTop[side] = center + h / 2;
      }
      continue;
    }
    const other: Side = prefer === 'R' ? 'L' : 'R';
    const side: Side = fits(prefer) ? prefer : fits(other) ? other : prefer;
    b.side = side;
    b.label = true;
    lastTop[side] = Math.max(lastTop[side], center + h / 2);
    prefer = side === 'R' ? 'L' : 'R';
  }
}

/** Görünür yükseklik aralığına (px) düşen blokların indeks aralığı. Bloklar startCm'e göre sıralıdır. */
export function visibleRange(blocks: Block[], fromPx: number, toPx: number): [number, number] {
  let lo = 0;
  let hi = blocks.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    const b = blocks[mid];
    if (cmToPx(b.startCm + b.cm) < fromPx) lo = mid + 1;
    else hi = mid;
  }
  let end = lo;
  while (end < blocks.length && cmToPx(blocks[end].startCm) <= toPx) end++;
  return [lo, end];
}
