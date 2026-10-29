// Kahramanlarımız ve şehitlerimiz listesi.
//
// KURALLAR
// - Yalnızca resmî kurum yayınlarında (bakanlık, valilik, kaymakamlık, belediye, TBMM, ÇATAB, Atatürk Ansiklopedisi,
//   kamu yayın kuruluşları) adı geçen kayıtlar yer alır. Kaynak her kaydın yanında yazılıdır.
// - Savaştan sonra vefat eden kahramanlarımız "KAHRAMAN" olarak işaretlenir; "şehit" denmez.
// - `enabled: false` olan kayıtlar sitede görünmez. Resmî kaynakla teyit edildikten sonra `true` yapılabilir.
// - Yeni kayıt eklerken `id` benzersiz olmalı ve sonradan değiştirilmemelidir (direkteki kayıt bu kimliğe bağlıdır).
//
// Kaynak: 29 Ekim 2026 tarihli araştırma raporu (Project Knowledge). Yayından önce kaynak bağlantılarının
// tarayıcıda açılıp kontrol edilmesi önerilir.

export type HeroCategory = 'KAHRAMAN' | 'SEHIT' | 'KAHRAMAN_SEHIT';

export interface Hero {
  id: string;
  displayName: string;
  aliases: string[];
  category: HeroCategory;
  /** Olay ve tarih, kısa: "18 Mart 1915, Çanakkale" */
  event: string;
  description: string;
  sourceName: string;
  sourceUrl: string;
  enabled: boolean;
}

const AILE_PDF = 'https://www.aile.gov.tr/media/62673/15-temmuz-sehitleri.pdf';
const EGM_PDF =
  'https://egm.gov.tr/kurumlar/egm.gov.tr/IcSite/belgeyonetimivekoordinasyon/yayimlanan_eserler/173yil_eserleri/EMNIYET-TESKILATININ-15-TEMMUZ-SEHITLERI.pdf';
const GIRESUN = 'https://giresun.gov.tr/15-temmuz-sehitleri';

function temmuz(id: string, displayName: string, aliases: string[] = [], description?: string, src?: [string, string]): Hero {
  return {
    id,
    displayName,
    aliases,
    category: 'SEHIT',
    event: '15 Temmuz 2016',
    description: description ?? "15 Temmuz 2016 gecesi darbe girişimine karşı şehit düştü.",
    sourceName: src ? src[0] : 'T.C. Aile ve Sosyal Hizmetler Bakanlığı, 15 Temmuz Şehitleri',
    sourceUrl: src ? src[1] : AILE_PDF,
    enabled: true,
  };
}

