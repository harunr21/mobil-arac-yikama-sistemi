'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { districts, extras, services } from '../content';

type BookingData = {
  serviceSlug: string; extraSlugs: string[]; district: string; address: string; date: string; time: string;
  placeId: string; vehicleMake: string; vehicleModel: string; plate: string; customerName: string; phone: string; email: string; notes: string;
};

const empty: BookingData = { serviceSlug: '', extraSlugs: [], district: '', address: '', placeId: '', date: '', time: '', vehicleMake: '', vehicleModel: '', plate: '', customerName: '', phone: '', email: '', notes: '' };
const labels = ['Hizmet', 'Ekstralar', 'Bilgiler', 'Özet'];

export function BookingWizard() {
  const searchParams = useSearchParams();
  const initialService = searchParams.get('hizmet');
  const initialDistrict = searchParams.get('ilce');
  const [step, setStep] = useState(0);
  const [data, setData] = useState<BookingData>(() => ({ ...empty, serviceSlug: services.some((item) => item.slug === initialService) ? initialService! : '', district: districts.includes(initialDistrict || '') ? initialDistrict! : '' }));
  const [slots, setSlots] = useState<{time:string;label?:string;available?:boolean}[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const [consent, setConsent] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState('');
  const [turnstileRequired, setTurnstileRequired] = useState(false);
  const [success, setSuccess] = useState<{ reference: string; manageUrl: string; whatsappUrl: string } | null>(null);
  const idempotencyKey = useRef('');
  const selected = services.find((service) => service.slug === data.serviceSlug);

  useEffect(() => {
    if (!data.serviceSlug || !data.date) return;
    fetch(`/api/availability?service=${encodeURIComponent(data.serviceSlug)}&date=${encodeURIComponent(data.date)}&extras=${encodeURIComponent(data.extraSlugs.join(','))}`)
      .then(async (response) => response.ok ? await response.json() as { slots?: {time:string;label?:string;available?:boolean}[] } : Promise.reject())
      .then((payload) => setSlots(payload.slots || []))
      .catch(() => setSlots([{time:'09:00'},{time:'10:30'},{time:'12:00'},{time:'13:30'},{time:'15:00'},{time:'16:30'}]))
      .finally(() => setLoadingSlots(false));
  }, [data.serviceSlug, data.date, data.extraSlugs]);

  const canContinue = useMemo(() => {
    if (step === 0) return Boolean(data.serviceSlug);
    if (step === 1) return true;
    if (step === 2) return Boolean(data.district && data.address && data.date && data.time && data.vehicleMake && data.customerName && data.phone && data.email);
    return consent && (!turnstileRequired || Boolean(turnstileToken));
  }, [consent, data, step, turnstileRequired, turnstileToken]);

  const next = () => { if (canContinue) { setError(''); setStep(Math.min(3, step + 1)); } else setError('Devam etmek için zorunlu alanları tamamlayın.'); };
  const toggleExtra = (slug: string) => setData((current) => ({ ...current, extraSlugs: current.extraSlugs.includes(slug) ? current.extraSlugs.filter((item) => item !== slug) : [...current.extraSlugs, slug], time: '' }));

  async function submit() {
    setSending(true); setError('');
    try {
      if (!idempotencyKey.current) idempotencyKey.current = crypto.randomUUID();
      const response = await fetch('/api/bookings', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...data, turnstileToken: turnstileToken || undefined, idempotencyKey: idempotencyKey.current }) });
      const payload = await response.json() as { reference: string; manageUrl: string; whatsappUrl: string; error?: string };
      if (!response.ok) throw new Error(payload.error || 'Randevu talebi oluşturulamadı.');
      setSuccess(payload);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Bir hata oluştu. Lütfen tekrar deneyin.'); }
    finally { setSending(false); }
  }

  if (success) return (
    <div className="booking-success">
      <span className="success-check" aria-hidden="true">✓</span>
      <p className="eyebrow dark">TALEBİNİZ ALINDI</p><h2>Şimdi biz kontrol ediyoruz.</h2>
      <p><strong>{success.reference}</strong> referanslı talebiniz onay bekliyor. Onaylanana kadar randevunuz kesinleşmiş sayılmaz.</p>
      <div><a className="primary-button" href={success.manageUrl}>Randevuyu yönet</a><a className="outline-button" href={success.whatsappUrl} target="_blank" rel="noreferrer">WhatsApp’ta paylaş</a></div>
    </div>
  );

  return (
    <div className="booking-shell">
      <aside className="booking-aside">
        <p className="eyebrow">RANDEVU TALEBİ</p><h1>Aracınız için zamanı siz seçin.</h1>
        <ol>{labels.map((label, index) => <li key={label} className={index === step ? 'active' : index < step ? 'done' : ''}><span>{index < step ? '✓' : index + 1}</span>{label}</li>)}</ol>
        <p className="booking-note">Ödeme hizmet sonunda yüz yüze yapılır. Kart bilgisi istemiyoruz.</p>
      </aside>
      <section className="booking-panel">
        <header><span>Adım {step + 1} / 4</span><strong>{labels[step]}</strong></header>
        {step === 0 && <div className="wizard-section"><h2>Hangi bakımı istiyorsunuz?</h2><p>Aracınızın bugünkü ihtiyacına en yakın paketi seçin.</p><div className="choice-grid">{services.map((service) => <button type="button" key={service.slug} className={data.serviceSlug === service.slug ? 'selected' : ''} onClick={() => setData({...data, serviceSlug:service.slug, time:''})}><span className={`choice-tone tone-${service.accent}`} /><b>{service.name}</b><small>{service.short}</small><em>{service.duration}</em></button>)}</div></div>}
        {step === 1 && <div className="wizard-section"><h2>Ek bir dokunuş ister misiniz?</h2><p>Bu adım isteğe bağlı. Dilerseniz doğrudan devam edin.</p><div className="extra-choice-grid">{extras.map((extra) => <label key={extra.slug} className={data.extraSlugs.includes(extra.slug) ? 'selected' : ''}><input type="checkbox" checked={data.extraSlugs.includes(extra.slug)} onChange={() => toggleExtra(extra.slug)} /><span><b>{extra.name}</b><small>{extra.copy}</small></span><em>{extra.duration}</em></label>)}</div></div>}
        {step === 2 && <div className="wizard-section"><h2>Nerede ve ne zaman?</h2><p>İlçe ve saat seçimi sunucuda aktif kapasiteye göre doğrulanır.</p><div className="form-grid">
          <label>İlçe *<select value={data.district} onChange={(e) => setData({...data,district:e.target.value})} required><option value="">Seçin</option>{districts.map((district) => <option key={district}>{district}</option>)}</select></label>
          <label className="wide">Açık adres *<AddressAutocomplete value={data.address} onChange={(address, placeId) => setData({...data,address,placeId})} /></label>
          <label>Tarih *<input type="date" min={new Date().toISOString().slice(0,10)} value={data.date} onChange={(e) => { setLoadingSlots(true); setSlots([]); setData({...data,date:e.target.value,time:''}); }} required /></label>
          <fieldset className="wide slot-field"><legend>Saat *</legend>{loadingSlots ? <p>Saatler kontrol ediliyor…</p> : data.date ? <div className="slot-grid">{slots.map((slot) => <button type="button" disabled={slot.available === false} className={data.time === slot.time ? 'selected' : ''} onClick={() => setData({...data,time:slot.time})} key={slot.time}>{slot.label || slot.time}</button>)}</div> : <p>Önce bir tarih seçin.</p>}</fieldset>
          <label>Marka *<input value={data.vehicleMake} onChange={(e) => setData({...data,vehicleMake:e.target.value})} placeholder="Örn. Renault" required /></label>
          <label>Model<input value={data.vehicleModel} onChange={(e) => setData({...data,vehicleModel:e.target.value})} placeholder="Örn. Clio" /></label>
          <label>Plaka<input value={data.plate} onChange={(e) => setData({...data,plate:e.target.value.toLocaleUpperCase('tr-TR')})} placeholder="06 ABC 123" /></label>
          <label>Ad soyad *<input autoComplete="name" value={data.customerName} onChange={(e) => setData({...data,customerName:e.target.value})} required /></label>
          <label>Telefon *<input type="tel" autoComplete="tel" value={data.phone} onChange={(e) => setData({...data,phone:e.target.value})} placeholder="05xx xxx xx xx" required /></label>
          <label>E-posta *<input type="email" autoComplete="email" value={data.email} onChange={(e) => setData({...data,email:e.target.value})} required /></label>
          <label className="wide">Notunuz<textarea value={data.notes} onChange={(e) => setData({...data,notes:e.target.value})} placeholder="Site girişi, araç durumu veya özel bir isteğiniz…" /></label>
        </div></div>}
        {step === 3 && <div className="wizard-section review-step"><h2>Son bir kontrol.</h2><p>Talep gönderildiğinde ekibimiz uygunluğu kontrol edip size dönüş yapar.</p><dl><div><dt>Hizmet</dt><dd>{selected?.name}</dd></div><div><dt>Ekstralar</dt><dd>{data.extraSlugs.length ? data.extraSlugs.map((slug) => extras.find((extra) => extra.slug === slug)?.name).join(', ') : 'Ekstra yok'}</dd></div><div><dt>Zaman</dt><dd>{data.date} · {data.time}</dd></div><div><dt>Adres</dt><dd>{data.district}, {data.address}</dd></div><div><dt>Araç</dt><dd>{[data.vehicleMake,data.vehicleModel,data.plate].filter(Boolean).join(' · ')}</dd></div><div><dt>İletişim</dt><dd>{data.customerName}<br />{data.phone}<br />{data.email}</dd></div></dl><label className="consent"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} required /><span>KVKK aydınlatma metnini okudum; randevu talebimin işlenmesini kabul ediyorum.</span></label><TurnstileWidget onRequired={setTurnstileRequired} onToken={setTurnstileToken} /></div>}
        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="wizard-actions">{step > 0 && <button type="button" className="back-button" onClick={() => setStep(step - 1)}>← Geri</button>}<button type="button" className="primary-button" disabled={!canContinue || sending} onClick={step === 3 ? submit : next}>{sending ? 'Gönderiliyor…' : step === 3 ? 'Talebi gönder' : 'Devam et →'}</button></div>
      </section>
      <div className="booking-mobile-summary"><span><small>Seçiminiz</small><b>{selected?.name || 'Henüz paket seçilmedi'}</b></span><button type="button" onClick={step === 3 ? submit : next} disabled={!canContinue || sending}>{step === 3 ? 'Talebi gönder' : 'Devam et'}</button></div>
    </div>
  );
}

