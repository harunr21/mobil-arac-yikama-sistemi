import type { Metadata } from 'next';
import { faqs } from '../content';

export const metadata: Metadata = {
  title: 'Sık Sorulan Sorular | Ankara Mobil Oto Yıkama',
  description: 'Mobil oto yıkama randevusu, ödeme, hizmet bölgeleri ve değişiklik koşulları hakkında yanıtlar.',
};

export default function FaqPage() {
  return (
    <main>
      <section className="faq-hero"><p className="eyebrow">SIK SORULAN SORULAR</p><h1>Merak ettiğiniz<br />her şey burada.</h1><p>Yanıtı bulamazsanız WhatsApp üzerinden ekibimize ulaşabilirsiniz.</p></section>
      <section className="faq-list" aria-label="Sık sorulan sorular">
        {faqs.map(([question, answer], index) => (
          <article key={question}>
            <span>{String(index + 1).padStart(2, '0')}</span><div><h2>{question}</h2><p>{answer}</p></div>
          </article>
        ))}
      </section>
      <section className="faq-contact"><h2>Başka bir sorunuz mu var?</h2><p>Mesajınızı bırakın, uygun olduğumuzda size dönüş yapalım.</p><a className="primary-button" href="https://wa.me/905555555555" target="_blank" rel="noreferrer">WhatsApp ile sorun</a></section>
    </main>
  );
}
