'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ACTIVE_HEROES, HERO_BY_ID, categoryLabel, type Hero } from '@/lib/heroes.ts';
import { matchAtaturkForm, looksLikeAtaturk, ataturkFirstMessage, ataturkRepeatMessage, FORM_BY_ID } from '@/lib/ataturk.ts';
import { fold } from '@/lib/normalize.ts';
import { CITIZEN_COLLECTIVE_NAME, CITIZEN_REVEAL_AT } from '@/lib/config.ts';
import type { MetaState, PoleEntry, SubmitResult } from '@/lib/types.ts';
import type { PoleLayout } from '@/lib/client/layout.ts';
import { Turnstile, type TurnstileHandle } from './Turnstile';

const JOINED_KEY = 'gondere:joined';

export interface EntryPreset {
  query?: string;
  heroId?: string;
  nonce: number;
}

interface Props {
  open: boolean;
  preset: EntryPreset | null;
  layout: PoleLayout;
  onClose: () => void;
  onAdded: (entry: PoleEntry, state: MetaState, message: string, close: boolean) => void;
  onStale: () => void;
  onShowEntry: (i: number) => void;
  onOpenInfo: () => void;
}

function meterOf(layout: PoleLayout, i: number): number {
  return Math.floor((layout.startOfEntry.get(i) ?? 0) / 100) + 1;
}

function readJoined(): boolean {
  try {
    return window.localStorage.getItem(JOINED_KEY) === '1';
  } catch {
    return false;
  }
}

function heroMatches(q: string): Hero[] {
  const f = fold(q);
  if (f.length < 2) return [];
  const scored: { h: Hero; s: number }[] = [];
  for (const h of ACTIVE_HEROES) {
    const names = [h.displayName, ...h.aliases].map(fold);
    let s = -1;
    for (const n of names) {
      if (n === f) s = Math.max(s, 3);
      else if (n.startsWith(f)) s = Math.max(s, 2);
      else if (n.split(' ').some((w) => w.startsWith(f)) || n.includes(f)) s = Math.max(s, 1);
    }
    if (s >= 0) scored.push({ h, s });
  }
  return scored
    .sort((a, b) => b.s - a.s || a.h.displayName.localeCompare(b.h.displayName, 'tr'))
    .slice(0, 6)
    .map((x) => x.h);
}

