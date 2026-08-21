import { NextResponse } from 'next/server';
import { AvailabilityError, findAvailableLane, getAvailabilityDetails } from '@/app/lib/availability';
import {
  endTime,
  findBookingByToken,
  getCutoff,
  publicBooking,
  sendBookingNotification,
  type BookingRow,
} from '@/app/lib/bookings';
import { getRawD1 } from '@/app/lib/db';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ token: string }> };

export async function GET(_request: Request, { params }: RouteContext) {
  const { token } = await params;
  const row = await findBookingByToken(token);
  if (!row) return NextResponse.json({ error: 'Randevu bağlantısı geçersiz veya süresi dolmuş.' }, { status: 404 });
  const cutoff = await getCutoff(row);
  return NextResponse.json(
    { booking: await publicBooking(row), ...cutoff },
    { headers: { 'Cache-Control': 'private, no-store' } },
  );
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const { token } = await params;
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) {
    return NextResponse.json({ error: 'Randevu bağlantısı geçersiz veya süresi dolmuş.' }, { status: 404 });
  }
  const contentLength = Number(request.headers.get('content-length') ?? 0);
  if (!Number.isFinite(contentLength) || contentLength > 4_096) {
    return NextResponse.json({ error: 'İstek verisi çok büyük.' }, { status: 413 });
  }
  const row = await findBookingByToken(token);
  if (!row) return NextResponse.json({ error: 'Randevu bağlantısı geçersiz veya süresi dolmuş.' }, { status: 404 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Geçerli bir işlem gönderin.' }, { status: 400 });
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json({ error: 'Geçerli bir işlem gönderin.' }, { status: 400 });
  }

  const cutoff = await getCutoff(row);
  if (!cutoff.canChange) {
    return NextResponse.json({ error: 'Çevrimiçi değişiklik süresi sona ermiş. Lütfen WhatsApp üzerinden iletişime geçin.' }, { status: 409 });
  }

  const input = body as Record<string, unknown>;
  if (input.action === 'cancel') return cancelBooking(row);
  if (input.action === 'reschedule') return rescheduleBooking(row, input);
  return NextResponse.json({ error: 'Desteklenmeyen işlem.' }, { status: 400 });
}

async function cancelBooking(row: BookingRow) {
  const db = getRawD1();
  const now = new Date().toISOString();
  await db.batch([
    db.prepare('DELETE FROM booking_slot_locks WHERE booking_id = ?').bind(row.id),
    db.prepare(`UPDATE bookings SET status = 'cancelled', change_requested = 0,
      notification_status = 'queued', notification_error = NULL, updated_at = ? WHERE id = ?`)
      .bind(now, row.id),
    analyticsStatement(db, 'booking_cancelled'),
  ]);
  const updated: BookingRow = {
    ...row,
    status: 'cancelled',
    change_requested: 0,
    notification_status: 'queued',
    notification_error: null,
    updated_at: now,
  };
  await sendBookingNotification(updated, 'cancelled');
  return NextResponse.json({
    booking: await publicBooking(updated),
    status: updated.status,
    reference: updated.reference,
  });
}

async function rescheduleBooking(row: BookingRow, input: Record<string, unknown>) {
  const date = typeof input.date === 'string' ? input.date.trim() : '';
  const time = typeof input.time === 'string' ? input.time.trim() : '';
  if (!/^\d{2}:\d{2}$/.test(time)) return NextResponse.json({ error: 'Geçerli bir saat seçin.' }, { status: 400 });
  const db = getRawD1();
  const service = await db.prepare('SELECT slug FROM services WHERE id = ? AND active = 1')
    .bind(row.service_id).first<{ slug: string }>();
  if (!service) return NextResponse.json({ error: 'Bu hizmet artık kullanılamıyor.' }, { status: 409 });
  const extraRows = await db.prepare(`SELECT extras.slug FROM booking_extras
    JOIN extras ON extras.id = booking_extras.extra_id WHERE booking_extras.booking_id = ? AND extras.active = 1`)
    .bind(row.id).all<{ slug: string }>();
  const extraSlugs = (extraRows.results ?? []).map((extra) => extra.slug);

  try {
    const details = await getAvailabilityDetails(service.slug, date, extraSlugs, row.id);
    const selected = details.slots.find((slot) => slot.time === time);
    if (!selected?.available) {
      return NextResponse.json({ error: 'Seçilen saat uygun değil.' }, { status: 409 });
    }
    const allocation = await findAvailableLane(
      date, time, details.durationMinutes, details.capacity, details.slotMinutes, row.id,
    );
    if (!allocation) return NextResponse.json({ error: 'Seçilen saat az önce doldu.' }, { status: 409 });

    const now = new Date().toISOString();
    const updated: BookingRow = {
      ...row,
      status: 'pending',
      requested_date: date,
      start_time: time,
      end_time: endTime(time, details.durationMinutes),
      service_duration_minutes: details.service.durationMinutes,
      change_requested: 1,
      notification_status: 'queued',
      notification_error: null,
      updated_at: now,
    };
    const statements: D1PreparedStatement[] = [
      db.prepare('DELETE FROM booking_slot_locks WHERE booking_id = ?').bind(row.id),
      db.prepare(`UPDATE bookings SET status = 'pending', requested_date = ?, start_time = ?, end_time = ?,
        service_duration_minutes = ?, change_requested = 1, notification_status = 'queued',
        notification_error = NULL, updated_at = ? WHERE id = ?`)
        .bind(date, time, updated.end_time, updated.service_duration_minutes, now, row.id),
      ...allocation.starts.map((slotStart) => db.prepare(`INSERT INTO booking_slot_locks
        (id, booking_id, slot_start, lane) VALUES (?, ?, ?, ?)`)
        .bind(crypto.randomUUID(), row.id, slotStart, allocation.lane)),
      analyticsStatement(db, 'booking_rescheduled'),
    ];
    try {
      await db.batch(statements);
    } catch (error) {
      console.error('booking_reschedule_atomic_update_failed', error);
      return NextResponse.json({ error: 'Seçilen saat az önce doldu. Uygunluğu yenileyin.' }, { status: 409 });
    }
    await sendBookingNotification(updated, 'rescheduled');
    return NextResponse.json({
      booking: await publicBooking(updated),
      status: updated.status,
      reference: updated.reference,
    });
  } catch (error) {
    if (error instanceof AvailabilityError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('booking_reschedule_failed', error);
    return NextResponse.json({ error: 'Randevu değiştirilemedi.' }, { status: 500 });
  }
}

function analyticsStatement(db: D1Database, event: string) {
  const date = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul' }).format(new Date());
  return db.prepare(`INSERT INTO analytics_daily (date, event, route, count) VALUES (?, ?, '/randevu/yonet', 1)
    ON CONFLICT(date, event, route) DO UPDATE SET count = count + 1`).bind(date, event);
}
