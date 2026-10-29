'use client';

import { useEffect, useState } from 'react';
import type { CitizenListResponse } from '@/lib/types.ts';
import { CITIZEN_COLLECTIVE_NAME, CITIZEN_REVEAL_AT } from '@/lib/config.ts';
import { FORM_BY_ID } from '@/lib/ataturk.ts';
import { formatInt } from '@/lib/normalize.ts';

export function Citizens({ citizenCount }: { citizenCount: number }) {
  const unlocked = citizenCount >= CITIZEN_REVEAL_AT;
  const [data, setData] = useState<CitizenListResponse | null>(null);
  const [names, setNames] = useState<{ i: number; name: string }[]>([]);
  const [cursor, setCursor] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  async function load(next: number | null) {
    setLoading(true);
    try {
      const res = await fetch(next === null ? '/api/citizens' : `/api/citizens?cursor=${next}`);
      if (!res.ok) return;
      const d = (await res.json()) as CitizenListResponse;
      setData(d);
      setNames((n) => (next === null ? d.names : [...n, ...d.names]));
      setCursor(d.nextCursor);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (unlocked && !data) load(null);
  }, [unlocked, data]);

  const pct = Math.min(100, (citizenCount / CITIZEN_REVEAL_AT) * 100);

  return (
    <section className="citizens" aria-labelledby="citizens-title">
      <h2 id="citizens-title">{CITIZEN_COLLECTIVE_NAME}</h2>
      {!unlocked || !data || data.locked ? (
        <>
          <p>
            Kendi adıyla katılan yurttaşlarımızın isimleri, {formatInt(CITIZEN_REVEAL_AT)}. yurttaşımız katıldığında burada topluca açılacak.
          </p>
          <div
            className="progress"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={CITIZEN_REVEAL_AT}
            aria-valuenow={Math.min(citizenCount, CITIZEN_REVEAL_AT)}
            aria-label="Katılan yurttaş sayısı"
          >
            <div style={{ width: `${pct}%` }} />
          </div>
          <p className="progress-label">
            {formatInt(citizenCount)} / {formatInt(CITIZEN_REVEAL_AT)} yurttaşımız
          </p>
        </>
      ) : (
        <>
          <p>{formatInt(citizenCount)} yurttaşımız kendi adıyla bayrağımızı yükseltti.</p>
          {data.honors.length > 0 && (
            <div className="honors">
              <h3>Ulu Önderimizin adını direğe ilk kazıyanlar</h3>
              <ul className="name-wall" style={{ marginTop: 6 }}>
                {data.honors.map((h) => (
                  <li key={h.formId}>
                    {h.name}
                    <span className="suggestion-meta" style={{ display: 'block', textAlign: 'left' }}>
                      {FORM_BY_ID[h.formId]?.form}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <ul className="name-wall">
            {names.map((n) => (
              <li key={n.i}>{n.name}</li>
            ))}
          </ul>
          {cursor !== null && (
            <div className="actions">
              <button className="btn btn-quiet" disabled={loading} onClick={() => load(cursor)}>
                Daha fazla isim göster
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