export function EntryDialog({ open, preset, layout, onClose, onAdded, onStale, onShowEntry, onOpenInfo }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const turnstile = useRef<TurnstileHandle>(null);

  const [query, setQuery] = useState('');
  const [heroId, setHeroId] = useState<string | null>(null);
  const [active, setActive] = useState(-1);
  const [consent, setConsent] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [captchaError, setCaptchaError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [joined, setJoined] = useState(false);
  const [honor, setHonor] = useState<{ formId: string; honorToken: string; message: string } | null>(null);
  const [honorName, setHonorName] = useState('');
  const [honorConsent, setHonorConsent] = useState(false);
  const [anma, setAnma] = useState<Record<string, { count: number | null; done: boolean }>>({});

  // Aç / kapat
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  // Her açılışta formu sıfırla (varsa ön seçimle)
  useEffect(() => {
    if (!open) return;
    setQuery(preset?.query ?? (preset?.heroId ? HERO_BY_ID[preset.heroId]?.displayName ?? '' : ''));
    setHeroId(preset?.heroId ?? null);
    setActive(-1);
    setConsent(false);
    setError(null);
    setNotice(null);
    setHonor(null);
    setHonorName('');
    setHonorConsent(false);
    setJoined(readJoined());
    if (!preset?.heroId && !preset?.query) window.setTimeout(() => inputRef.current?.focus(), 60);
  }, [open, preset]);

  const hero = heroId ? HERO_BY_ID[heroId] ?? null : null;
  const suggestions = useMemo(() => (heroId ? [] : heroMatches(query)), [heroId, query]);
  const form = !heroId ? matchAtaturkForm(query) : null;
  const hint = !heroId && !form && looksLikeAtaturk(query);
  const words = fold(query).split(' ').filter(Boolean).length;
  const showCitizen = !heroId && !form && !hint && !honor && words >= 2;
  const heroClaimedAt = hero ? layout.claimed.get(`h:${hero.id}`) : undefined;
  const formClaimedAt = form ? layout.claimed.get(`a:${form.id}`) : undefined;
  const anmaKey = hero && heroClaimedAt !== undefined ? `h:${hero.id}` : form && formClaimedAt !== undefined ? `a:${form.id}` : null;

  // Anma sayısını getir
  useEffect(() => {
    if (!anmaKey || anma[anmaKey]) return;
    setAnma((a) => ({ ...a, [anmaKey]: { count: null, done: false } }));
    fetch(`/api/anma?id=${encodeURIComponent(anmaKey)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setAnma((a) => ({ ...a, [anmaKey]: { ...a[anmaKey], count: d.count } })))
      .catch(() => undefined);
  }, [anmaKey, anma]);

  async function post(body: Record<string, unknown>): Promise<SubmitResult | null> {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch('/api/entry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...body, turnstile: token }),
      });
      const data = (await res.json()) as SubmitResult;
      if (!data.ok) setError(data.message);
      return data;
    } catch {
      setError('Bağlantı kurulamadı. İnternet bağlantınızı kontrol edip yeniden deneyin.');
      return null;
    } finally {
      setBusy(false);
      turnstile.current?.reset();
    }
  }

  async function engraveHero() {
    if (!hero) return;
    const r = await post({ kind: 'hero', refId: hero.id });
    if (!r || !r.ok) return;
    if (r.result === 'ADDED') {
      onAdded(r.entry, r.state, `“${hero.displayName}” direğe kazındı. Bayrağımız 2 metre yükseldi.`, true);
    } else if (r.result === 'ALREADY') {
      setNotice('Bu isim az önce başka bir yurttaşımız tarafından kazındı. Saygıyla anabilirsiniz.');
      onStale();
    }
  }

  async function engraveAtaturk() {
    if (!form) return;
    const r = await post({ kind: 'text', text: query });
    if (!r || !r.ok) return;
    if (r.result === 'ATATURK_FIRST') {
      onAdded(r.entry, r.state, `“${form.form}” direğe kazındı.`, false);
      setHonor({ formId: r.formId, honorToken: r.honorToken, message: ataturkFirstMessage(form) });
    } else if (r.result === 'ALREADY') {
      setNotice(ataturkRepeatMessage(form));
      onStale();
    }
  }

  async function joinAsCitizen() {
    const r = await post({ kind: 'text', text: query, consent });
    if (!r || !r.ok) return;
    if (r.result === 'ADDED') {
      try {
        window.localStorage.setItem(JOINED_KEY, '1');
      } catch {}
      onAdded(r.entry, r.state, `Adınız “${CITIZEN_COLLECTIVE_NAME}” arasında direğe işlendi. Bayrağımız yarım metre yükseldi.`, true);
    } else if (r.result === 'ATATURK_FIRST' && form) {
      setHonor({ formId: r.formId, honorToken: r.honorToken, message: ataturkFirstMessage(form) });
    }
  }

  async function addHonorName() {
    if (!honor) return;
    const r = await post({ kind: 'honor', formId: honor.formId, honorToken: honor.honorToken, text: honorName, consent: honorConsent });
    if (!r || !r.ok || r.result !== 'ADDED') return;
    try {
      window.localStorage.setItem(JOINED_KEY, '1');
    } catch {}
    onAdded(r.entry, r.state, 'Adınız, Ulu Önderimizin adını ilk kazıyanlar arasına eklendi. Bayrağımız yarım metre daha yükseldi.', true);
  }

  async function remember(key: string) {
    setAnma((a) => ({ ...a, [key]: { count: a[key]?.count ?? null, done: true } }));
    try {
      await fetch('/api/anma', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: key }) });
    } catch {}
  }

  function pick(h: Hero) {
    setHeroId(h.id);
    setQuery(h.displayName);
    setActive(-1);
    setError(null);
    setNotice(null);
  }

  function onInputKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!suggestions.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => (a + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => (a <= 0 ? suggestions.length - 1 : a - 1));
    } else if (e.key === 'Enter' && active >= 0) {
      e.preventDefault();
      pick(suggestions[active]);
    }
  }

  const needsToken = !token;
  const anmaState = anmaKey ? anma[anmaKey] : undefined;

  return (
    <dialog ref={ref} className="sheet" aria-labelledby="entry-title" onClose={onClose} onCancel={onClose}>
      <div className="sheet-head">
        <h2 id="entry-title">Bayrağı yükselt</h2>
        <button className="close-btn" onClick={onClose} aria-label="Kapat">
          ×
        </button>
      </div>

      <div className="sheet-body">
        {honor ? (
          <div className="panel panel-gold" role="status">
            <h3>{FORM_BY_ID[honor.formId]?.form}</h3>
            <p>{honor.message}</p>
            <p style={{ marginTop: 14 }}>
              Bu anı kayda geçirmek için adınızı da yazar mısınız? Adınız, {CITIZEN_COLLECTIVE_NAME} listesinin en başında yer alacak.
            </p>
            <label className="field-label" htmlFor="honor-name" style={{ marginTop: 12 }}>
              Adınız ve soyadınız
            </label>
            <input
              id="honor-name"
              className="text-input"
              value={honorName}
              onChange={(e) => setHonorName(e.target.value)}
              autoComplete="name"
              maxLength={40}
            />
            <label className="check">
              <input type="checkbox" checked={honorConsent} onChange={(e) => setHonorConsent(e.target.checked)} />
              <span>
                Yazdığım ismin kendi adım olduğunu beyan ederim. İsmimin bu sitede herkese açık ve kalıcı olarak gösterileceğini biliyor ve
                kabul ediyorum.{' '}
                <button type="button" className="linklike" onClick={onOpenInfo}>
                  Aydınlatma metni
                </button>
              </span>
            </label>
            <div className="actions">
              <button className="btn btn-gold" disabled={busy || needsToken || !honorConsent || !honorName.trim()} onClick={addHonorName}>
                Adımı ekle
              </button>
              <button className="btn btn-quiet" onClick={onClose}>
                Şimdi değil
              </button>
            </div>
          </div>
        ) : (
          <>
            <p className="lead">
              Bir kahramanımızın ya da şehidimizin adını listeden seçin. Dilerseniz kendi adınızla da katılabilirsiniz.
            </p>

            <label className="field-label" htmlFor="entry-name">
              İsim
            </label>
            <input
              id="entry-name"
              ref={inputRef}
              className="text-input"
              value={query}
              placeholder="Örneğin: Hasan Tahsin"
              autoComplete="off"
              maxLength={80}
              role="combobox"
              aria-expanded={suggestions.length > 0}
              aria-controls="entry-suggestions"
              aria-autocomplete="list"
              aria-activedescendant={active >= 0 ? `sug-${suggestions[active]?.id}` : undefined}
              onChange={(e) => {
                setQuery(e.target.value);
                setHeroId(null);
                setActive(-1);
                setError(null);
                setNotice(null);
              }}
              onKeyDown={onInputKey}
            />

            {suggestions.length > 0 && (
              <ul id="entry-suggestions" className="suggestions" role="listbox" aria-label="Kahramanlarımız ve şehitlerimiz">
                {suggestions.map((h, idx) => {
                  const taken = layout.claimed.has(`h:${h.id}`);
                  return (
                    <li
                      key={h.id}
                      id={`sug-${h.id}`}
                      role="option"
                      aria-selected={idx === active}
                      className="suggestion"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => pick(h)}
                    >
                      <span className="suggestion-name">{h.displayName}</span>
                      <span className="suggestion-meta">
                        {taken ? <span className="taken">Direkte kazılı</span> : categoryLabel(h.category)}
                        <br />
                        {h.event}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}

            {!hero && !form && !hint && words === 1 && suggestions.length === 0 && (
              <p className="helper">Listede bulunmuyorsa ve bu sizin adınızsa, adınızı ve soyadınızı birlikte yazın.</p>
            )}

            {hint && (
              <div className="panel panel-gold">
                <p style={{ marginTop: 0 }}>
                  Ulu Önderimizin adını tam ve ünvanıyla yazmak ister misiniz? Örneğin: <strong>Gazi Mustafa Kemal Atatürk</strong>
                </p>
              </div>
            )}

            {hero && (
              <div className="panel panel-hero">
                <h3>{hero.displayName}</h3>
                <p className="meta">
                  {categoryLabel(hero.category)}, {hero.event}
                </p>
                <p>{hero.description}</p>
                <p className="meta">
                  Kaynak:{' '}
                  {hero.sourceUrl ? (
                    <a href={hero.sourceUrl} target="_blank" rel="noopener noreferrer">
                      {hero.sourceName}
                    </a>
                  ) : (
                    hero.sourceName
                  )}
                </p>
                {heroClaimedAt !== undefined ? (
                  <>
                    <p>
                      <strong>Bu isim direğimizin {meterOf(layout, heroClaimedAt).toLocaleString('tr-TR')}. metresinde kazılı.</strong>
                    </p>
                    <div className="actions">
                      <button
                        className="btn btn-quiet"
                        onClick={() => {
                          onClose();
                          onShowEntry(heroClaimedAt);
                        }}
                      >
                        Direkte göster
                      </button>
                      <button className="btn btn-quiet" disabled={anmaState?.done} onClick={() => remember(`h:${hero.id}`)}>
                        {anmaState?.done ? 'Saygıyla andınız' : 'Saygıyla an'}
                      </button>
                    </div>
                    {anmaState?.count ? (
                      <p className="note">Bu adı şimdiye kadar {anmaState.count.toLocaleString('tr-TR')} kişi saygıyla andı.</p>
                    ) : null}
                  </>
                ) : (
                  <div className="actions">
                    <button className="btn btn-primary" disabled={busy || needsToken} onClick={engraveHero}>
                      Direğe kazı (+2 m)
                    </button>
                  </div>
                )}
              </div>
            )}

            {form && (
              <div className="panel panel-gold">
                <h3>{form.form}</h3>
                <p className="meta">Ulu Önderimizin adı, {form.period}</p>
                {formClaimedAt !== undefined ? (
                  <>
                    <p>{ataturkRepeatMessage(form, form.isFinal ? undefined : meterOf(layout, formClaimedAt))}</p>
                    <div className="actions">
                      <button
                        className="btn btn-quiet"
                        onClick={() => {
                          onClose();
                          onShowEntry(formClaimedAt);
                        }}
                      >
                        Direkte göster
                      </button>
                      <button className="btn btn-quiet" disabled={anmaState?.done} onClick={() => remember(`a:${form.id}`)}>
                        {anmaState?.done ? 'Saygıyla andınız' : 'Saygıyla an'}
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <p>Bu adı direğimize ilk kazıyan siz olabilirsiniz.</p>
                    <div className="actions">
                      <button className="btn btn-gold" disabled={busy || needsToken} onClick={engraveAtaturk}>
                        Direğe kazı
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            {showCitizen && (
              <div className="panel">
                <h3>Kendi adınızla katılın</h3>
                {joined ? (
                  <p>Bu cihazdan adınızla katıldınız. Kahramanlarımızın ve şehitlerimizin adlarını kazımaya devam edebilirsiniz.</p>
                ) : (
                  <>
                    <p>
                      Adınız “{CITIZEN_COLLECTIVE_NAME}” arasında direğe işlenir ve bayrağımızı yarım metre yükseltir. İsimler{' '}
                      {CITIZEN_REVEAL_AT.toLocaleString('tr-TR')}. yurttaşımız katıldığında sayfanın altında topluca açılır.
                    </p>
                    <label className="check">
                      <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
                      <span>
                        Yazdığım ismin kendi adım olduğunu beyan ederim. İsmimin bu sitede herkese açık ve kalıcı olarak gösterileceğini biliyor
                        ve kabul ediyorum.{' '}
                        <button type="button" className="linklike" onClick={onOpenInfo}>
                          Aydınlatma metni
                        </button>
                      </span>
                    </label>
                    <div className="actions">
                      <button className="btn btn-primary" disabled={busy || needsToken || !consent} onClick={joinAsCitizen}>
                        Adımla katıl (+0,5 m)
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </>
        )}

        {notice && (
          <p className="note" role="status">
            {notice}
          </p>
        )}
        {error && (
          <div className="error" role="alert">
            {error}
          </div>
        )}
        {captchaError && (
          <div className="error" role="alert">
            Güvenlik doğrulaması yüklenemedi. Sayfayı yenileyip yeniden deneyin.
          </div>
        )}
        {open && (
          <Turnstile
            ref={turnstile}
            onToken={(t) => {
              setToken(t);
              if (t) setCaptchaError(false);
            }}
            onError={() => setCaptchaError(true)}
          />
        )}
        {open && needsToken && !captchaError && <p className="note">Güvenlik doğrulaması yapılıyor…</p>}
        {busy && <p className="note">Kaydediliyor…</p>}
      </div>
    </dialog>
  );
}
