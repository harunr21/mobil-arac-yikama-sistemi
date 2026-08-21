'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import type {
  AdminBooking,
  AdminSnapshot,
  BookingStatus,
} from './types';
import styles from './admin.module.css';

type Tab = 'randevular' | 'hizmetler' | 'takvim' | 'bolgeler' | 'galeri' | 'yorumlar' | 'ayarlar';

const tabs: Array<{ id: Tab; label: string; glyph: string }> = [
  { id: 'randevular', label: 'Randevular', glyph: '▦' },
  { id: 'hizmetler', label: 'Hizmetler', glyph: '◇' },
  { id: 'takvim', label: 'Çalışma planı', glyph: '□' },
  { id: 'bolgeler', label: 'İlçeler', glyph: '⌖' },
  { id: 'galeri', label: 'Galeri', glyph: '▣' },
  { id: 'yorumlar', label: 'Yorumlar', glyph: '“' },
  { id: 'ayarlar', label: 'İşletme ayarları', glyph: '⚙' },
];

const emptySnapshot: AdminSnapshot = {
  bookings: [], services: [], extras: [], areas: [], rules: [], gallery: [], reviews: [], settings: {},
};

const statusLabels: Record<BookingStatus, string> = {
  pending: 'Onay bekliyor',
  confirmed: 'Onaylandı',
  rejected: 'Reddedildi',
  cancelled: 'İptal edildi',
  completed: 'Tamamlandı',
};

const weekdayLabels = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];

function formatMoney(cents: number | null) {
  if (cents === null) return 'Fiyat yakında';
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(cents / 100);
}

function formatDate(value: string) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('tr-TR', { dateStyle: 'medium' }).format(new Date(`${value}T12:00:00`));
}

