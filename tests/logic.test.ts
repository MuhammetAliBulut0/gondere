import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createMemoryDb } from '../lib/server/db.ts';
import { submit, getLive, getChunk, listCitizens, AppError } from '../lib/server/logic.ts';
import { validateCitizenName } from '../lib/validate.ts';
import { matchAtaturkForm, looksLikeAtaturk } from '../lib/ataturk.ts';
import { CHUNK_SIZE } from '../lib/config.ts';

const ctx = (ip: string) => ({ ipHash: ip });

test('kahraman +2 m eklenir ve yalnızca bir kez kazınır', async () => {
  const db = createMemoryDb();
  const r1 = await submit(db, { kind: 'hero', refId: 'hasan-tahsin' }, ctx('a'));
  assert.equal(r1.ok && r1.result, 'ADDED');
  const r2 = await submit(db, { kind: 'hero', refId: 'hasan-tahsin' }, ctx('b'));
  assert.ok(r2.ok && r2.result === 'ALREADY');
  if (r2.ok && r2.result === 'ALREADY') assert.equal(r2.entryIndex, 0);
  const live = await getLive(db);
  assert.equal(live.state.totalCm, 200);
  assert.equal(live.state.count, 1);
  assert.equal(live.lastChunk?.entries.length, 1);
});

test('devre dışı kayıtlar kabul edilmez', async () => {
  const db = createMemoryDb();
  await assert.rejects(() => submit(db, { kind: 'hero', refId: 'ulubatli-hasan' }, ctx('a')), (e: AppError) => e.code === 'NOT_FOUND');
});

test('vatandaş +0,5 m, onay şart, aynı bağlantıdan aynı isim tekrar edilemez', async () => {
  const db = createMemoryDb();
  await assert.rejects(() => submit(db, { kind: 'text', text: 'Ahmet Yılmaz' }, ctx('a')), (e: AppError) => e.code === 'CONSENT_REQUIRED');
  const r = await submit(db, { kind: 'text', text: 'ahmet YILMAZ', consent: true }, ctx('a'));
  assert.ok(r.ok && r.result === 'ADDED');
  if (r.ok && r.result === 'ADDED') {
    assert.equal(r.entry.k, 'V');
    assert.equal(r.entry.n, undefined, 'vatandaş adı direk verisinde yer almaz');
    assert.equal(r.state.citizenCount, 1);
    assert.equal(r.state.totalCm, 50);
  }
  await assert.rejects(() => submit(db, { kind: 'text', text: 'Ahmet Yılmaz', consent: true }, ctx('a')), (e: AppError) => e.code === 'DUPLICATE');
  const other = await submit(db, { kind: 'text', text: 'Ahmet Yılmaz', consent: true }, ctx('b'));
  assert.ok(other.ok);
});

test('Atatürk formları: ilk yazana +19 m / +10 m ve onur kaydı; tekrar yazana metre yok', async () => {
  const db = createMemoryDb();
  const m = await submit(db, { kind: 'text', text: '  mirliva mustafa kemal PAŞA ' }, ctx('a'));
  assert.ok(m.ok && m.result === 'ATATURK_FIRST');
  const f = await submit(db, { kind: 'text', text: 'Gazi Mustafa Kemal Atatürk' }, ctx('b'));
  assert.ok(f.ok && f.result === 'ATATURK_FIRST');
  const again = await submit(db, { kind: 'text', text: 'GAZİ MUSTAFA KEMAL ATATÜRK' }, ctx('c'));
  assert.ok(again.ok && again.result === 'ALREADY');
  let live = await getLive(db);
  assert.equal(live.state.totalCm, 2900, '19 + 10 = 29 metre');

  if (f.ok && f.result === 'ATATURK_FIRST') {
    await assert.rejects(
      () => submit(db, { kind: 'honor', formId: 'final', honorToken: 'yanlis', text: 'Ayşe Demir', consent: true }, ctx('b')),
      (e: AppError) => e.code === 'HONOR_INVALID',
    );
    const h = await submit(db, { kind: 'honor', formId: 'final', honorToken: f.honorToken, text: 'Ayşe Demir', consent: true }, ctx('b'));
    assert.ok(h.ok);
    await assert.rejects(
      () => submit(db, { kind: 'honor', formId: 'final', honorToken: f.honorToken, text: 'Fatma Demir', consent: true }, ctx('b')),
      (e: AppError) => e.code === 'HONOR_INVALID',
    );
  }
  live = await getLive(db);
  assert.equal(live.state.honors.length, 0, 'onur listesi 1000. katılımcıya kadar gizli');
  const raw = await db.get<{ honors: { name: string }[] }>('meta/state');
  assert.equal(raw?.honors[0].name, 'Ayşe Demir');
  assert.equal(live.state.totalCm, 2950);
});

