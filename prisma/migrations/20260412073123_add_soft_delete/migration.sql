-- DropForeignKey
ALTER TABLE "PatientSession" DROP CONSTRAINT "PatientSession_patientId_fkey";

-- AlterTable
ALTER TABLE "Medication" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "PatientSession" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ALTER COLUMN "patientId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "PatientSession" ADD CONSTRAINT "PatientSession_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE SET NULL ON UPDATE CASCADE;
