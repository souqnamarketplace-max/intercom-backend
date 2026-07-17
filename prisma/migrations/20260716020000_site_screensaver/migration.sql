-- Uploaded (not linked) screensaver for the panel's idle screen, stored as
-- a data URL for this testing phase, matching branding logo/message photos.
ALTER TABLE "sites" ADD COLUMN "screensaver_type" TEXT;
ALTER TABLE "sites" ADD COLUMN "screensaver_url" TEXT;
