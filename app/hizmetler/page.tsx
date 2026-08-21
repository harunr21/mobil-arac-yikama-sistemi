import type { Metadata } from 'next';
import { districts, extras } from '../content';
import { ServiceComparison } from '../components/service-comparison';

export const metadata: Metadata = {
  title: 'Hizmetler ve Fiyatlar | Ankara Mobil Oto Yıkama',
  description: 'Mobil oto yıkama paketlerini, sürelerini, içeriklerini ve ek hizmetleri karşılaştırın.',
};

export default function ServicesPage() {
  return (
    <main>
      <section className="page-hero services-hero">
        <div>
          <p className="eyebrow">HİZMETLER &amp; FİYATLAR</p>
          <h1>Her araç için<br />doğru bakım.</h1>
          <p>Günlük tazelemeden kapsamlı detay temizliğine kadar ihtiyacınıza uygun paketi seçin.</p>
        </div>
        <div className="services-collage" aria-label="Mobil araç bakım hizmeti görseli">
          <span className="collage-main" /><span className="collage-detail one" /><span className="collage-detail two" />
        </div>
      </section>

      <section className="service-area-form">
        <div><p className="eyebrow dark">ADRESİNİZDE MİYİZ?</p><h2>Önce hizmet bölgenizi kontrol edin.</h2></div>
        <form className="inline-area-checker" action="/randevu">
          <select name="ilce" defaultValue="" required aria-label="Hizmet ilçesi"><option value="" disabled>İlçenizi seçin</option>{districts.map((district) => <option key={district}>{district}</option>)}</select>
          <button type="submit">Bölgemi kontrol et</button>
        </form>
      </section>

      <section className="comparison-section">
        <div className="section-heading">
          <p className="eyebrow dark">PAKETLERİ KARŞILAŞTIRIN</p>
          <h2>İhtiyacınız kadar bakım.</h2>
          <p>Gösterilen fiyatlar panelden yayınlanana kadar “Fiyat yakında” olarak kalır. Talep sonrasında kapsam ve ücret birlikte onaylanır.</p>
        </div>
        <ServiceComparison />
      </section>

      <section className="extras-section">
        <div className="section-heading">
          <p className="eyebrow dark">BİRAZ DAHA FAZLASI</p>
          <h2>Bakımı özelleştirin.</h2>
          <p>Seçtiğiniz pakete, aracınızın o günkü ihtiyacına göre ek uygulamalar katın.</p>
        </div>
        <div className="extras-grid">
          {extras.map((extra, index) => (
            <article key={extra.slug}><span>0{index + 1}</span><h3>{extra.name}</h3><p>{extra.copy}</p><strong>{extra.duration}</strong></article>
          ))}
        </div>
      </section>

      <section className="slim-cta"><div><p className="eyebrow">KARARINIZ HAZIR MI?</p><h2>Bakımı adresinize getirelim.</h2></div><a className="primary-button" href="/randevu">Randevuya başla</a></section>
    </main>
  );
}
