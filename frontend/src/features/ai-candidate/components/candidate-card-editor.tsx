"use client";

import { Button } from "@/shared/ui/button";
import { Label } from "@/shared/ui/label";
import { Textarea } from "@/shared/ui/textarea";

interface CandidateCardEditorProps {
  candidateId: number;
  question: string;
  answer: string;
  explanation: string;
  onQuestionChange: (value: string) => void;
  onAnswerChange: (value: string) => void;
  onExplanationChange: (value: string) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
}

/**
 * AI 候補の編集フォーム。問題文・回答・補足を編集し、保存/キャンセルする。
 * 状態は親 (CandidateCard) が保持し、採用時の送信内容と共有する。
 */
export function CandidateCardEditor({
  candidateId,
  question,
  answer,
  explanation,
  onQuestionChange,
  onAnswerChange,
  onExplanationChange,
  onSave,
  onCancel,
  saving,
}: CandidateCardEditorProps) {
  return (
    <div className="space-y-3 pb-[env(safe-area-inset-bottom)]">
      <div className="space-y-1.5">
        <Label
          htmlFor={`candidate-${candidateId}-question`}
          className="text-xs text-muted-foreground"
        >
          問題文
        </Label>
        <Textarea
          id={`candidate-${candidateId}-question`}
          value={question}
          onChange={(e) => onQuestionChange(e.target.value)}
          rows={2}
          className="min-h-20"
        />
      </div>
      <div className="space-y-1.5">
        <Label
          htmlFor={`candidate-${candidateId}-answer`}
          className="text-xs text-muted-foreground"
        >
          回答
        </Label>
        <Textarea
          id={`candidate-${candidateId}-answer`}
          value={answer}
          onChange={(e) => onAnswerChange(e.target.value)}
          rows={2}
          className="min-h-20"
        />
      </div>
      <div className="space-y-1.5">
        <Label
          htmlFor={`candidate-${candidateId}-explanation`}
          className="text-xs text-muted-foreground"
        >
          補足説明 (任意)
        </Label>
        <Textarea
          id={`candidate-${candidateId}-explanation`}
          value={explanation}
          onChange={(e) => onExplanationChange(e.target.value)}
          rows={3}
          placeholder="[分野タグ] 自分が思い出しやすい具体例など"
        />
      </div>
      <div className="flex gap-2">
        <Button
          type="button"
          size="touch"
          onClick={onSave}
          disabled={saving}
        >
          保存
        </Button>
        <Button
          type="button"
          size="touch"
          variant="outline"
          onClick={onCancel}
        >
          キャンセル
        </Button>
      </div>
    </div>
  );
}
