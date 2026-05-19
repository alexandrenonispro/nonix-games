-- CreateTable
CREATE TABLE "undercover_history" (
    "id" TEXT NOT NULL,
    "room_code" TEXT NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL,
    "ended_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "winner" TEXT NOT NULL,
    "civil_word" TEXT NOT NULL,
    "undercover_word" TEXT NOT NULL,
    "players" JSONB NOT NULL,
    "rounds" INTEGER NOT NULL,

    CONSTRAINT "undercover_history_pkey" PRIMARY KEY ("id")
);
