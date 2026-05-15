"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { NoteSeedForm } from "@/features/note-seed";
import { generateCandidates } from "@/features/ai-candidate/api/endpoints";
import { aiCandidateKeys } from "@/features/ai-candidate/api/ai-candidate-queries";
import { noteSeedKeys } from "@/entities/note-seed/api/note-seed-queries";
import type { NoteSeed } from "@/entities/note-seed/types";

/**
 * /notes/new ページの Client 部。
 *
 * - 「続けて作成」トグル: ON 中はメモ保存後にフォームを reset して同画面に留まり、
 *   詳細設定 (テンプレート/サブ分野等) を引き継いだまま連続でメモを書ける。
 *   この時は「保存」単独ボタンを隠し、必ず「保存して候補生成」経由で保存される
 *   (= 連続作成の意義は AI 候補をどんどん溜めることなので、生成セットを省略させない)。
 * - 「保存して候補生成」ボタン: メモ保存直後に AI 候補生成ジョブを dispatch する。
 *   連続モード OFF なら候補レビュー画面 (/notes/{id}) に遷移、ON ならフォーム reset。
 *
 * 非同期ジョブのため候補は裏で生成される。完了通知は /notes/{id} 側の polling に任せる。
 */
export function NewNotePageClient() {
  const router = useRouter();
  const qc = useQueryClient();
  const [isContinuousMode, setIsContinuousMode] = useState(false);

  async function dispatchGeneration(note: NoteSeed): Promise<void> {
    try {
      await generateCandidates(note.id, {});
      // 生成 status は note 詳細画面で polling されるため、ここでは
      // メモ一覧側の generation バッジ更新だけ最低限引き起こす。
      qc.invalidateQueries({
        queryKey: aiCandidateKeys.generationStatus(note.id),
      });
      qc.invalidateQueries({ queryKey: noteSeedKeys.all });
    } catch {
      // 保存自体は成功しているので失敗してもメモは残る旨を伝える
      toast.error("候補生成の開始に失敗しました。あとで再試行してください");
      throw new Error("dispatch failed");
    }
  }

  async function handleSaveAndGenerate(note: NoteSeed): Promise<void> {
    try {
      await dispatchGeneration(note);
    } catch {
      // 失敗時は遷移しない (メモは保存済み)
      if (!isContinuousMode) {
        router.push(`/notes/${note.id}`);
      }
      return;
    }

    if (isContinuousMode) {
      toast.success("候補生成を開始しました。続けてメモを書いてください");
      // フォーム reset は NoteSeedForm 側で行う
    } else {
      toast.success("候補生成を開始しました");
      router.push(`/notes/${note.id}`);
    }
  }

  async function handleSaveOnly(): Promise<void> {
    // 連続モード OFF かつ「保存」ボタン経由のとき。
    // 連続モード ON では「保存」単独ボタンが出ないのでこの分岐に来ない。
    router.push("/notes");
  }

  return (
    <div className="space-y-5">
      <label
        className="
          flex items-start gap-3 p-3 border rounded-md cursor-pointer
          bg-muted/30 hover:bg-muted/50 transition-colors
          min-h-11
          has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-offset-2
        "
      >
        <input
          type="checkbox"
          checked={isContinuousMode}
          onChange={(e) => setIsContinuousMode(e.target.checked)}
          className="mt-1 size-4 accent-primary focus-visible:outline-none"
          aria-describedby="continue-mode-desc"
        />
        <span className="text-sm">
          <span className="font-medium">続けて作成モード</span>
          <span
            id="continue-mode-desc"
            className="block text-xs text-muted-foreground mt-0.5"
          >
            保存後にフォームを空にして連続でメモを書けます。詳細設定 (テンプレート等)
            は引き継がれます。このモードでは「保存して候補生成」だけが有効です。
          </span>
        </span>
      </label>

      <NoteSeedForm
        onSuccess={handleSaveOnly}
        onSaveAndGenerate={handleSaveAndGenerate}
        shouldResetAfterSave={isContinuousMode}
      />
    </div>
  );
}
