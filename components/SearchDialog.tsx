'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { fold } from '@/lib/normalize.ts';
import { categoryLabel } from '@/lib/heroes.ts';
import type { PoleLayout } from '@/lib/client/layout.ts';

interface Props {
  open: boolean;
  layout: PoleLayout;
  onClose: () => void;
  onShowEntry: (i: number) => void;
}

/** Direğe kazınmış isimlerde arama. Görünmeyen (ekran dışı) levhalara klavye ve ekran okuyucuyla ulaşmanın yolu da budur. */
export function SearchDialog({ open, layout, onClose, onShowEntry }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const [q, setQ] = useState('');

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      setQ('');
      d.showModal();
    }
    if (!open && d.open) d.close();
  }, [open]);

  const engraved = useMemo(
    () =>
      layout.blocks
        .filter((b) => b.type !== 'citizens')
        .map((b) => {
          if (b.type === 'hero') return { i: b.entry.i, name: b.entry.n ?? '', meta: b.hero ? categoryLabel(b.hero.category) : '', startCm: b.startCm };
          return { i: b.entry.i, name: b.entry.n ?? '', meta: 'Ulu Önderimizin adı', startCm: b.startCm };
        })
        .filter(Boolean) as { i: number; name: string; meta: string; startCm: number }[],
    [layout],
  );

  const results = useMemo(() => {
    const f = fold(q);
    const list = f ? engraved.filter((e) => fold(e.name).includes(f)) : engraved;
    return [...list].reverse().slice(0, 80);
  }, [q, engraved]);

  return (
    <dialog ref={ref} className="sheet" aria-labelledby="search-title" onClose={onClose} onCancel={onClose}>
      <div className="sheet-head">
        <h2 id="search-title">Direkte ara</h2>
        <button className="close-btn" onClick={onClose} aria-label="Kapat">
          ×
        </button>
      </div>
      <div className="sheet-body">
        <label className="field-label" htmlFor="search-q">
          Kazınmış bir isim
        </label>
        <input id="search-q" className="text-input" value={q} onChange={(e) => setQ(e.target.value)} autoComplete="off" />
        {engraved.length === 0 ? (
          <p className="note">Direğe henüz bir kahraman adı kazınmadı.</p>
        ) : results.length === 0 ? (
          <p className="note">Bu adla kazınmış bir isim bulunamadı. Kahramanlarımızı “Bayrağı yükselt” bölümünden kazıyabilirsiniz.</p>
        ) : (
          <ul className="result-list">
            {results.map((r) => (
              <li key={r.i}>
                <button
                  className="result-btn"
                  onClick={() => {
                    onClose();
                    onShowEntry(r.i);
                  }}
                >
                  <span>
                    <span className="suggestion-name">{r.name}</span>
                    <br />
                    <span className="suggestion-meta">{r.meta}</span>
                  </span>
                  <span className="suggestion-meta">{(Math.floor(r.startCm / 100) + 1).toLocaleString('tr-TR')}. metre</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        <p className="note">Kendi adıyla katılan yurttaşlarımızın isimleri 1.000. katılımcıda sayfanın altında açılır.</p>
      </div>
    </dialog>
  );
}
