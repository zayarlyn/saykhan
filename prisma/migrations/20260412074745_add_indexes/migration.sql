-- CreateIndex
CREATE INDEX "Expense_date_idx" ON "Expense"("date");

-- CreateIndex
CREATE INDEX "Expense_categoryId_idx" ON "Expense"("categoryId");

-- CreateIndex
CREATE INDEX "Medication_deletedAt_idx" ON "Medication"("deletedAt");

-- CreateIndex
CREATE INDEX "Medication_categoryId_idx" ON "Medication"("categoryId");

-- CreateIndex
CREATE INDEX "PatientSession_date_idx" ON "PatientSession"("date");

-- CreateIndex
CREATE INDEX "PatientSession_deletedAt_idx" ON "PatientSession"("deletedAt");

-- CreateIndex
CREATE INDEX "PatientSession_patientId_idx" ON "PatientSession"("patientId");

-- CreateIndex
CREATE INDEX "RestockBatchItem_restockBatchId_idx" ON "RestockBatchItem"("restockBatchId");

-- CreateIndex
CREATE INDEX "RestockBatchItem_medicationId_idx" ON "RestockBatchItem"("medicationId");

-- CreateIndex
CREATE INDEX "RestockBatchItem_expiryDate_idx" ON "RestockBatchItem"("expiryDate");

-- CreateIndex
CREATE INDEX "SessionMedication_sessionId_idx" ON "SessionMedication"("sessionId");

-- CreateIndex
CREATE INDEX "SessionMedication_medicationId_idx" ON "SessionMedication"("medicationId");
