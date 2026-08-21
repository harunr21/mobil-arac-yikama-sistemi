import { NextResponse } from 'next/server';
import { AvailabilityError, findAvailableLane, getAvailabilityDetails } from '@/app/lib/availability';
import { bookingResponse, endTime, sendBookingNotification, type BookingRow, verifyTurnstile } from '@/app/lib/bookings';
import { deriveManageToken, ensureDatabase, getRawD1, isActiveArea, sha256Hex } from '@/app/lib/db';
import { verifyAnkaraPlace } from '@/app/lib/places';

export const dynamic = 'force-dynamic';

type BookingInput = {
  idempotencyKey: string;
  serviceSlug: string;
  extraSlugs: string[];
  date: string;
  time: string;
  district: string;
  address: string;
  vehicleMake: string;
  vehicleModel: string;
  plate: string;
  customerName: string;
  phone: string;
  email: string;
  notes: string;
  turnstileToken?: string;
  placeId?: string;
};

class ValidationError extends Error {}

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get('content-length') ?? 0);
  if (contentLength > 32_768) return NextResponse.json({ error: 'Form verisi çok büyük.' }, { status: 413 });

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: 'Geçerli bir form gönderin.' }, { status: 400 });
  }

  try {
    const input = parseBookingInput(raw);
    await ensureDatabase();
    const db = getRawD1();
    const duplicate = await db.prepare('SELECT * FROM bookings WHERE idempotency_key = ?')
      .bind(input.idempotencyKey).first<BookingRow>();
    if (duplicate) {
      if (duplicate.email.toLocaleLowerCase('tr-TR') !== input.email.toLocaleLowerCase('tr-TR')) {
        return NextResponse.json({ error: 'Bu işlem anahtarı başka bir talep için kullanılmış.' }, { status: 409 });
      }
      return NextResponse.json(await bookingResponse(duplicate, input.idempotencyKey));
    }

    if (!(await verifyTurnstile(input.turnstileToken, request))) {
      return NextResponse.json({ error: 'Güvenlik doğrulaması başarısız. Lütfen tekrar deneyin.' }, { status: 400 });
    }
    if (!(await isActiveArea(input.district))) {
      return NextResponse.json({
        error: 'Bu ilçede henüz hizmet veremiyoruz.',
        unsupportedArea: true,
      }, { status: 422 });
    }
    if (input.placeId) {
      const placeStatus = await verifyAnkaraPlace(input.placeId, input.district);
      if (placeStatus === 'mismatch') return NextResponse.json({ error: 'Seçilen adres Ankara veya seçtiğiniz ilçe ile eşleşmiyor.' }, { status: 422 });
    }

    const details = await getAvailabilityDetails(input.serviceSlug, input.date, input.extraSlugs);
    const selectedSlot = details.slots.find((slot) => slot.time === input.time);
    if (!selectedSlot?.available) {
      return NextResponse.json({ error: 'Seçilen saat artık uygun değil. Lütfen başka bir saat seçin.' }, { status: 409 });
    }
    const allocation = await findAvailableLane(
      input.date,
      input.time,
      details.durationMinutes,
      details.capacity,
      details.slotMinutes,
    );
    if (!allocation) {
      return NextResponse.json({ error: 'Seçilen saat az önce doldu. Lütfen başka bir saat seçin.' }, { status: 409 });
    }

    const id = crypto.randomUUID();
    const token = await deriveManageToken(input.idempotencyKey, id);
    const tokenHash = await sha256Hex(token);
    const reference = createReference(input.date);
    const now = new Date().toISOString();
    const allPricesKnown = details.service.priceCents !== null && details.extras.every((extra) => extra.priceCents !== null);
    const estimatedTotalCents = allPricesKnown
      ? (details.service.priceCents ?? 0) + details.extras.reduce((sum, extra) => sum + (extra.priceCents ?? 0), 0)
      : null;
    const row: BookingRow = {
      id,
      reference,
      manage_token_hash: tokenHash,
      idempotency_key: input.idempotencyKey,
      status: 'pending',
      service_id: details.service.id,
      service_name: details.service.name,
      service_price_cents: details.service.priceCents,
      service_duration_minutes: details.service.durationMinutes,
      requested_date: input.date,
      start_time: input.time,
      end_time: endTime(input.time, details.durationMinutes),
      district: input.district,
      address: input.address,
      vehicle_make: input.vehicleMake,
      vehicle_model: input.vehicleModel,
      plate: input.plate,
      customer_name: input.customerName,
      phone: input.phone,
      email: input.email,
      notes: input.notes || null,
      estimated_total_cents: estimatedTotalCents,
      change_requested: 0,
      notification_status: 'queued',
      notification_error: null,
      created_at: now,
      updated_at: now,
    };

    const statements: D1PreparedStatement[] = [
      db.prepare(`INSERT INTO bookings (
        id, reference, manage_token_hash, idempotency_key, status, service_id, service_name,
        service_price_cents, service_duration_minutes, requested_date, start_time, end_time,
        district, address, vehicle_make, vehicle_model, plate, customer_name, phone, email,
        notes, estimated_total_cents, change_requested, notification_status, notification_error,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .bind(
          row.id, row.reference, row.manage_token_hash, row.idempotency_key, row.status,
          row.service_id, row.service_name, row.service_price_cents, row.service_duration_minutes,
          row.requested_date, row.start_time, row.end_time, row.district, row.address,
          row.vehicle_make, row.vehicle_model, row.plate, row.customer_name, row.phone, row.email,
          row.notes, row.estimated_total_cents, row.change_requested, row.notification_status,
          row.notification_error, row.created_at, row.updated_at,
        ),
      ...details.extras.map((extra) => db.prepare(`INSERT INTO booking_extras
        (id, booking_id, extra_id, name, price_cents, duration_minutes) VALUES (?, ?, ?, ?, ?, ?)`)
        .bind(crypto.randomUUID(), row.id, extra.id, extra.name, extra.priceCents, extra.durationMinutes)),
      ...allocation.starts.map((slotStart) => db.prepare(`INSERT INTO booking_slot_locks
        (id, booking_id, slot_start, lane) VALUES (?, ?, ?, ?)`)
        .bind(crypto.randomUUID(), row.id, slotStart, allocation.lane)),
      db.prepare(`INSERT INTO analytics_daily (date, event, route, count) VALUES (?, 'booking_submit', '/randevu', 1)
        ON CONFLICT(date, event, route) DO UPDATE SET count = count + 1`).bind(turkeyDate()),
    ];

    try {
      await db.batch(statements);
    } catch (error) {
      const racedDuplicate = await db.prepare('SELECT * FROM bookings WHERE idempotency_key = ?')
        .bind(input.idempotencyKey).first<BookingRow>();
      if (racedDuplicate && racedDuplicate.email.toLocaleLowerCase('tr-TR') === input.email.toLocaleLowerCase('tr-TR')) {
        return NextResponse.json(await bookingResponse(racedDuplicate, input.idempotencyKey));
      }
      console.error('booking_atomic_insert_failed', error);
      return NextResponse.json({ error: 'Seçilen saat az önce doldu. Lütfen uygunluğu yenileyin.' }, { status: 409 });
    }

    await sendBookingNotification(row, 'pending');
    return NextResponse.json(await bookingResponse(row, input.idempotencyKey), { status: 201 });
  } catch (error) {
    if (error instanceof ValidationError || error instanceof AvailabilityError) {
      return NextResponse.json({ error: error.message }, { status: error instanceof AvailabilityError ? error.status : 400 });
    }
    console.error('booking_request_failed', error);
    return NextResponse.json({ error: 'Talebiniz kaydedilemedi. Lütfen tekrar deneyin.' }, { status: 500 });
  }
}

function parseBookingInput(value: unknown): BookingInput {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new ValidationError('Geçerli bir form gönderin.');
  const input = value as Record<string, unknown>;
  const idempotencyKey = required(input.idempotencyKey, 'İşlem anahtarı', 128);
  if (!/^[A-Za-z0-9_-]{16,128}$/.test(idempotencyKey)) throw new ValidationError('İşlem anahtarı geçersiz.');
  const serviceSlug = required(input.serviceSlug, 'Hizmet', 80);
  const date = required(input.date, 'Tarih', 10);
  const time = required(input.time, 'Saat', 5);
  if (!/^\d{2}:\d{2}$/.test(time)) throw new ValidationError('Geçerli bir saat seçin.');
  const district = required(input.district, 'İlçe', 60);
  const address = required(input.address, 'Adres', 300);
  if (address.length < 8) throw new ValidationError('Açık adresinizi daha ayrıntılı yazın.');
  const vehicleMake = required(input.vehicleMake, 'Araç markası', 60);
  const vehicleModel = optionalField(input.vehicleModel, 'Araç modeli', 80);
  const plate = optionalField(input.plate, 'Plaka', 16).toLocaleUpperCase('tr-TR').replace(/\s+/g, ' ').trim();
  if (plate && !/^\d{2}\s?[A-ZÇĞİÖŞÜ]{1,3}\s?\d{2,4}$/.test(plate)) throw new ValidationError('Geçerli bir plaka yazın.');
  const customerName = required(input.customerName, 'Ad soyad', 100);
  if (customerName.length < 3) throw new ValidationError('Ad soyad en az 3 karakter olmalıdır.');
  const phone = normalizePhone(required(input.phone, 'Telefon', 24));
  const email = required(input.email, 'E-posta', 160).toLocaleLowerCase('tr-TR');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) throw new ValidationError('Geçerli bir e-posta adresi yazın.');
  const notes = optional(input.notes, 500);
  const rawExtraSlugs = input.extraSlugs ?? [];
  if (!Array.isArray(rawExtraSlugs) || rawExtraSlugs.length > 12) throw new ValidationError('Ek hizmet seçimi geçersiz.');
  const extraSlugs = rawExtraSlugs.map((item) => required(item, 'Ek hizmet', 80));
  return {
    idempotencyKey, serviceSlug, extraSlugs, date, time, district, address,
    vehicleMake, vehicleModel, plate, customerName, phone, email, notes,
    turnstileToken: typeof input.turnstileToken === 'string' ? input.turnstileToken : undefined,
    placeId: typeof input.placeId === 'string' && input.placeId.length <= 220 ? input.placeId : undefined,
  };
}

function required(value: unknown, label: string, max: number) {
  if (typeof value !== 'string') throw new ValidationError(`${label} alanı zorunludur.`);
  const normalized = value.trim();
  if (!normalized) throw new ValidationError(`${label} alanı zorunludur.`);
  if (normalized.length > max) throw new ValidationError(`${label} alanı çok uzun.`);
  return normalized;
}

function optional(value: unknown, max: number) {
  if (value == null || value === '') return '';
  if (typeof value !== 'string' || value.length > max) throw new ValidationError('Not alanı çok uzun.');
  return value.trim();
}

function optionalField(value: unknown, label: string, max: number) {
  if (value == null || value === '') return '';
  if (typeof value !== 'string' || value.trim().length > max) throw new ValidationError(`${label} alanı çok uzun.`);
  return value.trim();
}

function normalizePhone(value: string) {
  let digits = value.replace(/\D/g, '');
  if (digits.startsWith('90') && digits.length === 12) digits = digits.slice(2);
  if (digits.startsWith('0') && digits.length === 11) digits = digits.slice(1);
  if (!/^5\d{9}$/.test(digits)) throw new ValidationError('Geçerli bir Türkiye cep telefonu yazın.');
  return `+90${digits}`;
}

function createReference(date: string) {
  const bytes = crypto.getRandomValues(new Uint8Array(3));
  const suffix = [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('').toUpperCase();
  return `AMY-${date.replaceAll('-', '')}-${suffix}`;
}

function turkeyDate() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul' }).format(new Date());
}
