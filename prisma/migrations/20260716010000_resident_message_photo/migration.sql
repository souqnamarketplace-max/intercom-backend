-- Photo attached to a panel-to-resident message (visitor's snapshot),
-- stored as a data URL for this testing phase.
ALTER TABLE "resident_messages" ADD COLUMN "photo_url" TEXT;
