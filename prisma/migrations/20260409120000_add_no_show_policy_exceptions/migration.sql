-- CreateTable
CREATE TABLE "NoShowPolicyException" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "guestEmail" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NoShowPolicyException_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "NoShowPolicyException_userId_idx" ON "NoShowPolicyException"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "NoShowPolicyException_userId_guestEmail_key" ON "NoShowPolicyException"("userId", "guestEmail");

-- AddForeignKey
ALTER TABLE "NoShowPolicyException" ADD CONSTRAINT "NoShowPolicyException_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
