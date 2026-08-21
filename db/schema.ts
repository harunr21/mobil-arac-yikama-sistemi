import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';

export const services = sqliteTable(
  'services',
  {
    id: text('id').primaryKey(),
    slug: text('slug').notNull(),
    name: text('name').notNull(),
    shortDescription: text('short_description').notNull(),
    accent: text('accent').notNull(),
    priceCents: integer('price_cents'),
    durationMinutes: integer('duration_minutes').notNull(),
    sortOrder: integer('sort_order').notNull().default(0),
    active: integer('active', { mode: 'boolean' }).notNull().default(true),
    popular: integer('popular', { mode: 'boolean' }).notNull().default(false),
  },
  (table) => [
    uniqueIndex('idx_services_slug').on(table.slug),
    index('idx_services_active_sort').on(table.active, table.sortOrder),
  ],
);

export const serviceFeatures = sqliteTable(
  'service_features',
  {
    id: text('id').primaryKey(),
    serviceId: text('service_id').notNull().references(() => services.id, { onDelete: 'cascade' }),
    label: text('label').notNull(),
    sortOrder: integer('sort_order').notNull().default(0),
  },
  (table) => [index('idx_service_features_service_sort').on(table.serviceId, table.sortOrder)],
);

export const extras = sqliteTable(
  'extras',
  {
    id: text('id').primaryKey(),
    slug: text('slug').notNull(),
    name: text('name').notNull(),
    description: text('description').notNull(),
    priceCents: integer('price_cents'),
    durationMinutes: integer('duration_minutes').notNull().default(0),
    active: integer('active', { mode: 'boolean' }).notNull().default(true),
    sortOrder: integer('sort_order').notNull().default(0),
  },
  (table) => [
    uniqueIndex('idx_extras_slug').on(table.slug),
    index('idx_extras_active_sort').on(table.active, table.sortOrder),
  ],
);

export const serviceAreas = sqliteTable(
  'service_areas',
  {
    id: text('id').primaryKey(),
    district: text('district').notNull(),
    active: integer('active', { mode: 'boolean' }).notNull().default(false),
  },
  (table) => [uniqueIndex('idx_service_areas_district').on(table.district)],
);

export const availabilityRules = sqliteTable(
  'availability_rules',
  {
    id: text('id').primaryKey(),
    weekday: integer('weekday').notNull(),
    openTime: text('open_time').notNull(),
    closeTime: text('close_time').notNull(),
    capacity: integer('capacity').notNull().default(1),
    active: integer('active', { mode: 'boolean' }).notNull().default(true),
  },
  (table) => [uniqueIndex('idx_availability_rules_weekday').on(table.weekday)],
);

export const blackoutDates = sqliteTable(
  'blackout_dates',
  {
    id: text('id').primaryKey(),
    date: text('date').notNull(),
    reason: text('reason'),
  },
  (table) => [uniqueIndex('idx_blackout_dates_date').on(table.date)],
);

