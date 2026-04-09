-- CreateTable
CREATE TABLE "NoShowJustificationRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "guestEmail" TEXT NOT NULL,
    "guestName" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "justificationText" TEXT,
    "submittedAt" TIMESTAMP(3),
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NoShowJustificationRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "NoShowJustificationRequest_token_key" ON "NoShowJustificationRequest"("token");

-- CreateIndex
CREATE UNIQUE INDEX "NoShowJustificationRequest_userId_guestEmail_key" ON "NoShowJustificationRequest"("userId", "guestEmail");

-- CreateIndex
CREATE INDEX "NoShowJustificationRequest_userId_idx" ON "NoShowJustificationRequest"("userId");

-- CreateIndex
CREATE INDEX "NoShowJustificationRequest_status_idx" ON "NoShowJustificationRequest"("status");

-- AddForeignKey
ALTER TABLE "NoShowJustificationRequest" ADD CONSTRAINT "NoShowJustificationRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
