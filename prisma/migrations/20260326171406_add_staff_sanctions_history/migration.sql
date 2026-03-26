-- CreateTable
CREATE TABLE "StaffSanction" (
    "id" TEXT NOT NULL,
    "supportDiscordId" TEXT NOT NULL,
    "supportName" TEXT NOT NULL,
    "supportPcuLink" TEXT,
    "adminDiscordId" TEXT,
    "adminName" TEXT NOT NULL,
    "fecha" TEXT NOT NULL,
    "policyCategory" TEXT,
    "policyFault" TEXT,
    "motivo" TEXT NOT NULL,
    "categorias" TEXT[],
    "pruebas" TEXT,
    "requestedSanction" TEXT NOT NULL,
    "appliedSanction" TEXT NOT NULL,
    "levelLabel" TEXT,
    "previousAdvertencias" INTEGER NOT NULL DEFAULT 0,
    "previousWarnIntermedios" INTEGER NOT NULL DEFAULT 0,
    "previousWarnGraves" INTEGER NOT NULL DEFAULT 0,
    "accumulationNote" TEXT,
    "observaciones" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StaffSanction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StaffSanction_supportDiscordId_idx" ON "StaffSanction"("supportDiscordId");

-- CreateIndex
CREATE INDEX "StaffSanction_createdAt_idx" ON "StaffSanction"("createdAt");
