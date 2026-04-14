import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default function HomePage() {
  return (
    <main className="flex-1 flex flex-col items-center justify-center p-8 gap-8">
      <div className="text-center space-y-4 max-w-2xl">
        <h1 className="text-4xl font-bold tracking-tight">
          Anki AI Flashcard
        </h1>
        <p className="text-lg text-muted-foreground">
          AI策問補助付きフラッシュカードアプリ。
          <br />
          メモからAIがカード候補を生成し、間隔反復で記憶定着を支援します。
        </p>
      </div>
      <div className="flex gap-4">
        <Link href="/login" className={buttonVariants({ size: "lg" })}>
          ログイン
        </Link>
        <Link
          href="/register"
          className={buttonVariants({ variant: "outline", size: "lg" })}
        >
          新規登録
        </Link>
      </div>
    </main>
  );
}
