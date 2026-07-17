-- Per-device (not per-site) provisioning: replaces the panel's build-time
-- VITE_SITE_ID env var, which required one Vercel deployment per site and
-- couldn't distinguish between multiple panels on the same site.

ALTER TABLE "devices" ADD COLUMN "setup_code" TEXT;
ALTER TABLE "devices" ADD COLUMN "provisioned_at" TIMESTAMP(3);
CREATE UNIQUE INDEX "devices_setup_code_key" ON "devices"("setup_code");
