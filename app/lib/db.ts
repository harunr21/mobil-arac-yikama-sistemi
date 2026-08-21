import { env } from 'cloudflare:workers';

export type ServiceRecord = {
  id: string;
  slug: string;
  name: string;
  shortDescription: string;
  accent: string;
  priceCents: number | null;
  durationMinutes: number;
  sortOrder: number;
  active: boolean;
  popular: boolean;
};

export type ExtraRecord = {
  id: string;
  slug: string;
  name: string;
  description: string;
  priceCents: number | null;
  durationMinutes: number;
  active: boolean;
  sortOrder: number;
};

type RawService = {
  id: string;
  slug: string;
  name: string;
  short_description: string;
  accent: string;
  price_cents: number | null;
  duration_minutes: number;
  sort_order: number;
  active: number;
  popular: number;
};

type RawExtra = {
  id: string;
  slug: string;
  name: string;
  description: string;
  price_cents: number | null;
  duration_minutes: number;
  active: number;
  sort_order: number;
};

const tableStatements = [
  `CREATE TABLE IF NOT EXISTS services (
    id TEXT PRIMARY KEY NOT NULL, slug TEXT NOT NULL, name TEXT NOT NULL,
    short_description TEXT NOT NULL, accent TEXT NOT NULL, price_cents INTEGER,
    duration_minutes INTEGER NOT NULL, sort_order INTEGER DEFAULT 0 NOT NULL,
    active INTEGER DEFAULT 1 NOT NULL, popular INTEGER DEFAULT 0 NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS service_features (
    id TEXT PRIMARY KEY NOT NULL, service_id TEXT NOT NULL, label TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0 NOT NULL,
    FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS extras (
    id TEXT PRIMARY KEY NOT NULL, slug TEXT NOT NULL, name TEXT NOT NULL,
    description TEXT NOT NULL, price_cents INTEGER, duration_minutes INTEGER DEFAULT 0 NOT NULL,
    active INTEGER DEFAULT 1 NOT NULL, sort_order INTEGER DEFAULT 0 NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS service_areas (
    id TEXT PRIMARY KEY NOT NULL, district TEXT NOT NULL, active INTEGER DEFAULT 0 NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS availability_rules (
    id TEXT PRIMARY KEY NOT NULL, weekday INTEGER NOT NULL, open_time TEXT NOT NULL,
    close_time TEXT NOT NULL, capacity INTEGER DEFAULT 1 NOT NULL, active INTEGER DEFAULT 1 NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS blackout_dates (
    id TEXT PRIMARY KEY NOT NULL, date TEXT NOT NULL, reason TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS bookings (
    id TEXT PRIMARY KEY NOT NULL, reference TEXT NOT NULL, manage_token_hash TEXT NOT NULL,
    idempotency_key TEXT NOT NULL, status TEXT DEFAULT 'pending' NOT NULL,
    service_id TEXT NOT NULL, service_name TEXT NOT NULL, service_price_cents INTEGER,
    service_duration_minutes INTEGER NOT NULL, requested_date TEXT NOT NULL,
    start_time TEXT NOT NULL, end_time TEXT NOT NULL, district TEXT NOT NULL,
    address TEXT NOT NULL, vehicle_make TEXT NOT NULL, vehicle_model TEXT NOT NULL,
    plate TEXT NOT NULL, customer_name TEXT NOT NULL, phone TEXT NOT NULL,
    email TEXT NOT NULL, notes TEXT, estimated_total_cents INTEGER,
    change_requested INTEGER DEFAULT 0 NOT NULL,
    notification_status TEXT DEFAULT 'queued' NOT NULL, notification_error TEXT,
    created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
    FOREIGN KEY (service_id) REFERENCES services(id)
  )`,
  `CREATE TABLE IF NOT EXISTS booking_extras (
    id TEXT PRIMARY KEY NOT NULL, booking_id TEXT NOT NULL, extra_id TEXT NOT NULL,
    name TEXT NOT NULL, price_cents INTEGER, duration_minutes INTEGER DEFAULT 0 NOT NULL,
    FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
    FOREIGN KEY (extra_id) REFERENCES extras(id)
  )`,
  `CREATE TABLE IF NOT EXISTS booking_slot_locks (
    id TEXT PRIMARY KEY NOT NULL, booking_id TEXT NOT NULL, slot_start TEXT NOT NULL,
    lane INTEGER NOT NULL,
    FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS gallery_items (
    id TEXT PRIMARY KEY NOT NULL, title TEXT NOT NULL, service_id TEXT,
    district TEXT NOT NULL, completed_at TEXT NOT NULL, published INTEGER DEFAULT 0 NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE SET NULL
  )`,
  `CREATE TABLE IF NOT EXISTS gallery_images (
    id TEXT PRIMARY KEY NOT NULL, gallery_item_id TEXT NOT NULL, r2_key TEXT NOT NULL,
    alt_text TEXT NOT NULL, sort_order INTEGER DEFAULT 0 NOT NULL,
    FOREIGN KEY (gallery_item_id) REFERENCES gallery_items(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS reviews (
    id TEXT PRIMARY KEY NOT NULL, customer_name TEXT NOT NULL, rating INTEGER NOT NULL,
    quote TEXT NOT NULL, published INTEGER DEFAULT 0 NOT NULL,
    sort_order INTEGER DEFAULT 0 NOT NULL, created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS admin_credentials (
    id TEXT PRIMARY KEY NOT NULL, username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL, updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS admin_sessions (
    token_hash TEXT PRIMARY KEY NOT NULL, username TEXT NOT NULL,
    created_at TEXT NOT NULL, expires_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS admin_login_attempts (
    key_hash TEXT PRIMARY KEY NOT NULL, attempt_count INTEGER DEFAULT 0 NOT NULL,
    window_started_at TEXT NOT NULL, blocked_until TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS analytics_daily (
    date TEXT NOT NULL, event TEXT NOT NULL, route TEXT NOT NULL, count INTEGER DEFAULT 0 NOT NULL
  )`,
] as const;

