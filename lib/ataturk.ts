import { fold } from './normalize.ts';

// Ulu Önderimizin isim ve ünvan formları.
// Her form sistemde yalnızca bir kez kazınır; ilk yazana özel, tekrar yazanlara ayrı bir metin gösterilir.
// İki ana form: 19 Mayıs 1919'daki "Mirliva Mustafa Kemal Paşa" (+19 m) ve son ünvanlı adı
// "Gazi Mustafa Kemal Atatürk" (+10 m). İkisi birlikte bayrağımızı 29 metre yükseltir.
// Diğer formlar en fazla +5 m kazandırır.
//
// Kronoloji kaynakları: MSB Atatürk Sitesi, TDV İslâm Ansiklopedisi, MSÜ Kara Harp Okulu, T.C. Samsun Valiliği,
// TBMM, 2587 sayılı Kanun (ayrıntılar araştırma raporunda).

export interface AtaturkForm {
  id: string;
  form: string;
  /** Kabul edilen diğer yazımlar (fold edilmiş hâlleriyle karşılaştırılır) */
  aliases: string[];
  cm: number;
  period: string;
  /** İlk yazana gösterilen bağlam cümlesi */
  context: string;
  isFinal?: boolean;
  isMirliva?: boolean;
}

export const ATATURK_FORMS: AtaturkForm[] = [
  {
    id: 'mustafa-kemal',
    form: 'Mustafa Kemal',
    aliases: [],
    cm: 100,
    period: '1893',
    context: '“Kemal” adını, Selanik Askerî Rüştiyesi’ndeki matematik öğretmeni Yüzbaşı Mustafa Sabri Bey verdi.',
  },
  {
    id: 'tegmen',
    form: 'Teğmen Mustafa Kemal',
    aliases: [],
    cm: 100,
    period: '1902',
    context: '1902’de Harbiye’den teğmen olarak mezun oldu.',
  },
  {
    id: 'ustegmen',
    form: 'Üsteğmen Mustafa Kemal',
    aliases: [],
    cm: 100,
    period: '1903',
    context: '1903’te üsteğmenliğe yükseldi.',
  },
  {
    id: 'kurmay-yuzbasi',
    form: 'Kurmay Yüzbaşı Mustafa Kemal',
    aliases: ['Yüzbaşı Mustafa Kemal'],
    cm: 200,
    period: '1905',
    context: 'Harp Akademisi’ni kurmay yüzbaşı olarak bitirdi.',
  },
  {
    id: 'kolagasi',
    form: 'Kolağası Mustafa Kemal',
    aliases: [],
    cm: 200,
    period: '1907',
    context: '1907’de kolağası, yani kıdemli yüzbaşı oldu.',
  },
  {
    id: 'binbasi',
    form: 'Binbaşı Mustafa Kemal',
    aliases: [],
    cm: 200,
    period: '1911',
    context: '1911’de Trablusgarp’ta binbaşılığa yükseldi.',
  },
  {
    id: 'yarbay',
    form: 'Yarbay Mustafa Kemal',
    aliases: ['Kurmay Yarbay Mustafa Kemal'],
    cm: 300,
    period: '1914',
    context: '1914’te kurmay yarbay oldu.',
  },
  {
    id: 'albay',
    form: 'Albay Mustafa Kemal',
    aliases: ['Kurmay Albay Mustafa Kemal', 'Anafartalar Komutanı Mustafa Kemal'],
    cm: 400,
    period: '1915',
    context: 'Çanakkale’deki başarılarıyla albaylığa yükseldi; Anafartalar’ın komutanıydı.',
  },
  {
    id: 'mirliva',
    form: 'Mirliva Mustafa Kemal Paşa',
    aliases: [
      'Dokuzuncu Ordu Müfettişi Mirliva Mustafa Kemal Paşa',
      '9. Ordu Müfettişi Mirliva Mustafa Kemal Paşa',
      'Dokuzuncu Ordu Kıtaatı Müfettişi Mirliva Mustafa Kemal Paşa',
      '9. Ordu Kıtaatı Müfettişi Mirliva Mustafa Kemal Paşa',
    ],
    cm: 1900,
    period: '19 Mayıs 1919',
    context:
      '19 Mayıs 1919’da Dokuzuncu Ordu Müfettişi Mirliva Mustafa Kemal Paşa olarak Samsun’a çıktı ve Millî Mücadele’yi başlattı.',
    isMirliva: true,
  },
  {
    id: 'pasa',
    form: 'Mustafa Kemal Paşa',
    aliases: [],
    cm: 300,
    period: '1919–1921',
    context: 'Askerlikten istifa ederek Millî Mücadele’yi Heyet-i Temsiliye’nin ve TBMM’nin başında sürdürdü.',
  },
  {
    id: 'baskomutan',
    form: 'Başkomutan Mustafa Kemal Paşa',
    aliases: ['Başkumandan Mustafa Kemal Paşa'],
    cm: 400,
    period: '1921',
    context: '5 Ağustos 1921’de TBMM kararıyla Başkomutan oldu.',
  },
  {
    id: 'gazi-pasa',
    form: 'Gazi Mustafa Kemal Paşa',
    aliases: ['Müşir Gazi Mustafa Kemal Paşa', 'Mareşal Gazi Mustafa Kemal Paşa'],
    cm: 500,
    period: '19 Eylül 1921',
    context: 'Sakarya Zaferi’nin ardından TBMM ona Gazi unvanını ve Müşir rütbesini verdi.',
  },
  {
    id: 'kemal-ataturk',
    form: 'Kemal Atatürk',
    aliases: [],
    cm: 500,
    period: '24 Kasım 1934',
    context: 'TBMM, 2587 sayılı Kanun’la ona Atatürk soyadını verdi.',
  },
  {
    id: 'mustafa-kemal-ataturk',
    form: 'Mustafa Kemal Atatürk',
    aliases: [],
    cm: 500,
    period: '1934–1938',
    context: 'Milletimizin gönlünde Mustafa Kemal Atatürk adıyla yaşıyor.',
  },
  {
    id: 'final',
    form: 'Gazi Mustafa Kemal Atatürk',
    aliases: [],
    cm: 1000,
    period: '10 Kasım 1938',
    context: 'Cumhuriyetimizin kurucusu, Ulu Önderimiz. Adı artık direğimizin en tepesinde, bayrağımızın hemen altında.',
    isFinal: true,
  },
];

