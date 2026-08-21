import { districts } from './content';
import { ServiceComparison } from './components/service-comparison';
import { PublishedContent } from './components/published-content';

export const dynamic = 'force-dynamic';

export default function Home() {
  return (
    <main>
      <section className="hero home-hero">
        <div className="hero-content">
          <p className="eyebrow">ANKARA’NIN MOBİL OTO BAKIM EKİBİ</p>
          <h1>Oto yıkama.<br />Kapınıza kadar gelir.</h1>
          <p className="hero-lead">Aracınız yerinden kıpırdamaz. Profesyonel ekip, ihtiyacı olan bakımı seçtiğiniz saatte adresinize getirir.</p>
          <form className="area-checker" action="/randevu">
            <label htmlFor="district">Hizmet bölgenizde miyiz?</label>
            <div className="area-form">
              <select id="district" name="ilce" defaultValue="" required>
                <option value="" disabled>İlçenizi seçin</option>
                {districts.map((district) => <option key={district}>{district}</option>)}
              </select>
              <button type="submit">Kontrol et</button>
            </div>
          </form>
          <div className="trust-row" aria-label="Hizmet güvenceleri">
            <span>✓ Yerinde profesyonel bakım</span><span>✓ Onaylı randevu</span><span>✓ Yüz yüze ödeme</span>
          </div>
        </div>
      </section>

      <section className="quick-steps" aria-label="Nasıl çalışır">
        <div><strong>01</strong><span><b>Paketi seçin</b>Aracınıza uygun bakımı belirleyin.</span></div>
        <div><strong>02</strong><span><b>Zamanı söyleyin</b>Adres, gün ve saat tercihinizi iletin.</span></div>
        <div><strong>03</strong><span><b>Biz gelelim</b>Onay sonrası ekip adresinize gelsin.</span></div>
      </section>

      <section className="services-section" aria-labelledby="services-heading">
        <div className="section-heading centered">
          <p className="eyebrow dark">İHTİYACINIZA GÖRE</p>
          <h2 id="services-heading">Yıkamanızı seçin</h2>
          <p>Altı paket, tek amaç: aracınız için doğru bakımı kolayca seçebilmek.</p>
        </div>
        <ServiceComparison compact />
        <div className="center-action"><a className="outline-button" href="/hizmetler">Tüm hizmetleri karşılaştır</a></div>
      </section>

      <PublishedContent />

      <section className="quality-section">
        <div className="quality-copy">
          <p className="eyebrow dark">RAHATLIK DETAYLARDA</p>
          <h2>Aracınızın olduğu yerde, kontrollü ve özenli bakım.</h2>
          <p>Randevu talebinden işlem sonuna kadar her adım açık. Sürpriz işlem yok; kapsam dışı bir ihtiyaç görülürse önce sizin onayınız alınır.</p>
          <a className="text-link" href="/sss">Merak ettiklerinizi okuyun →</a>
        </div>
        <div className="quality-grid">
          <article><span>01</span><h3>Doğru ekipman</h3><p>Yüzeye uygun ürün ve profesyonel uygulama.</p></article>
          <article><span>02</span><h3>Net kapsam</h3><p>Her paketin içeriği ve tahmini süresi baştan belli.</p></article>
          <article><span>03</span><h3>Güvenli süreç</h3><p>Randevu onayı, durum bildirimleri ve güvenli yönetim bağlantısı.</p></article>
          <article><span>04</span><h3>Yerinde hizmet</h3><p>İş yeri, site veya uygun özel alanda aracınızın yanında.</p></article>
        </div>
      </section>

      <section className="district-band">
        <div><p className="eyebrow">HİZMET ALANI</p><h2>Ankara’nın aktif ilçelerinde yoldayız.</h2></div>
        <ul>{districts.map((district) => <li key={district}>{district}</li>)}</ul>
      </section>

      <section className="final-cta">
        <p className="eyebrow">SİZ ZAMANINIZI KORUYUN</p>
        <h2>Aracınızın bakımını<br />takviminize uydurun.</h2>
        <p>Paketi ve zamanı seçin. Talebinizi kontrol edip kısa sürede onaylayalım.</p>
        <a className="primary-button" href="/randevu">Randevu talebi oluştur</a>
      </section>
    </main>
  );
}
