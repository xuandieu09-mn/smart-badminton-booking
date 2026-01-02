-- CreateTable
CREATE TABLE "ChatMessage" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatAnalytics" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER,
    "query" TEXT NOT NULL,
    "intent" TEXT,
    "wasResolved" BOOLEAN NOT NULL DEFAULT false,
    "toolUsed" TEXT,
    "responseTime" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatAnalytics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ChatMessage_userId_createdAt_idx" ON "ChatMessage"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "ChatAnalytics_userId_createdAt_idx" ON "ChatAnalytics"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "ChatAnalytics_intent_idx" ON "ChatAnalytics"("intent");

-- CreateIndex
CREATE INDEX "ChatAnalytics_wasResolved_idx" ON "ChatAnalytics"("wasResolved");

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatAnalytics" ADD CONSTRAINT "ChatAnalytics_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
