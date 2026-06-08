-- Add per-community invoice webhook configuration.
ALTER TABLE "Community" ADD COLUMN "invoiceConfig" JSONB;
