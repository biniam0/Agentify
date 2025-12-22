/*
  Warnings:

  - The values [ADMIN_LOGS_ACCESSED] on the enum `ActivityType` will be removed. If these variants are still used in the database, this will fail.

*/
-- CreateEnum
CREATE TYPE "CallDirection" AS ENUM ('OUTBOUND', 'INBOUND');

-- AlterEnum
BEGIN;
CREATE TYPE "ActivityType_new" AS ENUM ('USER_LOGIN', 'TOKEN_REFRESH', 'PRE_CALL_TRIGGER', 'POST_CALL_TRIGGER', 'NOTE_CREATED', 'MEETING_CREATED', 'CONTACT_CREATED', 'DEAL_CREATED', 'CALL_RETRY', 'WEBHOOK_RECEIVED', 'SCHEDULER_RUN', 'DATA_FETCH');
ALTER TABLE "ActivityLog" ALTER COLUMN "activityType" TYPE "ActivityType_new" USING ("activityType"::text::"ActivityType_new");
ALTER TYPE "ActivityType" RENAME TO "ActivityType_old";
ALTER TYPE "ActivityType_new" RENAME TO "ActivityType";
DROP TYPE "ActivityType_old";
COMMIT;

-- AlterEnum
ALTER TYPE "CrmActionType" ADD VALUE 'TASK';

-- AlterTable
ALTER TABLE "CallLog" ADD COLUMN     "callDirection" "CallDirection" NOT NULL DEFAULT 'OUTBOUND';

-- CreateIndex
CREATE INDEX "CallLog_phoneNumber_idx" ON "CallLog"("phoneNumber");
