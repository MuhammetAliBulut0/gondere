'use client';

import { useEffect, useRef } from 'react';
import { CITIZEN_COLLECTIVE_NAME, CITIZEN_REVEAL_AT, CONTACT_EMAIL } from '@/lib/config.ts';

export function InfoDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog ref={ref} className="sheet" aria-labelledby="info-title" onClose={onClose} onCancel={onClose}>
      <div className="sheet-head">
        <h2 id="info-title">Nasıl katılırım?</h2>
        <button className="close-btn" onClick={onClose} aria-label="Kapat">
          ×
        </button>
      </div>
      <div className="sheet-body info-section">
        <p style={{ marginTop: 0 }}>
          Bayrağımız direğin dibinden başlar. Direğe kazınan her isim direği uzatır ve bayrağımızı yukarı taşır.
        </p>
        <table className="rule-table">
          <tbody>
            <tr>
              <td>Bir kahramanımızın ya da şehidimizin adını listeden seçip direğe kazımak. Her isim yalnızca bir kez kazınır.</td>
              <td>+2 m</td>
            </tr>
            <tr>
              <td>
                Kendi adınızla katılmak. Direkte “{CITIZEN_COLLECTIVE_NAME}” olarak yer alırsınız; isimler{' '}
                {CITIZEN_REVEAL_AT.toLocaleString('tr-TR')}. yurttaşımız katıldığında sayfanın altında topluca açılır.
              </td>
              <td>+0,5 m</td>
            </tr>
            <tr>
              <td>Ulu Önderimizin adlarını ünvanlarıyla yazanları özel bir an bekliyor.</td>
              <td>Sürpriz</td>
            </tr>
          </tbody>
        </table>
        <p>Zaten kazınmış bir ismi seçtiğinizde metre eklenmez; o ismi saygıyla anabilirsiniz.</p>

        <h3>Kaynaklar</h3>
        <p>
          Listedeki her isim resmî kurum yayınlarına dayanır ve kaynağı ismin yanında yer alır. Savaştan sonra vefat eden kahramanlarımız
          “kahraman”, şehit düşenler “şehit” olarak anılır. Bir hata görürseniz lütfen bize bildirin.
        </p>

        <h3 id="kvkk">Kişisel verilerin korunması hakkında aydınlatma</h3>
        <ul>
          <li>
            Kendi adınızla katıldığınızda yazdığınız ad ve soyad, bu sitede herkese açık ve kalıcı olarak gösterilmek amacıyla, açık
            rızanıza dayanarak işlenir.
          </li>
          <li>
            Kötüye kullanımı önlemek için IP adresiniz geri döndürülemez biçimde özetlenerek kullanılır. IP adresinizin kendisi saklanmaz.
          </li>
          <li>Başka hiçbir kişisel veri (e-posta, telefon vb.) istenmez. Reklam ya da takip çerezi kullanılmaz.</li>
          <li>Veriler Google Firebase altyapısında saklanır; site Vercel üzerinde çalışır. Güvenlik doğrulaması için Cloudflare Turnstile kullanılır.</li>
          <li>
            6698 sayılı Kişisel Verilerin Korunması Kanunu’nun 11. maddesindeki haklarınızı kullanmak, örneğin adınızın kaldırılmasını
            istemek için:{' '}
            {CONTACT_EMAIL ? <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> : 'iletişim adresimiz yakında burada yer alacak.'}
          </li>
        </ul>

        <h3>Bu site hakkında</h3>
        <p>
          Gönderimiz Göklere, 29 Ekim Cumhuriyet Bayramı için hazırlanmış gönüllü bir öğrenci projesidir. Herhangi bir resmî kurumla
          bağlantısı yoktur.
        </p>
      </div>
    </dialog>
  );
}
