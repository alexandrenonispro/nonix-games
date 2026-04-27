-- CreateTable
CREATE TABLE "drawnix_history" (
    "id" TEXT NOT NULL,
    "room_code" TEXT NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL,
    "ended_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "settings" JSONB NOT NULL,
    "rankings" JSONB NOT NULL,

    CONSTRAINT "drawnix_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "drawnix_turns" (
    "id" TEXT NOT NULL,
    "history_id" TEXT NOT NULL,
    "round" INTEGER NOT NULL,
    "turn_index" INTEGER NOT NULL,
    "drawer_id" TEXT NOT NULL,
    "drawer_name" TEXT NOT NULL,
    "word" TEXT NOT NULL,
    "canvas_data" TEXT NOT NULL,
    "guessers" JSONB NOT NULL,

    CONSTRAINT "drawnix_turns_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "drawnix_turns" ADD CONSTRAINT "drawnix_turns_history_id_fkey" FOREIGN KEY ("history_id") REFERENCES "drawnix_history"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
