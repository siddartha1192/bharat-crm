-- CreateTable
CREATE TABLE "RoundRobinConfig" (
    "id" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "assignmentScope" TEXT NOT NULL DEFAULT 'all',
    "teamId" TEXT,
    "departmentId" TEXT,
    "customUserIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "workingHours" JSONB,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "maxLeadsPerDay" INTEGER,
    "maxLeadsPerWeek" INTEGER,
    "fallbackToCreator" BOOLEAN NOT NULL DEFAULT true,
    "fallbackUserId" TEXT,
    "skipInactiveUsers" BOOLEAN NOT NULL DEFAULT true,
    "skipFullAgents" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "tenantId" TEXT NOT NULL,

    CONSTRAINT "RoundRobinConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoundRobinState" (
    "id" TEXT NOT NULL,
    "lastAssignedUserId" TEXT NOT NULL,
    "lastAssignedUserName" TEXT NOT NULL,
    "lastAssignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assignmentCount" INTEGER NOT NULL DEFAULT 0,
    "rotationCycle" INTEGER NOT NULL DEFAULT 1,
    "userPool" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "tenantId" TEXT NOT NULL,

    CONSTRAINT "RoundRobinState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoundRobinAssignment" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userName" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assignmentReason" TEXT NOT NULL,
    "rotationCycle" INTEGER NOT NULL DEFAULT 0,
    "tenantId" TEXT NOT NULL,

    CONSTRAINT "RoundRobinAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RoundRobinConfig_tenantId_key" ON "RoundRobinConfig"("tenantId");

-- CreateIndex
CREATE INDEX "RoundRobinConfig_tenantId_idx" ON "RoundRobinConfig"("tenantId");

-- CreateIndex
CREATE INDEX "RoundRobinConfig_isEnabled_idx" ON "RoundRobinConfig"("isEnabled");

-- CreateIndex
CREATE UNIQUE INDEX "RoundRobinState_tenantId_key" ON "RoundRobinState"("tenantId");

-- CreateIndex
CREATE INDEX "RoundRobinState_tenantId_idx" ON "RoundRobinState"("tenantId");

-- CreateIndex
CREATE INDEX "RoundRobinState_lastAssignedAt_idx" ON "RoundRobinState"("lastAssignedAt");

-- CreateIndex
CREATE INDEX "RoundRobinAssignment_tenantId_idx" ON "RoundRobinAssignment"("tenantId");

-- CreateIndex
CREATE INDEX "RoundRobinAssignment_userId_idx" ON "RoundRobinAssignment"("userId");

-- CreateIndex
CREATE INDEX "RoundRobinAssignment_leadId_idx" ON "RoundRobinAssignment"("leadId");

-- CreateIndex
CREATE INDEX "RoundRobinAssignment_assignedAt_idx" ON "RoundRobinAssignment"("assignedAt");
