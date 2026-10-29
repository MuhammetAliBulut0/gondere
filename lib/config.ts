// İş kuralları (v3). Puanlar santimetre (cm) cinsindendir.

/** Kahraman veya şehit (listeden seçim, her isim yalnızca bir kez): +2 m */
export const HERO_CM = 200;

/** Vatandaş (kendi adıyla katılım): +0,5 m */
export const CITIZEN_CM = 50;

/** Vatandaş isimleri bu sayıya ulaşıldığında "Cumhuriyetin Evlatları" bölümünde topluca açılır */
export const CITIZEN_REVEAL_AT = 1000;

/** Vatandaşların direkteki ortak adı */
export const CITIZEN_COLLECTIVE_NAME = 'Cumhuriyetin Evlatları';

/** Bir veri parçasında (chunk) en fazla kaç kayıt tutulur */
export const CHUNK_SIZE = 500;

/** Ekranda 1 metrenin piksel karşılığı */
export const PX_PER_M = 32;

/** Canlı durum kaç milisaniyede bir yenilenir */
export const POLL_MS = 8000;

/** Direkte ardışık kaç vatandaş tek etiket altında gruplanır */
export const CITIZEN_GROUP_SIZE = 10;

/** Kayıt gönderimi: IP başına pencere ve üst sınır (mobil operatörlerde çok kişi aynı IP'yi paylaşabilir) */
export const ENTRY_RATE = { windowMs: 10 * 60 * 1000, max: 15 };

/** "Saygıyla an" butonu için IP başına sınır */
export const ANMA_RATE = { windowMs: 10 * 60 * 1000, max: 60 };

/** Yükseklik hedefleri (metre). Direğin yanındaki cetvelde ve üst bilgide gösterilir. */
export const MILESTONES: { m: number; label: string }[] = [
  { m: 29, label: '29 Ekim' },
  { m: 103, label: 'Cumhuriyetimizin 103. yılı' },
  { m: 1919, label: '19 Mayıs 1919' },
  { m: 1923, label: '29 Ekim 1923' },
  { m: 5137, label: 'Ağrı Dağı zirvesi' },
  { m: 8849, label: 'Everest zirvesi' },
];

export const SITE = {
  title: 'Gönderimiz Göklere',
  subtitle: 'Cumhuriyetimizin 103. yılında, kahramanlarımızın ve şehitlerimizin isimleriyle.',
  url: 'https://gondere.vercel.app',
};

export const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL || '';