export function AdminDashboard({ adminName, adminEmail }: { adminName: string; adminEmail: string }) {
  const [activeTab, setActiveTab] = useState<Tab>('randevular');
  const [data, setData] = useState<AdminSnapshot>(emptySnapshot);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const [bookingFilter, setBookingFilter] = useState<BookingStatus | 'all'>('all');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin', { cache: 'no-store' });
      if (!response.ok) throw new Error(response.status === 403 ? 'Bu işlem için yetkiniz yok.' : 'Yönetim verileri alınamadı.');
      setData(await response.json() as AdminSnapshot);
    } catch (error) {
      setNotice({ kind: 'error', text: error instanceof Error ? error.message : 'Bir hata oluştu.' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function mutate(action: string, payload: Record<string, unknown>, label = 'Değişiklik kaydedildi.') {
    setBusy(action + JSON.stringify(payload));
    setNotice(null);
    try {
      const response = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action, ...payload }),
      });
      const result = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(result.error || 'Değişiklik kaydedilemedi.');
      setNotice({ kind: 'ok', text: label });
      await load();
    } catch (error) {
      setNotice({ kind: 'error', text: error instanceof Error ? error.message : 'Bir hata oluştu.' });
    } finally {
      setBusy(null);
    }
  }

  const visibleBookings = useMemo(
    () => data.bookings.filter((booking) => bookingFilter === 'all' || booking.status === bookingFilter),
    [bookingFilter, data.bookings],
  );
  const today = new Date().toISOString().slice(0, 10);
  const todayCount = data.bookings.filter((booking) => booking.requestedDate === today && !['rejected', 'cancelled'].includes(booking.status)).length;
  const pendingCount = data.bookings.filter((booking) => booking.status === 'pending').length;
  const confirmedCount = data.bookings.filter((booking) => booking.status === 'confirmed').length;

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <Link href="/" className={styles.brand} aria-label="Ankara Mobil Oto Yıkama ana sayfa">
          <span className={styles.brandMark}>AM</span>
          <span><strong>Ankara Mobil</strong><small>Yönetim paneli</small></span>
        </Link>
        <nav className={styles.nav} aria-label="Yönetim bölümleri">
          {tabs.map((tab) => (
            <button key={tab.id} type="button" className={activeTab === tab.id ? styles.navActive : ''} onClick={() => setActiveTab(tab.id)}>
              <span aria-hidden="true">{tab.glyph}</span>{tab.label}
              {tab.id === 'randevular' && pendingCount > 0 ? <b>{pendingCount}</b> : null}
            </button>
          ))}
        </nav>
        <div className={styles.sidebarFooter}>
          <span className={styles.avatar}>{adminName.slice(0, 1).toLocaleUpperCase('tr-TR')}</span>
          <span><strong>{adminName}</strong><small>{adminEmail}</small></span>
          <a href="/signout-with-chatgpt?return_to=%2F" aria-label="Çıkış yap">↗</a>
        </div>
      </aside>

      <main className={styles.main}>
        <header className={styles.topbar}>
          <div><p className={styles.eyebrow}>İşletme kontrol merkezi</p><h1>{tabs.find((tab) => tab.id === activeTab)?.label}</h1></div>
          <div className={styles.topbarActions}><Link href="/" target="_blank">Siteyi görüntüle ↗</Link><button type="button" onClick={() => void load()} disabled={loading}>Yenile</button></div>
        </header>

        {notice ? <div className={`${styles.notice} ${notice.kind === 'error' ? styles.noticeError : ''}`} role="status">{notice.text}<button type="button" onClick={() => setNotice(null)} aria-label="Bildirimi kapat">×</button></div> : null}
        {loading ? <div className={styles.loading} aria-live="polite"><span /> Veriler güncelleniyor…</div> : null}

        {activeTab === 'randevular' && (
          <section aria-label="Randevu yönetimi">
            <div className={styles.metrics}>
              <Metric label="Bugünkü randevu" value={todayCount} note="aktif kayıt" tone="cyan" />
              <Metric label="Onay bekleyen" value={pendingCount} note="işlem gerekli" tone="green" />
              <Metric label="Onaylanan" value={confirmedCount} note="toplam" tone="navy" />
              <Metric label="Aktif bölge" value={data.areas.filter((area) => area.active).length} note="Ankara ilçesi" tone="sand" />
            </div>
            <div className={styles.panel}>
              <div className={styles.panelHeader}><div><h2>Randevu talepleri</h2><p>Bekleyen talepler kapasiteyi ayırır.</p></div>
                <label className={styles.inlineField}>Durum <select value={bookingFilter} onChange={(event) => setBookingFilter(event.target.value as BookingStatus | 'all')}><option value="all">Tümü</option>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
              </div>
              {visibleBookings.length ? <div className={styles.bookingList}>{visibleBookings.map((booking) => <BookingCard key={booking.id} booking={booking} busy={busy !== null} onStatus={(status) => void mutate('update_booking_status', { id: booking.id, status }, `Randevu ${statusLabels[status].toLocaleLowerCase('tr-TR')}.`)} />)}</div> : <EmptyState title="Bu filtrede randevu yok" text="Yeni talepler geldiğinde burada görünecek." />}
            </div>
          </section>
        )}

        {activeTab === 'hizmetler' && (
          <section className={styles.panel}>
            <div className={styles.panelHeader}><div><h2>Paketler ve ekstralar</h2><p>Fiyatı boş bırakırsanız sitede “Fiyat yakında” görünür.</p></div></div>
            <div className={styles.cardGrid}>{data.services.map((service) => <ServiceForm key={service.id} service={service} disabled={busy !== null} onSave={(payload) => void mutate('update_service', payload)} />)}</div>
            <h3 className={styles.subheading}>Ek hizmetler</h3>
            <div className={styles.compactList}>{data.extras.map((extra) => <ExtraForm key={extra.id} extra={extra} disabled={busy !== null} onSave={(payload) => void mutate('update_extra', payload)} />)}</div>
          </section>
        )}

        {activeTab === 'takvim' && (
          <section className={styles.panel}>
            <div className={styles.panelHeader}><div><h2>Çalışma saatleri ve kapasite</h2><p>Slotlar 30 dakikalık dilimlerle oluşturulur. Kapasite, aynı anda kaç ekibin çalışabileceğini belirler.</p></div></div>
            <div className={styles.ruleList}>{data.rules.sort((a, b) => ((a.weekday + 6) % 7) - ((b.weekday + 6) % 7)).map((rule) => <RuleForm key={rule.id} rule={rule} disabled={busy !== null} onSave={(payload) => void mutate('update_rule', payload)} />)}</div>
            <BlackoutForm disabled={busy !== null} onSave={(payload) => void mutate('add_blackout', payload, 'Kapalı gün eklendi.')} />
          </section>
        )}

        {activeTab === 'bolgeler' && (
          <section className={styles.panel}>
            <div className={styles.panelHeader}><div><h2>Hizmet bölgeleri</h2><p>Pasif ilçelerde müşteriler randevu oluşturamaz; WhatsApp yönlendirmesi görür.</p></div></div>
            <div className={styles.areaGrid}>{data.areas.map((area) => <label key={area.id} className={styles.areaToggle}><input type="checkbox" checked={area.active} disabled={busy !== null} onChange={() => void mutate('toggle_area', { id: area.id, active: !area.active }, `${area.district} ${area.active ? 'pasifleştirildi' : 'aktifleştirildi'}.`)} /><span>{area.district}</span><small>{area.active ? 'Aktif' : 'Pasif'}</small></label>)}</div>
            <SimpleForm title="Yeni ilçe ekle" submitLabel="İlçeyi ekle" fields={[{ name: 'district', label: 'İlçe adı', required: true }]} disabled={busy !== null} onSubmit={(payload) => void mutate('add_area', payload, 'İlçe eklendi.')} />
          </section>
        )}

        {activeTab === 'galeri' && (
          <section className={styles.panel}>
            <div className={styles.panelHeader}><div><h2>Son işler galerisi</h2><p>Yalnızca gerçek iş fotoğraflarını yayınlayın. JPG, PNG veya WebP; en fazla 8 MB.</p></div></div>
            <GalleryUpload disabled={busy !== null} services={data.services} onDone={load} onNotice={setNotice} />
            {data.gallery.length ? <div className={styles.galleryList}>{data.gallery.map((item) => <article key={item.id}><div><strong>{item.title}</strong><span>{item.district} · {formatDate(item.completedAt)} · {item.imageCount} fotoğraf</span></div><button type="button" disabled={busy !== null} onClick={() => void mutate('toggle_gallery', { id: item.id, published: !item.published })}>{item.published ? 'Yayından kaldır' : 'Yayınla'}</button></article>)}</div> : <EmptyState title="Henüz galeri kaydı yok" text="İlk gerçek iş fotoğrafını yüklediğinizde galeri sitede otomatik görünür." />}
          </section>
        )}

        {activeTab === 'yorumlar' && (
          <section className={styles.panel}>
            <div className={styles.panelHeader}><div><h2>Müşteri yorumları</h2><p>Yalnızca müşteriden yayın izni alınmış, gerçek yorumları ekleyin.</p></div></div>
            <ReviewForm disabled={busy !== null} onSubmit={(payload) => void mutate('add_review', payload, 'Yorum eklendi.')} />
            {data.reviews.length ? <div className={styles.reviewList}>{data.reviews.map((review) => <article key={review.id}><div className={styles.stars} aria-label={`${review.rating} yıldız`}>{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</div><blockquote>“{review.quote}”</blockquote><footer>{review.customerName}</footer><button type="button" onClick={() => void mutate('toggle_review', { id: review.id, published: !review.published })}>{review.published ? 'Yayından kaldır' : 'Yayınla'}</button></article>)}</div> : <EmptyState title="Henüz yorum yok" text="Yayınlanmış gerçek yorum bulunmadığı sürece bu bölüm sitede gösterilmez." />}
          </section>
        )}

        {activeTab === 'ayarlar' && <SettingsForm settings={data.settings} disabled={busy !== null} onSubmit={(payload) => void mutate('save_settings', payload)} />}
      </main>
    </div>
  );
}

