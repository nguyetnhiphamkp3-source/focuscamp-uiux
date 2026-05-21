-- AlterTable
ALTER TABLE "Referral" ADD COLUMN "payoutStatus" TEXT NOT NULL DEFAULT 'UNPAID';
ALTER TABLE "Referral" ADD COLUMN "payoutNote" TEXT;
