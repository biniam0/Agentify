/*
  Warnings:

  - Made the column `barrierxUserId` on table `User` required. This step will fail if there are existing NULL values in that column.
  - Made the column `tenantSlug` on table `User` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN', 'SUPER_ADMIN');

-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM ('USER_LOGIN', 'TOKEN_REFRESH', 'PRE_CALL_TRIGGER', 'POST_CALL_TRIGGER', 'NOTE_CREATED', 'MEETING_CREATED', 'CONTACT_CREATED', 'DEAL_CREATED', 'CALL_RETRY', 'WEBHOOK_RECEIVED', 'SCHEDULER_RUN', 'DATA_FETCH', 'ADMIN_LOGS_ACCESSED');

-- CreateEnum
CREATE TYPE "Status" AS ENUM ('PENDING', 'RUNNING', 'SUCCESS', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CallType" AS ENUM ('PRE_CALL', 'POST_CALL');

-- CreateEnum
CREATE TYPE "CallStatus" AS ENUM ('INITIATED', 'RINGING', 'ANSWERED', 'COMPLETED', 'FAILED', 'NO_ANSWER', 'BUSY');

-- CreateEnum
CREATE TYPE "TriggerSource" AS ENUM ('MANUAL', 'SCHEDULED', 'RETRY', 'WEBHOOK');

-- CreateEnum
CREATE TYPE "CrmActionType" AS ENUM ('NOTE', 'MEETING', 'CONTACT', 'DEAL');

-- CreateEnum
CREATE TYPE "WebhookType" AS ENUM ('ELEVENLABS_CALL', 'ELEVENLABS_TOOL', 'BARRIERX');

-- CreateEnum
CREATE TYPE "SchedulerJobType" AS ENUM ('MEETING_AUTOMATION', 'CLEANUP', 'RETRY', 'HEALTH_CHECK');

-- CreateEnum
CREATE TYPE "ErrorType" AS ENUM ('API_ERROR', 'DATABASE_ERROR', 'EXTERNAL_SERVICE', 'VALIDATION_ERROR', 'AUTHENTICATION_ERROR', 'AUTHORIZATION_ERROR');

-- CreateEnum
CREATE TYPE "Severity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "role" "UserRole" NOT NULL DEFAULT 'USER',
ALTER COLUMN "barrierxUserId" SET NOT NULL,
ALTER COLUMN "tenantSlug" SET NOT NULL;

-- CreateTable
CREATE TABLE "ActivityLog" (
    "id" TEXT NOT NULL,
    "activityType" "ActivityType" NOT NULL,
    "status" "Status" NOT NULL DEFAULT 'PENDING',
    "userId" TEXT,
    "userName" TEXT,
    "userEmail" TEXT,
    "dealId" TEXT,
    "dealName" TEXT,
    "meetingId" TEXT,
    "meetingTitle" TEXT,
    "conversationId" TEXT,
    "callSid" TEXT,
    "metadata" JSONB,
    "errorMessage" TEXT,
    "errorStack" TEXT,
    "duration" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "ActivityLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CallLog" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT,
    "callSid" TEXT,
    "callType" "CallType" NOT NULL,
    "userId" TEXT NOT NULL,
    "userName" TEXT NOT NULL,
    "userEmail" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "dealName" TEXT NOT NULL,
    "meetingId" TEXT NOT NULL,
    "meetingTitle" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "ownerName" TEXT,
    "agentId" TEXT,
    "triggerSource" "TriggerSource" NOT NULL,
    "triggerUserId" TEXT,
    "status" "CallStatus" NOT NULL DEFAULT 'INITIATED',
    "initiatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "answeredAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "duration" INTEGER,
    "callSuccessful" BOOLEAN,
    "failureReason" TEXT,
    "transcriptSummary" TEXT,
    "retryAttempt" INTEGER NOT NULL DEFAULT 1,
    "maxRetries" INTEGER NOT NULL DEFAULT 3,
    "parentCallId" TEXT,
    "dynamicVariables" JSONB,
    "webhookData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CallLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrmActionLog" (
    "id" TEXT NOT NULL,
    "actionType" "CrmActionType" NOT NULL,
    "conversationId" TEXT,
    "dealId" TEXT,
    "tenantSlug" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "entityId" TEXT,
    "title" TEXT,
    "body" TEXT,
    "status" "Status" NOT NULL DEFAULT 'PENDING',
    "errorMessage" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "CrmActionLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebhookLog" (
    "id" TEXT NOT NULL,
    "webhookType" "WebhookType" NOT NULL,
    "eventType" TEXT NOT NULL,
    "conversationId" TEXT,
    "agentId" TEXT,
    "status" "Status" NOT NULL DEFAULT 'SUCCESS',
    "processingTime" INTEGER,
    "errorMessage" TEXT,
    "payload" JSONB NOT NULL,
    "response" JSONB,
    "signature" TEXT,
    "signatureValid" BOOLEAN,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebhookLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SchedulerLog" (
    "id" TEXT NOT NULL,
    "jobType" "SchedulerJobType" NOT NULL,
    "status" "Status" NOT NULL DEFAULT 'RUNNING',
    "totalUsers" INTEGER,
    "preCallsTriggered" INTEGER,
    "postCallsTriggered" INTEGER,
    "errorsCount" INTEGER,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "duration" INTEGER,
    "errorMessage" TEXT,
    "metadata" JSONB,

    CONSTRAINT "SchedulerLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ErrorLog" (
    "id" TEXT NOT NULL,
    "errorType" "ErrorType" NOT NULL,
    "severity" "Severity" NOT NULL,
    "source" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "stack" TEXT,
    "code" TEXT,
    "userId" TEXT,
    "dealId" TEXT,
    "endpoint" TEXT,
    "method" TEXT,
    "requestData" JSONB,
    "responseData" JSONB,
    "isResolved" BOOLEAN NOT NULL DEFAULT false,
    "resolvedAt" TIMESTAMP(3),
    "resolvedBy" TEXT,
    "resolution" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ErrorLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ActivityLog_userId_idx" ON "ActivityLog"("userId");

-- CreateIndex
CREATE INDEX "ActivityLog_activityType_idx" ON "ActivityLog"("activityType");

-- CreateIndex
CREATE INDEX "ActivityLog_status_idx" ON "ActivityLog"("status");

-- CreateIndex
CREATE INDEX "ActivityLog_dealId_idx" ON "ActivityLog"("dealId");

-- CreateIndex
CREATE INDEX "ActivityLog_conversationId_idx" ON "ActivityLog"("conversationId");

-- CreateIndex
CREATE INDEX "ActivityLog_createdAt_idx" ON "ActivityLog"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "CallLog_conversationId_key" ON "CallLog"("conversationId");

-- CreateIndex
CREATE INDEX "CallLog_userId_idx" ON "CallLog"("userId");

-- CreateIndex
CREATE INDEX "CallLog_dealId_idx" ON "CallLog"("dealId");

-- CreateIndex
CREATE INDEX "CallLog_callType_idx" ON "CallLog"("callType");

-- CreateIndex
CREATE INDEX "CallLog_status_idx" ON "CallLog"("status");

-- CreateIndex
CREATE INDEX "CallLog_conversationId_idx" ON "CallLog"("conversationId");

-- CreateIndex
CREATE INDEX "CallLog_initiatedAt_idx" ON "CallLog"("initiatedAt");

-- CreateIndex
CREATE INDEX "CrmActionLog_actionType_idx" ON "CrmActionLog"("actionType");

-- CreateIndex
CREATE INDEX "CrmActionLog_status_idx" ON "CrmActionLog"("status");

-- CreateIndex
CREATE INDEX "CrmActionLog_dealId_idx" ON "CrmActionLog"("dealId");

-- CreateIndex
CREATE INDEX "CrmActionLog_conversationId_idx" ON "CrmActionLog"("conversationId");

-- CreateIndex
CREATE INDEX "CrmActionLog_createdAt_idx" ON "CrmActionLog"("createdAt");

-- CreateIndex
CREATE INDEX "WebhookLog_webhookType_idx" ON "WebhookLog"("webhookType");

-- CreateIndex
CREATE INDEX "WebhookLog_eventType_idx" ON "WebhookLog"("eventType");

-- CreateIndex
CREATE INDEX "WebhookLog_conversationId_idx" ON "WebhookLog"("conversationId");

-- CreateIndex
CREATE INDEX "WebhookLog_createdAt_idx" ON "WebhookLog"("createdAt");

-- CreateIndex
CREATE INDEX "SchedulerLog_jobType_idx" ON "SchedulerLog"("jobType");

-- CreateIndex
CREATE INDEX "SchedulerLog_status_idx" ON "SchedulerLog"("status");

-- CreateIndex
CREATE INDEX "SchedulerLog_startedAt_idx" ON "SchedulerLog"("startedAt");

-- CreateIndex
CREATE INDEX "ErrorLog_errorType_idx" ON "ErrorLog"("errorType");

-- CreateIndex
CREATE INDEX "ErrorLog_severity_idx" ON "ErrorLog"("severity");

-- CreateIndex
CREATE INDEX "ErrorLog_isResolved_idx" ON "ErrorLog"("isResolved");

-- CreateIndex
CREATE INDEX "ErrorLog_createdAt_idx" ON "ErrorLog"("createdAt");