function Metric({ label, value, note, tone }: { label: string; value: number; note: string; tone: string }) {
  return <article className={`${styles.metric} ${styles[`metric_${tone}`]}`}><span>{label}</span><strong>{value}</strong><small>{note}</small></article>;
}

function BookingCard({ booking, busy, onStatus }: { booking: AdminBooking; busy: boolean; onStatus: (status: BookingStatus) => void }) {
  return <article className={styles.bookingCard}>
    <div className={styles.bookingTime}><strong>{booking.startTime}</strong><span>{formatDate(booking.requestedDate)}</span></div>
    <div className={styles.bookingBody}>
      <div className={styles.bookingHeading}><div><span className={`${styles.status} ${styles[`status_${booking.status}`]}`}>{statusLabels[booking.status]}</span><small>#{booking.reference}</small></div><strong>{booking.serviceName}</strong></div>
      <div className={styles.bookingFacts}><span><b>Müşteri</b>{booking.customerName}<a href={`tel:${booking.customerPhone}`}>{booking.customerPhone}</a></span><span><b>Araç</b>{booking.vehicle || 'Belirtilmedi'}</span><span><b>Konum</b>{booking.district}<small title={booking.address}>{booking.address}</small></span><span><b>Tutar</b>{formatMoney(booking.totalCents)}</span></div>
      {booking.notificationStatus === 'failed' ? <p className={styles.warning}>E-posta gönderilemedi: {booking.notificationError || 'Yeniden gönderim bekliyor.'}</p> : null}
      <div className={styles.bookingActions}>
        {booking.status === 'pending' ? <><button className={styles.approve} type="button" disabled={busy} onClick={() => onStatus('confirmed')}>Onayla</button><button className={styles.reject} type="button" disabled={busy} onClick={() => onStatus('rejected')}>Reddet</button></> : null}
        {booking.status === 'confirmed' ? <><button className={styles.approve} type="button" disabled={busy} onClick={() => onStatus('completed')}>Tamamlandı</button><button className={styles.reject} type="button" disabled={busy} onClick={() => onStatus('cancelled')}>İptal et</button></> : null}
      </div>
    </div>
  </article>;
}

