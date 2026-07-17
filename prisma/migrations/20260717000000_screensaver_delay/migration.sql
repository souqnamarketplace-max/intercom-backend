-- Configurable idle delay before the panel's screensaver activates
-- (previously purely motion-reactive with no configurable timing at all).
ALTER TABLE "sites" ADD COLUMN "screensaver_delay_seconds" INTEGER NOT NULL DEFAULT 20;
