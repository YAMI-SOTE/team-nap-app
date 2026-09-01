-- CreateTable
CREATE TABLE "NapRecord" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "start" TEXT NOT NULL,
    "end" TEXT NOT NULL,
    "minutes" INTEGER NOT NULL,
    "wakeStars" INTEGER NOT NULL DEFAULT 0,
    "focusDeltaPt" INTEGER NOT NULL DEFAULT 0,
    "aiAdvice" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NapRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "NapRecord_userId_date_idx" ON "NapRecord"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "NapRecord_userId_date_key" ON "NapRecord"("userId", "date");

-- AddForeignKey
ALTER TABLE "NapRecord" ADD CONSTRAINT "NapRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
