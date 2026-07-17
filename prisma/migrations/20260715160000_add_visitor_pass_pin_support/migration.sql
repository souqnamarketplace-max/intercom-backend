-- Adds PIN-based ("Delivery Pass") support to virtual_keys, alongside the
-- existing QR-based ("Visitor Pass") flow. Resident self-service generation
-- of both was previously entirely missing end-to-end.

ALTER TYPE "key_type" ADD VALUE IF NOT EXISTS 'delivery';

CREATE TYPE "key_access_method" AS ENUM ('qr', 'pin');

ALTER TABLE "virtual_keys"
  ADD COLUMN "access_method" "key_access_method" NOT NULL DEFAULT 'qr',
  ADD COLUMN "short_code_hash" TEXT,
  ALTER COLUMN "signed_token" SET DEFAULT '';