export const FORM_BY_ID: Record<string, AtaturkForm> = Object.fromEntries(ATATURK_FORMS.map((f) => [f.id, f]));

const FOLDED_TO_FORM = new Map<string, AtaturkForm>();
for (const f of ATATURK_FORMS) {
  for (const variant of [f.form, ...f.aliases]) {
    FOLDED_TO_FORM.set(fold(variant), f);
  }
}

/** Yazılan metin Ulu Önderimizin formlarından biriyle birebir eşleşiyor mu? */
export function matchAtaturkForm(text: string): AtaturkForm | null {
  return FOLDED_TO_FORM.get(fold(text)) ?? null;
}

const TITLE_TOKENS = ['gazi', 'mirliva', 'maresal', 'musir', 'baskomutan', 'baskumandan', 'pasa'];

/**
 * Tam eşleşme yoksa: metin Ulu Önderimizin adına benziyor mu?
 * ("Atatürk" soyadı 2622 sayılı Kanun gereği yalnızca O'na aittir; içeren her yazım yönlendirilir.)
 */
export function looksLikeAtaturk(text: string): boolean {
  const f = fold(text);
  if (!f) return false;
  if (f.includes('ataturk')) return true;
  if (f.includes('mustafa kemal')) {
    const tokens = f.split(' ');
    return tokens.some((t) => TITLE_TOKENS.includes(t));
  }
  return false;
}

export function ataturkFirstMessage(form: AtaturkForm): string {
  const meters = (form.cm / 100).toLocaleString('tr-TR');
  return `Ulu Önderimizin bu adını direğimize ilk siz kazıdınız. ${form.context} Bayrağımız ${meters} metre yükseldi.`;
}

export function ataturkRepeatMessage(form: AtaturkForm, meterPosition?: number): string {
  const where =
    meterPosition !== undefined && !form.isFinal
      ? ` Direğimizin ${meterPosition.toLocaleString('tr-TR')}. metresinde kazılı.`
      : form.isFinal
        ? ' Direğimizin en tepesinde, bayrağımızın hemen altında duruyor.'
        : '';
  return `“${form.form}” adı direğimize zaten kazındı.${where} Ulu Önderimizin adı yalnızca bu direkte değil, kurduğu Cumhuriyette ve milletimizin gönlünde yaşıyor.`;
}

export const ATATURK_29_MESSAGE =
  'Ulu Önderimizin 19 Mayıs 1919’daki adı ile son ünvanlı adı birlikte bayrağımızı 29 metre yükseltti: 29 Ekim’e saygıyla.';
