import type { MetaState, PoleEntry } from '../types.ts';
import { ACTIVE_HEROES } from '../heroes.ts';
import { CITIZEN_CM, HERO_CM } from '../config.ts';

/**
 * Test görünümü: adres çubuğuna ?test=METRE yazılırsa (örnek: /?test=300)
 * bayrak o yüksekliğe kadar uydurma kayıtlarla gösterilir.
 * Veritabanına hiçbir şey yazılmaz ve okunmaz; yalnızca o tarayıcıda görünür.
 */
export function readPreviewMeters(): number | null {
  if (typeof window === 'undefined') return null;
  const raw = new URLSearchParams(window.location.search).get('test');
  if (raw === null) return null;
  const m = Number(raw);
  if (!Number.isFinite(m) || m <= 0) return 150;
  return Math.min(Math.round(m), 20000);
}

export function buildPreview(meters: number): { entries: PoleEntry[]; meta: MetaState } {
  const target = meters * 100;
  const entries: PoleEntry[] = [];
  let total = 0;
  let citizens = 0;
  let h = 0;
  const push = (e: Omit<PoleEntry, 'i' | 'ts'>) => {
    entries.push({ ...e, i: entries.length, ts: 0 });
    total += e.cm;
    if (e.k === 'V') citizens++;
  };
  let step = 0;
  while (total < target - 1000) {
    if (step === 6) push({ k: 'A', r: 'mirliva', n: 'Mirliva Mustafa Kemal Paşa', cm: 1900 });
    else if (step % 3 === 2) for (let c = 0; c < 4; c++) push({ k: 'V', cm: CITIZEN_CM });
    else {
      const hero = ACTIVE_HEROES[h++ % ACTIVE_HEROES.length];
      push({ k: 'H', r: hero.id, n: hero.displayName, cm: HERO_CM });
    }
    step++;
  }
  push({ k: 'A', r: 'final', n: 'Gazi Mustafa Kemal Atatürk', cm: 1000 });
  const meta: MetaState = {
    totalCm: total,
    count: entries.length,
    citizenCount: citizens,
    chunkCount: 1,
    honors: [],
    v: 1,
    updatedAt: 0,
  };
  return { entries, meta };
}
