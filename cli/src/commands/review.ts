import { createInterface } from "node:readline/promises";
import { apiRequest } from "../api.js";
import { hasCloze, maskCloze, revealCloze } from "../cloze.js";

interface ReviewOptions {
  deck?: string;
  limit: string;
}

interface DueCard {
  id: number;
  question: string;
  answer: string;
  explanation: string | null;
}

interface TodayResponse {
  data: {
    total_due: number;
    new_count: number;
    review_count: number;
    cards: DueCard[];
  };
}

const RATINGS = {
  "1": "again",
  "2": "hard",
  "3": "good",
  "4": "easy",
} as const;

export async function reviewCommand(options: ReviewOptions): Promise<void> {
  const query = new URLSearchParams({ limit: options.limit });
  if (options.deck) {
    query.set("deck_id", options.deck);
  }

  const res = await apiRequest<TodayResponse>(`/review-sessions/today?${query}`);
  const { cards, total_due } = res.data;

  if (cards.length === 0) {
    console.log("今日の復習対象はありません。");
    return;
  }

  console.log(`復習対象: ${total_due} 枚\n`);

  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const counts = { again: 0, hard: 0, good: 0, easy: 0 };

  try {
    for (const [index, card] of cards.entries()) {
      const shownAt = Date.now();
      console.log(`[${index + 1}/${cards.length}] Q: ${maskCloze(card.question)}`);
      await rl.question("(Enter で答えを表示) ");
      if (hasCloze(card.question)) {
        console.log(`→ ${revealCloze(card.question)}`);
      }
      console.log(`A: ${card.answer}`);
      if (card.explanation) {
        console.log(`解説: ${card.explanation}`);
      }

      let rating: (typeof RATINGS)[keyof typeof RATINGS] | undefined;
      while (!rating) {
        const key = (
          await rl.question("評価 [1=もう一度 2=難しい 3=普通 4=簡単 q=終了]: ")
        ).trim();
        if (key === "q") {
          console.log("\n中断しました。");
          printSummary(counts);
          return;
        }
        rating = RATINGS[key as keyof typeof RATINGS];
      }

      await apiRequest("/review-sessions/answer", {
        method: "POST",
        body: {
          card_id: card.id,
          rating,
          response_time_ms: Date.now() - shownAt,
        },
      });
      counts[rating]++;
      console.log("");
    }

    console.log("今日の復習が完了しました!");
    printSummary(counts);
  } finally {
    rl.close();
  }
}

function printSummary(counts: Record<string, number>): void {
  console.log(
    `結果: もう一度 ${counts.again} / 難しい ${counts.hard} / 普通 ${counts.good} / 簡単 ${counts.easy}`
  );
}