function ServiceForm({ service, disabled, onSave }: { service: AdminSnapshot['services'][number]; disabled: boolean; onSave: (payload: Record<string, unknown>) => void }) {
  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const form = new FormData(event.currentTarget); onSave({ id: service.id, priceLira: form.get('priceLira'), durationMinutes: form.get('durationMinutes'), active: form.get('active') === 'on', popular: form.get('popular') === 'on' }); }
  return <form className={styles.serviceCard} onSubmit={submit}><div><span className={styles.drag}>⋮⋮</span><strong>{service.name}</strong></div><label>Fiyat (₺)<input name="priceLira" type="number" min="0" step="1" defaultValue={service.priceCents === null ? '' : service.priceCents / 100} placeholder="Yakında" /></label><label>Süre (dk)<input name="durationMinutes" type="number" min="30" step="30" defaultValue={service.durationMinutes} required /></label><div className={styles.switches}><label><input name="active" type="checkbox" defaultChecked={service.active} /> Aktif</label><label><input name="popular" type="checkbox" defaultChecked={service.popular} /> Öne çıkar</label></div><button type="submit" disabled={disabled}>Kaydet</button></form>;
}

function ExtraForm({ extra, disabled, onSave }: { extra: AdminSnapshot['extras'][number]; disabled: boolean; onSave: (payload: Record<string, unknown>) => void }) {
  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const form = new FormData(event.currentTarget); onSave({ id: extra.id, priceLira: form.get('priceLira'), durationMinutes: form.get('durationMinutes'), active: form.get('active') === 'on' }); }
  return <form onSubmit={submit}><strong>{extra.name}</strong><label>₺ <input name="priceLira" type="number" min="0" defaultValue={extra.priceCents === null ? '' : extra.priceCents / 100} placeholder="—" /></label><label>dk <input name="durationMinutes" type="number" min="0" step="30" defaultValue={extra.durationMinutes} /></label><label><input name="active" type="checkbox" defaultChecked={extra.active} /> Aktif</label><button type="submit" disabled={disabled}>Kaydet</button></form>;
}