function AddressAutocomplete({ value, onChange }: { value: string; onChange: (value: string, placeId: string) => void }) {
  const [suggestions, setSuggestions] = useState<Array<{ id: string; text: string }>>([]);
  const session = useRef('');
  useEffect(() => {
    if (value.trim().length < 3) return;
    const timer = window.setTimeout(async () => {
      if (!session.current) session.current = crypto.randomUUID();
      try {
        const response = await fetch(`/api/places?input=${encodeURIComponent(value)}&session=${encodeURIComponent(session.current)}`);
        const result = await response.json() as { suggestions?: Array<{ id: string; text: string }> };
        if (response.ok) setSuggestions(result.suggestions || []);
      } catch { /* Manual address entry remains available when Places is unavailable. */ }
    }, 280);
    return () => window.clearTimeout(timer);
  }, [value]);
  return <span className="address-autocomplete"><input role="combobox" autoComplete="street-address" value={value} onChange={(event) => { setSuggestions([]); onChange(event.target.value, ''); }} placeholder="Mahalle, cadde, bina ve uygun alan bilgisi" required aria-autocomplete="list" aria-controls="address-options" aria-expanded={suggestions.length > 0} />{suggestions.length > 0 && <span id="address-options" className="address-suggestions" role="listbox">{suggestions.map((suggestion) => <button type="button" role="option" aria-selected="false" key={suggestion.id} onClick={() => { onChange(suggestion.text, suggestion.id); setSuggestions([]); }}>{suggestion.text}</button>)}<small>Google tarafından sağlanan adres önerileri</small></span>}</span>;
}

