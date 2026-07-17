-- CreateEnum
CREATE TYPE "staff_role" AS ENUM ('platform_admin', 'owner_admin', 'owner_manager', 'owner_staff');

-- CreateEnum
CREATE TYPE "device_type" AS ENUM ('panel', 'pi_controller');

-- CreateEnum
CREATE TYPE "device_connection" AS ENUM ('ethernet', 'wifi', 'cellular');

-- CreateEnum
CREATE TYPE "resident_status" AS ENUM ('active', 'suspended', 'deleted');

-- CreateEnum
CREATE TYPE "fob_status" AS ENUM ('active', 'suspended', 'revoked', 'lost_stolen');

-- CreateEnum
CREATE TYPE "key_type" AS ENUM ('single_use', 'recurring');

-- CreateEnum
CREATE TYPE "key_status" AS ENUM ('active', 'revoked', 'expired');

-- CreateEnum
CREATE TYPE "audit_event_type" AS ENUM ('call_answered', 'call_missed', 'call_declined', 'unlock_app', 'unlock_pin', 'unlock_virtual_key', 'unlock_card_fob', 'unlock_admin_override', 'fire_alarm_triggered', 'device_offline', 'device_online', 'failed_pin_attempt', 'failed_fob_attempt', 'config_changed');

-- CreateTable
CREATE TABLE "owners" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "flat_fee_amount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "per_site_rate" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "per_unit_rate" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "per_resident_rate" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "billing_cycle" TEXT NOT NULL DEFAULT 'monthly',
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "subscription_status" TEXT NOT NULL DEFAULT 'trial',
    "trial_start_date" DATE,
    "trial_end_date" DATE,
    "subscription_start_date" DATE,
    "subscription_end_date" DATE,
    "next_billing_date" DATE,
    "grace_period_days" INTEGER NOT NULL DEFAULT 7,
    "demo_mode" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "owners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff_accounts" (
    "id" UUID NOT NULL,
    "owner_id" UUID,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "staff_role" NOT NULL,
    "identity_provider_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "staff_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sites" (
    "id" UUID NOT NULL,
    "owner_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "branding_logo_url" TEXT,
    "directory_privacy_mode" BOOLEAN NOT NULL DEFAULT false,
    "fire_alarm_relay_map" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "entry_points" (
    "id" UUID NOT NULL,
    "site_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "custom_buttons" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "entry_points_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "devices" (
    "id" UUID NOT NULL,
    "entry_point_id" UUID NOT NULL,
    "device_type" "device_type" NOT NULL,
    "serial_number" TEXT NOT NULL,
    "public_key" TEXT,
    "connection_type" "device_connection" NOT NULL DEFAULT 'ethernet',
    "failover_enabled" BOOLEAN NOT NULL DEFAULT false,
    "firmware_version" TEXT,
    "status" TEXT NOT NULL DEFAULT 'offline',
    "last_heartbeat_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "devices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "units" (
    "id" UUID NOT NULL,
    "site_id" UUID NOT NULL,
    "zone_id" UUID,
    "unit_number" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "units_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "zones" (
    "id" UUID NOT NULL,
    "site_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "zones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "delivery_authorizations" (
    "id" UUID NOT NULL,
    "site_id" UUID NOT NULL,
    "carrier_name" TEXT NOT NULL,
    "pin_hash" TEXT NOT NULL,
    "time_window" JSONB NOT NULL DEFAULT '{}',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "delivery_authorizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "partner_api_keys" (
    "id" UUID NOT NULL,
    "owner_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "key_prefix" TEXT NOT NULL,
    "key_hash" TEXT NOT NULL,
    "scopes" TEXT[],
    "last_used_at" TIMESTAMP(3),
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "partner_api_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "residents" (
    "id" UUID NOT NULL,
    "unit_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "status" "resident_status" NOT NULL DEFAULT 'active',
    "directory_visible" BOOLEAN NOT NULL DEFAULT true,
    "notifications_enabled" BOOLEAN NOT NULL DEFAULT true,
    "pin_hash" TEXT,
    "invite_code" TEXT,
    "app_account_created" BOOLEAN NOT NULL DEFAULT false,
    "otp_code" TEXT,
    "otp_expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "residents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "card_fobs" (
    "id" UUID NOT NULL,
    "resident_id" UUID,
    "site_id" UUID NOT NULL,
    "label" TEXT,
    "hashed_card_id" TEXT NOT NULL,
    "status" "fob_status" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "card_fobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "virtual_keys" (
    "id" UUID NOT NULL,
    "issued_by_resident_id" UUID,
    "unit_id" UUID NOT NULL,
    "site_id" UUID NOT NULL,
    "recipient_name" TEXT NOT NULL,
    "recipient_contact" TEXT,
    "key_type" "key_type" NOT NULL,
    "schedule" JSONB,
    "expires_at" TIMESTAMP(3),
    "status" "key_status" NOT NULL DEFAULT 'active',
    "signed_token" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "virtual_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "static_qr_codes" (
    "id" UUID NOT NULL,
    "site_id" UUID NOT NULL,
    "entry_point_id" UUID,
    "opaque_token" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "regenerated_at" TIMESTAMP(3),

    CONSTRAINT "static_qr_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_events" (
    "id" UUID NOT NULL,
    "site_id" UUID NOT NULL,
    "entry_point_id" UUID,
    "device_id" UUID,
    "unit_id" UUID,
    "resident_id" UUID,
    "event_type" "audit_event_type" NOT NULL,
    "method" TEXT,
    "result" TEXT NOT NULL,
    "photo_url" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "site_integrations" (
    "id" UUID NOT NULL,
    "site_id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "config" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "site_integrations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "staff_accounts_email_key" ON "staff_accounts"("email");

-- CreateIndex
CREATE UNIQUE INDEX "devices_serial_number_key" ON "devices"("serial_number");

-- CreateIndex
CREATE UNIQUE INDEX "devices_entry_point_id_device_type_key" ON "devices"("entry_point_id", "device_type");

-- CreateIndex
CREATE UNIQUE INDEX "units_site_id_unit_number_key" ON "units"("site_id", "unit_number");

-- CreateIndex
CREATE UNIQUE INDEX "zones_site_id_name_key" ON "zones"("site_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "delivery_authorizations_site_id_carrier_name_key" ON "delivery_authorizations"("site_id", "carrier_name");

-- CreateIndex
CREATE UNIQUE INDEX "partner_api_keys_key_hash_key" ON "partner_api_keys"("key_hash");

-- CreateIndex
CREATE UNIQUE INDEX "residents_invite_code_key" ON "residents"("invite_code");

-- CreateIndex
CREATE UNIQUE INDEX "static_qr_codes_opaque_token_key" ON "static_qr_codes"("opaque_token");

-- CreateIndex
CREATE INDEX "audit_events_site_id_created_at_idx" ON "audit_events"("site_id", "created_at");

-- AddForeignKey
ALTER TABLE "staff_accounts" ADD CONSTRAINT "staff_accounts_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "owners"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sites" ADD CONSTRAINT "sites_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "owners"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entry_points" ADD CONSTRAINT "entry_points_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "devices" ADD CONSTRAINT "devices_entry_point_id_fkey" FOREIGN KEY ("entry_point_id") REFERENCES "entry_points"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "units" ADD CONSTRAINT "units_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "units" ADD CONSTRAINT "units_zone_id_fkey" FOREIGN KEY ("zone_id") REFERENCES "zones"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zones" ADD CONSTRAINT "zones_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_authorizations" ADD CONSTRAINT "delivery_authorizations_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partner_api_keys" ADD CONSTRAINT "partner_api_keys_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "owners"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "residents" ADD CONSTRAINT "residents_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "units"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "card_fobs" ADD CONSTRAINT "card_fobs_resident_id_fkey" FOREIGN KEY ("resident_id") REFERENCES "residents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "card_fobs" ADD CONSTRAINT "card_fobs_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "virtual_keys" ADD CONSTRAINT "virtual_keys_issued_by_resident_id_fkey" FOREIGN KEY ("issued_by_resident_id") REFERENCES "residents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "virtual_keys" ADD CONSTRAINT "virtual_keys_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "units"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "virtual_keys" ADD CONSTRAINT "virtual_keys_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "static_qr_codes" ADD CONSTRAINT "static_qr_codes_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "static_qr_codes" ADD CONSTRAINT "static_qr_codes_entry_point_id_fkey" FOREIGN KEY ("entry_point_id") REFERENCES "entry_points"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_entry_point_id_fkey" FOREIGN KEY ("entry_point_id") REFERENCES "entry_points"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "devices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "units"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_resident_id_fkey" FOREIGN KEY ("resident_id") REFERENCES "residents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "site_integrations" ADD CONSTRAINT "site_integrations_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;
