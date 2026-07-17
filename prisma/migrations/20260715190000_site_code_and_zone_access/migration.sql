-- Site-level reusable pairing code (replaces having to pre-create a Device
-- row + one-time code before every panel install).
ALTER TABLE "sites" ADD COLUMN "panel_setup_code" TEXT;
CREATE UNIQUE INDEX "sites_panel_setup_code_key" ON "sites"("panel_setup_code");

-- Shared-space flag so common areas (parking, mail room) don't need a
-- ZoneEntryPoint row per zone.
ALTER TABLE "entry_points" ADD COLUMN "open_to_all_zones" BOOLEAN NOT NULL DEFAULT false;

-- Zone <-> EntryPoint many-to-many: which doors a zone's residents can access.
CREATE TABLE "zone_entry_points" (
    "zone_id" UUID NOT NULL,
    "entry_point_id" UUID NOT NULL,
    CONSTRAINT "zone_entry_points_pkey" PRIMARY KEY ("zone_id", "entry_point_id")
);

ALTER TABLE "zone_entry_points" ADD CONSTRAINT "zone_entry_points_zone_id_fkey"
  FOREIGN KEY ("zone_id") REFERENCES "zones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "zone_entry_points" ADD CONSTRAINT "zone_entry_points_entry_point_id_fkey"
  FOREIGN KEY ("entry_point_id") REFERENCES "entry_points"("id") ON DELETE CASCADE ON UPDATE CASCADE;
