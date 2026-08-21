import { env } from 'cloudflare:workers';
import {
  deriveManageToken,
  ensureDatabase,
  getBusinessSettings,
  getRawD1,
  minutesToTime,
  sha256Hex,
  timeToMinutes,
} from './db';

export const BOOKING_STATUSES = ['pending', 'confirmed', 'rejected', 'cancelled', 'completed'] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export type BookingRow = {
  id: string;
  reference: string;
  manage_token_hash: string;
  idempotency_key: string;
  status: BookingStatus;
  service_id: string;
  service_name: string;
  service_price_cents: number | null;
  service_duration_minutes: number;
  requested_date: string;
  start_time: string;
  end_time: string;
  district: string;
  address: string;
  vehicle_make: string;
  vehicle_model: string;
  plate: string;
  customer_name: string;
  phone: string;
  email: string;
  notes: string | null;
  estimated_total_cents: number | null;
  change_requested: number;
  notification_status: string;
  notification_error: string | null;
  created_at: string;
  updated_at: string;
};

export type PublicBooking = {
  reference: string;
  status: BookingStatus;
  serviceName: string;
  servicePriceCents: number | null;
  requestedDate: string;
  startTime: string;
  endTime: string;
  district: string;
  address: string;
  vehicleMake: string;
  vehicleModel: string;
  plate: string;
  customerName: string;
  phone: string;
  email: string;
  notes: string | null;
  estimatedTotalCents: number | null;
  changeRequested: boolean;
  extras: Array<{ name: string; priceCents: number | null; durationMinutes: number }>;
};

export async function findBookingByToken(token: string): Promise<BookingRow | null> {
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
  await ensureDatabase();
  const hash = await sha256Hex(token);
  return getRawD1().prepare('SELECT * FROM bookings WHERE manage_token_hash = ?').bind(hash).first<BookingRow>();
}

export async function publicBooking(row: BookingRow): Promise<PublicBooking> {
  const extras = await getRawD1().prepare(
    'SELECT name, price_cents, duration_minutes FROM booking_extras WHERE booking_id = ? ORDER BY id',
  ).bind(row.id).all<{ name: string; price_cents: number | null; duration_minutes: number }>();
  return {
    reference: row.reference,
    status: row.status,
    serviceName: row.service_name,
    servicePriceCents: row.service_price_cents,
    requestedDate: row.requested_date,
    startTime: row.start_time,
    endTime: row.end_time,
    district: row.district,
    address: row.address,
    vehicleMake: row.vehicle_make,
    vehicleModel: row.vehicle_model,
    plate: row.plate,
    customerName: row.customer_name,
    phone: row.phone,
    email: row.email,
    notes: row.notes,
    estimatedTotalCents: row.estimated_total_cents,
    changeRequested: row.change_requested === 1,
    extras: (extras.results ?? []).map((extra) => ({
      name: extra.name,
      priceCents: extra.price_cents,
      durationMinutes: extra.duration_minutes,
    })),
  };
}

export async function bookingResponse(row: BookingRow, idempotencyKey: string) {
  const token = await deriveManageToken(idempotencyKey, row.id);
  const expectedHash = await sha256Hex(token);
  if (expectedHash !== row.manage_token_hash) throw new Error('Booking token could not be reconstructed.');
  const settings = await getBusinessSettings();
  const whatsappNumber = (settings.whatsapp_number ?? '').replace(/\D/g, '');
  const message = `Merhaba, ${row.reference} referanslı ${row.service_name} randevu talebim hakkında yazıyorum. Tarih: ${formatDate(row.requested_date)} ${row.start_time}, ilçe: ${row.district}.`;
  return {
    reference: row.reference,
    manageUrl: `/randevu/yonet/${token}`,
    whatsappUrl: whatsappNumber ? `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}` : null,
    status: row.status,
  };
}

export async function getCutoff(row: BookingRow) {
  const settings = await getBusinessSettings();
  const hours = boundedInt(settings.booking_change_cutoff_hours, 2, 0, 72);
  const start = new Date(`${row.requested_date}T${row.start_time}:00+03:00`).getTime();
  const cutoffAtMs = start - hours * 60 * 60 * 1000;
  return { canChange: Date.now() < cutoffAtMs && ['pending', 'confirmed'].includes(row.status), cutoffAt: new Date(cutoffAtMs).toISOString() };
}

