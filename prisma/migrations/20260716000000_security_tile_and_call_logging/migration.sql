-- Dashboard-configurable visibility for the panel's Security tile (a
-- placeholder with no real multi-camera backend yet).
ALTER TABLE "sites" ADD COLUMN "security_tile_enabled" BOOLEAN NOT NULL DEFAULT false;
