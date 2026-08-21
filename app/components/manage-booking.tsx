'use client';
/* eslint-disable @next/next/no-html-link-for-pages -- Native links avoid a vinext hydration issue in this client component. */

import { useEffect, useState } from 'react';

type BookingRecord = { reference: string; status: string; serviceName?: string; serviceSlug?: string; requestedDate?: string; date?: string; startTime?: string; time?: string; district?: string; [key: string]: unknown };
type ManagePayload = { booking: BookingRecord; canChange: boolean; cutoffAt: string };

export function ManageBooking({ token }: { token: string }) {
  const [payload, setPayload] = useState<ManagePayload | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  useEffect(() => { fetch(`/api/bookings/manage/${encodeURIComponent(token)}`).then(async (r) => { const p = await r.json() as ManagePayload & { error?: string }; if (!r.ok) throw new Error(p.error); return p; }).then(setPayload).catch(() => setError('Bu bağlantıya ait randevu bulunamadı veya bağlantının süresi doldu.')); }, [token]);
  async function update(action: 'cancel' | 'reschedule') { if (action === 'cancel' && !window.confirm('Bu randevuyu iptal etmek istediğinizden emin misiniz?')) return; setBusy(true); setError(''); try { const response = await fetch(`/api/bookings/manage/${encodeURIComponent(token)}`, {method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify(action === 'cancel' ? {action} : {action,date,time})}); const result = await response.json() as { error?: string; booking?: BookingRecord; status?: string }; if (!response.ok) throw new Error(result.error); setPayload((current) => current ? ({...current,canChange: action === 'cancel' ? false : current.canChange,booking:{...current.booking,...result.booking,status:result.status || current.booking.status}}) : current); } catch (cause) { setError(cause instanceof Error ? cause.message : 'İşlem tamamlanamadı.'); } finally { setBusy(false); } }
  if (error && !payload) return <div className="manage-card"><h1>Bağlantıyı kontrol edin</h1><p>{error}</p><a className="primary-button" href="/">Ana sayfaya dön</a></div>;
  if (!payload) return <div className="manage-card"><p>Randevu bilgileri yükleniyor…</p></div>;
  const booking = payload.booking;
  return <div className="manage-card"><p className="eyebrow dark">RANDEVU YÖNETİMİ</p><h1>{booking.reference}</h1><span className={`status-pill status-${booking.status}`}>{booking.status}</span><dl><div><dt>Hizmet</dt><dd>{booking.serviceName || booking.serviceSlug}</dd></div><div><dt>Tarih ve saat</dt><dd>{booking.requestedDate || booking.date} · {booking.startTime || booking.time}</dd></div><div><dt>İlçe</dt><dd>{booking.district}</dd></div></dl>{payload.canChange ? <><div className="manage-actions"><button type="button" className="danger-button" disabled={busy} onClick={() => update('cancel')}>Randevuyu iptal et</button><div><h2>Yeni zaman iste</h2><input type="date" value={date} onChange={(e) => setDate(e.target.value)} /><input type="time" step="1800" value={time} onChange={(e) => setTime(e.target.value)} /><button type="button" className="outline-button" disabled={busy || !date || !time} onClick={() => update('reschedule')}>Değişiklik iste</button></div></div><p className="helper">Değişiklik talebi randevuyu yeniden yönetici onayına gönderir. Son işlem zamanı: {payload.cutoffAt}</p></> : <p className="notice">Bu randevu için çevrim içi değişiklik süresi sona ermiş. Lütfen WhatsApp üzerinden iletişim kurun.</p>}{error && <p className="form-error">{error}</p>}</div>;
}