export async function verifyTurnstile(token: unknown, request: Request): Promise<boolean> {
  const runtime = env as unknown as { TURNSTILE_SECRET_KEY?: string };
  const secret = runtime.TURNSTILE_SECRET_KEY?.trim();
  if (!secret) return true;
  if (typeof token !== 'string' || token.length < 10 || token.length > 2048) return false;
  const body = new FormData();
  body.set('secret', secret);
  body.set('response', token);
  const remoteIp = request.headers.get('cf-connecting-ip');
  if (remoteIp) body.set('remoteip', remoteIp);
  try {
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body });
    const result = await response.json() as { success?: boolean };
    return response.ok && result.success === true;
  } catch (error) {
    console.error('turnstile_verification_failed', error);
    return false;
  }
}

export async function sendBookingNotification(row: BookingRow, event: BookingStatus | 'rescheduled') {
  const runtime = env as unknown as { RESEND_API_KEY?: string; RESEND_FROM_EMAIL?: string; RESEND_FROM?: string; RESEND_REPLY_TO?: string };
  const from = runtime.RESEND_FROM_EMAIL || runtime.RESEND_FROM;
  if (!runtime.RESEND_API_KEY || !from) {
    await markNotification(row.id, 'not_configured', 'Resend yapılandırması eksik.');
    return;
  }
  const eventLabel: Record<string, string> = {
    pending: 'Randevu talebiniz alındı', confirmed: 'Randevunuz onaylandı',
    rejected: 'Randevu talebiniz sonuçlandı', cancelled: 'Randevunuz iptal edildi',
    completed: 'Hizmetiniz tamamlandı', rescheduled: 'Değişiklik talebiniz alındı',
  };
  const subject = `${eventLabel[event]} · ${row.reference}`;
  const lines = [
    `Merhaba ${row.customer_name},`, '', eventLabel[event] ?? 'Randevu güncellemesi',
    `Referans: ${row.reference}`, `Hizmet: ${row.service_name}`,
    `Tarih: ${formatDate(row.requested_date)} ${row.start_time}`, `İlçe: ${row.district}`, '',
    event === 'pending' || event === 'rescheduled'
      ? 'Talebiniz yönetici onayından sonra kesinleşecektir.'
      : 'Bu e-posta randevu durumunuzdaki değişiklik nedeniyle gönderildi.',
  ];
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${runtime.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': `booking/${row.id}/${event}/${row.updated_at}`,
      },
      body: JSON.stringify({
        from,
        to: [row.email],
        reply_to: runtime.RESEND_REPLY_TO || undefined,
        subject,
        text: lines.join('\n'),
      }),
    });
    if (!response.ok) throw new Error(`Resend ${response.status}: ${(await response.text()).slice(0, 180)}`);
    await markNotification(row.id, 'sent', null);
  } catch (error) {
    console.error('booking_email_failed', row.reference, error);
    await markNotification(row.id, 'retry_required', error instanceof Error ? error.message.slice(0, 300) : 'Bilinmeyen e-posta hatası');
  }
}

export function endTime(startTime: string, durationMinutes: number) {
  return minutesToTime(timeToMinutes(startTime) + durationMinutes);
}

async function markNotification(bookingId: string, status: string, error: string | null) {
  try {
    await getRawD1().prepare(
      'UPDATE bookings SET notification_status = ?, notification_error = ? WHERE id = ?',
    ).bind(status, error, bookingId).run();
  } catch (updateError) {
    console.error('notification_status_update_failed', bookingId, updateError);
  }
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('tr-TR', { dateStyle: 'long', timeZone: 'Europe/Istanbul' })
    .format(new Date(`${value}T12:00:00+03:00`));
}

function boundedInt(value: string | undefined, fallback: number, min: number, max: number) {
  const numeric = Number(value);
  return Number.isInteger(numeric) && numeric >= min && numeric <= max ? numeric : fallback;
}
