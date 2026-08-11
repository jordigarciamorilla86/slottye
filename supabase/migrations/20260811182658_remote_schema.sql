create extension if not exists "postgis" with schema "extensions";

drop extension if exists "pg_net";

create type "public"."booking_status" as enum ('CONFIRMED', 'CANCELLED_BY_USER', 'CANCELLED_BY_BUSINESS', 'COMPLETED', 'NO_SHOW', 'CANCELLED_ACCOUNT_DELETED');

create type "public"."notification_status" as enum ('PENDING', 'SENT', 'FAILED');

create type "public"."notification_type" as enum ('BOOKING_CONFIRMATION', 'BOOKING_CANCELLATION', 'BOOKING_REMINDER', 'NEW_SLOTS', 'SLOT_AVAILABLE', 'BOOKING_RESCHEDULED', 'REVIEW_REQUEST');

create type "public"."slot_status" as enum ('AVAILABLE', 'BOOKED', 'BLOCKED');

create type "public"."user_role" as enum ('customer', 'business', 'admin');


  create table "public"."admin_audit_logs" (
    "id" uuid not null default gen_random_uuid(),
    "admin_user_id" uuid,
    "action" text not null,
    "entity_type" text not null,
    "entity_id" uuid,
    "business_id" uuid,
    "target_user_id" uuid,
    "description" text not null,
    "old_values" jsonb,
    "new_values" jsonb,
    "metadata" jsonb,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."admin_audit_logs" enable row level security;


  create table "public"."block_google_calendar_events" (
    "id" uuid not null default gen_random_uuid(),
    "block_id" uuid not null,
    "business_id" uuid not null,
    "google_calendar_id" text not null default 'primary'::text,
    "google_event_id" text not null,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."block_google_calendar_events" enable row level security;


  create table "public"."booking_google_calendar_events" (
    "id" uuid not null default gen_random_uuid(),
    "booking_id" uuid not null,
    "business_id" uuid not null,
    "google_calendar_id" text not null,
    "google_event_id" text not null,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."booking_google_calendar_events" enable row level security;


  create table "public"."bookings" (
    "id" uuid not null default gen_random_uuid(),
    "slot_id" uuid not null,
    "user_id" uuid,
    "business_id" uuid not null,
    "service_id" uuid,
    "status" public.booking_status not null default 'CONFIRMED'::public.booking_status,
    "created_at" timestamp with time zone not null default now(),
    "cancelled_at" timestamp with time zone
      );


alter table "public"."bookings" enable row level security;


  create table "public"."business_blocks" (
    "id" uuid not null default gen_random_uuid(),
    "business_id" uuid not null,
    "start_at" timestamp with time zone not null,
    "end_at" timestamp with time zone not null,
    "reason" text,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."business_blocks" enable row level security;


  create table "public"."business_google_calendar_connections" (
    "id" uuid not null default gen_random_uuid(),
    "business_id" uuid not null,
    "google_calendar_id" text not null default 'primary'::text,
    "google_account_email" text,
    "access_token" text,
    "refresh_token" text not null,
    "token_expires_at" timestamp with time zone,
    "scope" text,
    "connected_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "sync_token" text,
    "watch_channel_id" text,
    "watch_resource_id" text,
    "watch_channel_token" text,
    "watch_expires_at" timestamp with time zone,
    "sync_lock_token" text,
    "sync_lock_until" timestamp with time zone
      );


alter table "public"."business_google_calendar_connections" enable row level security;


  create table "public"."business_hours" (
    "id" uuid not null default gen_random_uuid(),
    "business_id" uuid not null,
    "day_of_week" smallint not null,
    "open_time" time without time zone,
    "close_time" time without time zone,
    "closed" boolean not null default false,
    "created_at" timestamp with time zone not null default now(),
    "open_time_2" time without time zone,
    "close_time_2" time without time zone
      );


alter table "public"."business_hours" enable row level security;


  create table "public"."business_images" (
    "id" uuid not null default gen_random_uuid(),
    "business_id" uuid not null,
    "image_url" text not null,
    "position" integer not null default 0,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."business_images" enable row level security;


  create table "public"."business_subscriptions" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "business_id" uuid not null,
    "email_enabled" boolean not null default true,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."business_subscriptions" enable row level security;


  create table "public"."businesses" (
    "id" uuid not null default gen_random_uuid(),
    "owner_id" uuid not null,
    "category_id" uuid,
    "name" text not null,
    "slug" text not null,
    "description" text,
    "address" text,
    "city" text,
    "postal_code" text,
    "latitude" double precision,
    "longitude" double precision,
    "phone" text,
    "email" text,
    "website" text,
    "active" boolean not null default true,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "min_booking_notice_hours" integer not null default 2,
    "max_booking_advance_days" integer not null default 60,
    "allow_cancellations" boolean not null default true,
    "min_cancellation_notice_hours" integer not null default 24,
    "google_place_id" text,
    "show_google_reviews" boolean not null default false,
    "onboarding_completed_at" timestamp with time zone,
    "booking_policies_reviewed_at" timestamp with time zone
      );


alter table "public"."businesses" enable row level security;


  create table "public"."categories" (
    "id" uuid not null default gen_random_uuid(),
    "name" text not null,
    "slug" text not null,
    "icon" text,
    "active" boolean not null default true,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."categories" enable row level security;


  create table "public"."favorites" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "business_id" uuid not null,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."favorites" enable row level security;


  create table "public"."google_calendar_imported_blocks" (
    "id" uuid not null default gen_random_uuid(),
    "business_id" uuid not null,
    "block_id" uuid not null,
    "google_calendar_id" text not null default 'primary'::text,
    "google_event_id" text not null,
    "google_event_updated_at" timestamp with time zone,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."google_calendar_imported_blocks" enable row level security;


  create table "public"."manual_booking_google_calendar_events" (
    "id" uuid not null default gen_random_uuid(),
    "manual_booking_id" uuid not null,
    "business_id" uuid not null,
    "google_calendar_id" text not null default 'primary'::text,
    "google_event_id" text not null,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."manual_booking_google_calendar_events" enable row level security;


  create table "public"."manual_bookings" (
    "id" uuid not null default gen_random_uuid(),
    "business_id" uuid not null,
    "service_id" uuid,
    "customer_name" text not null,
    "customer_phone" text,
    "customer_email" text,
    "start_at" timestamp with time zone not null,
    "end_at" timestamp with time zone not null,
    "notes" text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."manual_bookings" enable row level security;


  create table "public"."notifications" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid,
    "business_id" uuid,
    "booking_id" uuid,
    "type" public.notification_type not null,
    "status" public.notification_status not null default 'PENDING'::public.notification_status,
    "created_at" timestamp with time zone not null default now(),
    "sent_at" timestamp with time zone,
    "subject" text,
    "metadata" jsonb
      );


alter table "public"."notifications" enable row level security;


  create table "public"."profiles" (
    "id" uuid not null,
    "email" text,
    "name" text,
    "avatar_url" text,
    "role" public.user_role not null default 'customer'::public.user_role,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "is_admin" boolean not null default false,
    "is_blocked" boolean not null default false
      );


alter table "public"."profiles" enable row level security;


  create table "public"."reviews" (
    "id" uuid not null default gen_random_uuid(),
    "booking_id" uuid not null,
    "user_id" uuid not null,
    "business_id" uuid not null,
    "rating" smallint not null,
    "comment" text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "visible" boolean not null default true
      );


alter table "public"."reviews" enable row level security;


  create table "public"."services" (
    "id" uuid not null default gen_random_uuid(),
    "business_id" uuid not null,
    "name" text not null,
    "description" text,
    "duration_minutes" integer not null default 30,
    "active" boolean not null default true,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."services" enable row level security;


  create table "public"."slots" (
    "id" uuid not null default gen_random_uuid(),
    "business_id" uuid not null,
    "service_id" uuid,
    "start_at" timestamp with time zone not null,
    "end_at" timestamp with time zone not null,
    "status" public.slot_status not null default 'AVAILABLE'::public.slot_status,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."slots" enable row level security;

CREATE INDEX admin_audit_logs_admin_user_id_idx ON public.admin_audit_logs USING btree (admin_user_id);

CREATE INDEX admin_audit_logs_business_id_idx ON public.admin_audit_logs USING btree (business_id);

CREATE INDEX admin_audit_logs_created_at_idx ON public.admin_audit_logs USING btree (created_at DESC);

CREATE INDEX admin_audit_logs_entity_idx ON public.admin_audit_logs USING btree (entity_type, entity_id);

CREATE UNIQUE INDEX admin_audit_logs_pkey ON public.admin_audit_logs USING btree (id);

CREATE INDEX admin_audit_logs_target_user_id_idx ON public.admin_audit_logs USING btree (target_user_id);

CREATE UNIQUE INDEX block_google_calendar_events_block_unique ON public.block_google_calendar_events USING btree (block_id);

CREATE INDEX block_google_calendar_events_business_id_idx ON public.block_google_calendar_events USING btree (business_id);

CREATE UNIQUE INDEX block_google_calendar_events_google_event_unique ON public.block_google_calendar_events USING btree (google_calendar_id, google_event_id);

CREATE UNIQUE INDEX block_google_calendar_events_pkey ON public.block_google_calendar_events USING btree (id);

CREATE UNIQUE INDEX booking_google_calendar_event_google_calendar_id_google_eve_key ON public.booking_google_calendar_events USING btree (google_calendar_id, google_event_id);

CREATE UNIQUE INDEX booking_google_calendar_events_booking_id_key ON public.booking_google_calendar_events USING btree (booking_id);

CREATE UNIQUE INDEX booking_google_calendar_events_pkey ON public.booking_google_calendar_events USING btree (id);

CREATE INDEX bookings_business_idx ON public.bookings USING btree (business_id);

CREATE UNIQUE INDEX bookings_one_confirmed_per_slot ON public.bookings USING btree (slot_id) WHERE (status = 'CONFIRMED'::public.booking_status);

CREATE UNIQUE INDEX bookings_pkey ON public.bookings USING btree (id);

CREATE INDEX bookings_user_idx ON public.bookings USING btree (user_id);

CREATE INDEX business_blocks_business_start_idx ON public.business_blocks USING btree (business_id, start_at);

CREATE UNIQUE INDEX business_blocks_pkey ON public.business_blocks USING btree (id);

CREATE UNIQUE INDEX business_google_calendar_connections_business_id_key ON public.business_google_calendar_connections USING btree (business_id);

CREATE UNIQUE INDEX business_google_calendar_connections_pkey ON public.business_google_calendar_connections USING btree (id);

CREATE UNIQUE INDEX business_google_calendar_connections_watch_channel_id_key ON public.business_google_calendar_connections USING btree (watch_channel_id) WHERE (watch_channel_id IS NOT NULL);

CREATE UNIQUE INDEX business_hours_business_day_unique ON public.business_hours USING btree (business_id, day_of_week);

CREATE UNIQUE INDEX business_hours_pkey ON public.business_hours USING btree (id);

CREATE UNIQUE INDEX business_images_pkey ON public.business_images USING btree (id);

CREATE UNIQUE INDEX business_subscriptions_pkey ON public.business_subscriptions USING btree (id);

CREATE UNIQUE INDEX business_subscriptions_user_id_business_id_key ON public.business_subscriptions USING btree (user_id, business_id);

CREATE INDEX businesses_category_idx ON public.businesses USING btree (category_id);

CREATE INDEX businesses_city_idx ON public.businesses USING btree (city);

CREATE INDEX businesses_google_place_id_idx ON public.businesses USING btree (google_place_id);

CREATE INDEX businesses_owner_idx ON public.businesses USING btree (owner_id);

CREATE UNIQUE INDEX businesses_pkey ON public.businesses USING btree (id);

CREATE UNIQUE INDEX businesses_slug_key ON public.businesses USING btree (slug);

CREATE UNIQUE INDEX categories_pkey ON public.categories USING btree (id);

CREATE UNIQUE INDEX categories_slug_key ON public.categories USING btree (slug);

CREATE UNIQUE INDEX favorites_pkey ON public.favorites USING btree (id);

CREATE UNIQUE INDEX favorites_user_id_business_id_key ON public.favorites USING btree (user_id, business_id);

CREATE INDEX favorites_user_idx ON public.favorites USING btree (user_id);

CREATE UNIQUE INDEX google_calendar_imported_blocks_block_unique ON public.google_calendar_imported_blocks USING btree (block_id);

CREATE INDEX google_calendar_imported_blocks_business_idx ON public.google_calendar_imported_blocks USING btree (business_id);

CREATE UNIQUE INDEX google_calendar_imported_blocks_event_unique ON public.google_calendar_imported_blocks USING btree (business_id, google_calendar_id, google_event_id);

CREATE UNIQUE INDEX google_calendar_imported_blocks_pkey ON public.google_calendar_imported_blocks USING btree (id);

CREATE INDEX manual_booking_google_calendar_events_business_id_idx ON public.manual_booking_google_calendar_events USING btree (business_id);

CREATE UNIQUE INDEX manual_booking_google_calendar_events_google_event_unique ON public.manual_booking_google_calendar_events USING btree (google_calendar_id, google_event_id);

CREATE UNIQUE INDEX manual_booking_google_calendar_events_manual_booking_unique ON public.manual_booking_google_calendar_events USING btree (manual_booking_id);

CREATE UNIQUE INDEX manual_booking_google_calendar_events_pkey ON public.manual_booking_google_calendar_events USING btree (id);

CREATE INDEX manual_bookings_business_end_idx ON public.manual_bookings USING btree (business_id, end_at);

CREATE INDEX manual_bookings_business_start_idx ON public.manual_bookings USING btree (business_id, start_at);

CREATE UNIQUE INDEX manual_bookings_pkey ON public.manual_bookings USING btree (id);

CREATE UNIQUE INDEX notifications_pkey ON public.notifications USING btree (id);

CREATE UNIQUE INDEX profiles_pkey ON public.profiles USING btree (id);

CREATE UNIQUE INDEX reviews_booking_unique ON public.reviews USING btree (booking_id);

CREATE INDEX reviews_business_id_idx ON public.reviews USING btree (business_id);

CREATE UNIQUE INDEX reviews_pkey ON public.reviews USING btree (id);

CREATE INDEX reviews_user_id_idx ON public.reviews USING btree (user_id);

CREATE INDEX services_business_idx ON public.services USING btree (business_id);

CREATE UNIQUE INDEX services_pkey ON public.services USING btree (id);

CREATE INDEX slots_available_idx ON public.slots USING btree (business_id, start_at) WHERE (status = 'AVAILABLE'::public.slot_status);

CREATE INDEX slots_business_start_idx ON public.slots USING btree (business_id, start_at);

CREATE UNIQUE INDEX slots_business_start_unique ON public.slots USING btree (business_id, start_at);

CREATE UNIQUE INDEX slots_pkey ON public.slots USING btree (id);

CREATE INDEX subscriptions_business_idx ON public.business_subscriptions USING btree (business_id);

alter table "public"."admin_audit_logs" add constraint "admin_audit_logs_pkey" PRIMARY KEY using index "admin_audit_logs_pkey";

alter table "public"."block_google_calendar_events" add constraint "block_google_calendar_events_pkey" PRIMARY KEY using index "block_google_calendar_events_pkey";

alter table "public"."booking_google_calendar_events" add constraint "booking_google_calendar_events_pkey" PRIMARY KEY using index "booking_google_calendar_events_pkey";

alter table "public"."bookings" add constraint "bookings_pkey" PRIMARY KEY using index "bookings_pkey";

alter table "public"."business_blocks" add constraint "business_blocks_pkey" PRIMARY KEY using index "business_blocks_pkey";

alter table "public"."business_google_calendar_connections" add constraint "business_google_calendar_connections_pkey" PRIMARY KEY using index "business_google_calendar_connections_pkey";

alter table "public"."business_hours" add constraint "business_hours_pkey" PRIMARY KEY using index "business_hours_pkey";

alter table "public"."business_images" add constraint "business_images_pkey" PRIMARY KEY using index "business_images_pkey";

alter table "public"."business_subscriptions" add constraint "business_subscriptions_pkey" PRIMARY KEY using index "business_subscriptions_pkey";

alter table "public"."businesses" add constraint "businesses_pkey" PRIMARY KEY using index "businesses_pkey";

alter table "public"."categories" add constraint "categories_pkey" PRIMARY KEY using index "categories_pkey";

alter table "public"."favorites" add constraint "favorites_pkey" PRIMARY KEY using index "favorites_pkey";

alter table "public"."google_calendar_imported_blocks" add constraint "google_calendar_imported_blocks_pkey" PRIMARY KEY using index "google_calendar_imported_blocks_pkey";

alter table "public"."manual_booking_google_calendar_events" add constraint "manual_booking_google_calendar_events_pkey" PRIMARY KEY using index "manual_booking_google_calendar_events_pkey";

alter table "public"."manual_bookings" add constraint "manual_bookings_pkey" PRIMARY KEY using index "manual_bookings_pkey";

alter table "public"."notifications" add constraint "notifications_pkey" PRIMARY KEY using index "notifications_pkey";

alter table "public"."profiles" add constraint "profiles_pkey" PRIMARY KEY using index "profiles_pkey";

alter table "public"."reviews" add constraint "reviews_pkey" PRIMARY KEY using index "reviews_pkey";

alter table "public"."services" add constraint "services_pkey" PRIMARY KEY using index "services_pkey";

alter table "public"."slots" add constraint "slots_pkey" PRIMARY KEY using index "slots_pkey";

alter table "public"."admin_audit_logs" add constraint "admin_audit_logs_admin_user_id_fkey" FOREIGN KEY (admin_user_id) REFERENCES public.profiles(id) ON DELETE SET NULL not valid;

alter table "public"."admin_audit_logs" validate constraint "admin_audit_logs_admin_user_id_fkey";

alter table "public"."admin_audit_logs" add constraint "admin_audit_logs_business_id_fkey" FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE SET NULL not valid;

alter table "public"."admin_audit_logs" validate constraint "admin_audit_logs_business_id_fkey";

alter table "public"."admin_audit_logs" add constraint "admin_audit_logs_target_user_id_fkey" FOREIGN KEY (target_user_id) REFERENCES public.profiles(id) ON DELETE SET NULL not valid;

alter table "public"."admin_audit_logs" validate constraint "admin_audit_logs_target_user_id_fkey";

alter table "public"."block_google_calendar_events" add constraint "block_google_calendar_events_block_id_fkey" FOREIGN KEY (block_id) REFERENCES public.business_blocks(id) ON DELETE CASCADE not valid;

alter table "public"."block_google_calendar_events" validate constraint "block_google_calendar_events_block_id_fkey";

alter table "public"."block_google_calendar_events" add constraint "block_google_calendar_events_block_unique" UNIQUE using index "block_google_calendar_events_block_unique";

alter table "public"."block_google_calendar_events" add constraint "block_google_calendar_events_business_id_fkey" FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE not valid;

alter table "public"."block_google_calendar_events" validate constraint "block_google_calendar_events_business_id_fkey";

alter table "public"."block_google_calendar_events" add constraint "block_google_calendar_events_google_event_unique" UNIQUE using index "block_google_calendar_events_google_event_unique";

alter table "public"."booking_google_calendar_events" add constraint "booking_google_calendar_event_google_calendar_id_google_eve_key" UNIQUE using index "booking_google_calendar_event_google_calendar_id_google_eve_key";

alter table "public"."booking_google_calendar_events" add constraint "booking_google_calendar_events_booking_id_fkey" FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON DELETE CASCADE not valid;

alter table "public"."booking_google_calendar_events" validate constraint "booking_google_calendar_events_booking_id_fkey";

alter table "public"."booking_google_calendar_events" add constraint "booking_google_calendar_events_booking_id_key" UNIQUE using index "booking_google_calendar_events_booking_id_key";

alter table "public"."booking_google_calendar_events" add constraint "booking_google_calendar_events_business_id_fkey" FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE not valid;

alter table "public"."booking_google_calendar_events" validate constraint "booking_google_calendar_events_business_id_fkey";

alter table "public"."bookings" add constraint "bookings_business_id_fkey" FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE not valid;

alter table "public"."bookings" validate constraint "bookings_business_id_fkey";

alter table "public"."bookings" add constraint "bookings_service_id_fkey" FOREIGN KEY (service_id) REFERENCES public.services(id) ON DELETE SET NULL not valid;

alter table "public"."bookings" validate constraint "bookings_service_id_fkey";

alter table "public"."bookings" add constraint "bookings_slot_id_fkey" FOREIGN KEY (slot_id) REFERENCES public.slots(id) ON DELETE RESTRICT not valid;

alter table "public"."bookings" validate constraint "bookings_slot_id_fkey";

alter table "public"."bookings" add constraint "bookings_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL not valid;

alter table "public"."bookings" validate constraint "bookings_user_id_fkey";

alter table "public"."business_blocks" add constraint "business_blocks_business_id_fkey" FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE not valid;

alter table "public"."business_blocks" validate constraint "business_blocks_business_id_fkey";

alter table "public"."business_blocks" add constraint "business_blocks_valid_range" CHECK ((end_at > start_at)) not valid;

alter table "public"."business_blocks" validate constraint "business_blocks_valid_range";

alter table "public"."business_google_calendar_connections" add constraint "business_google_calendar_connections_business_id_fkey" FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE not valid;

alter table "public"."business_google_calendar_connections" validate constraint "business_google_calendar_connections_business_id_fkey";

alter table "public"."business_google_calendar_connections" add constraint "business_google_calendar_connections_business_id_key" UNIQUE using index "business_google_calendar_connections_business_id_key";

alter table "public"."business_hours" add constraint "business_hours_business_day_unique" UNIQUE using index "business_hours_business_day_unique";

alter table "public"."business_hours" add constraint "business_hours_business_id_fkey" FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE not valid;

alter table "public"."business_hours" validate constraint "business_hours_business_id_fkey";

alter table "public"."business_hours" add constraint "business_hours_day_of_week_check" CHECK (((day_of_week >= 0) AND (day_of_week <= 6))) not valid;

alter table "public"."business_hours" validate constraint "business_hours_day_of_week_check";

alter table "public"."business_images" add constraint "business_images_business_id_fkey" FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE not valid;

alter table "public"."business_images" validate constraint "business_images_business_id_fkey";

alter table "public"."business_subscriptions" add constraint "business_subscriptions_business_id_fkey" FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE not valid;

alter table "public"."business_subscriptions" validate constraint "business_subscriptions_business_id_fkey";

alter table "public"."business_subscriptions" add constraint "business_subscriptions_user_id_business_id_key" UNIQUE using index "business_subscriptions_user_id_business_id_key";

alter table "public"."business_subscriptions" add constraint "business_subscriptions_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE not valid;

alter table "public"."business_subscriptions" validate constraint "business_subscriptions_user_id_fkey";

alter table "public"."businesses" add constraint "businesses_category_id_fkey" FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE SET NULL not valid;

alter table "public"."businesses" validate constraint "businesses_category_id_fkey";

alter table "public"."businesses" add constraint "businesses_max_booking_advance_days_check" CHECK ((max_booking_advance_days >= 1)) not valid;

alter table "public"."businesses" validate constraint "businesses_max_booking_advance_days_check";

alter table "public"."businesses" add constraint "businesses_min_booking_notice_hours_check" CHECK ((min_booking_notice_hours >= 0)) not valid;

alter table "public"."businesses" validate constraint "businesses_min_booking_notice_hours_check";

alter table "public"."businesses" add constraint "businesses_min_cancellation_notice_hours_check" CHECK ((min_cancellation_notice_hours >= 0)) not valid;

alter table "public"."businesses" validate constraint "businesses_min_cancellation_notice_hours_check";

alter table "public"."businesses" add constraint "businesses_owner_id_fkey" FOREIGN KEY (owner_id) REFERENCES public.profiles(id) ON DELETE CASCADE not valid;

alter table "public"."businesses" validate constraint "businesses_owner_id_fkey";

alter table "public"."businesses" add constraint "businesses_slug_key" UNIQUE using index "businesses_slug_key";

alter table "public"."categories" add constraint "categories_slug_key" UNIQUE using index "categories_slug_key";

alter table "public"."favorites" add constraint "favorites_business_id_fkey" FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE not valid;

alter table "public"."favorites" validate constraint "favorites_business_id_fkey";

alter table "public"."favorites" add constraint "favorites_user_id_business_id_key" UNIQUE using index "favorites_user_id_business_id_key";

alter table "public"."favorites" add constraint "favorites_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE not valid;

alter table "public"."favorites" validate constraint "favorites_user_id_fkey";

alter table "public"."google_calendar_imported_blocks" add constraint "google_calendar_imported_blocks_block_id_fkey" FOREIGN KEY (block_id) REFERENCES public.business_blocks(id) ON DELETE CASCADE not valid;

alter table "public"."google_calendar_imported_blocks" validate constraint "google_calendar_imported_blocks_block_id_fkey";

alter table "public"."google_calendar_imported_blocks" add constraint "google_calendar_imported_blocks_block_unique" UNIQUE using index "google_calendar_imported_blocks_block_unique";

alter table "public"."google_calendar_imported_blocks" add constraint "google_calendar_imported_blocks_business_id_fkey" FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE not valid;

alter table "public"."google_calendar_imported_blocks" validate constraint "google_calendar_imported_blocks_business_id_fkey";

alter table "public"."google_calendar_imported_blocks" add constraint "google_calendar_imported_blocks_event_unique" UNIQUE using index "google_calendar_imported_blocks_event_unique";

alter table "public"."manual_booking_google_calendar_events" add constraint "manual_booking_google_calendar_events_business_id_fkey" FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE not valid;

alter table "public"."manual_booking_google_calendar_events" validate constraint "manual_booking_google_calendar_events_business_id_fkey";

alter table "public"."manual_booking_google_calendar_events" add constraint "manual_booking_google_calendar_events_google_event_unique" UNIQUE using index "manual_booking_google_calendar_events_google_event_unique";

alter table "public"."manual_booking_google_calendar_events" add constraint "manual_booking_google_calendar_events_manual_booking_id_fkey" FOREIGN KEY (manual_booking_id) REFERENCES public.manual_bookings(id) ON DELETE CASCADE not valid;

alter table "public"."manual_booking_google_calendar_events" validate constraint "manual_booking_google_calendar_events_manual_booking_id_fkey";

alter table "public"."manual_booking_google_calendar_events" add constraint "manual_booking_google_calendar_events_manual_booking_unique" UNIQUE using index "manual_booking_google_calendar_events_manual_booking_unique";

alter table "public"."manual_bookings" add constraint "manual_bookings_business_id_fkey" FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE not valid;

alter table "public"."manual_bookings" validate constraint "manual_bookings_business_id_fkey";

alter table "public"."manual_bookings" add constraint "manual_bookings_service_id_fkey" FOREIGN KEY (service_id) REFERENCES public.services(id) ON DELETE SET NULL not valid;

alter table "public"."manual_bookings" validate constraint "manual_bookings_service_id_fkey";

alter table "public"."manual_bookings" add constraint "manual_bookings_valid_dates" CHECK ((end_at > start_at)) not valid;

alter table "public"."manual_bookings" validate constraint "manual_bookings_valid_dates";

alter table "public"."notifications" add constraint "notifications_booking_id_fkey" FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON DELETE CASCADE not valid;

alter table "public"."notifications" validate constraint "notifications_booking_id_fkey";

alter table "public"."notifications" add constraint "notifications_business_id_fkey" FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE not valid;

alter table "public"."notifications" validate constraint "notifications_business_id_fkey";

alter table "public"."notifications" add constraint "notifications_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE not valid;

alter table "public"."notifications" validate constraint "notifications_user_id_fkey";

alter table "public"."profiles" add constraint "profiles_id_fkey" FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."profiles" validate constraint "profiles_id_fkey";

alter table "public"."reviews" add constraint "reviews_booking_id_fkey" FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON DELETE CASCADE not valid;

alter table "public"."reviews" validate constraint "reviews_booking_id_fkey";

alter table "public"."reviews" add constraint "reviews_booking_unique" UNIQUE using index "reviews_booking_unique";

alter table "public"."reviews" add constraint "reviews_business_id_fkey" FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE not valid;

alter table "public"."reviews" validate constraint "reviews_business_id_fkey";

alter table "public"."reviews" add constraint "reviews_rating_check" CHECK (((rating >= 1) AND (rating <= 5))) not valid;

alter table "public"."reviews" validate constraint "reviews_rating_check";

alter table "public"."reviews" add constraint "reviews_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE not valid;

alter table "public"."reviews" validate constraint "reviews_user_id_fkey";

alter table "public"."services" add constraint "services_business_id_fkey" FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE not valid;

alter table "public"."services" validate constraint "services_business_id_fkey";

alter table "public"."slots" add constraint "slots_business_id_fkey" FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE not valid;

alter table "public"."slots" validate constraint "slots_business_id_fkey";

alter table "public"."slots" add constraint "slots_check" CHECK ((end_at > start_at)) not valid;

alter table "public"."slots" validate constraint "slots_check";

alter table "public"."slots" add constraint "slots_service_id_fkey" FOREIGN KEY (service_id) REFERENCES public.services(id) ON DELETE SET NULL not valid;

alter table "public"."slots" validate constraint "slots_service_id_fkey";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.acquire_google_calendar_sync_lock(p_business_id uuid, p_lock_token text, p_ttl_seconds integer DEFAULT 300)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_acquired boolean;
begin
  if
    p_business_id is null
    or p_lock_token is null
    or btrim(p_lock_token) = ''
  then
    return false;
  end if;

  /*
   * Evitamos TTL absurdos.
   * Permitimos entre 30 segundos y 15 minutos.
   */
  p_ttl_seconds :=
    greatest(
      30,
      least(
        coalesce(
          p_ttl_seconds,
          300
        ),
        900
      )
    );

  update public.business_google_calendar_connections
  set
    sync_lock_token =
      p_lock_token,

    sync_lock_until =
      now() +
      make_interval(
        secs =>
          p_ttl_seconds
      ),

    updated_at =
      now()
  where
    business_id =
      p_business_id
    and (
      sync_lock_until is null
      or sync_lock_until <= now()
      or sync_lock_token =
        p_lock_token
    );

  get diagnostics
    v_acquired =
      row_count;

  return
    v_acquired;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.admin_cancel_booking_for_account_deletion(p_booking_id uuid)
 RETURNS TABLE(booking_id uuid, slot_id uuid, business_id uuid, service_id uuid, start_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_booking public.bookings%rowtype;
  v_slot public.slots%rowtype;
begin
  /*
   * Bloqueamos la reserva para evitar cambios simultáneos.
   */
  select *
  into v_booking
  from public.bookings
  where id = p_booking_id
  for update;

  if not found then
    raise exception 'La reserva no existe.';
  end if;

  /*
   * Solo procesamos reservas todavía confirmadas.
   */
  if v_booking.status <> 'CONFIRMED'::public.booking_status then
    return;
  end if;

  select *
  into v_slot
  from public.slots
  where id = v_booking.slot_id
  for update;

  if not found then
    raise exception 'El horario de la reserva no existe.';
  end if;

  /*
   * La reserva permanece en el historial.
   */
  update public.bookings
  set
    status =
      'CANCELLED_ACCOUNT_DELETED'::public.booking_status,
    cancelled_at =
      now()
  where id =
    v_booking.id;

  /*
   * El horario vuelve a quedar disponible.
   */
  update public.slots
  set
    status =
      'AVAILABLE'::public.slot_status,
    updated_at =
      now()
  where id =
    v_slot.id;

  return query
  select
    v_booking.id,
    v_slot.id,
    v_booking.business_id,
    v_booking.service_id,
    v_slot.start_at;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.admin_set_business_active(p_business_id uuid, p_active boolean)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if not public.is_admin() then
    raise exception 'Not authorized';
  end if;

  update public.businesses
  set
    active = p_active,
    updated_at = now()
  where id = p_business_id;

  if not found then
    raise exception 'Business not found';
  end if;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.admin_set_review_visible(p_review_id uuid, p_visible boolean)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if not public.is_admin() then
    raise exception 'Not authorized';
  end if;

  update public.reviews
  set
    visible = p_visible,
    updated_at = now()
  where id = p_review_id;

  if not found then
    raise exception 'Review not found';
  end if;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.admin_set_user_blocked(p_user_id uuid, p_blocked boolean)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if not public.is_admin() then
    raise exception 'Not authorized';
  end if;

  if p_user_id = auth.uid() then
    raise exception 'You cannot block your own administrator account';
  end if;

  update public.profiles
  set
    is_blocked = p_blocked,
    updated_at = now()
  where id = p_user_id;

  if not found then
    raise exception 'User not found';
  end if;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.assert_active_user()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
    if auth.uid() is null then
        raise exception
            'Debes iniciar sesión';
    end if;

    if exists (
        select 1
        from public.profiles
        where id = auth.uid()
          and is_blocked
    ) then
        raise exception
            'Tu cuenta está bloqueada';
    end if;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.audit_agenda_integrity()
 RETURNS TABLE(check_name text, errors bigint)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$

/*
 * BOOKINGS SIN SLOT
 */

select
  'Bookings sin slot'::text,
  count(*)::bigint
from public.bookings b
left join public.slots s
  on s.id = b.slot_id
where
  s.id is null

union all

/*
 * SLOT BOOKED SIN UNA RESERVA QUE JUSTIFIQUE
 * QUE CONTINÚE OCUPADO.
 *
 * CONFIRMED, COMPLETED y NO_SHOW mantienen
 * correctamente el slot como BOOKED.
 */

select
  'Slots BOOKED sin reserva asociada válida'::text,
  count(*)::bigint
from public.slots s
where
  s.status =
    'BOOKED'::public.slot_status
  and not exists (
    select 1
    from public.bookings b
    where
      b.slot_id = s.id
      and b.status in (
        'CONFIRMED'::public.booking_status,
        'COMPLETED'::public.booking_status,
        'NO_SHOW'::public.booking_status
      )
  )

union all

/*
 * MÁS DE UNA RESERVA CONFIRMADA EN EL MISMO SLOT
 */

select
  'Slots con más de una reserva confirmada'::text,
  count(*)::bigint
from (
  select
    b.slot_id
  from public.bookings b
  where
    b.status =
      'CONFIRMED'::public.booking_status
  group by
    b.slot_id
  having
    count(*) > 1
) duplicated_confirmed

union all

/*
 * RESERVA CONFIRMADA SOBRE SLOT NO BOOKED
 */

select
  'Reservas confirmadas sobre slot no BOOKED'::text,
  count(*)::bigint
from public.bookings b
join public.slots s
  on s.id = b.slot_id
where
  b.status =
    'CONFIRMED'::public.booking_status
  and s.status <>
    'BOOKED'::public.slot_status

union all

/*
 * RESERVAS MANUALES SOLAPADAS
 */

select
  'Reservas manuales solapadas'::text,
  count(*)::bigint
from public.manual_bookings a
join public.manual_bookings b
  on a.business_id = b.business_id
  and a.id < b.id
  and a.start_at < b.end_at
  and a.end_at > b.start_at

union all

/*
 * RESERVAS SLOTTYE CONFIRMADAS SOLAPADAS
 */

select
  'Reservas Slottye confirmadas solapadas'::text,
  count(*)::bigint
from public.bookings a
join public.slots sa
  on sa.id = a.slot_id
join public.bookings b
  on a.business_id = b.business_id
  and a.id < b.id
join public.slots sb
  on sb.id = b.slot_id
where
  a.status =
    'CONFIRMED'::public.booking_status
  and b.status =
    'CONFIRMED'::public.booking_status
  and sa.start_at < sb.end_at
  and sa.end_at > sb.start_at

union all

/*
 * DISPONIBILIDAD SOBRE RESERVA MANUAL
 */

select
  'Disponibilidades sobre reserva manual'::text,
  count(*)::bigint
from public.slots s
join public.manual_bookings mb
  on mb.business_id = s.business_id
  and s.start_at < mb.end_at
  and s.end_at > mb.start_at
where
  s.status =
    'AVAILABLE'::public.slot_status

union all

/*
 * DISPONIBILIDAD SOBRE BLOQUEO
 */

select
  'Disponibilidades sobre bloqueo'::text,
  count(*)::bigint
from public.slots s
join public.business_blocks bb
  on bb.business_id = s.business_id
  and s.start_at < bb.end_at
  and s.end_at > bb.start_at
where
  s.status =
    'AVAILABLE'::public.slot_status

union all

/*
 * DISPONIBILIDAD SOBRE RESERVA CONFIRMADA
 */

select
  'Disponibilidades sobre reserva Slottye confirmada'::text,
  count(distinct s.id)::bigint
from public.slots s
join public.bookings b
  on b.business_id = s.business_id
  and b.status =
    'CONFIRMED'::public.booking_status
join public.slots booked_slot
  on booked_slot.id = b.slot_id
  and s.start_at < booked_slot.end_at
  and s.end_at > booked_slot.start_at
where
  s.status =
    'AVAILABLE'::public.slot_status

union all

/*
 * DURACIONES INVÁLIDAS
 */

select
  'Slots con duración inválida'::text,
  count(*)::bigint
from public.slots
where
  end_at <= start_at

union all

select
  'Reservas manuales con duración inválida'::text,
  count(*)::bigint
from public.manual_bookings
where
  end_at <= start_at

union all

select
  'Bloqueos con duración inválida'::text,
  count(*)::bigint
from public.business_blocks
where
  end_at <= start_at;

$function$
;

CREATE OR REPLACE FUNCTION public.book_slot(p_slot_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_user_id uuid;
  v_slot public.slots%rowtype;
  v_booking_id uuid;

  v_min_booking_notice_hours integer;
  v_max_booking_advance_days integer;
begin
  /*
   * Usuario autenticado.
   */

  v_user_id :=
    auth.uid();

  if v_user_id is null then
    raise exception
      'Debes iniciar sesión para reservar';
  end if;

  /*
   * Usuario no bloqueado.
   */

  perform public.assert_active_user();

  /*
   * Bloqueamos el slot mientras
   * procesamos la reserva.
   */

  select *
  into v_slot
  from public.slots
  where id =
    p_slot_id
  for update;

  if not found then
    raise exception
      'La cita no existe';
  end if;

  /*
   * Solo se puede reservar
   * un slot disponible.
   */

  if
    v_slot.status <>
    'AVAILABLE'::public.slot_status
  then
    raise exception
      'Esta cita ya no está disponible';
  end if;

  /*
   * No permitimos citas pasadas.
   */

  if
    v_slot.start_at <=
    now()
  then
    raise exception
      'No puedes reservar una cita pasada';
  end if;

  /*
   * Políticas configuradas por el negocio.
   */

  select
    min_booking_notice_hours,
    max_booking_advance_days
  into
    v_min_booking_notice_hours,
    v_max_booking_advance_days
  from public.businesses
  where id =
    v_slot.business_id;

  if not found then
    raise exception
      'El negocio asociado a esta cita no existe';
  end if;

  /*
   * Antelación mínima.
   */

  if
    v_slot.start_at <
    now() +
    make_interval(
      hours =>
        v_min_booking_notice_hours
    )
  then
    raise exception
      'Esta cita requiere al menos % horas de antelación para reservar',
      v_min_booking_notice_hours;
  end if;

  /*
   * Antelación máxima.
   */

  if
    v_slot.start_at >
    now() +
    make_interval(
      days =>
        v_max_booking_advance_days
    )
  then
    raise exception
      'Solo puedes reservar con un máximo de % días de antelación',
      v_max_booking_advance_days;
  end if;

  /*
   * Creamos la reserva.
   */

  insert into public.bookings (
    slot_id,
    user_id,
    business_id,
    service_id,
    status
  )
  values (
    v_slot.id,
    v_user_id,
    v_slot.business_id,
    v_slot.service_id,
    'CONFIRMED'::public.booking_status
  )
  returning id
  into v_booking_id;

  /*
   * El slot deja de estar disponible.
   */

  update public.slots
  set
    status =
      'BOOKED'::public.slot_status,
    updated_at =
      now()
  where id =
    v_slot.id;

  return v_booking_id;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.business_move_booking_to_time(p_booking_id uuid, p_start_at timestamp with time zone, p_end_at timestamp with time zone)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_user_id uuid;
  v_owner_id uuid;

  v_booking public.bookings%rowtype;
  v_old_slot public.slots%rowtype;

  v_target_slot_id uuid;
begin
  /*
   * USUARIO AUTENTICADO
   */

  v_user_id :=
    auth.uid();

  if
    v_user_id is null
  then
    raise exception
      'Debes iniciar sesión';
  end if;

  /*
   * USUARIO NO BLOQUEADO
   */

  perform public.assert_active_user();

  /*
   * VALIDAR NUEVO HORARIO
   */

  if
    p_start_at is null
    or p_end_at is null
    or p_end_at <= p_start_at
  then
    raise exception
      'El nuevo horario no es válido';
  end if;

  if
    p_start_at <= now()
  then
    raise exception
      'No puedes mover la reserva a una fecha pasada';
  end if;

  /*
   * RESERVA
   */

  select *
  into v_booking
  from public.bookings
  where id = p_booking_id
  for update;

  if
    not found
  then
    raise exception
      'La reserva no existe';
  end if;

  if
    v_booking.status <>
    'CONFIRMED'::public.booking_status
  then
    raise exception
      'Esta reserva ya no está activa';
  end if;

  /*
   * PROPIETARIO DEL NEGOCIO O SUPER ADMIN
   */

  select
    owner_id
  into
    v_owner_id
  from public.businesses
  where id = v_booking.business_id;

  if
    not found
  then
    raise exception
      'El negocio no existe';
  end if;

  if
    v_owner_id <> v_user_id
    and not public.is_super_admin()
  then
    raise exception
      'No puedes modificar esta reserva';
  end if;

  /*
   * SLOT ACTUAL
   */

  select *
  into v_old_slot
  from public.slots
  where id = v_booking.slot_id
  for update;

  if
    not found
  then
    raise exception
      'El horario actual de la reserva no existe';
  end if;

  if
    p_start_at = v_old_slot.start_at
    and p_end_at = v_old_slot.end_at
  then
    raise exception
      'Selecciona un horario diferente';
  end if;

  /*
   * CONFLICTO CON OTRA RESERVA SLOTTYE
   */

  if exists (
    select 1
    from public.bookings b
    join public.slots s
      on s.id = b.slot_id
    where b.business_id = v_booking.business_id
      and b.id <> v_booking.id
      and b.status =
        'CONFIRMED'::public.booking_status
      and s.start_at < p_end_at
      and s.end_at > p_start_at
  ) then
    raise exception
      'El nuevo horario coincide con otra reserva Slottye';
  end if;

  /*
   * CONFLICTO CON RESERVA MANUAL
   */

  if exists (
    select 1
    from public.manual_bookings mb
    where mb.business_id = v_booking.business_id
      and mb.start_at < p_end_at
      and mb.end_at > p_start_at
  ) then
    raise exception
      'El nuevo horario coincide con una reserva manual';
  end if;

  /*
   * CONFLICTO CON BLOQUEO
   */

  if exists (
    select 1
    from public.business_blocks bb
    where bb.business_id = v_booking.business_id
      and bb.start_at < p_end_at
      and bb.end_at > p_start_at
  ) then
    raise exception
      'El nuevo horario coincide con un bloqueo';
  end if;

  /*
   * CONFLICTO CON OTRO SLOT RESERVADO
   */

  if exists (
    select 1
    from public.slots s
    where s.business_id = v_booking.business_id
      and s.id <> v_old_slot.id
      and s.status =
        'BOOKED'::public.slot_status
      and s.start_at < p_end_at
      and s.end_at > p_start_at
  ) then
    raise exception
      'El nuevo horario coincide con otra reserva';
  end if;

  /*
   * RETIRAR DISPONIBILIDADES SOLAPADAS
   *
   * - Con historial: quedan BLOCKED.
   * - Sin historial: se eliminan.
   */

  update public.slots s
  set
    status =
      'BLOCKED'::public.slot_status,
    updated_at =
      now()
  where s.business_id = v_booking.business_id
    and s.id <> v_old_slot.id
    and s.status =
      'AVAILABLE'::public.slot_status
    and s.start_at < p_end_at
    and s.end_at > p_start_at
    and exists (
      select 1
      from public.bookings historical_booking
      where historical_booking.slot_id = s.id
    );

  delete from public.slots s
  where s.business_id = v_booking.business_id
    and s.id <> v_old_slot.id
    and s.status =
      'AVAILABLE'::public.slot_status
    and s.start_at < p_end_at
    and s.end_at > p_start_at
    and not exists (
      select 1
      from public.bookings historical_booking
      where historical_booking.slot_id = s.id
    );

  /*
   * CREAR NUEVO SLOT RESERVADO
   */

  begin
    insert into public.slots (
      business_id,
      service_id,
      start_at,
      end_at,
      status
    )
    values (
      v_booking.business_id,
      v_booking.service_id,
      p_start_at,
      p_end_at,
      'BOOKED'::public.slot_status
    )
    returning id
    into v_target_slot_id;

  exception
    when unique_violation then
      raise exception
        'El nuevo horario ya está ocupado o contiene historial';
  end;

  /*
   * ACTUALIZAR LA RESERVA
   */

  update public.bookings
  set
    slot_id =
      v_target_slot_id
  where id =
    v_booking.id;

  /*
   * RETIRAR EL SLOT ANTERIOR
   */

  if exists (
    select 1
    from public.bookings historical_booking
    where historical_booking.slot_id =
      v_old_slot.id
  ) then
    update public.slots
    set
      status =
        'BLOCKED'::public.slot_status,
      updated_at =
        now()
    where id =
      v_old_slot.id;
  else
    delete from public.slots
    where id =
      v_old_slot.id;
  end if;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.business_reschedule_booking(p_booking_id uuid, p_new_slot_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_user_id uuid;

  v_booking public.bookings%rowtype;
  v_old_slot public.slots%rowtype;
  v_new_slot public.slots%rowtype;

  v_owner_id uuid;
  v_old_slot_blocked boolean;
begin
  /*
   * USUARIO AUTENTICADO
   */

  v_user_id :=
    auth.uid();

  if
    v_user_id is null
  then
    raise exception
      'Debes iniciar sesión';
  end if;

  /*
   * USUARIO NO BLOQUEADO
   */

  perform public.assert_active_user();

  /*
   * RESERVA
   */

  select *
  into v_booking
  from public.bookings
  where
    id = p_booking_id
  for update;

  if
    not found
  then
    raise exception
      'La reserva no existe';
  end if;

  if
    v_booking.status <>
    'CONFIRMED'::public.booking_status
  then
    raise exception
      'Esta reserva ya no está activa';
  end if;

  /*
   * PROPIETARIO DEL NEGOCIO
   */

  select
    owner_id
  into
    v_owner_id
  from public.businesses
  where
    id = v_booking.business_id;

  if
    not found
  then
    raise exception
      'El negocio no existe';
  end if;

  if
    v_owner_id <> v_user_id
  then
    raise exception
      'No puedes modificar esta reserva';
  end if;

  /*
   * SLOT ACTUAL
   */

  select *
  into v_old_slot
  from public.slots
  where
    id = v_booking.slot_id
  for update;

  if
    not found
  then
    raise exception
      'La cita actual no existe';
  end if;

  /*
   * NUEVO SLOT
   */

  select *
  into v_new_slot
  from public.slots
  where
    id = p_new_slot_id
  for update;

  if
    not found
  then
    raise exception
      'La nueva cita no existe';
  end if;

  if
    v_new_slot.id =
    v_old_slot.id
  then
    raise exception
      'Selecciona una cita diferente';
  end if;

  if
    v_new_slot.business_id <>
    v_booking.business_id
  then
    raise exception
      'La nueva cita pertenece a otro negocio';
  end if;

  if
    v_new_slot.status <>
    'AVAILABLE'::public.slot_status
  then
    raise exception
      'La nueva cita ya no está disponible';
  end if;

  if
    v_new_slot.service_id is distinct from
    v_booking.service_id
  then
    raise exception
      'La nueva cita pertenece a otro servicio';
  end if;

  if
    v_new_slot.start_at <= now()
  then
    raise exception
      'No puedes seleccionar una cita pasada';
  end if;

  /*
   * COMPROBAR BLOQUEOS
   */

  if exists (
    select 1
    from public.business_blocks bb
    where
      bb.business_id =
        v_booking.business_id
      and v_new_slot.start_at <
        bb.end_at
      and v_new_slot.end_at >
        bb.start_at
  ) then
    raise exception
      'La nueva cita coincide con un horario bloqueado';
  end if;

  /*
   * COMPROBAR RESERVAS MANUALES
   */

  if exists (
    select 1
    from public.manual_bookings mb
    where
      mb.business_id =
        v_booking.business_id
      and mb.start_at <
        v_new_slot.end_at
      and mb.end_at >
        v_new_slot.start_at
  ) then
    raise exception
      'La nueva cita coincide con una reserva manual';
  end if;

  /*
   * COMPROBAR SI EL SLOT ANTIGUO
   * ESTÁ DENTRO DE UN BLOQUEO
   */

  select exists (
    select 1
    from public.business_blocks bb
    where
      bb.business_id =
        v_booking.business_id
      and v_old_slot.start_at <
        bb.end_at
      and v_old_slot.end_at >
        bb.start_at
  )
  into
    v_old_slot_blocked;

  /*
   * OCUPAR NUEVO SLOT
   */

  update public.slots
  set
    status =
      'BOOKED'::public.slot_status,
    updated_at =
      now()
  where
    id = v_new_slot.id;

  /*
   * ACTUALIZAR RESERVA
   */

  update public.bookings
  set
    slot_id =
      v_new_slot.id,
    service_id =
      v_new_slot.service_id
  where
    id = v_booking.id;

  /*
   * LIBERAR SLOT ANTERIOR
   */

  update public.slots
  set
    status =
      case
        when v_old_slot_blocked
          then 'BLOCKED'::public.slot_status
        else 'AVAILABLE'::public.slot_status
      end,
    updated_at =
      now()
  where
    id = v_old_slot.id;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.cancel_booking(p_booking_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_user_id uuid;

  v_booking
    public.bookings%rowtype;

  v_slot
    public.slots%rowtype;

  v_allow_cancellations
    boolean;

  v_min_notice_hours
    integer;
begin
  /*
   * Usuario autenticado
   */

  v_user_id :=
    auth.uid();

  if
    v_user_id is null
  then
    raise exception
      'Debes iniciar sesión';
  end if;

  /*
   * Usuario no bloqueado
   */

  perform public.assert_active_user();

  /*
   * Bloqueamos la reserva
   */

  select *
  into v_booking
  from public.bookings
  where id =
    p_booking_id
  for update;

  if
    not found
  then
    raise exception
      'La reserva no existe';
  end if;

  /*
   * La reserva debe pertenecer
   * al usuario autenticado
   */

  if
    v_booking.user_id <>
    v_user_id
  then
    raise exception
      'No puedes cancelar esta reserva';
  end if;

  /*
   * Solo se puede cancelar
   * una reserva confirmada
   */

  if
    v_booking.status <>
    'CONFIRMED'::public.booking_status
  then
    raise exception
      'Esta reserva ya no está activa';
  end if;

  /*
   * Cargamos y bloqueamos el slot
   */

  select *
  into v_slot
  from public.slots
  where id =
    v_booking.slot_id
  for update;

  if
    not found
  then
    raise exception
      'El horario de la reserva no existe';
  end if;

  /*
   * Obtenemos la política
   * de cancelación del negocio
   */

  select
    coalesce(
      allow_cancellations,
      false
    ),

    coalesce(
      min_cancellation_notice_hours,
      0
    )
  into
    v_allow_cancellations,
    v_min_notice_hours
  from public.businesses
  where id =
    v_booking.business_id;

  if
    not found
  then
    raise exception
      'El negocio no existe';
  end if;

  /*
   * El negocio puede desactivar
   * las cancelaciones online
   */

  if
    not v_allow_cancellations
  then
    raise exception
      'Este negocio no permite cancelaciones online';
  end if;

  /*
   * No permitimos cancelar citas
   * que ya hayan empezado
   */

  if
    v_slot.start_at <=
    now()
  then
    raise exception
      'Esta cita ya no se puede cancelar';
  end if;

  /*
   * Comprobamos la antelación mínima
   */

  if
    now() >
    v_slot.start_at -
    make_interval(
      hours =>
        v_min_notice_hours
    )
  then
    raise exception
      'Esta cita requiere al menos % horas de antelación para cancelar',
      v_min_notice_hours;
  end if;

  /*
   * Cancelamos la reserva
   */

  update public.bookings
  set
    status =
      'CANCELLED_BY_USER'::public.booking_status,

    cancelled_at =
      now()
  where id =
    v_booking.id;

  /*
   * Liberamos el slot
   */

  update public.slots
  set
    status =
      'AVAILABLE'::public.slot_status,

    updated_at =
      now()
  where id =
    v_booking.slot_id;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.cancel_booking_by_business(p_booking_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_user_id uuid;
  v_booking public.bookings%rowtype;
begin
  v_user_id :=
    auth.uid();

  if
    v_user_id is null
  then
    raise exception
      'Debes iniciar sesión';
  end if;

  perform public.assert_active_user();

  select *
  into v_booking
  from public.bookings
  where
    id = p_booking_id
  for update;

  if
    not found
  then
    raise exception
      'La reserva no existe';
  end if;

  /*
   * PROPIETARIO O SUPER ADMIN
   */

  if not exists (
    select 1
    from public.businesses b
    where
      b.id =
        v_booking.business_id
      and (
        b.owner_id =
          v_user_id
        or public.is_super_admin()
      )
  ) then
    raise exception
      'No puedes cancelar esta reserva';
  end if;

  if
    v_booking.status <>
    'CONFIRMED'::public.booking_status
  then
    raise exception
      'Esta reserva ya no está activa';
  end if;

  update public.bookings
  set
    status =
      'CANCELLED_BY_BUSINESS'::public.booking_status,

    cancelled_at =
      now()
  where
    id = v_booking.id;

  update public.slots
  set
    status =
      'AVAILABLE'::public.slot_status,

    updated_at =
      now()
  where
    id = v_booking.slot_id;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.complete_booking(p_booking_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_user_id uuid;
  v_booking public.bookings%rowtype;
  v_start_at timestamptz;
begin
  v_user_id :=
    auth.uid();

  if
    v_user_id is null
  then
    raise exception
      'Debes iniciar sesión';
  end if;

  perform public.assert_active_user();

  select *
  into v_booking
  from public.bookings
  where
    id = p_booking_id
  for update;

  if
    not found
  then
    raise exception
      'La reserva no existe';
  end if;

  /*
   * PROPIETARIO O SUPER ADMIN
   */

  if not exists (
    select 1
    from public.businesses b
    where
      b.id =
        v_booking.business_id
      and (
        b.owner_id =
          v_user_id
        or public.is_super_admin()
      )
  ) then
    raise exception
      'No puedes modificar esta reserva';
  end if;

  if
    v_booking.status <>
    'CONFIRMED'::public.booking_status
  then
    raise exception
      'Esta reserva ya no está activa';
  end if;

  select
    s.start_at
  into
    v_start_at
  from public.slots s
  where
    s.id =
      v_booking.slot_id
  for update;

  if
    not found
  then
    raise exception
      'El horario de la reserva no existe';
  end if;

  if
    v_start_at >
    now()
  then
    raise exception
      'No puedes completar una cita que todavía no ha comenzado';
  end if;

  update public.bookings
  set
    status =
      'COMPLETED'::public.booking_status
  where
    id = v_booking.id;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.create_agenda_block(p_business_id uuid, p_start_at timestamp with time zone, p_end_at timestamp with time zone, p_reason text)
 RETURNS public.business_blocks
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_owner_id uuid;
  v_block public.business_blocks;
  v_is_service_role boolean;
begin
  /*
   * ============================================================
   * ORIGEN DE LA LLAMADA
   * ============================================================
   */

  v_is_service_role :=
    coalesce(
      auth.jwt() ->> 'role',
      ''
    ) = 'service_role';

  /*
   * Usuario normal:
   * debe existir auth.uid().
   *
   * Backend Slottye:
   * service_role puede ejecutar la operación automática.
   */

  if
    auth.uid() is null
    and not v_is_service_role
  then
    raise exception
      'Not authenticated';
  end if;

  /*
   * ============================================================
   * VALIDAR FECHAS
   * ============================================================
   */

  if
    p_start_at is null
    or p_end_at is null
    or p_end_at <= p_start_at
  then
    raise exception
      'Invalid block dates';
  end if;

  /*
   * ============================================================
   * NEGOCIO
   * ============================================================
   */

  select
    owner_id
  into
    v_owner_id
  from public.businesses
  where
    id = p_business_id;

  if not found then
    raise exception
      'Business not found';
  end if;

  /*
   * ============================================================
   * PROPIETARIO / SUPER ADMIN / SERVICE ROLE
   * ============================================================
   */

  if not v_is_service_role then
    if
      v_owner_id <> auth.uid()
      and not public.is_super_admin()
    then
      raise exception
        'Not authorized';
    end if;
  end if;

  /*
   * ============================================================
   * RESERVA SLOTTYE SOLAPADA
   * ============================================================
   */

  if exists (
    select 1
    from public.bookings b
    join public.slots s
      on s.id = b.slot_id
    where
      b.business_id = p_business_id
      and b.status =
        'CONFIRMED'::public.booking_status
      and s.start_at < p_end_at
      and s.end_at > p_start_at
  ) then
    raise exception
      'El bloqueo coincide con una reserva Slottye';
  end if;

  /*
   * ============================================================
   * RESERVA MANUAL SOLAPADA
   * ============================================================
   */

  if exists (
    select 1
    from public.manual_bookings mb
    where
      mb.business_id = p_business_id
      and mb.start_at < p_end_at
      and mb.end_at > p_start_at
  ) then
    raise exception
      'El bloqueo coincide con una reserva manual';
  end if;

  /*
   * ============================================================
   * OTRO BLOQUEO SOLAPADO
   * ============================================================
   */

  if exists (
    select 1
    from public.business_blocks bb
    where
      bb.business_id = p_business_id
      and bb.start_at < p_end_at
      and bb.end_at > p_start_at
  ) then
    raise exception
      'El horario coincide con otro bloqueo';
  end if;

  /*
   * ============================================================
   * CREAR BLOQUEO
   * ============================================================
   */

  insert into public.business_blocks (
    business_id,
    start_at,
    end_at,
    reason
  )
  values (
    p_business_id,
    p_start_at,
    p_end_at,
    nullif(
      trim(
        coalesce(
          p_reason,
          ''
        )
      ),
      ''
    )
  )
  returning *
  into v_block;

  /*
   * ============================================================
   * SLOTS DISPONIBLES CON HISTORIAL
   * ============================================================
   */

  update public.slots s
  set
    status =
      'BLOCKED'::public.slot_status,
    updated_at =
      now()
  where
    s.business_id = p_business_id
    and s.status =
      'AVAILABLE'::public.slot_status
    and s.start_at < p_end_at
    and s.end_at > p_start_at
    and exists (
      select 1
      from public.bookings b
      where
        b.slot_id = s.id
    );

  /*
   * ============================================================
   * SLOTS DISPONIBLES SIN HISTORIAL
   * ============================================================
   */

  delete from public.slots s
  where
    s.business_id = p_business_id
    and s.status =
      'AVAILABLE'::public.slot_status
    and s.start_at < p_end_at
    and s.end_at > p_start_at
    and not exists (
      select 1
      from public.bookings b
      where
        b.slot_id = s.id
    );

  return v_block;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.create_agenda_slot(p_business_id uuid, p_service_id uuid, p_start_at timestamp with time zone, p_end_at timestamp with time zone)
 RETURNS public.slots
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_owner_id uuid;
  v_slot public.slots;
begin
  /*
   * USUARIO AUTENTICADO
   */

  if auth.uid() is null then
    raise exception
      'Not authenticated';
  end if;

  /*
   * USUARIO NO BLOQUEADO
   */

  perform public.assert_active_user();

  /*
   * VALIDAR FECHAS
   */

  if
    p_start_at is null
    or p_end_at is null
    or p_end_at <= p_start_at
  then
    raise exception
      'Invalid slot dates';
  end if;

  if
    p_start_at <= now()
  then
    raise exception
      'Cannot create a slot in the past';
  end if;

  /*
   * NEGOCIO
   */

  select
    owner_id
  into
    v_owner_id
  from public.businesses
  where
    id = p_business_id
  for update;

  if not found then
    raise exception
      'Business not found';
  end if;

  /*
   * PROPIETARIO O SUPER ADMIN
   */

  if
    v_owner_id <> auth.uid()
    and not public.is_super_admin()
  then
    raise exception
      'Not authorized';
  end if;

  /*
   * SERVICIO
   */

  if not exists (
    select 1
    from public.services
    where
      id = p_service_id
      and business_id = p_business_id
      and active = true
  ) then
    raise exception
      'Invalid service';
  end if;

  /*
   * RESERVA ONLINE SOLAPADA
   */

  if exists (
    select 1
    from public.bookings b
    join public.slots s
      on s.id = b.slot_id
    where
      b.business_id = p_business_id
      and b.status =
        'CONFIRMED'::public.booking_status
      and s.start_at < p_end_at
      and s.end_at > p_start_at
  ) then
    raise exception
      'There is already an online booking in this period';
  end if;

  /*
   * RESERVA MANUAL SOLAPADA
   */

  if exists (
    select 1
    from public.manual_bookings mb
    where
      mb.business_id = p_business_id
      and mb.start_at < p_end_at
      and mb.end_at > p_start_at
  ) then
    raise exception
      'There is already a manual booking in this period';
  end if;

  /*
   * BLOQUEO SOLAPADO
   */

  if exists (
    select 1
    from public.business_blocks bb
    where
      bb.business_id = p_business_id
      and bb.start_at < p_end_at
      and bb.end_at > p_start_at
  ) then
    raise exception
      'There is already a block in this period';
  end if;

  /*
   * OTRO SLOT SOLAPADO
   */

  if exists (
    select 1
    from public.slots s
    where
      s.business_id = p_business_id
      and s.status in (
        'AVAILABLE'::public.slot_status,
        'BOOKED'::public.slot_status
      )
      and s.start_at < p_end_at
      and s.end_at > p_start_at
  ) then
    raise exception
      'There is already a slot in this period';
  end if;

  /*
   * CREAR DISPONIBILIDAD
   */

  insert into public.slots (
    business_id,
    service_id,
    start_at,
    end_at,
    status
  )
  values (
    p_business_id,
    p_service_id,
    p_start_at,
    p_end_at,
    'AVAILABLE'::public.slot_status
  )
  returning *
  into v_slot;

  return v_slot;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.create_calendar_block(p_business_id uuid, p_start_at timestamp with time zone, p_end_at timestamp with time zone, p_reason text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_user_id uuid;
  v_owner_id uuid;

  v_block public.business_blocks;

  v_blocked_slot_ids uuid[] :=
    array[]::uuid[];

  v_booked_count integer :=
    0;
begin
  /*
   * ============================================================
   * USUARIO
   * ============================================================
   */

  v_user_id :=
    auth.uid();

  if
    v_user_id is null
  then
    raise exception
      'Not authenticated';
  end if;

  /*
   * ============================================================
   * VALIDAR FECHAS
   * ============================================================
   */

  if
    p_start_at is null
    or p_end_at is null
    or p_end_at <= p_start_at
  then
    raise exception
      'Invalid block dates';
  end if;

  if
    p_end_at <= now()
  then
    raise exception
      'Block is in the past';
  end if;

  /*
   * ============================================================
   * NEGOCIO
   * ============================================================
   */

  select
    owner_id
  into
    v_owner_id
  from public.businesses
  where
    id = p_business_id;

  if not found then
    raise exception
      'Business not found';
  end if;

  if
    v_owner_id <> v_user_id
  then
    raise exception
      'Not authorized';
  end if;

  /*
   * Evitamos que dos operaciones simultáneas sobre
   * el mismo calendario se pisen entre ellas.
   */

  perform pg_advisory_xact_lock(
    hashtext(
      p_business_id::text
    )::bigint
  );

  /*
   * ============================================================
   * BLOQUEO DUPLICADO
   * ============================================================
   */

  if exists (
    select 1
    from public.business_blocks bb
    where
      bb.business_id = p_business_id
      and bb.start_at = p_start_at
      and bb.end_at = p_end_at
  ) then
    raise exception
      'Block already exists';
  end if;

  /*
   * ============================================================
   * CONTAR RESERVAS EXISTENTES
   * ============================================================
   *
   * NO se cancelan ni modifican.
   * Solo devolvemos el número para información.
   */

  select
    count(*)
  into
    v_booked_count
  from public.slots s
  where
    s.business_id = p_business_id
    and s.status = 'BOOKED'
    and s.start_at < p_end_at
    and s.end_at > p_start_at;

  /*
   * ============================================================
   * CREAR BLOQUEO
   * ============================================================
   */

  insert into public.business_blocks (
    business_id,
    start_at,
    end_at,
    reason
  )
  values (
    p_business_id,
    p_start_at,
    p_end_at,
    nullif(
      trim(
        coalesce(
          p_reason,
          ''
        )
      ),
      ''
    )
  )
  returning *
  into v_block;

  /*
   * ============================================================
   * RETIRAR DISPONIBILIDADES
   * ============================================================
   *
   * Solo AVAILABLE.
   *
   * Las reservas BOOKED se conservan exactamente
   * como están.
   */

  with updated_slots as (
    update public.slots

    set
      status = 'BLOCKED'

    where
      business_id = p_business_id
      and status = 'AVAILABLE'
      and start_at < p_end_at
      and end_at > p_start_at

    returning id
  )
  select
    coalesce(
      array_agg(id),
      array[]::uuid[]
    )
  into
    v_blocked_slot_ids
  from updated_slots;

  /*
   * ============================================================
   * RESPUESTA
   * ============================================================
   */

  return jsonb_build_object(
    'block',
    jsonb_build_object(
      'id',
      v_block.id,

      'start_at',
      v_block.start_at,

      'end_at',
      v_block.end_at,

      'reason',
      v_block.reason
    ),

    'blocked_slot_ids',
    to_jsonb(
      v_blocked_slot_ids
    ),

    'blocked_count',
    cardinality(
      v_blocked_slot_ids
    ),

    'booked_count',
    v_booked_count
  );
end;
$function$
;

CREATE OR REPLACE FUNCTION public.create_calendar_slots_bulk(p_business_id uuid, p_service_id uuid, p_slots jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_user_id uuid;
  v_owner_id uuid;
  v_service_active boolean;

  v_item jsonb;

  v_start_at timestamptz;
  v_end_at timestamptz;

  v_created public.slots;

  v_created_slots jsonb :=
    '[]'::jsonb;

  v_created_count integer :=
    0;

  v_existing_count integer :=
    0;

  v_blocked_count integer :=
    0;

  v_invalid_count integer :=
    0;
begin
  /*
   * ============================================================
   * USUARIO
   * ============================================================
   */

  v_user_id :=
    auth.uid();

  if
    v_user_id is null
  then
    raise exception
      'Not authenticated';
  end if;

  /*
   * ============================================================
   * NEGOCIO
   * ============================================================
   */

  select
    owner_id
  into
    v_owner_id
  from public.businesses
  where
    id =
      p_business_id;

  if not found then
    raise exception
      'Business not found';
  end if;

  if
    v_owner_id <>
    v_user_id
  then
    raise exception
      'Not authorized';
  end if;

  /*
   * Serializamos modificaciones masivas del calendario
   * del mismo negocio durante esta transacción.
   */

  perform pg_advisory_xact_lock(
    hashtext(
      p_business_id::text
    )::bigint
  );

  /*
   * ============================================================
   * SERVICIO
   * ============================================================
   */

  select
    active
  into
    v_service_active
  from public.services
  where
    id =
      p_service_id
    and business_id =
      p_business_id;

  if not found then
    raise exception
      'Service does not belong to business';
  end if;

  if
    v_service_active <>
    true
  then
    raise exception
      'Service is inactive';
  end if;

  /*
   * ============================================================
   * VALIDAR ARRAY
   * ============================================================
   */

  if
    p_slots is null
    or jsonb_typeof(
      p_slots
    ) <>
      'array'
  then
    raise exception
      'Invalid slots payload';
  end if;

  if
    jsonb_array_length(
      p_slots
    ) = 0
  then
    return jsonb_build_object(
      'created',
      v_created_slots,

      'created_count',
      0,

      'existing_count',
      0,

      'blocked_count',
      0,

      'invalid_count',
      0
    );
  end if;

  if
    jsonb_array_length(
      p_slots
    ) >
      500
  then
    raise exception
      'Too many slots';
  end if;

  /*
   * ============================================================
   * PROCESAR HUECOS
   * ============================================================
   */

  for
    v_item
  in
    select value
    from jsonb_array_elements(
      p_slots
    )
  loop

    begin
  v_start_at :=
    (
      v_item ->> 'start_at'
    )::timestamptz;

  v_end_at :=
    (
      v_item ->> 'end_at'
    )::timestamptz;
exception
      when others then
        v_invalid_count :=
          v_invalid_count +
          1;

        continue;
    end;

    /*
     * Fechas inválidas.
     */

    if
      v_start_at is null
      or v_end_at is null
      or v_end_at <=
        v_start_at
      or v_end_at <=
        now()
    then
      v_invalid_count :=
        v_invalid_count +
        1;

      continue;
    end if;

    /*
     * ==========================================================
     * BLOQUEOS
     * ==========================================================
     */

    if exists (
      select 1

      from public.business_blocks bb

      where
        bb.business_id =
          p_business_id

        and bb.start_at <
          v_end_at

        and bb.end_at >
          v_start_at
    ) then
      v_blocked_count :=
        v_blocked_count +
        1;

      continue;
    end if;

    /*
     * ==========================================================
     * HUECO EXISTENTE
     * ==========================================================
     *
     * Conservamos el comportamiento actual de CalendarManager:
     * se considera duplicado si ya existe otro slot que empieza
     * exactamente a la misma hora.
     */

    if exists (
      select 1

      from public.slots s

      where
        s.business_id =
          p_business_id

        and s.start_at =
          v_start_at
    ) then
      v_existing_count :=
        v_existing_count +
        1;

      continue;
    end if;

    /*
     * ==========================================================
     * CREAR
     * ==========================================================
     */

    insert into public.slots (
      business_id,
      service_id,
      start_at,
      end_at,
      status
    )
    values (
      p_business_id,
      p_service_id,
      v_start_at,
      v_end_at,
      'AVAILABLE'
    )
    returning *
    into v_created;

    v_created_slots :=
      v_created_slots ||
      jsonb_build_array(
        jsonb_build_object(
          'id',
          v_created.id,

          'service_id',
          v_created.service_id,

          'start_at',
          v_created.start_at,

          'end_at',
          v_created.end_at,

          'status',
          v_created.status
        )
      );

    v_created_count :=
      v_created_count +
      1;
  end loop;

  /*
   * ============================================================
   * RESULTADO
   * ============================================================
   */

  return jsonb_build_object(
    'created',
    v_created_slots,

    'created_count',
    v_created_count,

    'existing_count',
    v_existing_count,

    'blocked_count',
    v_blocked_count,

    'invalid_count',
    v_invalid_count
  );
end;
$function$
;

CREATE OR REPLACE FUNCTION public.create_manual_booking(p_business_id uuid, p_service_id uuid, p_customer_name text, p_customer_phone text, p_customer_email text, p_start_at timestamp with time zone, p_end_at timestamp with time zone, p_notes text)
 RETURNS public.manual_bookings
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_owner_id uuid;
  v_manual_booking public.manual_bookings;
begin
  /*
   * USUARIO AUTENTICADO
   */

  if auth.uid() is null then
    raise exception
      'Debes iniciar sesión';
  end if;

  /*
   * USUARIO NO BLOQUEADO
   */

  perform public.assert_active_user();

  /*
   * VALIDACIONES BÁSICAS
   */

  if
    p_customer_name is null
    or length(
      trim(
        p_customer_name
      )
    ) = 0
  then
    raise exception
      'El nombre del cliente es obligatorio';
  end if;

  if
    p_start_at is null
    or p_end_at is null
    or p_end_at <= p_start_at
  then
    raise exception
      'El horario de la reserva no es válido';
  end if;

  /*
   * COMPROBAR PROPIETARIO O SUPER ADMIN
   */

  select
    owner_id
  into
    v_owner_id
  from public.businesses
  where
    id = p_business_id;

  if not found then
    raise exception
      'El negocio no existe';
  end if;

  if
    v_owner_id <> auth.uid()
    and not public.is_super_admin()
  then
    raise exception
      'No tienes permisos para crear esta reserva';
  end if;

  /*
   * COMPROBAR SERVICIO
   */

  if
    p_service_id is not null
  then
    if not exists (
      select 1
      from public.services
      where
        id = p_service_id
        and business_id = p_business_id
        and active = true
    ) then
      raise exception
        'El servicio no pertenece al negocio o no está activo';
    end if;
  end if;

  /*
   * RESERVA ONLINE SOLAPADA
   */

  if exists (
    select 1
    from public.bookings b
    join public.slots s
      on s.id = b.slot_id
    where
      b.business_id = p_business_id
      and b.status =
        'CONFIRMED'::public.booking_status
      and s.start_at < p_end_at
      and s.end_at > p_start_at
  ) then
    raise exception
      'Ya existe una reserva Slottye en ese horario';
  end if;

  /*
   * RESERVA MANUAL SOLAPADA
   */

  if exists (
    select 1
    from public.manual_bookings mb
    where
      mb.business_id = p_business_id
      and mb.start_at < p_end_at
      and mb.end_at > p_start_at
  ) then
    raise exception
      'Ya existe una reserva manual en ese horario';
  end if;

  /*
   * BLOQUEO SOLAPADO
   */

  if exists (
    select 1
    from public.business_blocks bb
    where
      bb.business_id = p_business_id
      and bb.start_at < p_end_at
      and bb.end_at > p_start_at
  ) then
    raise exception
      'Ese horario está bloqueado';
  end if;

  /*
   * CREAR RESERVA MANUAL
   */

  insert into public.manual_bookings (
    business_id,
    service_id,
    customer_name,
    customer_phone,
    customer_email,
    start_at,
    end_at,
    notes
  )
  values (
    p_business_id,
    p_service_id,
    trim(
      p_customer_name
    ),
    nullif(
      trim(
        p_customer_phone
      ),
      ''
    ),
    nullif(
      trim(
        p_customer_email
      ),
      ''
    ),
    p_start_at,
    p_end_at,
    nullif(
      trim(
        p_notes
      ),
      ''
    )
  )
  returning *
  into v_manual_booking;

  /*
   * SLOTS DISPONIBLES CON HISTORIAL
   */

  update public.slots s
  set
    status =
      'BLOCKED'::public.slot_status,
    updated_at =
      now()
  where
    s.business_id = p_business_id
    and s.status =
      'AVAILABLE'::public.slot_status
    and s.start_at < p_end_at
    and s.end_at > p_start_at
    and exists (
      select 1
      from public.bookings b
      where
        b.slot_id = s.id
    );

  /*
   * SLOTS DISPONIBLES SIN HISTORIAL
   */

  delete from public.slots s
  where
    s.business_id = p_business_id
    and s.status =
      'AVAILABLE'::public.slot_status
    and s.start_at < p_end_at
    and s.end_at > p_start_at
    and not exists (
      select 1
      from public.bookings b
      where
        b.slot_id = s.id
    );

  return v_manual_booking;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.delete_account_data_transactional(p_user_id uuid)
 RETURNS TABLE(released_booking_id uuid, released_slot_id uuid, released_business_id uuid, released_service_id uuid, released_start_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_booking record;
  v_released record;
begin
  /*
   * ============================================================
   * VALIDAR USUARIO
   * ============================================================
   */

  if p_user_id is null then
    raise exception 'USER_ID_REQUIRED';
  end if;

  /*
   * Bloqueamos el perfil mientras dura toda la operación.
   */

  perform 1
  from public.profiles
  where id = p_user_id
  for update;

  if not found then
    raise exception 'PROFILE_NOT_FOUND';
  end if;

  /*
   * ============================================================
   * CANCELAR RESERVAS FUTURAS CONFIRMADAS DEL USUARIO
   * ============================================================
   *
   * Reutilizamos la RPC existente.
   *
   * Esa función:
   * - bloquea booking + slot;
   * - cambia booking a CANCELLED_ACCOUNT_DELETED;
   * - libera el slot;
   * - devuelve los datos necesarios.
   */

  for v_booking in
    select
      b.id
    from public.bookings b
    join public.slots s
      on s.id = b.slot_id
    where
      b.user_id = p_user_id
      and b.status =
        'CONFIRMED'::public.booking_status
      and s.start_at > now()
      and s.status =
        'BOOKED'::public.slot_status
    order by s.start_at
  loop
    for v_released in
      select *
      from public.admin_cancel_booking_for_account_deletion(
        v_booking.id
      )
    loop
      released_booking_id :=
        v_released.booking_id;

      released_slot_id :=
        v_released.slot_id;

      released_business_id :=
        v_released.business_id;

      released_service_id :=
        v_released.service_id;

      released_start_at :=
        v_released.start_at;

      return next;
    end loop;
  end loop;

  /*
   * ============================================================
   * ELIMINAR PROFILE
   * ============================================================
   *
   * Aquí actúan tus FK reales:
   *
   * - businesses.owner_id -> CASCADE
   * - business_subscriptions -> CASCADE
   * - favorites -> CASCADE
   * - notifications -> CASCADE
   * - reviews -> CASCADE
   * - bookings.user_id -> SET NULL
   * - audit logs -> SET NULL
   *
   * Las reservas históricas del cliente permanecen.
   */

  delete from public.profiles
  where id = p_user_id;

  if not found then
    raise exception 'PROFILE_DELETE_FAILED';
  end if;

  /*
   * Si cualquier operación anterior falla,
   * PostgreSQL revierte TODA esta función.
   */
end;
$function$
;

CREATE OR REPLACE FUNCTION public.delete_agenda_block(p_block_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_user_id uuid;
  v_business_id uuid;
  v_is_service_role boolean;
begin
  /*
   * ============================================================
   * ORIGEN DE LA LLAMADA
   * ============================================================
   */

  v_is_service_role :=
    coalesce(
      auth.jwt() ->> 'role',
      ''
    ) = 'service_role';

  v_user_id :=
    auth.uid();

  /*
   * Usuario normal:
   * autenticado + activo.
   *
   * Backend service_role:
   * no existe usuario y no se ejecuta assert_active_user().
   */

  if not v_is_service_role then
    if
      v_user_id is null
    then
      raise exception
        'Debes iniciar sesión';
    end if;

    perform public.assert_active_user();
  end if;

  /*
   * ============================================================
   * CARGAR BLOQUEO
   * ============================================================
   */

  select
    bb.business_id
  into
    v_business_id
  from public.business_blocks bb
  where
    bb.id = p_block_id
  for update;

  if not found then
    raise exception
      'El bloqueo no existe';
  end if;

  /*
   * ============================================================
   * PROPIETARIO / SUPER ADMIN / SERVICE ROLE
   * ============================================================
   */

  if not v_is_service_role then
    if not exists (
      select 1
      from public.businesses b
      where
        b.id = v_business_id
        and (
          b.owner_id =
            v_user_id
          or public.is_super_admin()
        )
    ) then
      raise exception
        'No tienes permisos para eliminar este bloqueo';
    end if;
  end if;

  /*
   * ============================================================
   * ELIMINAR BLOQUEO
   * ============================================================
   *
   * Conservamos el comportamiento actual:
   * no se regeneran disponibilidades automáticamente.
   */

  delete from public.business_blocks
  where
    id = p_block_id;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.delete_agenda_slot(p_slot_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_business_id uuid;
  v_owner_id uuid;
  v_status text;
begin
  /*
   * USUARIO AUTENTICADO
   */

  if auth.uid() is null then
    raise exception
      'Not authenticated';
  end if;

  /*
   * USUARIO NO BLOQUEADO
   */

  perform public.assert_active_user();

  /*
   * CARGAR SLOT
   */

  select
    s.business_id,
    s.status::text
  into
    v_business_id,
    v_status
  from public.slots s
  where
    s.id = p_slot_id
  for update;

  if not found then
    raise exception
      'Slot not found';
  end if;

  /*
   * NEGOCIO
   */

  select
    b.owner_id
  into
    v_owner_id
  from public.businesses b
  where
    b.id = v_business_id;

  if not found then
    raise exception
      'Business not found';
  end if;

  /*
   * PROPIETARIO O SUPER ADMIN
   */

  if
    v_owner_id <> auth.uid()
    and not public.is_super_admin()
  then
    raise exception
      'Not authorized';
  end if;

  /*
   * SOLO DISPONIBILIDADES LIBRES
   */

  if
    v_status <> 'AVAILABLE'
  then
    raise exception
      'Only available slots can be removed';
  end if;

  /*
   * CONSERVAR HISTORIAL
   */

  if exists (
    select 1
    from public.bookings b
    where
      b.slot_id = p_slot_id
  ) then
    update public.slots
    set
      status =
        'BLOCKED'::public.slot_status,
      updated_at =
        now()
    where
      id = p_slot_id;
  else
    delete from public.slots
    where
      id = p_slot_id;
  end if;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.delete_business_service_transactional(p_business_id uuid, p_service_id uuid)
 RETURNS TABLE(deleted boolean, deleted_service_id uuid, deleted_slots integer, online_bookings bigint, manual_bookings bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_online_bookings bigint := 0;
  v_manual_bookings bigint := 0;
  v_deleted_slots integer := 0;
begin
  /*
   * ============================================================
   * VALIDAR PARÁMETROS
   * ============================================================
   */

  if p_business_id is null then
    raise exception 'BUSINESS_ID_REQUIRED';
  end if;

  if p_service_id is null then
    raise exception 'SERVICE_ID_REQUIRED';
  end if;

  /*
   * ============================================================
   * BLOQUEAR SERVICIO
   * ============================================================
   *
   * Además de comprobar que pertenece al negocio,
   * el FOR UPDATE evita modificaciones concurrentes
   * mientras decidimos si puede eliminarse.
   */

  perform 1
  from public.services s
  where
    s.id = p_service_id
    and s.business_id = p_business_id
  for update;

  if not found then
    raise exception 'SERVICE_NOT_FOUND';
  end if;

  /*
   * ============================================================
   * BLOQUEAR SLOTS DEL SERVICIO
   * ============================================================
   *
   * Esto también protege frente a una reserva concurrente
   * que intente referenciar uno de estos slots mientras
   * estamos realizando la eliminación.
   */

  perform 1
  from public.slots s
  where
    s.business_id = p_business_id
    and s.service_id = p_service_id
  for update;

  /*
   * ============================================================
   * RESERVAS ONLINE
   * ============================================================
   *
   * Contamos una reserva una sola vez aunque esté relacionada
   * tanto mediante service_id como mediante slot_id.
   */

  select
    count(distinct b.id)
  into
    v_online_bookings
  from public.bookings b
  where
    b.business_id = p_business_id
    and (
      b.service_id = p_service_id
      or exists (
        select 1
        from public.slots s
        where
          s.id = b.slot_id
          and s.business_id = p_business_id
          and s.service_id = p_service_id
      )
    );

  /*
   * ============================================================
   * RESERVAS MANUALES
   * ============================================================
   */

  select
    count(*)
  into
    v_manual_bookings
  from public.manual_bookings mb
  where
    mb.business_id = p_business_id
    and mb.service_id = p_service_id;

  /*
   * ============================================================
   * SI HAY HISTORIAL, NO ELIMINAR
   * ============================================================
   */

  if
    v_online_bookings > 0
    or v_manual_bookings > 0
  then
    deleted :=
      false;

    deleted_service_id :=
      p_service_id;

    deleted_slots :=
      0;

    online_bookings :=
      v_online_bookings;

    manual_bookings :=
      v_manual_bookings;

    return next;
    return;
  end if;

  /*
   * ============================================================
   * ELIMINAR DISPONIBILIDADES
   * ============================================================
   */

  delete from public.slots s
  where
    s.business_id = p_business_id
    and s.service_id = p_service_id;

  get diagnostics
    v_deleted_slots =
      row_count;

  /*
   * ============================================================
   * ELIMINAR SERVICIO
   * ============================================================
   */

  delete from public.services s
  where
    s.id = p_service_id
    and s.business_id = p_business_id;

  if not found then
    raise exception 'SERVICE_DELETE_FAILED';
  end if;

  /*
   * ============================================================
   * RESULTADO
   * ============================================================
   */

  deleted :=
    true;

  deleted_service_id :=
    p_service_id;

  deleted_slots :=
    v_deleted_slots;

  online_bookings :=
    0;

  manual_bookings :=
    0;

  return next;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.delete_calendar_slots(p_slot_ids uuid[])
 RETURNS TABLE(slot_id uuid, action text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_user_id uuid;
  v_requested_count integer;
  v_valid_count integer;
begin
  /*
   * ============================================================
   * USUARIO
   * ============================================================
   */

  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  /*
   * ============================================================
   * VALIDAR ENTRADA
   * ============================================================
   */

  if
    p_slot_ids is null
    or cardinality(p_slot_ids) = 0
  then
    raise exception 'No slots provided';
  end if;

  select count(distinct slot_id)
  into v_requested_count
  from unnest(p_slot_ids) as requested(slot_id);

  /*
   * Todos los slots:
   * - deben existir;
   * - pertenecer a un negocio del usuario;
   * - estar AVAILABLE.
   */

  select count(*)
  into v_valid_count
  from public.slots s
  join public.businesses b
    on b.id = s.business_id
  where
    s.id = any(p_slot_ids)
    and b.owner_id = v_user_id
    and s.status = 'AVAILABLE';

  if
    v_valid_count <>
    v_requested_count
  then
    raise exception
      'Some slots do not exist, are not available or do not belong to the user';
  end if;

  /*
   * ============================================================
   * CLASIFICAR
   * ============================================================
   *
   * Si existe cualquier reserva histórica:
   *   AVAILABLE -> BLOCKED
   *
   * Si nunca ha existido ninguna reserva:
   *   DELETE real
   *
   * Todo ocurre dentro de la misma transacción.
   * ============================================================
   */

  return query

  with slot_classification as (
    select
      s.id,

      exists (
        select 1
        from public.bookings b
        where b.slot_id = s.id
      ) as has_history

    from public.slots s

    where
      s.id = any(p_slot_ids)
      and s.status = 'AVAILABLE'
  ),

  blocked_slots as (
    update public.slots s

    set
      status = 'BLOCKED'

    from slot_classification sc

    where
      s.id = sc.id
      and sc.has_history = true

    returning
      s.id
  ),

  deleted_slots as (
    delete from public.slots s

    using slot_classification sc

    where
      s.id = sc.id
      and sc.has_history = false

    returning
      s.id
  )

  select
    blocked_slots.id,
    'BLOCKED'::text
  from blocked_slots

  union all

  select
    deleted_slots.id,
    'DELETED'::text
  from deleted_slots;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.delete_manual_booking(p_booking_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_user_id uuid;
  v_business_id uuid;
begin
  /*
   * USUARIO AUTENTICADO Y NO BLOQUEADO
   */

  if auth.uid() is null then
    raise exception
      'Debes iniciar sesión';
  end if;

  perform public.assert_active_user();

  v_user_id :=
    auth.uid();

  /*
   * CARGAR Y BLOQUEAR LA RESERVA MANUAL
   */

  select
    mb.business_id
  into
    v_business_id
  from public.manual_bookings mb
  where
    mb.id = p_booking_id
  for update;

  if not found then
    raise exception
      'La reserva manual no existe';
  end if;

  /*
   * COMPROBAR PROPIETARIO O SUPER ADMIN
   */

  if not exists (
    select 1
    from public.businesses b
    where
      b.id = v_business_id
      and (
        b.owner_id = v_user_id
        or public.is_super_admin()
      )
  ) then
    raise exception
      'No tienes permisos para eliminar esta reserva manual';
  end if;

  /*
   * ELIMINAR
   */

  delete from public.manual_bookings
  where
    id = p_booking_id;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  insert into public.profiles (
    id,
    email,
    name,
    avatar_url,
    role
  )
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data ->> 'name',
      new.raw_user_meta_data ->> 'full_name',
      ''
    ),
    new.raw_user_meta_data ->> 'avatar_url',
    case
      when new.raw_user_meta_data ->> 'role' = 'business'
        then 'business'::public.user_role
      else 'customer'::public.user_role
    end
  )
  on conflict (id) do nothing;

  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.is_active_user()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select
    auth.uid() is not null
    and exists (
      select 1
      from public.profiles p
      where
        p.id = auth.uid()
        and p.is_blocked = false
    );
$function$
;

CREATE OR REPLACE FUNCTION public.is_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and is_admin = true
  );
$function$
;

CREATE OR REPLACE FUNCTION public.is_super_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and is_admin = true
  );
$function$
;

CREATE OR REPLACE FUNCTION public.no_show_booking(p_booking_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_user_id uuid;
  v_booking public.bookings%rowtype;
  v_start_at timestamptz;
begin
  v_user_id :=
    auth.uid();

  if
    v_user_id is null
  then
    raise exception
      'Debes iniciar sesión';
  end if;

  perform public.assert_active_user();

  select *
  into v_booking
  from public.bookings
  where
    id = p_booking_id
  for update;

  if
    not found
  then
    raise exception
      'La reserva no existe';
  end if;

  /*
   * PROPIETARIO O SUPER ADMIN
   */

  if not exists (
    select 1
    from public.businesses b
    where
      b.id =
        v_booking.business_id
      and (
        b.owner_id =
          v_user_id
        or public.is_super_admin()
      )
  ) then
    raise exception
      'No puedes modificar esta reserva';
  end if;

  if
    v_booking.status <>
    'CONFIRMED'::public.booking_status
  then
    raise exception
      'Esta reserva ya no está activa';
  end if;

  select
    s.start_at
  into
    v_start_at
  from public.slots s
  where
    s.id =
      v_booking.slot_id
  for update;

  if
    not found
  then
    raise exception
      'El horario de la reserva no existe';
  end if;

  if
    v_start_at >
    now()
  then
    raise exception
      'No puedes marcar como no presentado antes de la cita';
  end if;

  update public.bookings
  set
    status =
      'NO_SHOW'::public.booking_status
  where
    id = v_booking.id;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.release_google_calendar_sync_lock(p_business_id uuid, p_lock_token text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_released boolean;
begin
  if
    p_business_id is null
    or p_lock_token is null
    or btrim(p_lock_token) = ''
  then
    return false;
  end if;

  update public.business_google_calendar_connections
  set
    sync_lock_token =
      null,

    sync_lock_until =
      null,

    updated_at =
      now()
  where
    business_id =
      p_business_id
    and sync_lock_token =
      p_lock_token;

  get diagnostics
    v_released =
      row_count;

  return
    v_released;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.reschedule_booking(p_booking_id uuid, p_new_slot_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_user_id uuid;

  v_booking public.bookings%rowtype;
  v_old_slot public.slots%rowtype;
  v_new_slot public.slots%rowtype;

  v_old_slot_blocked boolean;

  v_min_booking_notice_hours integer;
  v_max_booking_advance_days integer;

  v_allow_cancellations boolean;
  v_min_cancellation_notice_hours integer;
begin
  /*
   * Usuario autenticado
   */

  v_user_id :=
    auth.uid();

  if
    v_user_id is null
  then
    raise exception
      'Debes iniciar sesión';
  end if;

  /*
   * Usuario no bloqueado
   */

  perform public.assert_active_user();

  /*
   * Reserva actual
   */

  select *
  into v_booking
  from public.bookings
  where
    id = p_booking_id
  for update;

  if
    not found
  then
    raise exception
      'La reserva no existe';
  end if;

  if
    v_booking.user_id <>
    v_user_id
  then
    raise exception
      'No puedes modificar esta reserva';
  end if;

  if
    v_booking.status <>
    'CONFIRMED'::public.booking_status
  then
    raise exception
      'Esta reserva ya no está activa';
  end if;

  /*
   * Slot actual
   */

  select *
  into v_old_slot
  from public.slots
  where
    id = v_booking.slot_id
  for update;

  if
    not found
  then
    raise exception
      'La cita actual no existe';
  end if;

  if
    v_old_slot.start_at <=
    now()
  then
    raise exception
      'Esta cita ya no se puede modificar';
  end if;

  /*
   * Políticas del negocio
   */

  select
    min_booking_notice_hours,
    max_booking_advance_days,
    allow_cancellations,
    min_cancellation_notice_hours
  into
    v_min_booking_notice_hours,
    v_max_booking_advance_days,
    v_allow_cancellations,
    v_min_cancellation_notice_hours
  from public.businesses
  where
    id = v_booking.business_id;

  if
    not found
  then
    raise exception
      'El negocio no existe';
  end if;

  /*
   * Si el negocio no permite cancelaciones,
   * tampoco permitimos reprogramar
   */

  if
    not v_allow_cancellations
  then
    raise exception
      'Este negocio no permite modificar las citas';
  end if;

  /*
   * Antelación mínima para cambiar
   */

  if
    v_old_slot.start_at <
    now() +
    make_interval(
      hours =>
        v_min_cancellation_notice_hours
    )
  then
    raise exception
      'Esta cita solo se puede cambiar con al menos % horas de antelación',
      v_min_cancellation_notice_hours;
  end if;

  /*
   * Nuevo slot
   */

  select *
  into v_new_slot
  from public.slots
  where
    id = p_new_slot_id
  for update;

  if
    not found
  then
    raise exception
      'La nueva cita no existe';
  end if;

  if
    v_new_slot.id =
    v_old_slot.id
  then
    raise exception
      'Selecciona una cita diferente';
  end if;

  if
    v_new_slot.status <>
    'AVAILABLE'::public.slot_status
  then
    raise exception
      'La nueva cita ya no está disponible';
  end if;

  if
    v_new_slot.business_id <>
    v_booking.business_id
  then
    raise exception
      'La nueva cita pertenece a otro negocio';
  end if;

  if
    v_new_slot.service_id is distinct from
    v_booking.service_id
  then
    raise exception
      'La nueva cita pertenece a otro servicio';
  end if;

  if
    v_new_slot.start_at <=
    now()
  then
    raise exception
      'No puedes seleccionar una cita pasada';
  end if;

  /*
   * Política de reserva del nuevo hueco
   */

  if
    v_new_slot.start_at <
    now() +
    make_interval(
      hours =>
        v_min_booking_notice_hours
    )
  then
    raise exception
      'La nueva cita requiere al menos % horas de antelación',
      v_min_booking_notice_hours;
  end if;

  if
    v_new_slot.start_at >
    now() +
    make_interval(
      days =>
        v_max_booking_advance_days
    )
  then
    raise exception
      'No puedes reservar con más de % días de antelación',
      v_max_booking_advance_days;
  end if;

  /*
   * No permitir bloqueos
   */

  if exists (
    select 1
    from public.business_blocks bb
    where
      bb.business_id =
        v_booking.business_id
      and v_new_slot.start_at <
        bb.end_at
      and v_new_slot.end_at >
        bb.start_at
  ) then
    raise exception
      'La nueva cita coincide con un horario bloqueado';
  end if;

  /*
   * No permitir reservas manuales
   */

  if exists (
    select 1
    from public.manual_bookings mb
    where
      mb.business_id =
        v_booking.business_id
      and mb.start_at <
        v_new_slot.end_at
      and mb.end_at >
        v_new_slot.start_at
  ) then
    raise exception
      'La nueva cita coincide con una reserva manual';
  end if;

  /*
   * Comprobar si el slot antiguo
   * está dentro de un bloqueo
   */

  select exists (
    select 1
    from public.business_blocks bb
    where
      bb.business_id =
        v_booking.business_id
      and v_old_slot.start_at <
        bb.end_at
      and v_old_slot.end_at >
        bb.start_at
  )
  into
    v_old_slot_blocked;

  /*
   * Ocupamos el nuevo slot
   */

  update public.slots
  set
    status =
      'BOOKED'::public.slot_status,
    updated_at =
      now()
  where
    id = v_new_slot.id;

  /*
   * Actualizamos la reserva
   */

  update public.bookings
  set
    slot_id =
      v_new_slot.id
  where
    id = v_booking.id;

  /*
   * Liberamos el anterior,
   * salvo que esté bloqueado
   */

  update public.slots
  set
    status =
      case
        when v_old_slot_blocked
          then 'BLOCKED'::public.slot_status
        else 'AVAILABLE'::public.slot_status
      end,
    updated_at =
      now()
  where
    id = v_old_slot.id;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.save_business_hours_transactional(p_business_id uuid, p_days jsonb)
 RETURNS TABLE(id uuid, day_of_week smallint, open_time time without time zone, close_time time without time zone, open_time_2 time without time zone, close_time_2 time without time zone, closed boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_day jsonb;
  v_day_of_week smallint;
  v_open_time time;
  v_close_time time;
  v_open_time_2 time;
  v_close_time_2 time;
  v_closed boolean;
  v_count integer;
begin
  /*
   * ============================================================
   * VALIDAR NEGOCIO
   * ============================================================
   */

  if p_business_id is null then
    raise exception 'BUSINESS_ID_REQUIRED';
  end if;

  perform 1
  from public.businesses b
  where b.id = p_business_id
  for update;

  if not found then
    raise exception 'BUSINESS_NOT_FOUND';
  end if;

  /*
   * ============================================================
   * VALIDAR JSON
   * ============================================================
   */

  if p_days is null
     or jsonb_typeof(p_days) <> 'array' then
    raise exception 'INVALID_DAYS';
  end if;

  if jsonb_array_length(p_days) <> 7 then
    raise exception 'SEVEN_DAYS_REQUIRED';
  end if;

  /*
   * Deben existir exactamente los días 0..6,
   * sin duplicados.
   */

  select
    count(
      distinct (
        item.value->>'day_of_week'
      )::integer
    )
  into v_count
  from jsonb_array_elements(
    p_days
  ) as item(value)
  where
    item.value ? 'day_of_week'
    and (
      item.value->>'day_of_week'
    ) ~ '^[0-6]$';

  if v_count <> 7 then
    raise exception 'INVALID_DAY_SET';
  end if;

  /*
   * ============================================================
   * VALIDAR TODOS LOS DÍAS ANTES DE ESCRIBIR
   * ============================================================
   */

  for v_day in
    select item.value
    from jsonb_array_elements(
      p_days
    ) as item(value)
  loop
    begin
      v_day_of_week :=
        (
          v_day->>'day_of_week'
        )::smallint;

      v_closed :=
        (
          v_day->>'closed'
        )::boolean;
    exception
      when others then
        raise exception 'INVALID_DAY_DATA';
    end;

    if v_day_of_week < 0
       or v_day_of_week > 6 then
      raise exception 'INVALID_DAY_OF_WEEK';
    end if;

    if v_closed is null then
      raise exception 'INVALID_CLOSED_VALUE';
    end if;

    /*
     * Día cerrado.
     */

    if v_closed then
      v_open_time :=
        null;

      v_close_time :=
        null;

      v_open_time_2 :=
        null;

      v_close_time_2 :=
        null;
    else
      /*
       * Primer tramo obligatorio.
       */

      begin
        v_open_time :=
          nullif(
            v_day->>'open_time',
            ''
          )::time;

        v_close_time :=
          nullif(
            v_day->>'close_time',
            ''
          )::time;

        v_open_time_2 :=
          nullif(
            v_day->>'open_time_2',
            ''
          )::time;

        v_close_time_2 :=
          nullif(
            v_day->>'close_time_2',
            ''
          )::time;
      exception
        when others then
          raise exception
            'INVALID_TIME_FORMAT_DAY_%',
            v_day_of_week;
      end;

      if v_open_time is null
         or v_close_time is null
         or v_open_time >= v_close_time then
        raise exception
          'INVALID_FIRST_SHIFT_DAY_%',
          v_day_of_week;
      end if;

      /*
       * Segundo tramo:
       * ambos valores o ninguno.
       */

      if (
        v_open_time_2 is null
        and v_close_time_2 is not null
      ) or (
        v_open_time_2 is not null
        and v_close_time_2 is null
      ) then
        raise exception
          'INVALID_SECOND_SHIFT_DAY_%',
          v_day_of_week;
      end if;

      if v_open_time_2 is not null then
        if v_open_time_2 >=
           v_close_time_2 then
          raise exception
            'INVALID_SECOND_SHIFT_DAY_%',
            v_day_of_week;
        end if;

        if v_open_time_2 <
           v_close_time then
          raise exception
            'OVERLAPPING_SHIFTS_DAY_%',
            v_day_of_week;
        end if;
      end if;
    end if;
  end loop;

  /*
   * ============================================================
   * GUARDAR LOS SIETE DÍAS
   * ============================================================
   */

  for v_day in
    select item.value
    from jsonb_array_elements(
      p_days
    ) as item(value)
  loop
    v_day_of_week :=
      (
        v_day->>'day_of_week'
      )::smallint;

    v_closed :=
      (
        v_day->>'closed'
      )::boolean;

    if v_closed then
      v_open_time :=
        null;

      v_close_time :=
        null;

      v_open_time_2 :=
        null;

      v_close_time_2 :=
        null;
    else
      v_open_time :=
        nullif(
          v_day->>'open_time',
          ''
        )::time;

      v_close_time :=
        nullif(
          v_day->>'close_time',
          ''
        )::time;

      v_open_time_2 :=
        nullif(
          v_day->>'open_time_2',
          ''
        )::time;

      v_close_time_2 :=
        nullif(
          v_day->>'close_time_2',
          ''
        )::time;
    end if;

    insert into public.business_hours (
      business_id,
      day_of_week,
      open_time,
      close_time,
      open_time_2,
      close_time_2,
      closed
    )
    values (
      p_business_id,
      v_day_of_week,
      v_open_time,
      v_close_time,
      v_open_time_2,
      v_close_time_2,
      v_closed
    )
    on conflict on constraint
      business_hours_business_day_unique
    do update set
      open_time =
        excluded.open_time,

      close_time =
        excluded.close_time,

      open_time_2 =
        excluded.open_time_2,

      close_time_2 =
        excluded.close_time_2,

      closed =
        excluded.closed;
  end loop;

  /*
   * ============================================================
   * DEVOLVER HORARIO COMPLETO
   * ============================================================
   */

  return query
  select
    bh.id,
    bh.day_of_week,
    bh.open_time,
    bh.close_time,
    bh.open_time_2,
    bh.close_time_2,
    bh.closed
  from public.business_hours bh
  where
    bh.business_id =
      p_business_id
  order by
    bh.day_of_week;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.search_available_slots_by_distance(p_category_id uuid, p_from timestamp with time zone, p_to timestamp with time zone DEFAULT NULL::timestamp with time zone, p_latitude double precision DEFAULT NULL::double precision, p_longitude double precision DEFAULT NULL::double precision, p_max_distance_km double precision DEFAULT NULL::double precision, p_page integer DEFAULT 1, p_page_size integer DEFAULT 12)
 RETURNS TABLE(slot_id uuid, start_at timestamp with time zone, end_at timestamp with time zone, service_id uuid, service_name text, duration_minutes integer, business_id uuid, business_name text, business_slug text, business_address text, business_city text, business_latitude double precision, business_longitude double precision, image_url text, distance_km double precision, total_count bigint)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$

with available as (
  select
    s.id as slot_id,
    s.start_at,
    s.end_at,

    srv.id as service_id,
    srv.name as service_name,
    srv.duration_minutes,

    b.id as business_id,
    b.name as business_name,
    b.slug as business_slug,
    b.address as business_address,
    b.city as business_city,
    b.latitude::double precision as business_latitude,
    b.longitude::double precision as business_longitude,

    (
      select bi.image_url
      from public.business_images bi
      where bi.business_id = b.id
      order by
        bi.position asc nulls last
      limit 1
    ) as image_url,

    case
      when
        p_latitude is null
        or p_longitude is null
        or b.latitude is null
        or b.longitude is null
      then null

      else
        6371.0 * acos(
          least(
            1.0,
            greatest(
              -1.0,
              cos(radians(p_latitude))
              * cos(radians(b.latitude::double precision))
              * cos(
                  radians(b.longitude::double precision)
                  - radians(p_longitude)
                )
              +
              sin(radians(p_latitude))
              * sin(radians(b.latitude::double precision))
            )
          )
        )
    end as distance_km

  from public.slots s

  join public.services srv
    on srv.id = s.service_id

  join public.businesses b
    on b.id = s.business_id

  where
    s.status = 'AVAILABLE'
    and s.start_at >= p_from

    and (
      p_to is null
      or s.start_at < p_to
    )

    and srv.active = true
    and b.active = true
    and b.category_id = p_category_id
),

filtered as (
  select *
  from available
  where
    distance_km is not null
    and (
      p_max_distance_km is null
      or distance_km <= p_max_distance_km
    )
),

counted as (
  select
    *,
    count(*) over () as total_count
  from filtered
)

select
  slot_id,
  start_at,
  end_at,

  service_id,
  service_name,
  duration_minutes,

  business_id,
  business_name,
  business_slug,
  business_address,
  business_city,
  business_latitude,
  business_longitude,

  image_url,

  distance_km,

  total_count

from counted

order by
  distance_km asc,
  start_at asc

limit greatest(
  p_page_size,
  1
)

offset (
  greatest(
    p_page,
    1
  ) - 1
) * greatest(
  p_page_size,
  1
);

$function$
;

CREATE OR REPLACE FUNCTION public.set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  new.updated_at = now();
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.update_agenda_block(p_block_id uuid, p_start_at timestamp with time zone, p_end_at timestamp with time zone, p_reason text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_user_id uuid;
  v_business_id uuid;
  v_owner_id uuid;

  v_old_start_at timestamptz;
  v_old_end_at timestamptz;

  v_is_service_role boolean;
begin
  /*
   * ============================================================
   * ORIGEN DE LA LLAMADA
   * ============================================================
   */

  v_is_service_role :=
    coalesce(
      auth.jwt() ->> 'role',
      ''
    ) = 'service_role';

  v_user_id :=
    auth.uid();

  if
    v_user_id is null
    and not v_is_service_role
  then
    raise exception
      'Debes iniciar sesión';
  end if;

  /*
   * ============================================================
   * VALIDAR FECHAS
   * ============================================================
   */

  if
    p_start_at is null
    or p_end_at is null
    or p_end_at <= p_start_at
  then
    raise exception
      'El horario del bloqueo no es válido';
  end if;

  /*
   * ============================================================
   * CARGAR BLOQUEO Y HORARIO ANTERIOR
   * ============================================================
   */

  select
    business_id,
    start_at,
    end_at
  into
    v_business_id,
    v_old_start_at,
    v_old_end_at
  from public.business_blocks
  where
    id = p_block_id
  for update;

  if not found then
    raise exception
      'El bloqueo no existe';
  end if;

  /*
   * ============================================================
   * NEGOCIO
   * ============================================================
   */

  select
    owner_id
  into
    v_owner_id
  from public.businesses
  where
    id = v_business_id;

  if not found then
    raise exception
      'El negocio no existe';
  end if;

  /*
   * ============================================================
   * PROPIETARIO / SUPER ADMIN / SERVICE ROLE
   * ============================================================
   */

  if not v_is_service_role then
    if
      v_owner_id <> v_user_id
      and not public.is_super_admin()
    then
      raise exception
        'No puedes modificar este bloqueo';
    end if;
  end if;

  /*
   * ============================================================
   * NO SOLAPAR CON RESERVAS SLOTTYE
   * ============================================================
   */

  if exists (
    select 1
    from public.bookings b
    join public.slots s
      on s.id = b.slot_id
    where
      b.business_id = v_business_id
      and b.status =
        'CONFIRMED'::public.booking_status
      and s.start_at < p_end_at
      and s.end_at > p_start_at
  ) then
    raise exception
      'El bloqueo coincide con una reserva Slottye';
  end if;

  /*
   * ============================================================
   * NO SOLAPAR CON RESERVAS MANUALES
   * ============================================================
   */

  if exists (
    select 1
    from public.manual_bookings mb
    where
      mb.business_id = v_business_id
      and mb.start_at < p_end_at
      and mb.end_at > p_start_at
  ) then
    raise exception
      'El bloqueo coincide con una reserva manual';
  end if;

  /*
   * ============================================================
   * NO SOLAPAR CON OTROS BLOQUEOS
   * ============================================================
   */

  if exists (
    select 1
    from public.business_blocks bb
    where
      bb.business_id = v_business_id
      and bb.id <> p_block_id
      and bb.start_at < p_end_at
      and bb.end_at > p_start_at
  ) then
    raise exception
      'El horario coincide con otro bloqueo';
  end if;

  /*
   * ============================================================
   * MOVER / ACTUALIZAR BLOQUEO
   * ============================================================
   */

  update public.business_blocks
  set
    start_at =
      p_start_at,

    end_at =
      p_end_at,

    reason =
      nullif(
        trim(
          coalesce(
            p_reason,
            ''
          )
        ),
        ''
      )
  where
    id = p_block_id;

  /*
   * ============================================================
   * LIMPIAR HORARIO ANTERIOR
   * ============================================================
   */

  delete from public.slots s
  where
    s.business_id =
      v_business_id
    and s.start_at <
      v_old_end_at
    and s.end_at >
      v_old_start_at
    and s.status in (
      'AVAILABLE'::public.slot_status,
      'BLOCKED'::public.slot_status
    )
    and not exists (
      select 1
      from public.bookings b
      where
        b.slot_id = s.id
    );
end;
$function$
;

CREATE OR REPLACE FUNCTION public.update_agenda_slot(p_slot_id uuid, p_service_id uuid, p_start_at timestamp with time zone, p_end_at timestamp with time zone)
 RETURNS public.slots
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_business_id uuid;
  v_owner_id uuid;
  v_status text;
  v_slot public.slots;
begin
  /*
   * USUARIO AUTENTICADO
   */

  if auth.uid() is null then
    raise exception
      'Debes iniciar sesión';
  end if;

  /*
   * USUARIO NO BLOQUEADO
   */

  perform public.assert_active_user();

  /*
   * VALIDAR FECHAS
   */

  if
    p_start_at is null
    or p_end_at is null
    or p_end_at <= p_start_at
  then
    raise exception
      'El horario de la disponibilidad no es válido';
  end if;

  if
    p_start_at <= now()
  then
    raise exception
      'No puedes mover una disponibilidad a una fecha pasada';
  end if;

  /*
   * CARGAR SLOT
   */

  select
    s.business_id,
    s.status::text
  into
    v_business_id,
    v_status
  from public.slots s
  where
    s.id = p_slot_id
  for update;

  if not found then
    raise exception
      'La disponibilidad no existe';
  end if;

  /*
   * NEGOCIO
   */

  select
    b.owner_id
  into
    v_owner_id
  from public.businesses b
  where
    b.id = v_business_id;

  if not found then
    raise exception
      'El negocio no existe';
  end if;

  /*
   * PROPIETARIO O SUPER ADMIN
   */

  if
    v_owner_id <> auth.uid()
    and not public.is_super_admin()
  then
    raise exception
      'No tienes permisos para modificar esta disponibilidad';
  end if;

  /*
   * SOLO DISPONIBILIDADES LIBRES
   */

  if
    v_status <> 'AVAILABLE'
  then
    raise exception
      'Solo puedes modificar disponibilidades libres';
  end if;

  /*
   * COMPROBAR SERVICIO
   */

  if
    p_service_id is not null
  then
    if not exists (
      select 1
      from public.services s
      where
        s.id = p_service_id
        and s.business_id = v_business_id
        and s.active = true
    ) then
      raise exception
        'El servicio seleccionado no es válido';
    end if;
  end if;

  /*
   * RESERVA SLOTTYE SOLAPADA
   */

  if exists (
    select 1
    from public.bookings b
    join public.slots s
      on s.id = b.slot_id
    where
      b.business_id = v_business_id
      and b.status =
        'CONFIRMED'::public.booking_status
      and s.id <> p_slot_id
      and s.start_at < p_end_at
      and s.end_at > p_start_at
  ) then
    raise exception
      'Ya existe una reserva Slottye en ese horario';
  end if;

  /*
   * RESERVA MANUAL SOLAPADA
   */

  if exists (
    select 1
    from public.manual_bookings mb
    where
      mb.business_id = v_business_id
      and mb.start_at < p_end_at
      and mb.end_at > p_start_at
  ) then
    raise exception
      'Ya existe una reserva manual en ese horario';
  end if;

  /*
   * BLOQUEO SOLAPADO
   */

  if exists (
    select 1
    from public.business_blocks bb
    where
      bb.business_id = v_business_id
      and bb.start_at < p_end_at
      and bb.end_at > p_start_at
  ) then
    raise exception
      'Ese horario está bloqueado';
  end if;

  /*
   * OTRO SLOT SOLAPADO
   */

  if exists (
    select 1
    from public.slots s
    where
      s.business_id = v_business_id
      and s.id <> p_slot_id
      and s.status in (
        'AVAILABLE'::public.slot_status,
        'BOOKED'::public.slot_status,
        'BLOCKED'::public.slot_status
      )
      and s.start_at < p_end_at
      and s.end_at > p_start_at
  ) then
    raise exception
      'Ese horario ya está ocupado o contiene historial';
  end if;

  /*
   * ACTUALIZAR DISPONIBILIDAD
   */

  begin
    update public.slots
    set
      service_id = p_service_id,
      start_at = p_start_at,
      end_at = p_end_at,
      updated_at = now()
    where
      id = p_slot_id
    returning *
    into v_slot;

  exception
    when unique_violation then
      raise exception
        'Ese horario ya está ocupado o contiene historial';
  end;

  return v_slot;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.update_manual_booking(p_booking_id uuid, p_service_id uuid, p_customer_name text, p_customer_phone text, p_customer_email text, p_start_at timestamp with time zone, p_end_at timestamp with time zone, p_notes text)
 RETURNS public.manual_bookings
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_business_id uuid;
  v_owner_id uuid;
  v_booking public.manual_bookings;
begin
  /*
   * USUARIO AUTENTICADO
   */

  if auth.uid() is null then
    raise exception
      'Debes iniciar sesión';
  end if;

  /*
   * USUARIO NO BLOQUEADO
   */

  perform public.assert_active_user();

  /*
   * VALIDACIONES BÁSICAS
   */

  if
    p_customer_name is null
    or length(
      trim(
        p_customer_name
      )
    ) = 0
  then
    raise exception
      'El nombre del cliente es obligatorio';
  end if;

  if
    p_start_at is null
    or p_end_at is null
    or p_end_at <= p_start_at
  then
    raise exception
      'El horario de la reserva no es válido';
  end if;

  /*
   * RESERVA Y NEGOCIO
   */

  select
    mb.business_id
  into
    v_business_id
  from public.manual_bookings mb
  where
    mb.id = p_booking_id
  for update;

  if not found then
    raise exception
      'La reserva manual no existe';
  end if;

  select
    b.owner_id
  into
    v_owner_id
  from public.businesses b
  where
    b.id = v_business_id;

  if not found then
    raise exception
      'El negocio no existe';
  end if;

  /*
   * PROPIETARIO O SUPER ADMIN
   */

  if
    v_owner_id <> auth.uid()
    and not public.is_super_admin()
  then
    raise exception
      'No tienes permisos para modificar esta reserva';
  end if;

  /*
   * SERVICIO
   */

  if
    p_service_id is not null
  then
    if not exists (
      select 1
      from public.services s
      where
        s.id = p_service_id
        and s.business_id = v_business_id
        and s.active = true
    ) then
      raise exception
        'El servicio no pertenece al negocio o no está activo';
    end if;
  end if;

  /*
   * RESERVA ONLINE SOLAPADA
   */

  if exists (
    select 1
    from public.bookings b
    join public.slots s
      on s.id = b.slot_id
    where
      b.business_id = v_business_id
      and b.status =
        'CONFIRMED'::public.booking_status
      and s.start_at < p_end_at
      and s.end_at > p_start_at
  ) then
    raise exception
      'Ya existe una reserva Slottye en ese horario';
  end if;

  /*
   * OTRA RESERVA MANUAL SOLAPADA
   */

  if exists (
    select 1
    from public.manual_bookings mb
    where
      mb.business_id = v_business_id
      and mb.id <> p_booking_id
      and mb.start_at < p_end_at
      and mb.end_at > p_start_at
  ) then
    raise exception
      'Ya existe una reserva manual en ese horario';
  end if;

  /*
   * BLOQUEO SOLAPADO
   */

  if exists (
    select 1
    from public.business_blocks bb
    where
      bb.business_id = v_business_id
      and bb.start_at < p_end_at
      and bb.end_at > p_start_at
  ) then
    raise exception
      'Ese horario está bloqueado';
  end if;

  /*
   * ACTUALIZAR RESERVA MANUAL
   */

  update public.manual_bookings
  set
    service_id =
      p_service_id,

    customer_name =
      trim(
        p_customer_name
      ),

    customer_phone =
      nullif(
        trim(
          p_customer_phone
        ),
        ''
      ),

    customer_email =
      nullif(
        trim(
          p_customer_email
        ),
        ''
      ),

    start_at =
      p_start_at,

    end_at =
      p_end_at,

    notes =
      nullif(
        trim(
          p_notes
        ),
        ''
      ),

    updated_at =
      now()
  where
    id = p_booking_id
  returning *
  into v_booking;

  /*
   * SLOTS DISPONIBLES CON HISTORIAL
   */

  update public.slots s
  set
    status =
      'BLOCKED'::public.slot_status,
    updated_at =
      now()
  where
    s.business_id = v_business_id
    and s.status =
      'AVAILABLE'::public.slot_status
    and s.start_at < p_end_at
    and s.end_at > p_start_at
    and exists (
      select 1
      from public.bookings b
      where
        b.slot_id = s.id
    );

  /*
   * SLOTS DISPONIBLES SIN HISTORIAL
   */

  delete from public.slots s
  where
    s.business_id = v_business_id
    and s.status =
      'AVAILABLE'::public.slot_status
    and s.start_at < p_end_at
    and s.end_at > p_start_at
    and not exists (
      select 1
      from public.bookings b
      where
        b.slot_id = s.id
    );

  return v_booking;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.update_review(p_review_id uuid, p_rating integer, p_comment text)
 RETURNS public.reviews
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_user_id uuid;
  v_review public.reviews%rowtype;
begin
  /*
   * Usuario autenticado
   */

  v_user_id :=
    auth.uid();

  if
    v_user_id is null
  then
    raise exception
      'Debes iniciar sesión';
  end if;

  /*
   * Usuario no bloqueado
   */

  perform public.assert_active_user();

  /*
   * Valoración válida
   */

  if
    p_rating < 1
    or p_rating > 5
  then
    raise exception
      'La valoración debe estar entre 1 y 5 estrellas';
  end if;

  /*
   * Máximo 1000 caracteres
   */

  if
    length(
      coalesce(
        p_comment,
        ''
      )
    ) > 1000
  then
    raise exception
      'El comentario no puede superar los 1000 caracteres';
  end if;

  /*
   * Cargamos y bloqueamos la reseña
   */

  select *
  into v_review
  from public.reviews
  where
    id = p_review_id
  for update;

  if
    not found
  then
    raise exception
      'La reseña no existe';
  end if;

  /*
   * Solo puede editarla su autor
   */

  if
    v_review.user_id <>
    v_user_id
  then
    raise exception
      'No puedes editar esta reseña';
  end if;

  /*
   * Actualizamos únicamente
   * rating, comment y updated_at
   */

  update public.reviews
  set
    rating =
      p_rating,

    comment =
      nullif(
        trim(
          coalesce(
            p_comment,
            ''
          )
        ),
        ''
      ),

    updated_at =
      now()
  where
    id = p_review_id
  returning *
  into v_review;

  return v_review;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.user_owns_business(p_business_id text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (
    select 1
    from public.businesses b
    where
      b.id::text =
        p_business_id
      and b.owner_id =
        auth.uid()
  );
$function$
;

grant delete on table "public"."admin_audit_logs" to "anon";

grant insert on table "public"."admin_audit_logs" to "anon";

grant references on table "public"."admin_audit_logs" to "anon";

grant select on table "public"."admin_audit_logs" to "anon";

grant trigger on table "public"."admin_audit_logs" to "anon";

grant truncate on table "public"."admin_audit_logs" to "anon";

grant update on table "public"."admin_audit_logs" to "anon";

grant delete on table "public"."admin_audit_logs" to "authenticated";

grant insert on table "public"."admin_audit_logs" to "authenticated";

grant references on table "public"."admin_audit_logs" to "authenticated";

grant select on table "public"."admin_audit_logs" to "authenticated";

grant trigger on table "public"."admin_audit_logs" to "authenticated";

grant truncate on table "public"."admin_audit_logs" to "authenticated";

grant update on table "public"."admin_audit_logs" to "authenticated";

grant delete on table "public"."admin_audit_logs" to "service_role";

grant insert on table "public"."admin_audit_logs" to "service_role";

grant references on table "public"."admin_audit_logs" to "service_role";

grant select on table "public"."admin_audit_logs" to "service_role";

grant trigger on table "public"."admin_audit_logs" to "service_role";

grant truncate on table "public"."admin_audit_logs" to "service_role";

grant update on table "public"."admin_audit_logs" to "service_role";

grant delete on table "public"."block_google_calendar_events" to "anon";

grant insert on table "public"."block_google_calendar_events" to "anon";

grant references on table "public"."block_google_calendar_events" to "anon";

grant select on table "public"."block_google_calendar_events" to "anon";

grant trigger on table "public"."block_google_calendar_events" to "anon";

grant truncate on table "public"."block_google_calendar_events" to "anon";

grant update on table "public"."block_google_calendar_events" to "anon";

grant delete on table "public"."block_google_calendar_events" to "authenticated";

grant insert on table "public"."block_google_calendar_events" to "authenticated";

grant references on table "public"."block_google_calendar_events" to "authenticated";

grant select on table "public"."block_google_calendar_events" to "authenticated";

grant trigger on table "public"."block_google_calendar_events" to "authenticated";

grant truncate on table "public"."block_google_calendar_events" to "authenticated";

grant update on table "public"."block_google_calendar_events" to "authenticated";

grant delete on table "public"."block_google_calendar_events" to "service_role";

grant insert on table "public"."block_google_calendar_events" to "service_role";

grant references on table "public"."block_google_calendar_events" to "service_role";

grant select on table "public"."block_google_calendar_events" to "service_role";

grant trigger on table "public"."block_google_calendar_events" to "service_role";

grant truncate on table "public"."block_google_calendar_events" to "service_role";

grant update on table "public"."block_google_calendar_events" to "service_role";

grant delete on table "public"."booking_google_calendar_events" to "anon";

grant insert on table "public"."booking_google_calendar_events" to "anon";

grant references on table "public"."booking_google_calendar_events" to "anon";

grant select on table "public"."booking_google_calendar_events" to "anon";

grant trigger on table "public"."booking_google_calendar_events" to "anon";

grant truncate on table "public"."booking_google_calendar_events" to "anon";

grant update on table "public"."booking_google_calendar_events" to "anon";

grant delete on table "public"."booking_google_calendar_events" to "authenticated";

grant insert on table "public"."booking_google_calendar_events" to "authenticated";

grant references on table "public"."booking_google_calendar_events" to "authenticated";

grant select on table "public"."booking_google_calendar_events" to "authenticated";

grant trigger on table "public"."booking_google_calendar_events" to "authenticated";

grant truncate on table "public"."booking_google_calendar_events" to "authenticated";

grant update on table "public"."booking_google_calendar_events" to "authenticated";

grant delete on table "public"."booking_google_calendar_events" to "service_role";

grant insert on table "public"."booking_google_calendar_events" to "service_role";

grant references on table "public"."booking_google_calendar_events" to "service_role";

grant select on table "public"."booking_google_calendar_events" to "service_role";

grant trigger on table "public"."booking_google_calendar_events" to "service_role";

grant truncate on table "public"."booking_google_calendar_events" to "service_role";

grant update on table "public"."booking_google_calendar_events" to "service_role";

grant references on table "public"."bookings" to "anon";

grant select on table "public"."bookings" to "anon";

grant trigger on table "public"."bookings" to "anon";

grant truncate on table "public"."bookings" to "anon";

grant select on table "public"."bookings" to "authenticated";

grant delete on table "public"."bookings" to "service_role";

grant insert on table "public"."bookings" to "service_role";

grant references on table "public"."bookings" to "service_role";

grant select on table "public"."bookings" to "service_role";

grant trigger on table "public"."bookings" to "service_role";

grant truncate on table "public"."bookings" to "service_role";

grant update on table "public"."bookings" to "service_role";

grant delete on table "public"."business_blocks" to "anon";

grant insert on table "public"."business_blocks" to "anon";

grant references on table "public"."business_blocks" to "anon";

grant select on table "public"."business_blocks" to "anon";

grant trigger on table "public"."business_blocks" to "anon";

grant truncate on table "public"."business_blocks" to "anon";

grant update on table "public"."business_blocks" to "anon";

grant delete on table "public"."business_blocks" to "authenticated";

grant insert on table "public"."business_blocks" to "authenticated";

grant select on table "public"."business_blocks" to "authenticated";

grant update on table "public"."business_blocks" to "authenticated";

grant delete on table "public"."business_blocks" to "service_role";

grant insert on table "public"."business_blocks" to "service_role";

grant references on table "public"."business_blocks" to "service_role";

grant select on table "public"."business_blocks" to "service_role";

grant trigger on table "public"."business_blocks" to "service_role";

grant truncate on table "public"."business_blocks" to "service_role";

grant update on table "public"."business_blocks" to "service_role";

grant delete on table "public"."business_google_calendar_connections" to "anon";

grant insert on table "public"."business_google_calendar_connections" to "anon";

grant references on table "public"."business_google_calendar_connections" to "anon";

grant select on table "public"."business_google_calendar_connections" to "anon";

grant trigger on table "public"."business_google_calendar_connections" to "anon";

grant truncate on table "public"."business_google_calendar_connections" to "anon";

grant update on table "public"."business_google_calendar_connections" to "anon";

grant delete on table "public"."business_google_calendar_connections" to "authenticated";

grant insert on table "public"."business_google_calendar_connections" to "authenticated";

grant references on table "public"."business_google_calendar_connections" to "authenticated";

grant select on table "public"."business_google_calendar_connections" to "authenticated";

grant trigger on table "public"."business_google_calendar_connections" to "authenticated";

grant truncate on table "public"."business_google_calendar_connections" to "authenticated";

grant update on table "public"."business_google_calendar_connections" to "authenticated";

grant delete on table "public"."business_google_calendar_connections" to "service_role";

grant insert on table "public"."business_google_calendar_connections" to "service_role";

grant references on table "public"."business_google_calendar_connections" to "service_role";

grant select on table "public"."business_google_calendar_connections" to "service_role";

grant trigger on table "public"."business_google_calendar_connections" to "service_role";

grant truncate on table "public"."business_google_calendar_connections" to "service_role";

grant update on table "public"."business_google_calendar_connections" to "service_role";

grant delete on table "public"."business_hours" to "anon";

grant insert on table "public"."business_hours" to "anon";

grant references on table "public"."business_hours" to "anon";

grant select on table "public"."business_hours" to "anon";

grant trigger on table "public"."business_hours" to "anon";

grant truncate on table "public"."business_hours" to "anon";

grant update on table "public"."business_hours" to "anon";

grant delete on table "public"."business_hours" to "authenticated";

grant insert on table "public"."business_hours" to "authenticated";

grant select on table "public"."business_hours" to "authenticated";

grant update on table "public"."business_hours" to "authenticated";

grant delete on table "public"."business_hours" to "service_role";

grant insert on table "public"."business_hours" to "service_role";

grant references on table "public"."business_hours" to "service_role";

grant select on table "public"."business_hours" to "service_role";

grant trigger on table "public"."business_hours" to "service_role";

grant truncate on table "public"."business_hours" to "service_role";

grant update on table "public"."business_hours" to "service_role";

grant delete on table "public"."business_images" to "anon";

grant insert on table "public"."business_images" to "anon";

grant references on table "public"."business_images" to "anon";

grant select on table "public"."business_images" to "anon";

grant trigger on table "public"."business_images" to "anon";

grant truncate on table "public"."business_images" to "anon";

grant update on table "public"."business_images" to "anon";

grant delete on table "public"."business_images" to "authenticated";

grant insert on table "public"."business_images" to "authenticated";

grant select on table "public"."business_images" to "authenticated";

grant update on table "public"."business_images" to "authenticated";

grant delete on table "public"."business_images" to "service_role";

grant insert on table "public"."business_images" to "service_role";

grant references on table "public"."business_images" to "service_role";

grant select on table "public"."business_images" to "service_role";

grant trigger on table "public"."business_images" to "service_role";

grant truncate on table "public"."business_images" to "service_role";

grant update on table "public"."business_images" to "service_role";

grant delete on table "public"."business_subscriptions" to "anon";

grant insert on table "public"."business_subscriptions" to "anon";

grant references on table "public"."business_subscriptions" to "anon";

grant select on table "public"."business_subscriptions" to "anon";

grant trigger on table "public"."business_subscriptions" to "anon";

grant truncate on table "public"."business_subscriptions" to "anon";

grant update on table "public"."business_subscriptions" to "anon";

grant delete on table "public"."business_subscriptions" to "authenticated";

grant insert on table "public"."business_subscriptions" to "authenticated";

grant select on table "public"."business_subscriptions" to "authenticated";

grant update on table "public"."business_subscriptions" to "authenticated";

grant delete on table "public"."business_subscriptions" to "service_role";

grant insert on table "public"."business_subscriptions" to "service_role";

grant references on table "public"."business_subscriptions" to "service_role";

grant select on table "public"."business_subscriptions" to "service_role";

grant trigger on table "public"."business_subscriptions" to "service_role";

grant truncate on table "public"."business_subscriptions" to "service_role";

grant update on table "public"."business_subscriptions" to "service_role";

grant references on table "public"."businesses" to "anon";

grant select on table "public"."businesses" to "anon";

grant trigger on table "public"."businesses" to "anon";

grant truncate on table "public"."businesses" to "anon";

grant select on table "public"."businesses" to "authenticated";

grant delete on table "public"."businesses" to "service_role";

grant insert on table "public"."businesses" to "service_role";

grant references on table "public"."businesses" to "service_role";

grant select on table "public"."businesses" to "service_role";

grant trigger on table "public"."businesses" to "service_role";

grant truncate on table "public"."businesses" to "service_role";

grant update on table "public"."businesses" to "service_role";

grant delete on table "public"."categories" to "anon";

grant insert on table "public"."categories" to "anon";

grant references on table "public"."categories" to "anon";

grant select on table "public"."categories" to "anon";

grant trigger on table "public"."categories" to "anon";

grant truncate on table "public"."categories" to "anon";

grant update on table "public"."categories" to "anon";

grant delete on table "public"."categories" to "authenticated";

grant insert on table "public"."categories" to "authenticated";

grant select on table "public"."categories" to "authenticated";

grant update on table "public"."categories" to "authenticated";

grant delete on table "public"."categories" to "service_role";

grant insert on table "public"."categories" to "service_role";

grant references on table "public"."categories" to "service_role";

grant select on table "public"."categories" to "service_role";

grant trigger on table "public"."categories" to "service_role";

grant truncate on table "public"."categories" to "service_role";

grant update on table "public"."categories" to "service_role";

grant delete on table "public"."favorites" to "anon";

grant insert on table "public"."favorites" to "anon";

grant references on table "public"."favorites" to "anon";

grant select on table "public"."favorites" to "anon";

grant trigger on table "public"."favorites" to "anon";

grant truncate on table "public"."favorites" to "anon";

grant update on table "public"."favorites" to "anon";

grant delete on table "public"."favorites" to "authenticated";

grant insert on table "public"."favorites" to "authenticated";

grant select on table "public"."favorites" to "authenticated";

grant update on table "public"."favorites" to "authenticated";

grant delete on table "public"."favorites" to "service_role";

grant insert on table "public"."favorites" to "service_role";

grant references on table "public"."favorites" to "service_role";

grant select on table "public"."favorites" to "service_role";

grant trigger on table "public"."favorites" to "service_role";

grant truncate on table "public"."favorites" to "service_role";

grant update on table "public"."favorites" to "service_role";

grant delete on table "public"."google_calendar_imported_blocks" to "anon";

grant insert on table "public"."google_calendar_imported_blocks" to "anon";

grant references on table "public"."google_calendar_imported_blocks" to "anon";

grant select on table "public"."google_calendar_imported_blocks" to "anon";

grant trigger on table "public"."google_calendar_imported_blocks" to "anon";

grant truncate on table "public"."google_calendar_imported_blocks" to "anon";

grant update on table "public"."google_calendar_imported_blocks" to "anon";

grant delete on table "public"."google_calendar_imported_blocks" to "authenticated";

grant insert on table "public"."google_calendar_imported_blocks" to "authenticated";

grant references on table "public"."google_calendar_imported_blocks" to "authenticated";

grant select on table "public"."google_calendar_imported_blocks" to "authenticated";

grant trigger on table "public"."google_calendar_imported_blocks" to "authenticated";

grant truncate on table "public"."google_calendar_imported_blocks" to "authenticated";

grant update on table "public"."google_calendar_imported_blocks" to "authenticated";

grant delete on table "public"."google_calendar_imported_blocks" to "service_role";

grant insert on table "public"."google_calendar_imported_blocks" to "service_role";

grant references on table "public"."google_calendar_imported_blocks" to "service_role";

grant select on table "public"."google_calendar_imported_blocks" to "service_role";

grant trigger on table "public"."google_calendar_imported_blocks" to "service_role";

grant truncate on table "public"."google_calendar_imported_blocks" to "service_role";

grant update on table "public"."google_calendar_imported_blocks" to "service_role";

grant delete on table "public"."manual_booking_google_calendar_events" to "anon";

grant insert on table "public"."manual_booking_google_calendar_events" to "anon";

grant references on table "public"."manual_booking_google_calendar_events" to "anon";

grant select on table "public"."manual_booking_google_calendar_events" to "anon";

grant trigger on table "public"."manual_booking_google_calendar_events" to "anon";

grant truncate on table "public"."manual_booking_google_calendar_events" to "anon";

grant update on table "public"."manual_booking_google_calendar_events" to "anon";

grant delete on table "public"."manual_booking_google_calendar_events" to "authenticated";

grant insert on table "public"."manual_booking_google_calendar_events" to "authenticated";

grant references on table "public"."manual_booking_google_calendar_events" to "authenticated";

grant select on table "public"."manual_booking_google_calendar_events" to "authenticated";

grant trigger on table "public"."manual_booking_google_calendar_events" to "authenticated";

grant truncate on table "public"."manual_booking_google_calendar_events" to "authenticated";

grant update on table "public"."manual_booking_google_calendar_events" to "authenticated";

grant delete on table "public"."manual_booking_google_calendar_events" to "service_role";

grant insert on table "public"."manual_booking_google_calendar_events" to "service_role";

grant references on table "public"."manual_booking_google_calendar_events" to "service_role";

grant select on table "public"."manual_booking_google_calendar_events" to "service_role";

grant trigger on table "public"."manual_booking_google_calendar_events" to "service_role";

grant truncate on table "public"."manual_booking_google_calendar_events" to "service_role";

grant update on table "public"."manual_booking_google_calendar_events" to "service_role";

grant delete on table "public"."manual_bookings" to "anon";

grant insert on table "public"."manual_bookings" to "anon";

grant references on table "public"."manual_bookings" to "anon";

grant select on table "public"."manual_bookings" to "anon";

grant trigger on table "public"."manual_bookings" to "anon";

grant truncate on table "public"."manual_bookings" to "anon";

grant update on table "public"."manual_bookings" to "anon";

grant delete on table "public"."manual_bookings" to "authenticated";

grant insert on table "public"."manual_bookings" to "authenticated";

grant select on table "public"."manual_bookings" to "authenticated";

grant update on table "public"."manual_bookings" to "authenticated";

grant delete on table "public"."manual_bookings" to "service_role";

grant insert on table "public"."manual_bookings" to "service_role";

grant references on table "public"."manual_bookings" to "service_role";

grant select on table "public"."manual_bookings" to "service_role";

grant trigger on table "public"."manual_bookings" to "service_role";

grant truncate on table "public"."manual_bookings" to "service_role";

grant update on table "public"."manual_bookings" to "service_role";

grant delete on table "public"."notifications" to "anon";

grant insert on table "public"."notifications" to "anon";

grant references on table "public"."notifications" to "anon";

grant select on table "public"."notifications" to "anon";

grant trigger on table "public"."notifications" to "anon";

grant truncate on table "public"."notifications" to "anon";

grant update on table "public"."notifications" to "anon";

grant delete on table "public"."notifications" to "authenticated";

grant insert on table "public"."notifications" to "authenticated";

grant select on table "public"."notifications" to "authenticated";

grant update on table "public"."notifications" to "authenticated";

grant delete on table "public"."notifications" to "service_role";

grant insert on table "public"."notifications" to "service_role";

grant references on table "public"."notifications" to "service_role";

grant select on table "public"."notifications" to "service_role";

grant trigger on table "public"."notifications" to "service_role";

grant truncate on table "public"."notifications" to "service_role";

grant update on table "public"."notifications" to "service_role";

grant references on table "public"."profiles" to "anon";

grant select on table "public"."profiles" to "anon";

grant trigger on table "public"."profiles" to "anon";

grant truncate on table "public"."profiles" to "anon";

grant select on table "public"."profiles" to "authenticated";

grant delete on table "public"."profiles" to "service_role";

grant insert on table "public"."profiles" to "service_role";

grant references on table "public"."profiles" to "service_role";

grant select on table "public"."profiles" to "service_role";

grant trigger on table "public"."profiles" to "service_role";

grant truncate on table "public"."profiles" to "service_role";

grant update on table "public"."profiles" to "service_role";

grant references on table "public"."reviews" to "anon";

grant select on table "public"."reviews" to "anon";

grant trigger on table "public"."reviews" to "anon";

grant truncate on table "public"."reviews" to "anon";

grant select on table "public"."reviews" to "authenticated";

grant delete on table "public"."reviews" to "service_role";

grant insert on table "public"."reviews" to "service_role";

grant references on table "public"."reviews" to "service_role";

grant select on table "public"."reviews" to "service_role";

grant trigger on table "public"."reviews" to "service_role";

grant truncate on table "public"."reviews" to "service_role";

grant update on table "public"."reviews" to "service_role";

grant delete on table "public"."services" to "anon";

grant insert on table "public"."services" to "anon";

grant references on table "public"."services" to "anon";

grant select on table "public"."services" to "anon";

grant trigger on table "public"."services" to "anon";

grant truncate on table "public"."services" to "anon";

grant update on table "public"."services" to "anon";

grant delete on table "public"."services" to "authenticated";

grant insert on table "public"."services" to "authenticated";

grant select on table "public"."services" to "authenticated";

grant update on table "public"."services" to "authenticated";

grant delete on table "public"."services" to "service_role";

grant insert on table "public"."services" to "service_role";

grant references on table "public"."services" to "service_role";

grant select on table "public"."services" to "service_role";

grant trigger on table "public"."services" to "service_role";

grant truncate on table "public"."services" to "service_role";

grant update on table "public"."services" to "service_role";

grant delete on table "public"."slots" to "anon";

grant insert on table "public"."slots" to "anon";

grant references on table "public"."slots" to "anon";

grant select on table "public"."slots" to "anon";

grant trigger on table "public"."slots" to "anon";

grant truncate on table "public"."slots" to "anon";

grant update on table "public"."slots" to "anon";

grant delete on table "public"."slots" to "authenticated";

grant insert on table "public"."slots" to "authenticated";

grant select on table "public"."slots" to "authenticated";

grant update on table "public"."slots" to "authenticated";

grant delete on table "public"."slots" to "service_role";

grant insert on table "public"."slots" to "service_role";

grant references on table "public"."slots" to "service_role";

grant select on table "public"."slots" to "service_role";

grant trigger on table "public"."slots" to "service_role";

grant truncate on table "public"."slots" to "service_role";

grant update on table "public"."slots" to "service_role";


  create policy "admins_can_read_all_bookings"
  on "public"."bookings"
  as permissive
  for select
  to authenticated
using (public.is_admin());



  create policy "bookings_business_read"
  on "public"."bookings"
  as permissive
  for select
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.businesses b
  WHERE ((b.id = bookings.business_id) AND (b.owner_id = auth.uid())))));



  create policy "bookings_user_read"
  on "public"."bookings"
  as permissive
  for select
  to authenticated
using ((user_id = auth.uid()));



  create policy "Business owners can create blocks"
  on "public"."business_blocks"
  as permissive
  for insert
  to authenticated
with check ((public.is_active_user() AND (EXISTS ( SELECT 1
   FROM public.businesses b
  WHERE ((b.id = business_blocks.business_id) AND (b.owner_id = auth.uid()))))));



  create policy "Business owners can delete blocks"
  on "public"."business_blocks"
  as permissive
  for delete
  to authenticated
using ((public.is_active_user() AND (EXISTS ( SELECT 1
   FROM public.businesses b
  WHERE ((b.id = business_blocks.business_id) AND (b.owner_id = auth.uid()))))));



  create policy "Business owners can view blocks"
  on "public"."business_blocks"
  as permissive
  for select
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.businesses b
  WHERE ((b.id = business_blocks.business_id) AND (b.owner_id = auth.uid())))));



  create policy "business_hours_owner_manage"
  on "public"."business_hours"
  as permissive
  for all
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.businesses b
  WHERE ((b.id = business_hours.business_id) AND (b.owner_id = auth.uid())))))
with check ((EXISTS ( SELECT 1
   FROM public.businesses b
  WHERE ((b.id = business_hours.business_id) AND (b.owner_id = auth.uid())))));



  create policy "business_hours_public_read"
  on "public"."business_hours"
  as permissive
  for select
  to anon, authenticated
using ((EXISTS ( SELECT 1
   FROM public.businesses b
  WHERE ((b.id = business_hours.business_id) AND (b.active = true)))));



  create policy "business_images_owner_manage"
  on "public"."business_images"
  as permissive
  for all
  to authenticated
using (public.user_owns_business((business_id)::text))
with check (public.user_owns_business((business_id)::text));



  create policy "business_images_public_read"
  on "public"."business_images"
  as permissive
  for select
  to anon, authenticated
using ((EXISTS ( SELECT 1
   FROM public.businesses b
  WHERE ((b.id = business_images.business_id) AND (b.active = true)))));



  create policy "Business owners can view subscribers"
  on "public"."business_subscriptions"
  as permissive
  for select
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.businesses
  WHERE ((businesses.id = business_subscriptions.business_id) AND (businesses.owner_id = auth.uid())))));



  create policy "subscriptions_user_manage"
  on "public"."business_subscriptions"
  as permissive
  for all
  to authenticated
using ((user_id = auth.uid()))
with check ((user_id = auth.uid()));



  create policy "admins_can_read_all_businesses"
  on "public"."businesses"
  as permissive
  for select
  to authenticated
using (public.is_admin());



  create policy "businesses_owner_delete"
  on "public"."businesses"
  as permissive
  for delete
  to authenticated
using (((owner_id = auth.uid()) AND public.is_active_user()));



  create policy "businesses_owner_insert"
  on "public"."businesses"
  as permissive
  for insert
  to authenticated
with check (((owner_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'business'::public.user_role) AND (p.is_blocked = false))))));



  create policy "businesses_owner_read"
  on "public"."businesses"
  as permissive
  for select
  to authenticated
using ((owner_id = auth.uid()));



  create policy "businesses_owner_update"
  on "public"."businesses"
  as permissive
  for update
  to authenticated
using (((owner_id = auth.uid()) AND public.is_active_user()))
with check (((owner_id = auth.uid()) AND public.is_active_user()));



  create policy "businesses_public_read"
  on "public"."businesses"
  as permissive
  for select
  to anon, authenticated
using ((active = true));



  create policy "categories_public_read"
  on "public"."categories"
  as permissive
  for select
  to anon, authenticated
using ((active = true));



  create policy "favorites_user_manage"
  on "public"."favorites"
  as permissive
  for all
  to authenticated
using ((user_id = auth.uid()))
with check ((user_id = auth.uid()));



  create policy "admins_can_read_all_manual_bookings"
  on "public"."manual_bookings"
  as permissive
  for select
  to authenticated
using (public.is_admin());



  create policy "business_owners_can_delete_manual_bookings"
  on "public"."manual_bookings"
  as permissive
  for delete
  to authenticated
using ((public.is_active_user() AND (EXISTS ( SELECT 1
   FROM public.businesses b
  WHERE ((b.id = manual_bookings.business_id) AND (b.owner_id = auth.uid()))))));



  create policy "business_owners_can_insert_manual_bookings"
  on "public"."manual_bookings"
  as permissive
  for insert
  to authenticated
with check ((public.is_active_user() AND (EXISTS ( SELECT 1
   FROM public.businesses b
  WHERE ((b.id = manual_bookings.business_id) AND (b.owner_id = auth.uid()))))));



  create policy "business_owners_can_select_manual_bookings"
  on "public"."manual_bookings"
  as permissive
  for select
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.businesses b
  WHERE ((b.id = manual_bookings.business_id) AND (b.owner_id = auth.uid())))));



  create policy "business_owners_can_update_manual_bookings"
  on "public"."manual_bookings"
  as permissive
  for update
  to authenticated
using ((public.is_active_user() AND (EXISTS ( SELECT 1
   FROM public.businesses b
  WHERE ((b.id = manual_bookings.business_id) AND (b.owner_id = auth.uid()))))))
with check ((public.is_active_user() AND (EXISTS ( SELECT 1
   FROM public.businesses b
  WHERE ((b.id = manual_bookings.business_id) AND (b.owner_id = auth.uid()))))));



  create policy "notifications_user_read"
  on "public"."notifications"
  as permissive
  for select
  to authenticated
using ((user_id = auth.uid()));



  create policy "Business owners can view booking customer profiles"
  on "public"."profiles"
  as permissive
  for select
  to authenticated
using ((EXISTS ( SELECT 1
   FROM (public.bookings b
     JOIN public.businesses bus ON ((bus.id = b.business_id)))
  WHERE ((b.user_id = profiles.id) AND (bus.owner_id = auth.uid())))));



  create policy "Business owners can view subscriber profiles"
  on "public"."profiles"
  as permissive
  for select
  to authenticated
using ((EXISTS ( SELECT 1
   FROM (public.business_subscriptions bs
     JOIN public.businesses b ON ((b.id = bs.business_id)))
  WHERE ((bs.user_id = profiles.id) AND (b.owner_id = auth.uid())))));



  create policy "admins_can_read_all_profiles"
  on "public"."profiles"
  as permissive
  for select
  to authenticated
using (public.is_admin());



  create policy "profiles_select_own"
  on "public"."profiles"
  as permissive
  for select
  to authenticated
using ((id = auth.uid()));



  create policy "profiles_update_own"
  on "public"."profiles"
  as permissive
  for update
  to authenticated
using ((id = auth.uid()))
with check ((id = auth.uid()));



  create policy "admins_can_read_all_reviews"
  on "public"."reviews"
  as permissive
  for select
  to authenticated
using (public.is_admin());



  create policy "reviews_business_owner_read"
  on "public"."reviews"
  as permissive
  for select
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.businesses b
  WHERE ((b.id = reviews.business_id) AND (b.owner_id = auth.uid())))));



  create policy "reviews_public_read"
  on "public"."reviews"
  as permissive
  for select
  to anon, authenticated
using ((visible = true));



  create policy "reviews_user_read_own"
  on "public"."reviews"
  as permissive
  for select
  to authenticated
using ((user_id = auth.uid()));



  create policy "services_owner_manage"
  on "public"."services"
  as permissive
  for all
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.businesses b
  WHERE ((b.id = services.business_id) AND (b.owner_id = auth.uid())))))
with check ((EXISTS ( SELECT 1
   FROM public.businesses b
  WHERE ((b.id = services.business_id) AND (b.owner_id = auth.uid())))));



  create policy "services_public_read"
  on "public"."services"
  as permissive
  for select
  to anon, authenticated
using (((active = true) AND (EXISTS ( SELECT 1
   FROM public.businesses b
  WHERE ((b.id = services.business_id) AND (b.active = true))))));



  create policy "slots_customer_read_booked"
  on "public"."slots"
  as permissive
  for select
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.bookings b
  WHERE ((b.slot_id = slots.id) AND (b.user_id = auth.uid())))));



  create policy "slots_owner_manage"
  on "public"."slots"
  as permissive
  for all
  to authenticated
