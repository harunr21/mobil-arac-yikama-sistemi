'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

const whatsapp = 'https://wa.me/905555555555?text=Merhaba%2C%20mobil%20oto%20y%C4%B1kama%20hakk%C4%B1nda%20bilgi%20almak%20istiyorum.';

export function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [menu, setMenu] = useState({ path: '', open: false });
  const open = menu.path === pathname && menu.open;
  useEffect(() => {
    if (!open) return;
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape') setMenu({ path: pathname, open: false }); };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', close);
    return () => { document.body.style.overflow = ''; window.removeEventListener('keydown', close); };
  }, [open, pathname]);
  useEffect(() => {
    const events = pathname.startsWith('/randevu') && !pathname.startsWith('/randevu/yonet') ? ['page_view', 'booking_start'] : ['page_view'];
    for (const event of events) void fetch('/api/analytics', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ event, route: pathname }), keepalive: true });
  }, [pathname]);
  const trackWhatsApp = () => { const body = JSON.stringify({ event: 'whatsapp_click', route: pathname }); navigator.sendBeacon?.('/api/analytics', new Blob([body], { type: 'application/json' })); };
  if (pathname.startsWith('/admin')) return <>{children}</>;

  return (
    <>
      <a className="skip-link" href="#ana-icerik">Ana içeriğe geç</a>
      <header className="site-header">
        {/* vinext dev hydration is more reliable with a native document link here. */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a className="brand" href="/" aria-label="Ankara Mobil Oto Yıkama ana sayfa">
          <span className="brand-mark" aria-hidden="true">A</span>
          <span><span className="brand-kicker">ANKARA</span><span className="brand-name">Mobil Oto Yıkama</span></span>
        </a>
        <nav className="desktop-nav" aria-label="Ana menü">
          <a href="/hizmetler">Hizmetler &amp; Fiyatlar</a>
          <a href="/sss">Sık Sorulanlar</a>
          <a className="whatsapp-button" href={whatsapp} target="_blank" rel="noreferrer" onClick={trackWhatsApp}>WhatsApp</a>
        </nav>
        <button className={`menu-button ${open ? 'is-open' : ''}`} type="button" aria-label={open ? 'Menüyü kapat' : 'Menüyü aç'} aria-expanded={open} onClick={() => setMenu({ path: pathname, open: !open })}>
          <span /><span /><span />
        </button>
        {open && <button className="mobile-backdrop" type="button" aria-label="Menüyü kapat" onClick={() => setMenu({ path: pathname, open: false })} />}
        <nav className={`mobile-nav ${open ? 'is-open' : ''}`} aria-label="Mobil menü">
          <a href="/hizmetler">Hizmetler &amp; Fiyatlar</a>
          <a href="/sss">Sık Sorulanlar</a>
          <a href="/randevu">Randevu talebi oluştur</a>
          <a className="whatsapp-button" href={whatsapp} target="_blank" rel="noreferrer" onClick={trackWhatsApp}>WhatsApp ile ulaş</a>
        </nav>
      </header>
      <div id="ana-icerik">{children}</div>
      <footer className="site-footer">
        <div className="footer-lead">
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a className="brand brand-light" href="/"><span className="brand-mark" aria-hidden="true">A</span><span><span className="brand-kicker">ANKARA</span><span className="brand-name">Mobil Oto Yıkama</span></span></a>
          <p>Profesyonel araç bakımını seçtiğiniz adrese getiriyoruz.</p>
        </div>
        <div><h2>Keşfedin</h2><a href="/hizmetler">Hizmetler</a><a href="/sss">Sık Sorulanlar</a><a href="/randevu">Randevu</a></div>
        <div><h2>Yasal</h2><a href="/kvkk">KVKK</a><a href="/gizlilik">Gizlilik</a><a href="/kullanim-kosullari">Kullanım Koşulları</a></div>
        <div><h2>İletişim</h2><a href={whatsapp} target="_blank" rel="noreferrer" onClick={trackWhatsApp}>WhatsApp</a><span>Ankara, Türkiye</span><span>Randevulu hizmet</span></div>
        <p className="footer-bottom">© {new Date().getFullYear()} Ankara Mobil Oto Yıkama. Geçici marka ve iletişim bilgileri yayın öncesi güncellenecektir.</p>
      </footer>
      <a className="floating-whatsapp" href={whatsapp} target="_blank" rel="noreferrer" aria-label="WhatsApp üzerinden iletişim kur" onClick={trackWhatsApp}><span aria-hidden="true">●</span> WhatsApp</a>
    </>
  );
}
