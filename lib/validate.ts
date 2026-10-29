import { fold, foldCompact, cleanSpaces, toTitleCaseTr } from './normalize.ts';
import { looksLikeAtaturk } from './ataturk.ts';

// Vatandaş isim doğrulaması.
// Gerçek bir ismin gerçekten o kişiye ait olduğu teknik olarak doğrulanamaz; burada yalnızca
// kontrol edilebilenler kontrol edilir: biçim, uygunsuz içerik, unvan/rütbe, tanınmış kişi adları.
// İsimler 1000. katılımcıya kadar gizli tutulduğu için açılmadan önce elle de gözden geçirilebilir.

export type NameCheck =
  | { ok: true; display: string; norm: string }
  | { ok: false; code: 'INVALID_NAME' | 'ATATURK_HINT'; message: string };

const ALLOWED = /^[\p{Script=Latin}' \-]+$/u;
const VOWEL = /[aeiouâîû]/;

/** Ad yerine yazılabilecek anlamsız/deneme kelimeleri (tam eşleşme) */
const JUNK_TOKENS = new Set([
  'test', 'deneme', 'admin', 'asdf', 'qwerty', 'isim', 'soyisim', 'soyad', 'adsoyad', 'anonim', 'bilinmeyen',
  'yok', 'null', 'undefined', 'kullanici', 'user', 'xxx', 'abc', 'falan', 'filan',
]);

/** İsme eklenmemesi gereken unvan ve rütbeler (tam eşleşme) */
const TITLE_TOKENS = new Set([
  'sehit', 'gazi', 'onbasi', 'cavus', 'yuzbasi', 'binbasi', 'yarbay', 'albay', 'pasa', 'mirliva', 'maresal', 'musir',
  'tegmen', 'ustegmen', 'astegmen', 'komiser', 'baskomiser', 'kolagasi', 'general', 'orgeneral', 'korgeneral',
  'tumgeneral', 'tuggeneral', 'bey', 'hanim', 'efendi', 'hazretleri', 'dr', 'prof', 'doc', 'av', 'muh',
]);
// Not: "Gazi" bazı kişilerin gerçek adı olabilir; bu durumda kullanıcıya açık bir mesaj gösterilir.

// Uygunsuz içerik: tam eşleşme (kısa ve başka kelimelerin içinde geçebilecek kökler)
const BAD_EXACT = new Set([
  'am', 'amk', 'aq', 'mk', 'oc', 'sik', 'got', 'pic', 'yarak', 'mal', 'salak', 'aptal', 'it', 'bok', 'dangalak',
  'pust', 'ibne', 'sex', 'seks', 'porno', 'porn', 'fuck', 'shit', 'bitch', 'dick',
  'nazi', 'hitler', 'isis', 'isid', 'deas', 'daes', 'pkk', 'ypg', 'pyd', 'feto', 'dhkpc', 'apo', 'terorist', 'hain',
]);

// Uygunsuz içerik: kelime başında geçen kökler
const BAD_PREFIX = [
  'amk', 'amcik', 'aminakoy', 'sikt', 'sikis', 'sikik', 'siker', 'sikiy', 'yarra', 'orosp', 'orosb', 'pezev', 'kahpe',
  'ibnel', 'gavat', 'kaltak', 'surtuk', 'yavsak', 'serefsiz', 'dalyara', 'tassak', 'tasak', 'gotver', 'gotun', 'gotlek',
  'fahis', 'kerhan', 'gerizekal', 'haysiyetsiz', 'domal', 'fuck', 'motherf', 'pussy',
];

// Uygunsuz içerik: boşluksuz metnin herhangi bir yerinde geçen güçlü kökler.
// Yalnızca gerçek isim birleşimlerinde rastlantıyla oluşamayacak uzun kökler buraya eklenir
// (örneğin "Işık Erim" boşluksuz yazıldığında kısa kökler yanlış alarm verir).
const BAD_ANYWHERE = ['orospu', 'orosbu', 'yarrak', 'pezevenk', 'gotveren', 'fethullahgulen', 'abdullahocalan'];

// Bayrak sitesinde trol amaçlı yazılabilecek tanınmış kişi adları (her görüşten; tam ad eşleşmesi).
// Gerekirse bu liste genişletilebilir veya daraltılabilir.
const PUBLIC_FIGURES = [
  'recep tayyip erdogan', 'tayyip erdogan', 'ozgur ozel', 'kemal kilicdaroglu', 'devlet bahceli', 'ekrem imamoglu',
  'mansur yavas', 'meral aksener', 'ali babacan', 'ahmet davutoglu', 'umit ozdag', 'selahattin demirtas',
  'fatih erbakan', 'muharrem ince', 'temel karamollaoglu', 'musavat dervisoglu', 'tulay hatimogullari',
  'tuncer bakirhan', 'donald trump', 'vladimir putin', 'benjamin netanyahu', 'adolf hitler',
];

export function containsProfanity(text: string): boolean {
  const tokens = fold(text).split(' ').filter(Boolean);
  for (const t of tokens) {
    if (BAD_EXACT.has(t)) return true;
    if (BAD_PREFIX.some((p) => t.startsWith(p))) return true;
  }
  const compact = foldCompact(text);
  return BAD_ANYWHERE.some((w) => compact.includes(w));
}

export function validateCitizenName(raw: string): NameCheck {
  const text = cleanSpaces(raw ?? '');
  const fail = (message: string): NameCheck => ({ ok: false, code: 'INVALID_NAME', message });

  if (!text) return fail('Lütfen adınızı ve soyadınızı yazın.');
  if (text.length > 40) return fail('İsim en fazla 40 karakter olabilir.');
  if (looksLikeAtaturk(text)) {
    return {
      ok: false,
      code: 'ATATURK_HINT',
      message: 'Ulu Önderimizin adını tam ve ünvanıyla yazmak ister misiniz? Örneğin: Gazi Mustafa Kemal Atatürk',
    };
  }
  if (/\d/.test(text)) return fail('İsimde rakam kullanılamaz.');
  if (!ALLOWED.test(text)) return fail('İsimde yalnızca harf, boşluk, kesme işareti ve kısa çizgi kullanılabilir.');

  const words = text.split(' ');
  if (words.length < 2) return fail('Lütfen adınızı ve soyadınızı birlikte yazın.');
  if (words.length > 4) return fail('İsim en fazla dört kelimeden oluşabilir.');

  const folded = fold(text);
  const tokens = folded.split(' ');
  if (tokens.some((t) => t.length < 2)) return fail('Ad ve soyadınızı kısaltma kullanmadan yazın.');
  if (tokens.some((t) => !VOWEL.test(t))) return fail('İsminizi kontrol edip yeniden yazar mısınız?');
  if (/(.)\1\1/.test(folded.replace(/\s/g, ''))) return fail('İsminizi kontrol edip yeniden yazar mısınız?');
  if (new Set(tokens).size === 1) return fail('İsminizi kontrol edip yeniden yazar mısınız?');
  if (tokens.some((t) => JUNK_TOKENS.has(t))) return fail('Lütfen gerçek adınızı ve soyadınızı yazın.');
  if (tokens.some((t) => TITLE_TOKENS.has(t))) {
    return fail('Unvan ya da rütbe eklemeden yalnızca adınızı ve soyadınızı yazın. Kahramanlarımızın adlarını listeden seçebilirsiniz.');
  }
  if (containsProfanity(text)) return fail('Bu isim kabul edilemiyor. Lütfen kendi adınızı ve soyadınızı yazın.');
  if (PUBLIC_FIGURES.includes(folded)) return fail('Lütfen kendi adınızı ve soyadınızı yazın.');

  return { ok: true, display: toTitleCaseTr(text), norm: folded };
}
