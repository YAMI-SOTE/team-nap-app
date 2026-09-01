-- AlterTable
ALTER TABLE "Onboarding" ADD COLUMN     "calendarDeviceConnected" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "napCutoffHour" INTEGER NOT NULL DEFAULT 15,
ADD COLUMN     "notifyNapEnd" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "notifyNapSuggestion" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "notifyTeamNapSuggestion" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "notifyWakeSupport" BOOLEAN NOT NULL DEFAULT true;