function TurnstileWidget({ onRequired, onToken }: { onRequired: (required: boolean) => void; onToken: (token: string) => void }) {
  const container = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let active = true;
    fetch('/api/public-config').then(async (response) => await response.json() as { turnstile?: { siteKey: string } | null }).then((config) => {
      if (!active || !config.turnstile?.siteKey) return;
      onRequired(true);
      const render = () => {
        const turnstile = (window as unknown as { turnstile?: { render: (node: HTMLElement, options: Record<string, unknown>) => string } }).turnstile;
        if (container.current && turnstile) turnstile.render(container.current, { sitekey: config.turnstile.siteKey, callback: onToken, 'expired-callback': () => onToken(''), theme: 'light' });
      };
      const existing = document.querySelector<HTMLScriptElement>('script[data-turnstile-script]');
      if (existing) { if ((window as unknown as { turnstile?: unknown }).turnstile) render(); else existing.addEventListener('load', render, { once: true }); return; }
      const script = document.createElement('script'); script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'; script.async = true; script.defer = true; script.dataset.turnstileScript = 'true'; script.addEventListener('load', render, { once: true }); document.head.appendChild(script);
    }).catch(() => undefined);
    return () => { active = false; };
  }, [onRequired, onToken]);
  return <div className="turnstile-slot" ref={container} />;
}
