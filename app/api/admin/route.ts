import { ensureDatabase, getRawD1 } from '@/app/lib/db';
import { AdminAccessError, requireAdmin } from '@/app/admin/auth';
import { sendBookingStatusEmail } from '@/app/admin/notifications';
import { getAdminSnapshot } from '@/app/admin/store';
import type { BookingStatus } from '@/app/admin/types';

export const dynamic = 'force-dynamic';

class InputError extends Error {}

export async function GET() {
  try {
    await requireAdmin('/admin');
    return Response.json(await getAdminSnapshot(), { headers: { 'cache-control': 'no-store' } });
  } catch (error) {
    if (error instanceof AdminAccessError) return Response.json({ error: error.message }, { status: 403 });
    throw error;
  }
}

export async function POST(request: Request) {
  try {
    await requireAdmin('/admin');
    assertSameOrigin(request);
    const body = await request.json() as Record<string, unknown>;
    if (typeof body.action !== 'string') throw new InputError('Geçersiz yönetim işlemi.');
    await ensureDatabase();
    await executeAction(body.action, body);
    return Response.json({ ok: true });
  } catch (error) {
    if (error instanceof AdminAccessError) return Response.json({ error: error.message }, { status: 403 });
    if (error instanceof InputError || error instanceof SyntaxError) return Response.json({ error: error.message }, { status: 400 });
    console.error('Admin mutation failed', error);
    return Response.json({ error: 'Değişiklik kaydedilemedi. Lütfen tekrar deneyin.' }, { status: 500 });
  }
}