function RuleForm({ rule, disabled, onSave }: { rule: AdminSnapshot['rules'][number]; disabled: boolean; onSave: (payload: Record<string, unknown>) => void }) {
  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const form = new FormData(event.currentTarget); onSave({ id: rule.id, openTime: form.get('openTime'), closeTime: form.get('closeTime'), capacity: form.get('capacity'), active: form.get('active') === 'on' }); }
  return <form onSubmit={submit}><strong>{weekdayLabels[rule.weekday]}</strong><label className={styles.switchLabel}><input name="active" type="checkbox" defaultChecked={rule.active} /> <span>{rule.active ? 'Açık' : 'Kapalı'}</span></label><label>Başlangıç<input name="openTime" type="time" defaultValue={rule.openTime} /></label><label>Bitiş<input name="closeTime" type="time" defaultValue={rule.closeTime} /></label><label>Ekip<input name="capacity" type="number" min="1" max="10" defaultValue={rule.capacity} /></label><button type="submit" disabled={disabled}>Kaydet</button></form>;
}

function BlackoutForm({ disabled, onSave }: { disabled: boolean; onSave: (payload: Record<string, unknown>) => void }) {
  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const form = new FormData(event.currentTarget); onSave({ date: form.get('date'), reason: form.get('reason') }); event.currentTarget.reset(); }
  return <form className={styles.inlineForm} onSubmit={submit}><div><strong>Kapalı gün ekle</strong><span>Bayram, bakım veya özel gün</span></div><label>Tarih<input name="date" type="date" required /></label><label>Açıklama<input name="reason" type="text" maxLength={120} placeholder="Örn. Resmî tatil" required /></label><button type="submit" disabled={disabled}>Ekle</button></form>;
}

function SimpleForm({ title, submitLabel, fields, disabled, onSubmit }: { title: string; submitLabel: string; fields: Array<{ name: string; label: string; required?: boolean }>; disabled: boolean; onSubmit: (payload: Record<string, unknown>) => void }) {
  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const form = new FormData(event.currentTarget); onSubmit(Object.fromEntries(form)); event.currentTarget.reset(); }
  return <form className={styles.inlineForm} onSubmit={submit}><strong>{title}</strong>{fields.map((field) => <label key={field.name}>{field.label}<input name={field.name} required={field.required} /></label>)}<button type="submit" disabled={disabled}>{submitLabel}</button></form>;
}

