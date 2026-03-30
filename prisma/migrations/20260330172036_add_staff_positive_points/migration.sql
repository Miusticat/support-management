-- CreateTable
CREATE TABLE "StaffPositivePoints" (
    "id" TEXT NOT NULL,
    "supportDiscordId" TEXT NOT NULL,
    "supportName" TEXT NOT NULL,
    "supportPcuLink" TEXT,
    "adminDiscordId" TEXT,
    "adminName" TEXT NOT NULL,
    "fecha" TEXT NOT NULL,
    "pointType" TEXT NOT NULL,
    "pointValue" DOUBLE PRECISION NOT NULL,
    "justificacion" TEXT NOT NULL,
    "evidencia" TEXT,
    "categorias" TEXT[],
    "observaciones" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StaffPositivePoints_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StaffPositivePoints_supportDiscordId_idx" ON "StaffPositivePoints"("supportDiscordId");

-- CreateIndex
CREATE INDEX "StaffPositivePoints_createdAt_idx" ON "StaffPositivePoints"("createdAt");
