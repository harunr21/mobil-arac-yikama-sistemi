import {
  ensureDatabase,
  getExtrasBySlugs,
  getRawD1,
  getServiceBySlug,
  localDateTime,
  minutesToTime,
  slotStarts,
  timeToMinutes,
  type ExtraRecord,
  type ServiceRecord,
} from './db';

export type AvailabilitySlot = { time: string; label: string; available: boolean };

export type AvailabilityDetails = {
  slots: AvailabilitySlot[];
  service: ServiceRecord;
  extras: ExtraRecord[];
  durationMinutes: number;
  capacity: number;
  slotMinutes: number;
  closedReason: string | null;
};

type AvailabilityRule = {
  open_time: string;
  close_time: string;
  capacity: number;
  active: number;
};

export class AvailabilityError extends Error {
  constructor(message: string, public readonly status = 400) {
    super(message);
  }
}

export async function getAvailabilityDetails(
  serviceSlug: string,
  date: string,
  extraSlugs: string[],
  excludeBookingId?: string,
): Promise<AvailabilityDetails> {
  assertDate(date);
  await ensureDatabase();
  const service = await getServiceBySlug(serviceSlug);
  if (!service) throw new AvailabilityError('Seçilen hizmet bulunamadı.', 404);

  const extras = await getExtrasBySlugs(extraSlugs);
  if (extras.length !== new Set(extraSlugs).size) {
    throw new AvailabilityError('Seçilen ek hizmetlerden biri kullanılamıyor.');
  }

  const db = getRawD1();
  const weekday = new Date(`${date}T12:00:00Z`).getUTCDay();
  const rule = await db.prepare(
    'SELECT open_time, close_time, capacity, active FROM availability_rules WHERE weekday = ?',
  ).bind(weekday).first<AvailabilityRule>();
  const durationMinutes = service.durationMinutes + extras.reduce((total, extra) => total + extra.durationMinutes, 0);
  const setting = await db.prepare("SELECT value FROM settings WHERE key = 'slot_minutes'").first<{ value: string }>();
  const slotMinutes = boundedInt(setting?.value, 30, 15, 120);

  if (!rule || rule.active !== 1) {
    return { slots: [], service, extras, durationMinutes, capacity: rule?.capacity ?? 1, slotMinutes, closedReason: 'Bu gün hizmet verilmiyor.' };
  }
  const blackout = await db.prepare('SELECT reason FROM blackout_dates WHERE date = ?').bind(date).first<{ reason: string | null }>();
  if (blackout) {
    return { slots: [], service, extras, durationMinutes, capacity: rule.capacity, slotMinutes, closedReason: blackout.reason || 'Bu tarih hizmete kapalı.' };
  }

  const lockQuery = excludeBookingId
    ? "SELECT slot_start, lane FROM booking_slot_locks WHERE slot_start LIKE ? AND booking_id != ?"
    : "SELECT slot_start, lane FROM booking_slot_locks WHERE slot_start LIKE ?";
  const statement = excludeBookingId
    ? db.prepare(lockQuery).bind(`${date}%`, excludeBookingId)
    : db.prepare(lockQuery).bind(`${date}%`);
  const lockRows = await statement.all<{ slot_start: string; lane: number }>();
  const occupied = new Set((lockRows.results ?? []).map((row) => `${row.slot_start}|${row.lane}`));
  const open = timeToMinutes(rule.open_time);
  const close = timeToMinutes(rule.close_time);
  const now = Date.now();
  const slots: AvailabilitySlot[] = [];

  for (let start = open; start + durationMinutes <= close; start += slotMinutes) {
    const time = minutesToTime(start);
    const starts = slotStarts(date, time, durationMinutes, slotMinutes);
    let available = localDateTime(date, time).getTime() > now;
    if (available) {
      available = findFreeLaneFromSet(starts, rule.capacity, occupied) !== null;
    }
    slots.push({ time, label: time, available });
  }

  return { slots, service, extras, durationMinutes, capacity: rule.capacity, slotMinutes, closedReason: null };
}

export async function findAvailableLane(
  date: string,
  time: string,
  durationMinutes: number,
  capacity: number,
  slotMinutes: number,
  excludeBookingId?: string,
): Promise<{ lane: number; starts: string[] } | null> {
  const starts = slotStarts(date, time, durationMinutes, slotMinutes);
  const placeholders = starts.map(() => '?').join(', ');
  const excluding = excludeBookingId ? ' AND booking_id != ?' : '';
  const values: (string | number)[] = [...starts];
  if (excludeBookingId) values.push(excludeBookingId);
  const locks = await getRawD1().prepare(
    `SELECT slot_start, lane FROM booking_slot_locks WHERE slot_start IN (${placeholders})${excluding}`,
  ).bind(...values).all<{ slot_start: string; lane: number }>();
  const occupied = new Set((locks.results ?? []).map((row) => `${row.slot_start}|${row.lane}`));
  const lane = findFreeLaneFromSet(starts, capacity, occupied);
  return lane === null ? null : { lane, starts };
}

function findFreeLaneFromSet(starts: string[], capacity: number, occupied: Set<string>): number | null {
  for (let lane = 1; lane <= Math.max(1, capacity); lane += 1) {
    if (starts.every((slot) => !occupied.has(`${slot}|${lane}`))) return lane;
  }
  return null;
}

function assertDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new AvailabilityError('Geçerli bir tarih seçin.');
  const parsed = new Date(`${value}T12:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    throw new AvailabilityError('Geçerli bir tarih seçin.');
  }
  const today = new Date();
  const turkeyToday = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul' }).format(today);
  if (value < turkeyToday) throw new AvailabilityError('Geçmiş bir tarih seçilemez.');
  const max = new Date();
  max.setUTCDate(max.getUTCDate() + 90);
  if (value > max.toISOString().slice(0, 10)) throw new AvailabilityError('En fazla 90 gün sonrası için talep oluşturabilirsiniz.');
}

function boundedInt(value: string | undefined, fallback: number, min: number, max: number) {
  const numeric = Number(value);
  return Number.isInteger(numeric) && numeric >= min && numeric <= max ? numeric : fallback;
}