function GalleryUpload({ disabled, services, onDone, onNotice }: { disabled: boolean; services: AdminSnapshot['services']; onDone: () => Promise<void>; onNotice: (notice: { kind: 'ok' | 'error'; text: string }) => void }) {
  const [uploading, setUploading] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setUploading(true); try { const response = await fetch('/api/admin/gallery', { method: 'POST', body: new FormData(event.currentTarget) }); const result = await response.json().catch(() => ({})) as { error?: string }; if (!response.ok) throw new Error(result.error || 'Fotoğraf yüklenemedi.'); event.currentTarget.reset(); onNotice({ kind: 'ok', text: 'Galeri kaydı yüklendi. Yayınlamak için listeden onaylayın.' }); await onDone(); } catch (error) { onNotice({ kind: 'error', text: error instanceof Error ? error.message : 'Fotoğraf yüklenemedi.' }); } finally { setUploading(false); } }
  return <form className={styles.uploadForm} onSubmit={submit}><label className={styles.dropzone}><input name="file" type="file" accept="image/jpeg,image/png,image/webp" required /><span className={styles.uploadIcon}>↑</span><strong>Fotoğraf seçin</strong><small>JPG, PNG veya WebP · en fazla 8 MB</small></label><div className={styles.uploadFields}><label>Başlık<input name="title" maxLength={100} required placeholder="Örn. İncek’te iç-dış temizlik" /></label><label>İlçe<input name="district" maxLength={60} required /></label><label>Tamamlanma tarihi<input name="completedAt" type="date" required /></label><label>Hizmet<select name="serviceId"><option value="">Hizmet seçilmedi</option>{services.map((service) => <option value={service.id} key={service.id}>{service.name}</option>)}</select></label><label className={styles.fullField}>Alternatif metin<input name="altText" maxLength={180} required placeholder="Fotoğrafta görünen işi kısa ve nesnel biçimde anlatın" /></label><button type="submit" disabled={disabled || uploading}>{uploading ? 'Yükleniyor…' : 'Galeriye yükle'}</button></div></form>;
}

function ReviewForm({ disabled, onSubmit }: { disabled: boolean; onSubmit: (payload: Record<string, unknown>) => void }) {
  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const form = new FormData(event.currentTarget); onSubmit(Object.fromEntries(form)); event.currentTarget.reset(); }
  return <form className={styles.reviewForm} onSubmit={submit}><label>Müşteri adı<input name="customerName" required maxLength={60} placeholder="Yayın izni alınmış ad" /></label><label>Puan<select name="rating" defaultValue="5"><option value="5">5 yıldız</option><option value="4">4 yıldız</option><option value="3">3 yıldız</option><option value="2">2 yıldız</option><option value="1">1 yıldız</option></select></label><label className={styles.fullField}>Yorum<textarea name="quote" required maxLength={420} rows={3} /></label><label className={styles.consent}><input type="checkbox" required /> Bu yorumun yayın izninin alındığını onaylıyorum.</label><button type="submit" disabled={disabled}>Taslak olarak ekle</button></form>;
}

function SettingsForm({ settings, disabled, onSubmit }: { settings: Record<string, string>; disabled: boolean; onSubmit: (payload: Record<string, unknown>) => void }) {
  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); onSubmit({ settings: Object.fromEntries(new FormData(event.currentTarget)) }); }
  return <section className={styles.panel}><div className={styles.panelHeader}><div><h2>İşletme bilgileri</h2><p>Sitede ve müşteri bildirimlerinde gösterilen iletişim bilgileri.</p></div></div><form className={styles.settingsForm} onSubmit={submit}><label>İşletme adı<input name="business_name" defaultValue={settings.business_name || 'Ankara Mobil Oto Yıkama'} required /></label><label>Telefon<input name="phone" type="tel" defaultValue={settings.phone || ''} placeholder="+90 5xx xxx xx xx" /></label><label>WhatsApp numarası<input name="whatsapp_number" inputMode="numeric" defaultValue={settings.whatsapp_number || ''} placeholder="905xxxxxxxxx" /></label><label>E-posta<input name="contact_email" type="email" defaultValue={settings.contact_email || ''} /></label><label>İptal/değişiklik sınırı (saat)<input name="booking_change_cutoff_hours" type="number" min="1" max="48" defaultValue={settings.booking_change_cutoff_hours || '2'} /></label><label className={styles.fullField}>Kısa işletme notu<textarea name="business_note" rows={3} maxLength={300} defaultValue={settings.business_note || ''} /></label><div className={styles.formFoot}><p>Ödeme yöntemi: <strong>Hizmet sonrası yüz yüze</strong></p><button type="submit" disabled={disabled}>Ayarları kaydet</button></div></form></section>;
}

function EmptyState({ title, text }: { title: string; text: string }) { return <div className={styles.empty}><span aria-hidden="true">○</span><strong>{title}</strong><p>{text}</p></div>; }
