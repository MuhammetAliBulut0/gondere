'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useLive } from '@/lib/client/useLive.ts';
import { buildLayout, cmToPx, visibleRange, type Block } from '@/lib/client/layout.ts';
import { CITIZEN_COLLECTIVE_NAME, MILESTONES, PX_PER_M, SITE } from '@/lib/config.ts';
import { cmToMetersText, formatInt } from '@/lib/normalize.ts';
import { ATATURK_29_MESSAGE } from '@/lib/ataturk.ts';
import type { MetaState, PoleEntry } from '@/lib/types.ts';
import { Flag } from './Flag';
import { EntryDialog, type EntryPreset } from './EntryDialog';
import { SearchDialog } from './SearchDialog';
import { InfoDialog } from './InfoDialog';
import { Citizens } from './Citizens';

const useIsoLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

// Sahne ölçüleri (px)
const GROUND = 120; // zemin şeridi
const PLINTH_H = 56;
const BASE = GROUND + PLINTH_H - 6; // direğin kaideye oturduğu yükseklik
const BUFFER = 700; // görünür alanın üstünde/altında önceden çizilecek pay

const CLOUDS = [
  { m: 70, x: '4%' },
  { m: 240, x: '56%' },
  { m: 820, x: '8%' },
  { m: 2300, x: '52%' },
];

// Yüksekliğe göre gökyüzü renkleri: [metre, üst renk, alt renk]
const SKY: [number, number[], number[]][] = [
  [0, [31, 111, 216], [140, 202, 246]],
  [300, [24, 96, 200], [110, 182, 240]],
  [1500, [18, 72, 170], [64, 140, 220]],
  [4000, [12, 44, 120], [30, 86, 170]],
  [8000, [8, 22, 70], [16, 46, 110]],
  [12000, [5, 12, 40], [10, 26, 70]],
];

function skyAt(m: number) {
  let k = 0;
  while (k < SKY.length - 2 && m > SKY[k + 1][0]) k++;
  const [m0, a0, b0] = SKY[k];
  const [m1, a1, b1] = SKY[k + 1];
  const t = Math.max(0, Math.min(1, (m - m0) / (m1 - m0)));
  const mix = (p: number[], q: number[]) => `rgb(${p.map((v, j) => Math.round(v + (q[j] - v) * t)).join(',')})`;
  return { a: mix(a0, a1), b: mix(b0, b1) };
}

function plaqueMeta(b: Block): string {
  if (b.type === 'hero') {
    if (!b.hero) return '';
    const year = b.hero.event.match(/\b(1\d{3}|20\d{2})\b/g)?.at(-1) ?? b.hero.event;
    return `${b.hero.category === 'KAHRAMAN' ? 'Kahraman' : 'Şehit'}, ${year}`;
  }
  if (b.type === 'ata') return b.form?.period ?? '';
  if (b.type === 'ataFinal') return 'Ulu Önderimiz';
  return '';
}