test('kısmi Atatürk yazımı yönlendirilir', async () => {
  const db = createMemoryDb();
  await assert.rejects(() => submit(db, { kind: 'text', text: 'Mustafa Kemal Atatürk Bey', consent: true }, ctx('a')), (e: AppError) => e.code === 'ATATURK_HINT');
  assert.equal(looksLikeAtaturk('Mustafa Kemal Yıldız'), false, 'gerçek kişi adı olabilir');
  assert.equal(matchAtaturkForm('9. Ordu Müfettişi Mirliva Mustafa Kemal Paşa')?.id, 'mirliva');
});

test('hız sınırı', async () => {
  const db = createMemoryDb();
  const names = 'Ada Bora Cem Deniz Ece Fuat Gizem Hakan Irmak Kaan Lale Mert Nil Onur Pelin Rüzgar Selin Tuna Umut Yasemin'.split(' ');
  let limited = false;
  for (const first of names) {
    try {
      await submit(db, { kind: 'text', text: `${first} Kaya`, consent: true }, { ipHash: 'x' });
    } catch (e) {
      if ((e as AppError).code === 'RATE_LIMITED') limited = true;
      else throw e;
    }
  }
  assert.ok(limited);
});

test('veri parçaları dolunca mühürlenir', async () => {
  const db = createMemoryDb();
  for (let k = 0; k < CHUNK_SIZE + 2; k++) {
    const syl = ['ba', 'ce', 'di', 'fo', 'gu', 'ha', 'ke', 'li', 'mo', 'nu'];
    const name = `Ali ${syl[Math.floor(k / 100) % 10]}${syl[Math.floor(k / 10) % 10]}${syl[k % 10]}`;
    await submit(db, { kind: 'text', text: name, consent: true }, { ipHash: `ip${k}` });
  }
  const live = await getLive(db);
  assert.equal(live.state.chunkCount, 2);
  assert.equal(live.lastChunk?.index, 1);
  const c0 = await getChunk(db, 0);
  assert.equal(c0.sealed, true);
  assert.equal(c0.entries.length, CHUNK_SIZE);
  const list = await listCitizens(db, null);
  assert.equal(list.locked, true);
});

test('isim doğrulama', () => {
  const ok = ['Ahmet Yılmaz', 'ayşe nur ÖZTÜRK', 'Işık Erim', 'Amine Koç', 'Mustafa Kemal Yıldız', 'Gül Şahin-Demir'];
  for (const n of ok) assert.ok(validateCitizenName(n).ok, n);
  const bad = ['Ahmet', 'Ahmet 123', 'Test Deneme', 'Seyit Onbaşı', 'aaa bbb', 'Recep Tayyip Erdoğan', 'Ali Orospu', 'xqz brt'];
  for (const n of bad) assert.equal(validateCitizenName(n).ok, false, n);
  const v = validateCitizenName('ahmet YILMAZ');
  assert.ok(v.ok && v.display === 'Ahmet Yılmaz');
  const i = validateCitizenName('ismail IŞIK');
  assert.ok(i.ok && i.display === 'İsmail Işık', JSON.stringify(i));
});