export const bookings = sqliteTable(
  'bookings',
  {
    id: text('id').primaryKey(),
    reference: text('reference').notNull(),
    manageTokenHash: text('manage_token_hash').notNull(),
    idempotencyKey: text('idempotency_key').notNull(),
    status: text('status').notNull().default('pending'),
    serviceId: text('service_id').notNull().references(() => services.id),
    serviceName: text('service_name').notNull(),
    servicePriceCents: integer('service_price_cents'),
    serviceDurationMinutes: integer('service_duration_minutes').notNull(),
    requestedDate: text('requested_date').notNull(),
    startTime: text('start_time').notNull(),
    endTime: text('end_time').notNull(),
    district: text('district').notNull(),
    address: text('address').notNull(),
    vehicleMake: text('vehicle_make').notNull(),
    vehicleModel: text('vehicle_model').notNull(),
    plate: text('plate').notNull(),
    customerName: text('customer_name').notNull(),
    phone: text('phone').notNull(),
    email: text('email').notNull(),
    notes: text('notes'),
    estimatedTotalCents: integer('estimated_total_cents'),
    changeRequested: integer('change_requested', { mode: 'boolean' }).notNull().default(false),
    notificationStatus: text('notification_status').notNull().default('queued'),
    notificationError: text('notification_error'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => [
    uniqueIndex('idx_bookings_reference').on(table.reference),
    uniqueIndex('idx_bookings_manage_token_hash').on(table.manageTokenHash),
    uniqueIndex('idx_bookings_idempotency_key').on(table.idempotencyKey),
    index('idx_bookings_date_status').on(table.requestedDate, table.status),
    index('idx_bookings_created_at').on(table.createdAt),
  ],
);

export const bookingExtras = sqliteTable(
  'booking_extras',
  {
    id: text('id').primaryKey(),
    bookingId: text('booking_id').notNull().references(() => bookings.id, { onDelete: 'cascade' }),
    extraId: text('extra_id').notNull().references(() => extras.id),
    name: text('name').notNull(),
    priceCents: integer('price_cents'),
    durationMinutes: integer('duration_minutes').notNull().default(0),
  },
  (table) => [index('idx_booking_extras_booking').on(table.bookingId)],
);

export const bookingSlotLocks = sqliteTable(
  'booking_slot_locks',
  {
    id: text('id').primaryKey(),
    bookingId: text('booking_id').notNull().references(() => bookings.id, { onDelete: 'cascade' }),
    slotStart: text('slot_start').notNull(),
    lane: integer('lane').notNull(),
  },
  (table) => [
    uniqueIndex('idx_booking_slot_locks_slot_lane').on(table.slotStart, table.lane),
    index('idx_booking_slot_locks_booking').on(table.bookingId),
  ],
);

export const galleryItems = sqliteTable(
  'gallery_items',
  {
    id: text('id').primaryKey(),
    title: text('title').notNull(),
    serviceId: text('service_id').references(() => services.id, { onDelete: 'set null' }),
    district: text('district').notNull(),
    completedAt: text('completed_at').notNull(),
    published: integer('published', { mode: 'boolean' }).notNull().default(false),
    createdAt: text('created_at').notNull(),
  },
  (table) => [index('idx_gallery_items_published_date').on(table.published, table.completedAt)],
);

export const galleryImages = sqliteTable(
  'gallery_images',
  {
    id: text('id').primaryKey(),
    galleryItemId: text('gallery_item_id').notNull().references(() => galleryItems.id, { onDelete: 'cascade' }),
    r2Key: text('r2_key').notNull(),
    altText: text('alt_text').notNull(),
    sortOrder: integer('sort_order').notNull().default(0),
  },
  (table) => [index('idx_gallery_images_item_sort').on(table.galleryItemId, table.sortOrder)],
);

export const reviews = sqliteTable(
  'reviews',
  {
    id: text('id').primaryKey(),
    customerName: text('customer_name').notNull(),
    rating: integer('rating').notNull(),
    quote: text('quote').notNull(),
    published: integer('published', { mode: 'boolean' }).notNull().default(false),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: text('created_at').notNull(),
  },
  (table) => [index('idx_reviews_published_sort').on(table.published, table.sortOrder)],
);

export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
});

export const adminCredentials = sqliteTable('admin_credentials', {
  id: text('id').primaryKey(),
  username: text('username').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const adminSessions = sqliteTable(
  'admin_sessions',
  {
    tokenHash: text('token_hash').primaryKey(),
    username: text('username').notNull(),
    createdAt: text('created_at').notNull(),
    expiresAt: text('expires_at').notNull(),
  },
  (table) => [index('idx_admin_sessions_expires').on(table.expiresAt)],
);

export const adminLoginAttempts = sqliteTable('admin_login_attempts', {
  keyHash: text('key_hash').primaryKey(),
  attemptCount: integer('attempt_count').notNull().default(0),
  windowStartedAt: text('window_started_at').notNull(),
  blockedUntil: text('blocked_until'),
});

export const analyticsDaily = sqliteTable(
  'analytics_daily',
  {
    date: text('date').notNull(),
    event: text('event').notNull(),
    route: text('route').notNull(),
    count: integer('count').notNull().default(0),
  },
  (table) => [uniqueIndex('idx_analytics_daily_key').on(table.date, table.event, table.route)],
);