export function Scene() {
  const { meta, entries, status, errorText, refresh, applyEntry } = useLive();
  const layout = useMemo(() => buildLayout(entries), [entries]);

  const [view, setView] = useState({ y: 0, h: 800, w: 400 });
  const [entryOpen, setEntryOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [preset, setPreset] = useState<EntryPreset | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [highlight, setHighlight] = useState<number | null>(null);
  const [announce, setAnnounce] = useState('');
  const [reduced, setReduced] = useState(false);
  const introRef = useRef<HTMLDivElement>(null);
  const [introBottom, setIntroBottom] = useState(340);

  // Bayrağın üstünde kalan gökyüzü payı, başlık metninin yüksekliğine göre ayarlanır
  useEffect(() => {
    const el = introRef.current;
    if (!el) return;
    const measure = () => setIntroBottom(el.offsetTop + el.offsetHeight);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const TOP_PAD = Math.max(260, introBottom + 40);

  // Ölçüler
  const flagW = Math.round(Math.max(170, Math.min(300, view.w * 0.46)));
  const flagH = Math.round(flagW / 1.5);
  const HOIST = flagH + 34;
  const totalCm = layout.totalCm;
  const polePx = cmToPx(totalCm);
  const stageH = Math.max(view.h, TOP_PAD + HOIST + polePx + BASE + 24);
  const flagDocTop = stageH - (BASE + polePx + HOIST) + 8;

  // Kaydırma ve boyut takibi
  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      setView({ y: window.scrollY, h: window.innerHeight, w: window.innerWidth });
    };
    const on = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    update();
    window.addEventListener('scroll', on, { passive: true });
    window.addEventListener('resize', on);
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const onMq = () => setReduced(mq.matches);
    mq.addEventListener('change', onMq);
    return () => {
      window.removeEventListener('scroll', on);
      window.removeEventListener('resize', on);
      mq.removeEventListener('change', onMq);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  // Direk uzadığında, aşağıda isim okuyan kişinin ekranı kaymasın
  const prevStage = useRef(stageH);
  useIsoLayoutEffect(() => {
    const d = stageH - prevStage.current;
    prevStage.current = stageH;
    if (d !== 0 && window.scrollY > 160) window.scrollBy(0, d);
  }, [stageH]);

  // Yüksekliğe göre gökyüzü
  const hp = (docY: number) => stageH - docY - BASE;
  const centerM = Math.max(0, hp(view.y + view.h / 2)) / PX_PER_M;
  useEffect(() => {
    const { a, b } = skyAt(centerM);
    const root = document.documentElement.style;
    root.setProperty('--sky-a', a);
    root.setProperty('--sky-b', b);
    root.setProperty('--stars', String(Math.max(0, Math.min(1, (centerM - 2500) / 4000))));
  }, [centerM]);

  // Ekran okuyucular için yükseklik duyurusu (en fazla 20 sn'de bir)
  const lastAnnounce = useRef(0);
  useEffect(() => {
    if (status !== 'ready') return;
    const now = Date.now();
    if (now - lastAnnounce.current < 20000) return;
    lastAnnounce.current = now;
    setAnnounce(`Bayrağımız ${cmToMetersText(totalCm)} metrede.`);
  }, [totalCm, status]);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 6000);
    return () => window.clearTimeout(id);
  }, [toast]);

  useEffect(() => {
    if (highlight === null) return;
    const id = window.setTimeout(() => setHighlight(null), 6000);
    return () => window.clearTimeout(id);
  }, [highlight]);

  const behavior: ScrollBehavior = reduced ? 'auto' : 'smooth';

  const scrollToFlag = useCallback(() => {
    window.scrollTo({ top: Math.max(0, flagDocTop - 150), behavior });
  }, [flagDocTop, behavior]);

  const scrollToEntry = useCallback(
    (i: number) => {
      const bi = layout.blockOfEntry.get(i);
      if (bi === undefined) return;
      const b = layout.blocks[bi];
      const docY = stageH - BASE - cmToPx(b.startCm + b.cm / 2);
      window.scrollTo({ top: Math.max(0, docY - window.innerHeight / 2), behavior });
      setHighlight(i);
    },
    [layout, stageH, behavior],
  );

  const pendingScroll = useRef<null | 'flag'>(null);
  useEffect(() => {
    if (pendingScroll.current === 'flag') {
      pendingScroll.current = null;
      window.setTimeout(scrollToFlag, 80);
    }
  }, [stageH, scrollToFlag]);

  const onAdded = useCallback(
    (entry: PoleEntry, state: MetaState, message: string, close: boolean) => {
      applyEntry(entry, state);
      setHighlight(entry.i);
      const other = entry.r === 'mirliva' ? 'a:final' : 'a:mirliva';
      const extra = entry.k === 'A' && (entry.r === 'mirliva' || entry.r === 'final') && layout.claimed.has(other) ? ` ${ATATURK_29_MESSAGE}` : '';
      setToast(message + extra);
      if (close) {
        setEntryOpen(false);
        pendingScroll.current = 'flag';
      }
      window.setTimeout(() => refresh(true), 1500);
    },
    [applyEntry, refresh, layout],
  );

  const openEntry = (p?: Omit<EntryPreset, 'nonce'>) => {
    setPreset({ ...(p ?? {}), nonce: Date.now() });
    setEntryOpen(true);
  };

  // Görünür bloklar
  const fromPx = hp(view.y + view.h) - BUFFER;
  const toPx = hp(view.y) + BUFFER;
  const [start, end] = visibleRange(layout.blocks, fromPx, toPx);
  const visibleBlocks = layout.blocks.slice(start, end);

  const fromM = Math.max(0, Math.floor(fromPx / PX_PER_M));
  const toM = Math.min(Math.floor(totalCm / 100), Math.ceil(toPx / PX_PER_M));
  const rulerLabels: number[] = [];
  for (let m = Math.ceil(Math.max(10, fromM) / 10) * 10; m <= toM; m += 10) rulerLabels.push(m);
  const milestones = MILESTONES.filter((ms) => ms.m * 100 <= totalCm && ms.m >= fromM && ms.m <= toM);
  const next = MILESTONES.find((ms) => ms.m * 100 > totalCm);

  const flagVisible = view.y < flagDocTop + flagH && view.y + view.h > flagDocTop;
  const ready = status === 'ready';
  const isHighlighted = (b: Block) =>
    highlight !== null && (b.type === 'citizens' ? highlight >= b.firstI && highlight <= b.lastI : b.entry.i === highlight);

  return (
    <>
      <div className="sky" aria-hidden="true" />

      <header className="topbar">
        <p className="wordmark">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/flag.svg" alt="" />
          <span>{SITE.title}</span>
        </p>
        <div className="altimeter" aria-label={`Bayrağımızın yüksekliği ${cmToMetersText(totalCm)} metre`}>
          <span className="altimeter-value">{ready || totalCm > 0 ? `${cmToMetersText(totalCm)} m` : '…'}</span>
          {next && <span className="altimeter-next">Sıradaki hedef: {formatInt(next.m)} m</span>}
        </div>
        <nav className="topbar-actions" aria-label="Site">
          <button className="text-btn" onClick={() => setSearchOpen(true)}>
            Ara
          </button>
          <button className="text-btn" onClick={() => setInfoOpen(true)}>
            Bilgi
          </button>
        </nav>
      </header>

      {status === 'error' && <div className="status-banner">{errorText}</div>}

      <main>
        <div className="stage" style={{ height: stageH }} aria-label="Bayrak direği">
          <Bunting width={view.w} />
          <div className="intro" ref={introRef}>
            <p className="intro-badge">29 Ekim Cumhuriyet Bayramımız kutlu olsun</p>
            <h1>{SITE.title}</h1>
            <p className="subtitle">{SITE.subtitle}</p>
            <p className="explain">Direğe kazınan her isim bayrağımızı biraz daha yukarı taşır.</p>
            {ready && totalCm === 0 && (
              <p className="empty-note">Bayrağımız henüz göndere çekilmedi. İlk ismi siz kazıyın, bayrağımız yükselmeye başlasın.</p>
            )}
          </div>

          {CLOUDS.filter((c) => c.m * 100 < totalCm && cmToPx(c.m * 100) > fromPx && cmToPx(c.m * 100) < toPx).map((c) => (
            <div key={c.m} className="cloud" style={{ bottom: BASE + cmToPx(c.m * 100), left: c.x }} aria-hidden="true" />
          ))}

          <div className="ruler grow" style={{ bottom: BASE, height: polePx }} aria-hidden="true" />
          {rulerLabels.map((m) => (
            <span key={m} className="ruler-label" style={{ bottom: BASE + m * PX_PER_M }} aria-hidden="true">
              {formatInt(m)} m
            </span>
          ))}
          {milestones.map((ms) => (
            <div key={ms.m} className="milestone" style={{ bottom: BASE + ms.m * PX_PER_M }}>
              <span>
                {ms.label}, {formatInt(ms.m)} m
              </span>
            </div>
          ))}

          {/* Direk: kazınmış bölüm + bayrağın asılı olduğu tepe bölümü */}
          <div className="pole grow" style={{ bottom: BASE, height: polePx }} aria-hidden="true" />
          <div className="hoist grow" style={{ bottom: BASE + polePx, height: HOIST }} aria-hidden="true" />
          <div className="finial grow" style={{ bottom: BASE + polePx + HOIST - 4 }} aria-hidden="true" />

          {visibleBlocks.map((b) => {
            const bottom = BASE + cmToPx(b.startCm);
            const h = cmToPx(b.cm);
            const center = BASE + cmToPx(b.startCm + b.cm / 2);
            const hi = isHighlighted(b);
            const segClass = b.type === 'citizens' ? 'seg-citizens' : b.type === 'hero' ? 'seg-hero' : 'seg-gold';
            return (
              <div key={b.key}>
                <div className={`seg ${segClass}${hi ? ' is-new' : ''}`} style={{ bottom, height: h }} aria-hidden="true" />
                {b.type === 'citizens'
                  ? b.label && (
                      <div className={`citizen-label side-${b.side}`} style={{ bottom: center }}>
                        <span className="citizen-name">{CITIZEN_COLLECTIVE_NAME}</span>
                        <small>{formatInt(b.count)} yurttaşımız</small>
                      </div>
                    )
                  : (
                      <button
                        className={`plaque side-${b.side}${b.type !== 'hero' ? ' plaque-ata' : ''}${b.type === 'ataFinal' ? ' plaque-final' : ''}${hi ? ' is-new' : ''}`}
                        style={{ bottom: center }}
                        onClick={() =>
                          b.type === 'hero' && b.hero ? openEntry({ heroId: b.hero.id }) : openEntry({ query: b.entry.n ?? '' })
                        }
                      >
                        <span className="plaque-name">{b.entry.n}</span>
                        <span className="plaque-meta">{plaqueMeta(b)}</span>
                      </button>
                    )}
              </div>
            );
          })}

          {totalCm > 0 ? (
            <Flag width={flagW} bottom={BASE + polePx + HOIST - flagH - 8} />
          ) : (
            <>
              <div className="folded-flag" style={{ bottom: BASE }} role="img" aria-label="Katlanmış Türk Bayrağı" />
            </>
          )}

          <div className="ground" style={{ height: GROUND }} aria-hidden="true" />
          <div className="plinth" style={{ bottom: GROUND - 6, height: PLINTH_H }}>
            29 Ekim 1923
          </div>
        </div>

        <div className="below">
          <div className="below-inner">
            <Citizens citizenCount={meta?.citizenCount ?? 0} />
            <footer className="footer">
              <p>
                {SITE.title}, 29 Ekim Cumhuriyet Bayramı için hazırlanmış gönüllü bir öğrenci projesidir; herhangi bir resmî kurumla
                bağlantısı yoktur.
              </p>
              <p>
                İsimlerin kaynakları her ismin yanında yer alır.{' '}
                <button onClick={() => setInfoOpen(true)}>Nasıl katılırım ve aydınlatma metni</button>
              </p>
            </footer>
          </div>
        </div>
      </main>

      {!flagVisible && totalCm > 0 && (
        <button className="back-to-flag" onClick={scrollToFlag}>
          Bayrağa dön
        </button>
      )}

      <div className="cta-bar">
        <button className="btn btn-primary btn-big" onClick={() => openEntry()}>
          Bayrağı yükselt
        </button>
      </div>

      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
      <div className="sr-only" aria-live="polite">
        {announce}
      </div>

      <EntryDialog
        open={entryOpen}
        preset={preset}
        layout={layout}
        onClose={() => setEntryOpen(false)}
        onAdded={onAdded}
        onStale={() => refresh(true)}
        onShowEntry={(i) => window.setTimeout(() => scrollToEntry(i), 60)}
        onOpenInfo={() => setInfoOpen(true)}
      />
      <SearchDialog
        open={searchOpen}
        layout={layout}
        onClose={() => setSearchOpen(false)}
        onShowEntry={(i) => window.setTimeout(() => scrollToEntry(i), 60)}
      />
      <InfoDialog open={infoOpen} onClose={() => setInfoOpen(false)} />
    </>
  );
}