async function executeAction(action: string, body: Record<string, unknown>) {
  const db = getRawD1();
  if (action === 'update_booking_status') {
    const id = stringValue(body.id, 'Randevu bulunamadı.', 100);
    const status = stringValue(body.status, 'Geçersiz randevu durumu.', 20) as BookingStatus;
    const allowedStatuses: BookingStatus[] = ['confirmed', 'rejected', 'cancelled', 'completed'];
    if (!allowedStatuses.includes(status)) throw new InputError('Bu durum değişikliğine izin verilmiyor.');
    const current = await db.prepare('SELECT status FROM bookings WHERE id = ?').bind(id).first<{ status: BookingStatus }>();
    if (!current) throw new InputError('Randevu bulunamadı.');
    const transitions: Record<BookingStatus, BookingStatus[]> = {
      pending: ['confirmed', 'rejected'], confirmed: ['completed', 'cancelled'],
      rejected: [], cancelled: [], completed: [],
    };
    if (!transitions[current.status]?.includes(status)) throw new InputError('Randevunun mevcut durumundan bu duruma geçilemez.');
    const now = new Date().toISOString();
    const statements = [db.prepare(`UPDATE bookings SET status = ?, notification_status = 'queued',
      notification_error = NULL, updated_at = ? WHERE id = ?`).bind(status, now, id)];
    if (status === 'rejected' || status === 'cancelled' || status === 'completed') {
      statements.push(db.prepare('DELETE FROM booking_slot_locks WHERE booking_id = ?').bind(id));
    }
    if (status === 'confirmed') {
      const date = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul' }).format(new Date());
      statements.push(db.prepare(`INSERT INTO analytics_daily (date, event, route, count) VALUES (?, 'booking_confirmed', '/admin', 1)
        ON CONFLICT(date, event, route) DO UPDATE SET count = count + 1`).bind(date));
    }
    await db.batch(statements);
    await sendBookingStatusEmail(id);
    return;
  }

  if (action === 'update_service') {
    const id = stringValue(body.id, 'Hizmet bulunamadı.', 100);
    const duration = integerValue(body.durationMinutes, 30, 720, 'Hizmet süresi 30–720 dakika olmalı.');
    const price = moneyValue(body.priceLira);
    await db.prepare(`UPDATE services SET price_cents = ?, duration_minutes = ?, active = ?, popular = ? WHERE id = ?`)
      .bind(price, duration, boolInt(body.active), boolInt(body.popular), id).run();
    return;
  }

  if (action === 'update_extra') {
    const id = stringValue(body.id, 'Ek hizmet bulunamadı.', 100);
    const duration = integerValue(body.durationMinutes, 0, 360, 'Ek hizmet süresi 0–360 dakika olmalı.');
    await db.prepare('UPDATE extras SET price_cents = ?, duration_minutes = ?, active = ? WHERE id = ?')
      .bind(moneyValue(body.priceLira), duration, boolInt(body.active), id).run();
    return;
  }

  if (action === 'update_rule') {
    const id = stringValue(body.id, 'Çalışma kuralı bulunamadı.', 100);
    const openTime = timeValue(body.openTime);
    const closeTime = timeValue(body.closeTime);
    if (closeTime <= openTime) throw new InputError('Bitiş saati başlangıç saatinden sonra olmalı.');
    const capacity = integerValue(body.capacity, 1, 10, 'Kapasite 1–10 arasında olmalı.');
    await db.prepare('UPDATE availability_rules SET open_time = ?, close_time = ?, capacity = ?, active = ? WHERE id = ?')
      .bind(openTime, closeTime, capacity, boolInt(body.active), id).run();
    return;
  }

  if (action === 'add_blackout') {
    const date = dateValue(body.date);
    const reason = stringValue(body.reason, 'Açıklama gerekli.', 120);
    await db.prepare('INSERT INTO blackout_dates (id, date, reason) VALUES (?, ?, ?) ON CONFLICT(date) DO UPDATE SET reason = excluded.reason')
      .bind(crypto.randomUUID(), date, reason).run();
    return;
  }

  if (action === 'toggle_area') {
    const id = stringValue(body.id, 'İlçe bulunamadı.', 100);
    await db.prepare('UPDATE service_areas SET active = ? WHERE id = ?').bind(boolInt(body.active), id).run();
    return;
  }

  if (action === 'add_area') {
    const district = stringValue(body.district, 'İlçe adı gerekli.', 60);
    if (!/^[A-Za-zÇĞİÖŞÜçğıöşü\s-]{2,60}$/.test(district)) throw new InputError('Geçerli bir ilçe adı girin.');
    await db.prepare('INSERT INTO service_areas (id, district, active) VALUES (?, ?, 1) ON CONFLICT(district) DO UPDATE SET active = 1')
      .bind(crypto.randomUUID(), district).run();
    return;
  }

  if (action === 'toggle_gallery') {
    await db.prepare('UPDATE gallery_items SET published = ? WHERE id = ?')
      .bind(boolInt(body.published), stringValue(body.id, 'Galeri kaydı bulunamadı.', 100)).run();
    return;
  }

  if (action === 'add_review') {
    const customerName = stringValue(body.customerName, 'Müşteri adı gerekli.', 60);
    const quote = stringValue(body.quote, 'Yorum gerekli.', 420);
    const rating = integerValue(body.rating, 1, 5, 'Puan 1–5 arasında olmalı.');
    const max = await db.prepare('SELECT COALESCE(MAX(sort_order), 0) AS value FROM reviews').first<{ value: number }>();
    await db.prepare(`INSERT INTO reviews (id, customer_name, rating, quote, published, sort_order, created_at)
      VALUES (?, ?, ?, ?, 0, ?, ?)`).bind(crypto.randomUUID(), customerName, rating, quote, (max?.value ?? 0) + 1, new Date().toISOString()).run();
    return;
  }

  if (action === 'toggle_review') {
    await db.prepare('UPDATE reviews SET published = ? WHERE id = ?')
      .bind(boolInt(body.published), stringValue(body.id, 'Yorum bulunamadı.', 100)).run();
    return;
  }

  if (action === 'save_settings') {
    if (!body.settings || typeof body.settings !== 'object' || Array.isArray(body.settings)) throw new InputError('Ayarlar geçersiz.');
    const input = body.settings as Record<string, unknown>;
    const allowed = ['business_name', 'phone', 'whatsapp_number', 'contact_email', 'booking_change_cutoff_hours', 'business_note'];
    const statements = allowed.map((key) => {
      const value = typeof input[key] === 'string' ? input[key].trim().slice(0, key === 'business_note' ? 300 : 120) : '';
      if (key === 'booking_change_cutoff_hours' && (Number(value) < 1 || Number(value) > 48)) throw new InputError('İptal/değişiklik sınırı 1–48 saat arasında olmalı.');
      if (key === 'contact_email' && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) throw new InputError('Geçerli bir e-posta adresi girin.');
      if (key === 'whatsapp_number' && value && !/^90\d{10}$/.test(value.replace(/\D/g, ''))) throw new InputError('WhatsApp numarasını 905xxxxxxxxx biçiminde girin.');
      return db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').bind(key, key === 'whatsapp_number' ? value.replace(/\D/g, '') : value);
    });
    await db.batch(statements);
    return;
  }

  throw new InputError('Bilinmeyen yönetim işlemi.');
}

function assertSameOrigin(request: Request) {
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) throw new InputError('İstek kaynağı doğrulanamadı.');
}
function stringValue(value: unknown, message: string, max: number) { if (typeof value !== 'string' || !value.trim() || value.trim().length > max) throw new InputError(message); return value.trim(); }
function boolInt(value: unknown) { return value === true ? 1 : 0; }
function integerValue(value: unknown, min: number, max: number, message: string) { const parsed = Number(value); if (!Number.isInteger(parsed) || parsed < min || parsed > max) throw new InputError(message); return parsed; }
function moneyValue(value: unknown): number | null { if (value === '' || value === null || value === undefined) return null; const parsed = Number(value); if (!Number.isFinite(parsed) || parsed < 0 || parsed > 1_000_000) throw new InputError('Geçerli bir fiyat girin.'); return Math.round(parsed * 100); }
function timeValue(value: unknown) { if (typeof value !== 'string' || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value)) throw new InputError('Geçerli bir saat girin.'); return value; }
function dateValue(value: unknown) { if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(`${value}T12:00:00Z`))) throw new InputError('Geçerli bir tarih girin.'); return value; }
