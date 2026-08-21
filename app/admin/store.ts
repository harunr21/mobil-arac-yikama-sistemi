import 'server-only';

import { ensureDatabase, getRawD1 } from '@/app/lib/db';
import type { AdminSnapshot, BookingStatus } from './types';

type RawBooking = {
  id: string; reference: string; status: BookingStatus; service_name: string;
  requested_date: string; start_time: string; district: string; address: string;
  customer_name: string; phone: string; email: string | null; vehicle_make: string;
  vehicle_model: string; plate: string; estimated_total_cents: number | null;
  notification_status: string | null; notification_error: string | null; created_at: string;
};

export async function getAdminSnapshot(): Promise<AdminSnapshot> {
  await ensureDatabase();
  const db = getRawD1();
  const [bookings, services, extras, areas, rules, gallery, reviews, settings] = await Promise.all([
    db.prepare(`SELECT id, reference, status, service_name, requested_date, start_time, district,
      address, customer_name, phone, email, vehicle_make, vehicle_model, plate,
      estimated_total_cents, notification_status, notification_error, created_at
      FROM bookings ORDER BY requested_date DESC, start_time DESC, created_at DESC LIMIT 250`).all<RawBooking>(),
    db.prepare('SELECT id, name, price_cents, duration_minutes, active, popular, sort_order FROM services ORDER BY sort_order, name').all<{ id: string; name: string; price_cents: number | null; duration_minutes: number; active: number; popular: number; sort_order: number }>(),
    db.prepare('SELECT id, name, price_cents, duration_minutes, active FROM extras ORDER BY sort_order, name').all<{ id: string; name: string; price_cents: number | null; duration_minutes: number; active: number }>(),
    db.prepare('SELECT id, district, active FROM service_areas ORDER BY district COLLATE NOCASE').all<{ id: string; district: string; active: number }>(),
    db.prepare('SELECT id, weekday, open_time, close_time, capacity, active FROM availability_rules ORDER BY weekday').all<{ id: string; weekday: number; open_time: string; close_time: string; capacity: number; active: number }>(),
    db.prepare(`SELECT gi.id, gi.title, gi.district, gi.completed_at, gi.published,
      COUNT(gim.id) AS image_count FROM gallery_items gi
      LEFT JOIN gallery_images gim ON gim.gallery_item_id = gi.id
      GROUP BY gi.id ORDER BY gi.completed_at DESC, gi.created_at DESC`).all<{ id: string; title: string; district: string; completed_at: string; published: number; image_count: number }>(),
    db.prepare('SELECT id, customer_name, rating, quote, published, sort_order FROM reviews ORDER BY sort_order, created_at DESC').all<{ id: string; customer_name: string; rating: number; quote: string; published: number; sort_order: number }>(),
    db.prepare('SELECT key, value FROM settings').all<{ key: string; value: string }>(),
  ]);

  return {
    bookings: (bookings.results ?? []).map((row) => ({
      id: row.id, reference: row.reference, status: row.status, serviceName: row.service_name,
      requestedDate: row.requested_date, startTime: row.start_time, district: row.district,
      address: row.address, customerName: row.customer_name, customerPhone: row.phone,
      customerEmail: row.email, vehicle: [row.vehicle_make, row.vehicle_model, row.plate].filter(Boolean).join(' · '),
      totalCents: row.estimated_total_cents, notificationStatus: row.notification_status,
      notificationError: row.notification_error, createdAt: row.created_at,
    })),
    services: (services.results ?? []).map((row) => ({ id: row.id, name: row.name, priceCents: row.price_cents, durationMinutes: row.duration_minutes, active: row.active === 1, popular: row.popular === 1, sortOrder: row.sort_order })),
    extras: (extras.results ?? []).map((row) => ({ id: row.id, name: row.name, priceCents: row.price_cents, durationMinutes: row.duration_minutes, active: row.active === 1 })),
    areas: (areas.results ?? []).map((row) => ({ id: row.id, district: row.district, active: row.active === 1 })),
    rules: (rules.results ?? []).map((row) => ({ id: row.id, weekday: row.weekday, openTime: row.open_time, closeTime: row.close_time, capacity: row.capacity, active: row.active === 1 })),
    gallery: (gallery.results ?? []).map((row) => ({ id: row.id, title: row.title, district: row.district, completedAt: row.completed_at, published: row.published === 1, imageCount: Number(row.image_count) })),
    reviews: (reviews.results ?? []).map((row) => ({ id: row.id, customerName: row.customer_name, rating: row.rating, quote: row.quote, published: row.published === 1, sortOrder: row.sort_order })),
    settings: Object.fromEntries((settings.results ?? []).map((row) => [row.key, row.value])),
  };
}

export async function getBookingForNotification(id: string) {
  await ensureDatabase();
  return getRawD1().prepare(`SELECT id, reference, status, service_name, requested_date,
    start_time, customer_name, email FROM bookings WHERE id = ?`).bind(id).first<{
      id: string; reference: string; status: BookingStatus; service_name: string;
      requested_date: string; start_time: string; customer_name: string; email: string;
    }>();
}

