import 'server-only';

import { env } from 'cloudflare:workers';
import { getRawD1 } from '@/app/lib/db';
import { getBookingForNotification } from './store';
import type { BookingStatus } from './types';

const labels: Record<BookingStatus, string> = {
  pending: 'yeniden onay bekliyor', confirmed: 'onaylandı', rejected: 'reddedildi',
  cancelled: 'iptal edildi', completed: 'tamamlandı',
};

function setting(name: string): string {
  const workerEnv = env as unknown as Record<string, unknown>;
  return (typeof workerEnv[name] === 'string' ? workerEnv[name] : '') || process.env[name] || '';
}

export async function sendBookingStatusEmail(bookingId: string): Promise<void> {
  const booking = await getBookingForNotification(bookingId);
  if (!booking?.email) return;
  const apiKey = setting('RESEND_API_KEY');
  const from = setting('RESEND_FROM');
  if (!apiKey || !from) {
    await getRawD1().prepare(`UPDATE bookings SET notification_status = 'skipped',
      notification_error = 'Resend yapılandırılmadı' WHERE id = ?`).bind(bookingId).run();
    return;
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${apiKey}`,
        'content-type': 'application/json',
        'Idempotency-Key': `ankara-booking-${booking.id}-${booking.status}`,
      },
      body: JSON.stringify({
        from,
        to: [booking.email],
        subject: `Randevunuz ${labels[booking.status]} · ${booking.reference}`,
        html: `<div style="font-family:Arial,sans-serif;color:#10243d;line-height:1.6"><h2>Merhaba ${escapeHtml(booking.customer_name)},</h2><p><strong>${escapeHtml(booking.service_name)}</strong> hizmeti için ${escapeHtml(booking.requested_date)} ${escapeHtml(booking.start_time)} tarihli <strong>${escapeHtml(booking.reference)}</strong> numaralı randevunuz ${labels[booking.status]}.</p><p>Ödeme hizmet sonrasında yüz yüze alınacaktır.</p><p>Ankara Mobil Oto Yıkama</p></div>`,
      }),
    });
    if (!response.ok) throw new Error(`Resend ${response.status}`);
    await getRawD1().prepare(`UPDATE bookings SET notification_status = 'sent',
      notification_error = NULL WHERE id = ?`).bind(bookingId).run();
  } catch (error) {
    await getRawD1().prepare(`UPDATE bookings SET notification_status = 'failed',
      notification_error = ? WHERE id = ?`).bind(error instanceof Error ? error.message.slice(0, 240) : 'Bilinmeyen e-posta hatası', bookingId).run();
  }
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char] || char);
}

