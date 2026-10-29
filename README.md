# Gönderimiz Göklere

Cumhuriyetimizin 103. yılında, kahramanlarımızın ve şehitlerimizin isimleriyle bayrağımızı göklere taşıyoruz.

Ziyaretçiler bir kahramanımızın ya da şehidimizin adını listeden seçip direğe kazır, ya da kendi adlarıyla katılır. Direğe kazınan her isim direği uzatır; bayrak her zaman direğin tepesindedir.

## İş kuralları

| Girdi | Yükseklik | Kural |
|---|---|---|
| Kahraman / şehit (listeden seçim) | +2 m | Her isim sistemde yalnızca bir kez kazınır. Sonrakiler "Saygıyla an" ile anar, metre eklenmez. |
| Vatandaş (kendi adı) | +0,5 m | Direkte "Cumhuriyetin Evlatları" olarak görünür. Gerçek isimler 1.000. vatandaşta sayfanın altında topluca açılır. |
| Mirliva Mustafa Kemal Paşa | +19 m | Tek seferlik (19 Mayıs 1919). |
| Gazi Mustafa Kemal Atatürk | +10 m | Tek seferlik. Altın harflerle direğin en tepesinde, bayrağın hemen altında durur. |
| Ulu Önderimizin diğer ünvanlı adları | +1 ile +5 m | Her biri tek seferlik. |

- Ulu Önderimizin adını ilk kazıyandan kendi adı da rica edilir; bu ad "Cumhuriyetin Evlatları" listesinin en başında yer alır.
- Tüm puanlar `lib/config.ts` ve `lib/ataturk.ts` dosyalarındadır. Yükseklik santimetre olarak tutulur.

## Klasör yapısı

```
app/
  page.tsx, layout.tsx, globals.css   Sayfa ve tasarım
  api/live        Canlı durum (CDN'de 5 sn önbellek)
  api/chunk/[n]   Direk verisi parçaları (dolanlar süresiz önbellekte)
  api/entry       İsim kazıma (Turnstile + hız sınırı + doğrulama)
  api/anma        "Saygıyla an" sayacı
  api/citizens    Cumhuriyetin Evlatları listesi (1.000'e kadar kilitli)
components/       Sahne, bayrak, diyaloglar
lib/
  heroes.ts       Kahraman ve şehit listesi (kaynaklı)
  ataturk.ts      Ulu Önderimizin ad ve ünvan formları
  validate.ts     Vatandaş adı doğrulaması ve uygunsuz içerik filtresi
  config.ts       İş kuralları ve sabitler
  server/         Veritabanı, iş mantığı, güvenlik
tests/            İş mantığı testleri (npm test)
```

## Ortam değişkenleri (Vercel → Settings → Environment Variables)

| Değişken | Açıklama |
|---|---|
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Cloudflare Turnstile site anahtarı (herkese açık) |
| `FIREBASE_PROJECT_ID` | Servis hesabı JSON'undaki `project_id` |
| `FIREBASE_CLIENT_EMAIL` | Servis hesabı JSON'undaki `client_email` |
| `FIREBASE_PRIVATE_KEY` | Servis hesabı JSON'undaki `private_key` (olduğu gibi) |
| `TURNSTILE_SECRET_KEY` | Cloudflare Turnstile gizli anahtarı |
| `IP_HASH_SALT` | En az 32 karakterlik rastgele metin |
| `NEXT_PUBLIC_CONTACT_EMAIL` | İsteğe bağlı. Aydınlatma metnindeki iletişim adresi |

`NEXT_PUBLIC_FIREBASE_*` değişkenleri kullanılmaz; tarayıcı veritabanına doğrudan bağlanmaz, tüm okuma ve yazmalar sunucudan yapılır.

Değişkenler eksikse canlı sitede API "bakımda" yanıtı verir (güvenli tarafta kalır).

## Firestore

- Veritabanı **production mode** kurallarıyla açılmalıdır (`firestore.rules`): tarayıcıdan erişim tamamen kapalıdır, sunucu Admin SDK ile erişir.
- İndeks gerekmez.
- Ücretsiz Spark planının günlük okuma/yazma kotaları vardır. Her isim kazıma 4–5 yazma işlemidir. Yoğunluk beklenirse Blaze (kullandıkça öde) planına geçilmelidir.

## Kahraman listesini güncellemek

`lib/heroes.ts` dosyasında her kayıt bir kaynakla birlikte tutulur.

- Yeni isim eklerken `id` benzersiz olmalı ve sonradan değiştirilmemelidir.
- `enabled: false` olan kayıtlar sitede görünmez. Resmî kaynakla teyit edildikten sonra `true` yapılabilir.
- Savaştan sonra vefat eden kahramanlarımız `KAHRAMAN`, şehit düşenler `SEHIT` / `KAHRAMAN_SEHIT` olarak işaretlenir.

## Yerelde çalıştırma

```bash
npm install
npm run dev      # Ortam değişkeni yoksa bellek içi deneme veritabanı kullanılır
npm test         # İş mantığı testleri
npm run build
```

## Not

Bu site gönüllü bir öğrenci projesidir; herhangi bir resmî kurumla bağlantısı yoktur.
