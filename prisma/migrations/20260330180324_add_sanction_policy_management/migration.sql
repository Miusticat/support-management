-- CreateTable
CREATE TABLE "SanctionPolicyCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SanctionPolicyCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SanctionPolicyInfraction" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "fault" TEXT NOT NULL,
    "sanction" TEXT NOT NULL,
    "tags" TEXT[],
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SanctionPolicyInfraction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SanctionPolicyCategory_name_key" ON "SanctionPolicyCategory"("name");

-- CreateIndex
CREATE INDEX "SanctionPolicyCategory_sortOrder_idx" ON "SanctionPolicyCategory"("sortOrder");

-- CreateIndex
CREATE INDEX "SanctionPolicyInfraction_categoryId_idx" ON "SanctionPolicyInfraction"("categoryId");

-- CreateIndex
CREATE INDEX "SanctionPolicyInfraction_sortOrder_idx" ON "SanctionPolicyInfraction"("sortOrder");

-- AddForeignKey
ALTER TABLE "SanctionPolicyInfraction" ADD CONSTRAINT "SanctionPolicyInfraction_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "SanctionPolicyCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;
