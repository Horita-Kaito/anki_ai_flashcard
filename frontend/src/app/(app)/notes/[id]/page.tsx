"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ChevronDown, Pencil } from "lucide-react";
import {
  NoteSeedForm,
  useNoteSeed,
  useDeleteNoteSeed,
} from "@/features/note-seed";
import { GenerateCandidatesView } from "@/features/ai-candidate";
import { Button } from "@/shared/ui/button";
import { BackHeader } from "@/shared/ui/back-header";
import { MarkdownText } from "@/shared/ui/markdown-text";

export default function NoteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const { id } = use(params);
  const noteId = Number(id);
  const { data: note, isLoading, isError } = useNoteSeed(noteId);
  const deleteMutation = useDeleteNoteSeed();
  const [editing, setEditing] = useState(false);
  const [expanded, setExpanded] = useState(false);

  async function handleDelete() {
    if (!note) return;
    if (!confirm("このメモを削除しますか?")) return;
    try {
      await deleteMutation.mutateAsync(note.id);
      toast.success("メモを削除しました");
      router.push("/notes");
    } catch {
      toast.error("削除に失敗しました");
    }
  }

  if (isLoading) {
    return (
      <main className="flex-1 flex items-center justify-center">
        <p className="text-muted-foreground">読み込み中...</p>
      </main>
    );
  }

  if (isError || !note) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center gap-4 p-4">
        <p>メモが見つかりません</p>
        <Button
          onClick={() => router.push("/notes")}
          size="lg"
          className="min-h-11"
        >
          一覧へ
        </Button>
      </main>
    );
  }

  const hasDetails =
    !!note.subdomain || !!note.learning_goal || !!note.note_context;
  const isLong = note.body.length > 80;
  const collapsible = isLong || hasDetails;

  return (
    <main className="flex-1 p-4 md:p-8">
      <div className="max-w-3xl mx-auto space-y-6 pb-8">
        <BackHeader title="メモと AI 候補" />

        {/* メモセクション */}
        <section
          aria-labelledby="memo-section"
          className="border rounded-xl p-4 md:p-5 space-y-3 bg-muted/20"
        >
          {editing ? (
            <>
              <h2 id="memo-section" className="text-sm font-medium">
                メモを編集
              </h2>
              <NoteSeedForm
                note={note}
                onSuccess={() => {
                  setEditing(false);
                  setExpanded(false);
                }}
                onCancel={() => setEditing(false)}
              />
            </>
          ) : (
            <>
              <div className="flex items-start justify-between gap-3">
                <h2
                  id="memo-section"
                  className="text-xs font-medium text-muted-foreground"
                >
                  元メモ
                </h2>
                <div className="flex gap-2">
                  {collapsible && (
                    <button
                      type="button"
                      onClick={() => setExpanded((v) => !v)}
                      className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 min-h-8"
                      aria-expanded={expanded}
                    >
                      <ChevronDown
                        className={`size-3.5 transition-transform ${
                          expanded ? "rotate-180" : ""
                        }`}
                        aria-hidden
                      />
                      {expanded ? "閉じる" : "全文"}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setEditing(true);
                      setExpanded(true);
                    }}
                    className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 min-h-8"
                  >
                    <Pencil className="size-3.5" aria-hidden />
                    編集
                  </button>
                </div>
              </div>
              {expanded || !collapsible ? (
                <MarkdownText text={note.body} />
              ) : (
                <div className="relative max-h-24 overflow-hidden">
                  <MarkdownText text={note.body} />
                  <div
                    aria-hidden
                    className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-muted/40 to-transparent"
                  />
                </div>
              )}
              {expanded && hasDetails && (
                <dl className="space-y-1 text-xs text-muted-foreground pt-1 border-t">
                  {note.subdomain && (
                    <div className="flex gap-2">
                      <dt className="font-medium shrink-0">サブ分野:</dt>
                      <dd>{note.subdomain}</dd>
                    </div>
                  )}
                  {note.learning_goal && (
                    <div className="flex gap-2">
                      <dt className="font-medium shrink-0">学習目的:</dt>
                      <dd>{note.learning_goal}</dd>
                    </div>
                  )}
                  {note.note_context && (
                    <div className="flex gap-2">
                      <dt className="font-medium shrink-0">補足:</dt>
                      <dd>{note.note_context}</dd>
                    </div>
                  )}
                </dl>
              )}
            </>
          )}
        </section>

        {/* AI 生成 + 候補一覧 (編集中は隠す) */}
        {!editing && <GenerateCandidatesView noteSeedId={noteId} />}

        {/* 危険な操作 */}
        {!editing && (
          <section
            aria-labelledby="danger-zone"
            className="border border-destructive/30 rounded-xl p-4 md:p-5 space-y-3"
          >
            <h2
              id="danger-zone"
              className="text-sm font-medium text-destructive"
            >
              危険な操作
            </h2>
            <p className="text-sm text-muted-foreground">
              このメモから生成された AI 候補もすべて削除されます (カード採用済みは残ります)。
            </p>
            <Button
              type="button"
              variant="destructive"
              size="lg"
              className="min-h-11"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "削除中..." : "メモを削除"}
            </Button>
          </section>
        )}
      </div>
    </main>
  );
}
