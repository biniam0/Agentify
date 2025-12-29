-- CreateIndex
CREATE INDEX "ActivityLog_userId_createdAt_idx" ON "ActivityLog"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "ActivityLog_dealId_activityType_idx" ON "ActivityLog"("dealId", "activityType");

-- CreateIndex
CREATE INDEX "ActivityLog_status_createdAt_idx" ON "ActivityLog"("status", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "CallLog_phoneNumber_callType_initiatedAt_idx" ON "CallLog"("phoneNumber", "callType", "initiatedAt" DESC);

-- CreateIndex
CREATE INDEX "CallLog_userId_initiatedAt_idx" ON "CallLog"("userId", "initiatedAt" DESC);

-- CreateIndex
CREATE INDEX "CallLog_status_initiatedAt_idx" ON "CallLog"("status", "initiatedAt");

-- CreateIndex
CREATE INDEX "CallLog_callType_status_idx" ON "CallLog"("callType", "status");

-- CreateIndex
CREATE INDEX "ErrorLog_severity_isResolved_createdAt_idx" ON "ErrorLog"("severity", "isResolved", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "ErrorLog_errorType_createdAt_idx" ON "ErrorLog"("errorType", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "User_isAuth_isEnabled_idx" ON "User"("isAuth", "isEnabled");

-- CreateIndex
CREATE INDEX "WebhookLog_conversationId_eventType_createdAt_idx" ON "WebhookLog"("conversationId", "eventType", "createdAt");
