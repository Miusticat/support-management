-- CreateTable
CREATE TABLE "DiscordMembership" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "permissions" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DiscordMembership_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DiscordMembership_userId_key" ON "DiscordMembership"("userId");

-- CreateIndex
CREATE INDEX "DiscordMembership_guildId_idx" ON "DiscordMembership"("guildId");

-- AddForeignKey
ALTER TABLE "DiscordMembership" ADD CONSTRAINT "DiscordMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