export const HEROES: Hero[] = [
  // ——— Kahramanlarımız (şehit düşmemiş) ———
  {
    id: 'seyit-onbasi',
    displayName: 'Seyit Onbaşı',
    aliases: ['Seyit Ali Çabuk', 'Koca Seyit', 'Havranlı Seyit'],
    category: 'KAHRAMAN',
    event: '18 Mart 1915, Çanakkale',
    description: 'Mecidiye Tabyası’nda top mermisini sırtında taşıyan topçu. 1939’da köyünde vefat etti.',
    sourceName: 'Havran Belediyesi',
    sourceUrl: 'https://www.havran.bel.tr/seyit-onbasi/canakkale-kahramani-koca-seyit/',
    enabled: true,
  },
  {
    id: 'nene-hatun',
    displayName: 'Nene Hatun',
    aliases: ['Nene Hatun Kırkgöz'],
    category: 'KAHRAMAN',
    event: '1877, Aziziye Tabyası',
    description: '93 Harbi’nde Aziziye Tabyası savunmasına katılan kadın kahramanımız. 1955’te Erzurum’da vefat etti.',
    sourceName: 'Diyanet Haber',
    sourceUrl: 'https://www.diyanethaber.com.tr/93-harbinin-cesur-kahramani-nene-hatun',
    enabled: true,
  },
  {
    id: 'kara-fatma',
    displayName: 'Kara Fatma',
    aliases: ['Fatma Seher Erden', 'Üsteğmen Kara Fatma'],
    category: 'KAHRAMAN',
    event: 'Kurtuluş Savaşı',
    description: 'Millî Mücadele’de milis müfrezesine komuta eden kadın kahramanımız. 1955’te İstanbul’da vefat etti.',
    sourceName: 'TRT Haber',
    sourceUrl: 'https://www.trthaber.com/haber/kultur-sanat/milli-mucadelenin-kadin-kahramani-kara-fatma-498105.html',
    enabled: true,
  },
  {
    id: 'bigali-mehmet-cavus',
    displayName: 'Bigalı Mehmet Çavuş',
    aliases: ['Mehmet Çavuş'],
    category: 'KAHRAMAN',
    event: '4 Mart 1915, Seddülbahir',
    description: 'Seddülbahir çıkarmasında yaralanan Çanakkale gazisi. 1964’te vefat etti.',
    sourceName: 'Çanakkale Savaşları Gelibolu Tarihi Alan Başkanlığı',
    sourceUrl:
      'https://canakkaletarihialan.gov.tr/tr/kurumsal/etkinlik-detay2/18-seddulbahir-kahramani-canakkale-gazisi-bigali-mehmet-cavusu-anma-programi',
    enabled: true,
  },

  // ——— Kahraman şehitlerimiz ———
  {
    id: 'hasan-tahsin',
    displayName: 'Hasan Tahsin',
    aliases: ['Osman Nevres', 'İlk Kurşun'],
    category: 'KAHRAMAN_SEHIT',
    event: '15 Mayıs 1919, İzmir',
    description: 'İzmir’in işgalinde ilk kurşunu atan gazeteci. Aynı gün şehit edildi.',
    sourceName: 'TBMM Genel Kurul Tutanağı',
    sourceUrl: 'https://www5.tbmm.gov.tr/develop/owa/genel_kurul.cl_getir?pEid=77718',
    enabled: true,
  },
  {
    id: 'yarbay-huseyin-avni-bey',
    displayName: 'Yarbay Hüseyin Avni Bey',
    aliases: ['Hüseyin Avni Bey', '57. Alay Komutanı Hüseyin Avni Bey'],
    category: 'KAHRAMAN_SEHIT',
    event: '13 Ağustos 1915, Çanakkale',
    description: '57. Alay komutanı. Kesikdere’deki karargâhında şehit düştü.',
    sourceName: 'Çanakkale Savaşları Gelibolu Tarihi Alan Başkanlığı',
    sourceUrl: 'https://www.canakkaletarihialan.gov.tr/tr/ziyaret/sehitlikveanitlar/yarbay-huseyin-avni-bey-sehitligi',
    enabled: true,
  },
  {
    id: 'yahya-cavus',
    displayName: 'Yahya Çavuş',
    aliases: ['Ezineli Yahya Çavuş'],
    category: 'KAHRAMAN_SEHIT',
    event: '1915, Çanakkale',
    description: '26. Alay’dan. 25 Nisan 1915’te Ertuğrul Koyu’nda çıkarmaya karşı direnen bölüğe komuta etti.',
    sourceName: 'Çanakkale Savaşları Gelibolu Tarihi Alan Başkanlığı',
    sourceUrl: 'https://canakkaletarihialan.gov.tr/tr/ziyaret/sehitlikveanitlar/yahya-cavus-sehitligi-ve-aniti',
    enabled: true,
  },
  {
    id: 'yuzbasi-huseyin-husnu',
    displayName: 'Yüzbaşı Hüseyin Hüsnü',
    aliases: ['Hüseyin Hüsnü'],
    category: 'KAHRAMAN_SEHIT',
    event: '25 Nisan 1915, Ertuğrul Koyu',
    description: '26. Alay 10. Bölük komutanı. Ertuğrul Koyu çıkarmasında şehit düştü.',
    sourceName: 'Çanakkale Savaşları Gelibolu Tarihi Alan Başkanlığı',
    sourceUrl: 'https://canakkaletarihialan.gov.tr/tr/ziyaret/sehitlikveanitlar/yahya-cavus-sehitligi-ve-aniti',
    enabled: true,
  },
  {
    id: 'ustegmen-hasan-dardanos',
    displayName: 'Üsteğmen Hasan',
    aliases: ['Hasan Mevsuf', 'Dardanos Bataryası Hasan'],
    category: 'KAHRAMAN_SEHIT',
    event: '18 Mart 1915, Kepez',
    description: 'Dardanos Bataryası komutanı. Teğmen Mevsuf ile birlikte şehit düştü.',
    sourceName: 'T.C. Çanakkale Valiliği',
    sourceUrl: 'http://www.canakkale.gov.tr/vali-orhan-tavli-hasan-mevsuf-sehitliginde-incelemelerde-bulundu',
    enabled: true,
  },
  {
    id: 'tegmen-mevsuf',
    displayName: 'Teğmen Mevsuf',
    aliases: ['Mehmet Mevsuf'],
    category: 'KAHRAMAN_SEHIT',
    event: '18 Mart 1915, Kepez',
    description: 'Dardanos Bataryası’nın gözetleme subayı. Üsteğmen Hasan ile birlikte şehit düştü.',
    sourceName: 'T.C. Çanakkale Valiliği',
    sourceUrl: 'http://www.canakkale.gov.tr/vali-orhan-tavli-hasan-mevsuf-sehitliginde-incelemelerde-bulundu',
    enabled: true,
  },
  {
    id: 'sahin-bey',
    displayName: 'Şahin Bey',
    aliases: ['Mehmet Said', 'Antepli Şahin Bey'],
    category: 'KAHRAMAN_SEHIT',
    event: '28 Mart 1920, Antep',
    description: 'Antep savunmasının sembolü. Elmalı Köprüsü’nde şehit düştü.',
    sourceName: 'T.C. Gaziantep Valiliği',
    sourceUrl: 'https://www.gaziantep.gov.tr/sahinbey',
    enabled: true,
  },
  {
    id: 'serife-baci',
    displayName: 'Şerife Bacı',
    aliases: ['Şehit Şerife Bacı', 'Şerife Kadın'],
    category: 'KAHRAMAN_SEHIT',
    event: 'Aralık 1921, İstiklal Yolu',
    description: 'İnebolu’dan Kastamonu’ya cephane taşırken donarak şehit oldu.',
    sourceName: 'T.C. İnebolu Kaymakamlığı',
    sourceUrl: 'https://inebolu.gov.tr/serife-baci',
    enabled: true,
  },
  {
    id: 'yarbay-nazim-bey',
    displayName: 'Yarbay Nazım Bey',
    aliases: ['Mehmet Nazım Bey', 'Albay Nazım Bey'],
    category: 'KAHRAMAN_SEHIT',
    event: '15 Temmuz 1921, Kütahya-Eskişehir',
    description: '4. Tümen komutanı. Kütahya-Eskişehir Muharebeleri’nde şehit düştü.',
    sourceName: 'Atatürk Ansiklopedisi',
    sourceUrl: 'https://ataturkansiklopedisi.gov.tr/detay/241/%C5%9Eehit-Naz%C4%B1m-Bey-(1887-1921)',
    enabled: true,
  },
  {
    id: 'pilot-yuzbasi-cengiz-topel',
    displayName: 'Pilot Yüzbaşı Cengiz Topel',
    aliases: ['Cengiz Topel'],
    category: 'KAHRAMAN_SEHIT',
    event: '8 Ağustos 1964, Kıbrıs',
    description: 'Erenköy’de görev sırasında düşürülüp esir alındı ve şehit edildi. Cumhuriyet döneminin ilk hava harp şehidi.',
    sourceName: 'Millî Savunma Bakanlığı anma paylaşımı (İlkhaber aracılığıyla)',
    sourceUrl: 'https://www.ilkhaber-gazetesi.com/gundem/msb-cengiz-topel-ve-erenkoy-sehitlerini-andi-311804',
    enabled: true,
  },
  {
    id: 'omer-halisdemir',
    displayName: 'P. Kd. Bçvş. Ömer Halisdemir',
    aliases: ['Ömer Halisdemir'],
    category: 'KAHRAMAN_SEHIT',
    event: '15 Temmuz 2016',
    description: 'Özel Kuvvetler Komutanlığı’nda darbecilerin önünü kesti ve şehit edildi.',
    sourceName: 'Anadolu Ajansı',
    sourceUrl: 'https://www.aa.com.tr/tr/gundem/15-temmuz-kahramani-sehit-omer-halisdemirin-kabrinde-yogunluk-yasandi/3998577',
    enabled: true,
  },

  // ——— 15 Temmuz şehitlerimiz ———
  temmuz('ahmet-oruc-15temmuz', 'Polis Ahmet Oruç', ['Ahmet Oruç'], 'Özel harekât polisi. İkiz kardeşi Mehmet Oruç ile birlikte şehit düştü.', [
    'Emniyet Genel Müdürlüğü, Emniyet Teşkilatının 15 Temmuz Şehitleri',
    EGM_PDF,
  ]),
  temmuz('mehmet-oruc-15temmuz', 'Polis Mehmet Oruç', ['Mehmet Oruç'], 'Özel harekât polisi. İkiz kardeşi Ahmet Oruç ile birlikte şehit düştü.', [
    'Emniyet Genel Müdürlüğü, Emniyet Teşkilatının 15 Temmuz Şehitleri',
    EGM_PDF,
  ]),
  temmuz('bulent-yurtseven', 'Başkomiser Bülent Yurtseven', ['Bülent Yurtseven'], 'Iğdır doğumlu. Özel Harekât Dairesi’nin bombalanmasında şehit düştü.', [
    'Emniyet Genel Müdürlüğü, Emniyet Teşkilatının 15 Temmuz Şehitleri',
    EGM_PDF,
  ]),
  temmuz('cuneyt-bursa', 'Polis Cüneyt Bursa', ['Cüneyt Bursa'], 'Kayseri Pınarbaşı nüfusuna kayıtlı polis şehidimiz.', [
    'Emniyet Genel Müdürlüğü, Emniyet Teşkilatının 15 Temmuz Şehitleri',
    EGM_PDF,
  ]),
  temmuz('edip-zengin', 'Polis Edip Zengin', ['Edip Zengin'], 'Erzurum Şenkaya doğumlu polis şehidimiz.', [
    'Emniyet Genel Müdürlüğü, Emniyet Teşkilatının 15 Temmuz Şehitleri',
    EGM_PDF,
  ]),
  temmuz('eyyup-oguz', 'Polis Eyyüp Oğuz', ['Eyyüp Oğuz', 'Eyüp Oğuz'], 'Elazığ Keban doğumlu polis şehidimiz.', [
    'Emniyet Genel Müdürlüğü, Emniyet Teşkilatının 15 Temmuz Şehitleri',
    EGM_PDF,
  ]),
  temmuz('cengiz-hasbal', 'Cengiz Hasbal', [], 'Giresunlu. 15 Temmuz Şehitler Köprüsü’nde şehit düştü.', ['T.C. Giresun Valiliği', GIRESUN]),
  temmuz('ismail-kefal', 'İsmail Kefal', [], 'Giresunlu. Fatih Sultan Mehmet Köprüsü’nde şehit düştü.', ['T.C. Giresun Valiliği', GIRESUN]),
  temmuz('muharrem-kerem-yildiz', 'Muharrem Kerem Yıldız', [], 'Çamoluklu. 15 Temmuz Şehitler Köprüsü’nde şehit düştü.', ['T.C. Giresun Valiliği', GIRESUN]),
  temmuz('emrah-sagaz', 'Emrah Sağaz', [], 'Çamoluklu. İstanbul Esenler’de şehit düştü.', ['T.C. Giresun Valiliği', GIRESUN]),
  temmuz('mehmet-guder', 'Mehmet Güder', [], 'Tokat Sulusaray Alpudere doğumlu şehidimiz.', ['T.C. Sulusaray Kaymakamlığı', 'https://sulusaray.gov.tr/sehitlerimiz']),
  temmuz('adil-buyukcengiz', 'Adil Büyükcengiz'),
  temmuz('ahmet-kara-15temmuz', 'Ahmet Kara'),
  temmuz('ahmet-kocabay', 'Ahmet Kocabay'),
  temmuz('ahmet-ozsoy', 'Ahmet Özsoy'),
  temmuz('akin-sertcelik', 'Akın Sertçelik'),
  temmuz('battal-ilgun', 'Battal İlgün'),
  temmuz('batuhan-ergin', 'Batuhan Ergin'),
  temmuz('beytullah-yesilay', 'Beytullah Yeşilay'),
  temmuz('birol-yavuz', 'Birol Yavuz'),
  temmuz('burak-canturk', 'Burak Cantürk'),
  temmuz('burhan-oner', 'Burhan Öner'),
  temmuz('emin-guner', 'Emin Güner'),
  temmuz('emrah-sapa', 'Emrah Sapa'),
  temmuz('engin-tilbec', 'Engin Tilbeç'),
  temmuz('erdem-diker', 'Erdem Diker'),
  temmuz('erhan-dural', 'Erhan Dural'),

  // ——— Teyit bekleyenler (sitede görünmez) ———
  {
    id: 'sutcu-imam',
    displayName: 'Sütçü İmam',
    aliases: ['Sütçü İmam Efendi'],
    category: 'KAHRAMAN',
    event: '31 Ekim 1919, Maraş',
    description: 'Maraş’ta işgale karşı ilk kurşunu attı. 1922’de vefat etti.',
    sourceName: 'Resmî kaynak bekleniyor',
    sourceUrl: '',
    enabled: false,
  },
  {
    id: 'astegmen-kubilay',
    displayName: 'Asteğmen Mustafa Fehmi Kubilay',
    aliases: ['Öğretmen Kubilay', 'Kubilay'],
    category: 'KAHRAMAN_SEHIT',
    event: '23 Aralık 1930, Menemen',
    description: 'Öğretmen yedek subay. Menemen’de gerici isyancılar tarafından şehit edildi.',
    sourceName: 'Resmî kaynak bekleniyor',
    sourceUrl: '',
    enabled: false,
  },
  {
    id: 'albay-resat-cigiltepe',
    displayName: 'Albay Reşat Çiğiltepe',
    aliases: ['Miralay Reşat Bey'],
    category: 'KAHRAMAN_SEHIT',
    event: '27 Ağustos 1922, Büyük Taarruz',
    description: '57. Tümen komutanı. Büyük Taarruz’da Çiğiltepe’de hayatını kaybetti.',
    sourceName: 'T.C. Millî Savunma Bakanlığı Atatürk Sitesi',
    sourceUrl: 'https://ata.msb.gov.tr/Sayfa/SayfaGoster/resat-cigiltepe',
    enabled: false, // Proje sahibinin kararı bekleniyor
  },
  {
    id: 'ulubatli-hasan',
    displayName: 'Ulubatlı Hasan',
    aliases: [],
    category: 'KAHRAMAN_SEHIT',
    event: '1453, İstanbul’un Fethi',
    description: 'Fetih sırasında surlara sancak diktiği anlatılan yeniçeri.',
    sourceName: 'Resmî kaynak bekleniyor',
    sourceUrl: '',
    enabled: false,
  },
];

export const ACTIVE_HEROES: Hero[] = HEROES.filter((h) => h.enabled);

export const HERO_BY_ID: Record<string, Hero> = Object.fromEntries(HEROES.map((h) => [h.id, h]));

export function categoryLabel(c: HeroCategory): string {
  switch (c) {
    case 'KAHRAMAN':
      return 'Kahramanımız';
    case 'SEHIT':
      return 'Şehidimiz';
    case 'KAHRAMAN_SEHIT':
      return 'Kahraman şehidimiz';
  }
}
