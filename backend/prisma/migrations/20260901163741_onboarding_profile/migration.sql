-- CreateTable
CREATE TABLE "Onboarding" (
    "userId" TEXT NOT NULL,
    "bedtime" TEXT NOT NULL DEFAULT '23:30',
    "wakeTime" TEXT NOT NULL DEFAULT '07:30',
    "calendarConnected" BOOLEAN NOT NULL DEFAULT false,
    "notificationsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Onboarding_pkey" PRIMARY KEY ("userId")
);

-- AddForeignKey
ALTER TABLE "Onboarding" ADD CONSTRAINT "Onboarding_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