const indexStatements = [
  'CREATE UNIQUE INDEX IF NOT EXISTS idx_services_slug ON services(slug)',
  'CREATE INDEX IF NOT EXISTS idx_services_active_sort ON services(active, sort_order)',
  'CREATE INDEX IF NOT EXISTS idx_service_features_service_sort ON service_features(service_id, sort_order)',
  'CREATE UNIQUE INDEX IF NOT EXISTS idx_extras_slug ON extras(slug)',
  'CREATE INDEX IF NOT EXISTS idx_extras_active_sort ON extras(active, sort_order)',
  'CREATE UNIQUE INDEX IF NOT EXISTS idx_service_areas_district ON service_areas(district)',
  'CREATE UNIQUE INDEX IF NOT EXISTS idx_availability_rules_weekday ON availability_rules(weekday)',
  'CREATE UNIQUE INDEX IF NOT EXISTS idx_blackout_dates_date ON blackout_dates(date)',
  'CREATE UNIQUE INDEX IF NOT EXISTS idx_bookings_reference ON bookings(reference)',
  'CREATE UNIQUE INDEX IF NOT EXISTS idx_bookings_manage_token_hash ON bookings(manage_token_hash)',
  'CREATE UNIQUE INDEX IF NOT EXISTS idx_bookings_idempotency_key ON bookings(idempotency_key)',
  'CREATE INDEX IF NOT EXISTS idx_bookings_date_status ON bookings(requested_date, status)',
  'CREATE INDEX IF NOT EXISTS idx_bookings_created_at ON bookings(created_at)',
  'CREATE INDEX IF NOT EXISTS idx_booking_extras_booking ON booking_extras(booking_id)',
  'CREATE UNIQUE INDEX IF NOT EXISTS idx_booking_slot_locks_slot_lane ON booking_slot_locks(slot_start, lane)',
  'CREATE INDEX IF NOT EXISTS idx_booking_slot_locks_booking ON booking_slot_locks(booking_id)',
  'CREATE INDEX IF NOT EXISTS idx_gallery_items_published_date ON gallery_items(published, completed_at)',
  'CREATE INDEX IF NOT EXISTS idx_gallery_images_item_sort ON gallery_images(gallery_item_id, sort_order)',
  'CREATE INDEX IF NOT EXISTS idx_reviews_published_sort ON reviews(published, sort_order)',
  'CREATE INDEX IF NOT EXISTS idx_admin_sessions_expires ON admin_sessions(expires_at)',
  'CREATE UNIQUE INDEX IF NOT EXISTS idx_analytics_daily_key ON analytics_daily(date, event, route)',
] as const;

