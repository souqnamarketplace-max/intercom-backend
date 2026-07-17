-- Adds a start-of-window field to virtual_keys, matching ButterflyMX-style
-- "Custom Duration" and recurring-window presets (previously we only had
-- an end/expiry, not a start).

ALTER TABLE "virtual_keys" ADD COLUMN "activates_at" TIMESTAMP(3);
