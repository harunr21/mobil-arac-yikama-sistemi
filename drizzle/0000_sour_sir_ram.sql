CREATE TABLE `analytics_daily` (
	`date` text NOT NULL,
	`event` text NOT NULL,
	`route` text NOT NULL,
	`count` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_analytics_daily_key` ON `analytics_daily` (`date`,`event`,`route`);--> statement-breakpoint
CREATE TABLE `availability_rules` (
	`id` text PRIMARY KEY NOT NULL,
	`weekday` integer NOT NULL,
	`open_time` text NOT NULL,
	`close_time` text NOT NULL,
	`capacity` integer DEFAULT 1 NOT NULL,
	`active` integer DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_availability_rules_weekday` ON `availability_rules` (`weekday`);--> statement-breakpoint
CREATE TABLE `blackout_dates` (
	`id` text PRIMARY KEY NOT NULL,
	`date` text NOT NULL,
	`reason` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_blackout_dates_date` ON `blackout_dates` (`date`);--> statement-breakpoint
CREATE TABLE `booking_extras` (
	`id` text PRIMARY KEY NOT NULL,
	`booking_id` text NOT NULL,
	`extra_id` text NOT NULL,
	`name` text NOT NULL,
	`price_cents` integer,
	`duration_minutes` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`booking_id`) REFERENCES `bookings`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`extra_id`) REFERENCES `extras`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_booking_extras_booking` ON `booking_extras` (`booking_id`);--> statement-breakpoint
CREATE TABLE `booking_slot_locks` (
	`id` text PRIMARY KEY NOT NULL,
	`booking_id` text NOT NULL,
	`slot_start` text NOT NULL,
	`lane` integer NOT NULL,
	FOREIGN KEY (`booking_id`) REFERENCES `bookings`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_booking_slot_locks_slot_lane` ON `booking_slot_locks` (`slot_start`,`lane`);--> statement-breakpoint
CREATE INDEX `idx_booking_slot_locks_booking` ON `booking_slot_locks` (`booking_id`);--> statement-breakpoint
CREATE TABLE `bookings` (
	`id` text PRIMARY KEY NOT NULL,
	`reference` text NOT NULL,
	`manage_token_hash` text NOT NULL,
	`idempotency_key` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`service_id` text NOT NULL,
	`service_name` text NOT NULL,
	`service_price_cents` integer,
	`service_duration_minutes` integer NOT NULL,
	`requested_date` text NOT NULL,
	`start_time` text NOT NULL,
	`end_time` text NOT NULL,
	`district` text NOT NULL,
	`address` text NOT NULL,
	`vehicle_make` text NOT NULL,
	`vehicle_model` text NOT NULL,
	`plate` text NOT NULL,
	`customer_name` text NOT NULL,
	`phone` text NOT NULL,
	`email` text NOT NULL,
	`notes` text,
	`estimated_total_cents` integer,
	`change_requested` integer DEFAULT false NOT NULL,
	`notification_status` text DEFAULT 'queued' NOT NULL,
	`notification_error` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`service_id`) REFERENCES `services`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_bookings_reference` ON `bookings` (`reference`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_bookings_manage_token_hash` ON `bookings` (`manage_token_hash`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_bookings_idempotency_key` ON `bookings` (`idempotency_key`);--> statement-breakpoint
CREATE INDEX `idx_bookings_date_status` ON `bookings` (`requested_date`,`status`);--> statement-breakpoint
CREATE INDEX `idx_bookings_created_at` ON `bookings` (`created_at`);--> statement-breakpoint
CREATE TABLE `extras` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`description` text NOT NULL,
	`price_cents` integer,
	`duration_minutes` integer DEFAULT 0 NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_extras_slug` ON `extras` (`slug`);--> statement-breakpoint
CREATE INDEX `idx_extras_active_sort` ON `extras` (`active`,`sort_order`);--> statement-breakpoint
CREATE TABLE `gallery_images` (
	`id` text PRIMARY KEY NOT NULL,
	`gallery_item_id` text NOT NULL,
	`r2_key` text NOT NULL,
	`alt_text` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`gallery_item_id`) REFERENCES `gallery_items`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_gallery_images_item_sort` ON `gallery_images` (`gallery_item_id`,`sort_order`);--> statement-breakpoint
CREATE TABLE `gallery_items` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`service_id` text,
	`district` text NOT NULL,
	`completed_at` text NOT NULL,
	`published` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`service_id`) REFERENCES `services`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `idx_gallery_items_published_date` ON `gallery_items` (`published`,`completed_at`);--> statement-breakpoint
CREATE TABLE `reviews` (
	`id` text PRIMARY KEY NOT NULL,
	`customer_name` text NOT NULL,
	`rating` integer NOT NULL,
	`quote` text NOT NULL,
	`published` integer DEFAULT false NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_reviews_published_sort` ON `reviews` (`published`,`sort_order`);--> statement-breakpoint
CREATE TABLE `service_areas` (
	`id` text PRIMARY KEY NOT NULL,
	`district` text NOT NULL,
	`active` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_service_areas_district` ON `service_areas` (`district`);--> statement-breakpoint
CREATE TABLE `service_features` (
	`id` text PRIMARY KEY NOT NULL,
	`service_id` text NOT NULL,
	`label` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`service_id`) REFERENCES `services`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_service_features_service_sort` ON `service_features` (`service_id`,`sort_order`);--> statement-breakpoint
CREATE TABLE `services` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`short_description` text NOT NULL,
	`accent` text NOT NULL,
	`price_cents` integer,
	`duration_minutes` integer NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`popular` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_services_slug` ON `services` (`slug`);--> statement-breakpoint
CREATE INDEX `idx_services_active_sort` ON `services` (`active`,`sort_order`);--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