using ((public.is_active_user() AND (EXISTS ( SELECT 1
   FROM public.businesses b
  WHERE ((b.id = slots.business_id) AND (b.owner_id = auth.uid()))))))
with check ((public.is_active_user() AND (EXISTS ( SELECT 1
   FROM public.businesses b
  WHERE ((b.id = slots.business_id) AND (b.owner_id = auth.uid()))))));



  create policy "slots_owner_read_all"
  on "public"."slots"
  as permissive
  for select
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.businesses b
  WHERE ((b.id = slots.business_id) AND (b.owner_id = auth.uid())))));



  create policy "slots_public_read_available"
  on "public"."slots"
  as permissive
  for select
  to anon, authenticated
using (((status = 'AVAILABLE'::public.slot_status) AND (EXISTS ( SELECT 1
   FROM public.businesses b
  WHERE ((b.id = slots.business_id) AND (b.active = true))))));


CREATE TRIGGER businesses_set_updated_at BEFORE UPDATE ON public.businesses FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER profiles_set_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER services_set_updated_at BEFORE UPDATE ON public.services FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER slots_set_updated_at BEFORE UPDATE ON public.slots FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


  create policy "business_images_storage_delete"
  on "storage"."objects"
  as permissive
  for delete
  to authenticated
using (((bucket_id = 'business-images'::text) AND public.user_owns_business((storage.foldername(name))[1])));



  create policy "business_images_storage_insert"
  on "storage"."objects"
  as permissive
  for insert
  to authenticated
with check (((bucket_id = 'business-images'::text) AND public.user_owns_business((storage.foldername(name))[1])));



  create policy "business_images_storage_update"
  on "storage"."objects"
  as permissive
  for update
  to authenticated
using (((bucket_id = 'business-images'::text) AND public.user_owns_business((storage.foldername(name))[1])))
with check (((bucket_id = 'business-images'::text) AND public.user_owns_business((storage.foldername(name))[1])));