const serviceSeeds = [
  ['svc-exterior', 'dis-yikama-cila', 'Dış Yıkama & Cila', 'Köpüklü dış yıkama, jant temizliği ve hızlı koruyucu cila.', '#11b7ad', null, 60, 1, 1, 0],
  ['svc-mini', 'mini-ic-dis', 'Mini İç-Dış', 'Günlük kullanım için pratik iç ve dış temizlik.', '#19a9e5', null, 90, 2, 1, 0],
  ['svc-mini-plus', 'mini-ic-dis-plus', 'Mini İç-Dış Plus', 'Detaylı iç yüzey bakımıyla güçlendirilmiş mini paket.', '#6d78e8', null, 120, 3, 1, 1],
  ['svc-pet', 'evcil-hayvan-paketi', 'Evcil Hayvan Paketi', 'Tüy, koku ve temas yüzeylerine özel yoğun temizlik.', '#8b65d8', null, 150, 4, 1, 0],
  ['svc-detail', 'full-detayli-temizlik', 'Full Detaylı Temizlik', 'Aracın iç ve dış yüzeylerinde kapsamlı detay uygulaması.', '#0d6b78', null, 240, 5, 1, 0],
  ['svc-interior', 'sadece-ic-temizlik', 'Sadece İç Temizlik', 'Kabin, koltuk, paspas ve bagaj odaklı iç temizlik.', '#3aa86b', null, 120, 6, 1, 0],
] as const;

const featureSeeds = [
  ['sf-1-1', 'svc-exterior', 'Basınçlı ön durulama', 1], ['sf-1-2', 'svc-exterior', 'Köpüklü el yıkama', 2], ['sf-1-3', 'svc-exterior', 'Jant ve lastik bakımı', 3], ['sf-1-4', 'svc-exterior', 'Hızlı koruyucu cila', 4],
  ['sf-2-1', 'svc-mini', 'Dış yıkama', 1], ['sf-2-2', 'svc-mini', 'İç süpürme', 2], ['sf-2-3', 'svc-mini', 'Torpido ve yüzey silme', 3], ['sf-2-4', 'svc-mini', 'Cam temizliği', 4],
  ['sf-3-1', 'svc-mini-plus', 'Mini İç-Dış kapsamı', 1], ['sf-3-2', 'svc-mini-plus', 'Detaylı plastik bakımı', 2], ['sf-3-3', 'svc-mini-plus', 'Bagaj temizliği', 3], ['sf-3-4', 'svc-mini-plus', 'Koku giderme', 4],
  ['sf-4-1', 'svc-pet', 'Yoğun tüy toplama', 1], ['sf-4-2', 'svc-pet', 'Koku nötralizasyonu', 2], ['sf-4-3', 'svc-pet', 'Koltuk ve zemin detay', 3], ['sf-4-4', 'svc-pet', 'İç yüzey hijyeni', 4],
  ['sf-5-1', 'svc-detail', 'Detaylı iç temizlik', 1], ['sf-5-2', 'svc-detail', 'Detaylı dış temizlik', 2], ['sf-5-3', 'svc-detail', 'Leke odaklı uygulama', 3], ['sf-5-4', 'svc-detail', 'Koruyucu yüzey bakımı', 4],
  ['sf-6-1', 'svc-interior', 'Kabin ve bagaj süpürme', 1], ['sf-6-2', 'svc-interior', 'Koltuk ve paspas temizliği', 2], ['sf-6-3', 'svc-interior', 'Plastik yüzey bakımı', 3], ['sf-6-4', 'svc-interior', 'İç cam temizliği', 4],
] as const;