/** Bayram süsü: kırmızı-beyaz flamalar. */
function Bunting({ width }: { width: number }) {
  const step = 34;
  const n = Math.max(6, Math.ceil(width / step) + 1);
  const sag = 12;
  const y = (x: number) => 4 + sag * Math.sin((Math.PI * x) / Math.max(1, width));
  const tris = Array.from({ length: n }, (_, k) => {
    const x0 = k * step;
    const x1 = x0 + step - 6;
    const xm = (x0 + x1) / 2;
    return (
      <polygon
        key={k}
        points={`${x0},${y(x0)} ${x1},${y(x1)} ${xm},${y(xm) + 26}`}
        fill={k % 2 === 0 ? '#a8101a' : '#ffffff'}
        stroke={k % 2 === 0 ? '#7e0a12' : '#e3e5ea'}
        strokeWidth="1"
      />
    );
  });
  const d = Array.from({ length: 41 }, (_, k) => {
    const x = (k / 40) * width;
    return `${k === 0 ? 'M' : 'L'}${x.toFixed(1)},${y(x).toFixed(1)}`;
  }).join(' ');
  return (
    <svg className="bunting" viewBox={`0 0 ${width} 46`} preserveAspectRatio="none" aria-hidden="true">
      <path d={d} fill="none" stroke="#ffffff" strokeWidth="2" />
      {tris}
    </svg>
  );
}