const extraSeeds = [
  ['ext-seat', 'koltuk-leke-uygulamasi', 'Koltuk Leke Uygulaması', 'Belirli lekelere yoğun bölgesel uygulama.', null, 30, 1, 1],
  ['ext-engine', 'motor-yuzey-temizligi', 'Motor Yüzey Temizliği', 'Uygun bölgelere kontrollü yüzey temizliği.', null, 30, 1, 2],
  ['ext-odor', 'ozon-koku-giderme', 'Ozon ile Koku Giderme', 'Kabin kokularına destekleyici ozon uygulaması.', null, 30, 1, 3],
] as const;

const districts = ['Akyurt', 'Altındağ', 'Ayaş', 'Bala', 'Beypazarı', 'Çamlıdere', 'Çankaya', 'Çubuk', 'Elmadağ', 'Etimesgut', 'Evren', 'Gölbaşı', 'Güdül', 'Haymana', 'Kahramankazan', 'Kalecik', 'Keçiören', 'Kızılcahamam', 'Mamak', 'Nallıhan', 'Polatlı', 'Pursaklar', 'Sincan', 'Şereflikoçhisar', 'Yenimahalle'] as const;
const initiallyActiveDistricts = new Set(['Çankaya', 'Etimesgut', 'Gölbaşı', 'Keçiören', 'Mamak', 'Pursaklar', 'Sincan', 'Yenimahalle']);

let initializePromise: Promise<void> | null = null;

export function getRawD1(): D1Database {
  const runtime = env as unknown as { DB?: D1Database };
  if (!runtime.DB) throw new Error('D1 DB binding is not available.');
  return runtime.DB;
}

export async function ensureDatabase(): Promise<void> {
  if (!initializePromise) {
    initializePromise = initializeDatabase().catch((error) => {
      initializePromise = null;
      throw error;
    });
  }
  return initializePromise;
}

async function initializeDatabase() {
  const db = getRawD1();
  await db.batch([...tableStatements, ...indexStatements].map((sql) => db.prepare(sql)));

  const seedStatements: D1PreparedStatement[] = serviceSeeds.map((row) =>
    db.prepare(`INSERT OR IGNORE INTO services
      (id, slug, name, short_description, accent, price_cents, duration_minutes, sort_order, active, popular)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(...row),
  );
  seedStatements.push(...featureSeeds.map((row) =>
    db.prepare('INSERT OR IGNORE INTO service_features (id, service_id, label, sort_order) VALUES (?, ?, ?, ?)').bind(...row),
  ));
  seedStatements.push(...extraSeeds.map((row) =>
    db.prepare(`INSERT OR IGNORE INTO extras
      (id, slug, name, description, price_cents, duration_minutes, active, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).bind(...row),
  ));
  seedStatements.push(...districts.map((district, index) =>
    db.prepare('INSERT OR IGNORE INTO service_areas (id, district, active) VALUES (?, ?, ?)')
      .bind(`area-${index + 1}`, district, initiallyActiveDistricts.has(district) ? 1 : 0),
  ));
  for (let weekday = 0; weekday <= 6; weekday += 1) {
    const isSunday = weekday === 0;
    seedStatements.push(db.prepare(`INSERT OR IGNORE INTO availability_rules
      (id, weekday, open_time, close_time, capacity, active) VALUES (?, ?, ?, ?, ?, ?)`)
      .bind(`rule-${weekday}`, weekday, '09:00', isSunday ? '17:00' : '18:00', 1, isSunday ? 0 : 1));
  }
  const defaultSettings = [
    ['business_name', 'Ankara Mobil Oto Yıkama'],
    ['whatsapp_number', '905555555555'],
    ['booking_change_cutoff_hours', '2'],
    ['slot_minutes', '30'],
  ] as const;
  seedStatements.push(...defaultSettings.map(([key, value]) =>
    db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)').bind(key, value),
  ));
  await db.batch(seedStatements);
  await db.prepare('PRAGMA optimize').run();
}

export async function listServices(activeOnly = true): Promise<ServiceRecord[]> {
  await ensureDatabase();
  const db = getRawD1();
  const query = activeOnly
    ? 'SELECT * FROM services WHERE active = 1 ORDER BY sort_order, name'
    : 'SELECT * FROM services ORDER BY sort_order, name';
  const rows = await db.prepare(query).all<RawService>();
  return (rows.results ?? []).map(mapService);
}

export async function getServiceBySlug(slug: string): Promise<ServiceRecord | null> {
  await ensureDatabase();
  const row = await getRawD1().prepare('SELECT * FROM services WHERE slug = ? AND active = 1').bind(slug).first<RawService>();
  return row ? mapService(row) : null;
}

export async function listExtras(activeOnly = true): Promise<ExtraRecord[]> {
  await ensureDatabase();
  const query = activeOnly
    ? 'SELECT * FROM extras WHERE active = 1 ORDER BY sort_order, name'
    : 'SELECT * FROM extras ORDER BY sort_order, name';
  const rows = await getRawD1().prepare(query).all<RawExtra>();
  return (rows.results ?? []).map(mapExtra);
}

export async function getExtrasBySlugs(slugs: string[]): Promise<ExtraRecord[]> {
  if (slugs.length === 0) return [];
  await ensureDatabase();
  const unique = [...new Set(slugs)];
  const placeholders = unique.map(() => '?').join(', ');
  const rows = await getRawD1().prepare(
    `SELECT * FROM extras WHERE active = 1 AND slug IN (${placeholders}) ORDER BY sort_order`,
  ).bind(...unique).all<RawExtra>();
  return (rows.results ?? []).map(mapExtra);
}

export async function listActiveAreas(): Promise<string[]> {
  await ensureDatabase();
  const rows = await getRawD1().prepare(
    'SELECT district FROM service_areas WHERE active = 1 ORDER BY district COLLATE NOCASE',
  ).all<{ district: string }>();
  return (rows.results ?? []).map((row) => row.district);
}

export async function isActiveArea(district: string): Promise<boolean> {
  await ensureDatabase();
  const row = await getRawD1().prepare(
    'SELECT 1 AS ok FROM service_areas WHERE district = ? COLLATE NOCASE AND active = 1',
  ).bind(district.trim()).first<{ ok: number }>();
  return row?.ok === 1;
}

export async function getBusinessSettings(): Promise<Record<string, string>> {
  await ensureDatabase();
  const rows = await getRawD1().prepare('SELECT key, value FROM settings').all<{ key: string; value: string }>();
  return Object.fromEntries((rows.results ?? []).map(({ key, value }) => [key, value]));
}

export async function sha256Hex(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function deriveManageToken(idempotencyKey: string, bookingId: string): Promise<string> {
  const material = new TextEncoder().encode(`ankara-booking-v1:${idempotencyKey}:${bookingId}`);
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', material));
  let binary = '';
  for (const byte of digest) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

export function localDateTime(date: string, time: string): Date {
  return new Date(`${date}T${time}:00+03:00`);
}

export function minutesToTime(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

export function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

export function slotStarts(date: string, startTime: string, durationMinutes: number, slotMinutes = 30): string[] {
  const start = timeToMinutes(startTime);
  const roundedDuration = Math.ceil(durationMinutes / slotMinutes) * slotMinutes;
  const slots: string[] = [];
  for (let offset = 0; offset < roundedDuration; offset += slotMinutes) {
    slots.push(`${date}T${minutesToTime(start + offset)}:00+03:00`);
  }
  return slots;
}

function mapService(row: RawService): ServiceRecord {
  return {
    id: row.id, slug: row.slug, name: row.name, shortDescription: row.short_description,
    accent: row.accent, priceCents: row.price_cents, durationMinutes: row.duration_minutes,
    sortOrder: row.sort_order, active: row.active === 1, popular: row.popular === 1,
  };
}

function mapExtra(row: RawExtra): ExtraRecord {
  return {
    id: row.id, slug: row.slug, name: row.name, description: row.description,
    priceCents: row.price_cents, durationMinutes: row.duration_minutes,
    active: row.active === 1, sortOrder: row.sort_order,
  };
}
