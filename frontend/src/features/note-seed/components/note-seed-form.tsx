"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, Mic, MicOff } from "lucide-react";
import {
  useCreateNoteSeed,
  useUpdateNoteSeed,
} from "../api/note-seed-queries";
import {
  createNoteSeedSchema,
  type CreateNoteSeedInput,
} from "../schemas/note-seed-schemas";
import { useDomainTemplateList } from "@/entities/domain-template/api/domain-template-queries";
import { Button } from "@/shared/ui/button";
import { MarkdownText } from "@/shared/ui/markdown-text";
import type { NoteSeed } from "@/entities/note-seed/types";

type BodyTab = "edit" | "preview";

type SubmitAction = "save" | "save-and-generate";

interface BrowserSpeechRecognitionAlternative {
  transcript: string;
}

interface BrowserSpeechRecognitionResult {
  readonly isFinal: boolean;
  readonly 0: BrowserSpeechRecognitionAlternative;
}

interface BrowserSpeechRecognitionResultList {
  readonly length: number;
  readonly [index: number]: BrowserSpeechRecognitionResult;
}

interface BrowserSpeechRecognitionEvent extends Event {
  readonly resultIndex: number;
  readonly results: BrowserSpeechRecognitionResultList;
}

interface BrowserSpeechRecognitionErrorEvent extends Event {
  readonly error: string;
}

interface BrowserSpeechRecognition extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onresult: ((event: BrowserSpeechRecognitionEvent) => void) | null;
  onerror: ((event: BrowserSpeechRecognitionErrorEvent) => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

type BrowserSpeechRecognitionConstructor = new () => BrowserSpeechRecognition;

type WindowWithSpeechRecognition = Window &
  typeof globalThis & {
    SpeechRecognition?: BrowserSpeechRecognitionConstructor;
    webkitSpeechRecognition?: BrowserSpeechRecognitionConstructor;
  };

interface NoteSeedFormProps {
  note?: NoteSeed;
  redirectTo?: string;
  /**
   * 保存成功時のコールバック。指定時は redirectTo へのリダイレクトをスキップする。
   * 引数として作成/更新された NoteSeed を受け取る。
   */
  onSuccess?: (note: NoteSeed) => void | Promise<void>;
  /** キャンセルボタンのハンドラ。指定時は router.back() の代わりに呼ばれる。 */
  onCancel?: () => void;
  /**
   * 「保存して候補生成」アクションのハンドラ。
   * 渡された場合のみ create モードで対応ボタンが追加表示される。
   * 通常 page 側で AI 候補生成 dispatch + 遷移をハンドルする。
   */
  onSaveAndGenerate?: (note: NoteSeed) => void | Promise<void>;
  /**
   * true の時、保存後に redirect/onSuccess の代わりに本文だけ空にして
   * 同じフォームから連続でメモを書けるようにする。
   * 詳細設定 (テンプレート/サブ分野/学習目的/コンテキスト) は保持する。
   * このモードでは「保存」単体ボタンは非表示にし、「保存して候補生成」だけを残す。
   */
  shouldResetAfterSave?: boolean;
}

/**
 * メモ入力フォーム。
 * モバイル: 本文 textarea を大きく、保存ボタンは下部 sticky + safe-area。
 * PC: Cmd/Ctrl+Enter で送信。
 *
 * create モードでは onSaveAndGenerate を渡すと「保存して候補生成」ボタンが現れ、
 * shouldResetAfterSave を ON にすると保存後フォーム reset で連続作成できる。
 */
export function NoteSeedForm({
  note,
  redirectTo = "/notes",
  onSuccess,
  onCancel,
  onSaveAndGenerate,
  shouldResetAfterSave = false,
}: NoteSeedFormProps) {
  const router = useRouter();
  const createMutation = useCreateNoteSeed();
  const updateMutation = useUpdateNoteSeed(note?.id ?? 0);
  const { data: templates } = useDomainTemplateList();
  const isEdit = !!note;
  const [showAdvanced, setShowAdvanced] = useState(
    !!(note?.subdomain || note?.learning_goal || note?.note_context)
  );
  const [bodyTab, setBodyTab] = useState<BodyTab>("edit");
  const [isSpeechSupported, setIsSpeechSupported] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  // どのボタンで submit したかを onSubmit 側で判別するためのフラグ。
  // ref を使うのは render を引き起こさず、かつ submit イベントと同期させたいため。
  const submitActionRef = useRef<SubmitAction>("save");

  const showSaveAndGenerate = !isEdit && !!onSaveAndGenerate;
  const showSaveOnly = !shouldResetAfterSave;

  const {
    register,
    handleSubmit,
    control,
    getValues,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CreateNoteSeedInput>({
    resolver: zodResolver(createNoteSeedSchema),
    defaultValues: {
      body: note?.body ?? "",
      domain_template_id: note?.domain_template_id ?? null,
      subdomain: note?.subdomain ?? "",
      learning_goal: note?.learning_goal ?? "",
      note_context: note?.note_context ?? "",
    },
  });

  useEffect(() => {
    const speechWindow = window as WindowWithSpeechRecognition;
    setIsSpeechSupported(
      !!(speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition)
    );

    return () => {
      recognitionRef.current?.abort();
      recognitionRef.current = null;
    };
  }, []);

  const onSubmit = handleSubmit(async (values) => {
    const payload = {
      ...values,
      domain_template_id: values.domain_template_id || null,
    };
    const action = submitActionRef.current;
    try {
      const saved = isEdit
        ? await updateMutation.mutateAsync(payload)
        : await createMutation.mutateAsync(payload);
      toast.success(isEdit ? "メモを更新しました" : "メモを保存しました");

      if (action === "save-and-generate" && onSaveAndGenerate) {
        await onSaveAndGenerate(saved);
      } else if (onSuccess) {
        await onSuccess(saved);
      } else if (!shouldResetAfterSave) {
        router.push(redirectTo);
      }

      if (shouldResetAfterSave) {
        // 本文だけクリアし、詳細設定 (テンプレート/サブ分野/学習目的/コンテキスト) は保持。
        reset({
          body: "",
          domain_template_id: values.domain_template_id,
          subdomain: values.subdomain,
          learning_goal: values.learning_goal,
          note_context: values.note_context,
        });
        setBodyTab("edit");
        requestAnimationFrame(() => textareaRef.current?.focus());
      }
    } catch {
      toast.error("保存に失敗しました");
    } finally {
      // 次回 submit でフラグが残らないようリセット
      submitActionRef.current = "save";
    }
  });

  // PC 向け: Cmd/Ctrl+Enter で送信 (デフォルトの primary ボタン動作)
  function handleKeyDown(e: React.KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      // 連続モード時は primary が save-and-generate なのでそちらを発火
      submitActionRef.current =
        shouldResetAfterSave && showSaveAndGenerate ? "save-and-generate" : "save";
      onSubmit();
    }
  }

  const { ref: bodyRefCallback, ...bodyRegister } = register("body");
  function setBodyTextareaRef(el: HTMLTextAreaElement | null) {
    bodyRefCallback(el);
    textareaRef.current = el;
  }
  function switchBodyTab(next: BodyTab) {
    setBodyTab(next);
    if (next === "edit") {
      // hidden 解除後に focus を当てるため次フレームで実行
      requestAnimationFrame(() => textareaRef.current?.focus());
    }
  }

  function appendRecognizedText(text: string) {
    const transcript = text.trim();
    if (!transcript) return;

    const current = getValues("body") ?? "";
    const separator =
      current.trim().length === 0 || current.endsWith("\n") ? "" : "\n";

    setValue("body", `${current}${separator}${transcript}`, {
      shouldDirty: true,
      shouldValidate: true,
    });
    setBodyTab("edit");
    requestAnimationFrame(() => textareaRef.current?.focus());
  }

  function toggleSpeechInput() {
    if (!isSpeechSupported) {
      toast.error("このブラウザは音声入力に対応していません");
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const speechWindow = window as WindowWithSpeechRecognition;
    const Recognition =
      speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
    if (!Recognition) return;

    const recognition = new Recognition();
    recognition.lang = "ja-JP";
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => {
      setIsListening(false);
      toast.error("音声入力を開始できませんでした");
    };
    recognition.onresult = (event) => {
      let finalTranscript = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        }
      }
      appendRecognizedText(finalTranscript);
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch {
      setIsListening(false);
      toast.error("音声入力を開始できませんでした");
    }
  }
  const bodyValue = useWatch({ control, name: "body" });

  return (
    <form
      onSubmit={onSubmit}
      onKeyDown={handleKeyDown}
      className="space-y-5 pb-40 md:pb-0"
      noValidate
      aria-label={isEdit ? "メモ編集フォーム" : "メモ作成フォーム"}
    >
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <label htmlFor="body" className="text-sm font-medium">
            メモ本文 <span className="text-destructive">*</span>
          </label>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button
              type="button"
              variant={isListening ? "destructive" : "outline"}
              size="sm"
              onClick={toggleSpeechInput}
              disabled={!isSpeechSupported}
              aria-pressed={isListening}
              aria-label={isListening ? "音声入力を停止" : "音声入力を開始"}
              title={
                isSpeechSupported
                  ? isListening
                    ? "音声入力を停止"
                    : "音声入力を開始"
                  : "このブラウザは音声入力に対応していません"
              }
              className="min-h-9"
            >
              {isListening ? (
                <MicOff className="size-4" aria-hidden />
              ) : (
                <Mic className="size-4" aria-hidden />
              )}
              <span>{isListening ? "録音中" : "音声入力"}</span>
            </Button>
            <div
              role="tablist"
              aria-label="本文の表示モード切替"
              className="flex border rounded-md p-0.5 bg-[var(--bronze-faint)] text-xs"
            >
              <button
                type="button"
                role="tab"
                id="body-tab-edit"
                aria-selected={bodyTab === "edit"}
                aria-controls="body-panel-edit"
                tabIndex={bodyTab === "edit" ? 0 : -1}
                onClick={() => switchBodyTab("edit")}
                className={`px-3 min-h-8 rounded transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  bodyTab === "edit"
                    ? "bg-card shadow-sm font-medium"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                編集
              </button>
              <button
                type="button"
                role="tab"
                id="body-tab-preview"
                aria-selected={bodyTab === "preview"}
                aria-controls="body-panel-preview"
                tabIndex={bodyTab === "preview" ? 0 : -1}
                onClick={() => switchBodyTab("preview")}
                className={`px-3 min-h-8 rounded transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  bodyTab === "preview"
                    ? "bg-card shadow-sm font-medium"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                プレビュー
              </button>
            </div>
          </div>
        </div>
        <div
          id="body-panel-edit"
          role="tabpanel"
          aria-labelledby="body-tab-edit"
          hidden={bodyTab !== "edit"}
        >
          <textarea
            id="body"
            rows={8}
            {...bodyRegister}
            ref={setBodyTextareaRef}
            className="knowledge-text w-full border rounded-lg bg-card px-4 py-4 text-lg md:text-base min-h-[60vh] resize-y leading-relaxed shadow-sm"
            placeholder="読んだこと、聞いたこと、自分の言葉で残しておきたいことを書きます。"
            aria-invalid={!!errors.body}
            autoFocus
          />
        </div>
        <div
          id="body-panel-preview"
          role="tabpanel"
          aria-labelledby="body-tab-preview"
          hidden={bodyTab !== "preview"}
          className="knowledge-text border rounded-lg px-4 py-4 min-h-[60vh] bg-card paper-rule"
        >
          {bodyValue ? (
            <MarkdownText text={bodyValue} />
          ) : (
            <p className="text-sm text-muted-foreground italic">
              プレビューするメモがありません
            </p>
          )}
        </div>
        {errors.body && (
          <p role="alert" className="text-xs text-destructive">
            {errors.body.message}
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          Markdown 記法対応 / 音声入力は対応ブラウザのみ / PC: Cmd/Ctrl + Enter で保存
        </p>
      </div>

      <div className="space-y-1.5 rounded-lg border bg-card p-3">
        <label htmlFor="domain_template_id" className="text-sm font-medium">
          分野テンプレート
        </label>
        <select
          id="domain_template_id"
          {...register("domain_template_id", {
            setValueAs: (v) => (v === "" || v == null ? null : Number(v)),
          })}
          className="w-full border rounded-md px-3 py-2.5 text-base md:text-sm min-h-11 bg-background"
        >
          <option value="">指定しない</option>
          {templates?.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </div>

      <button
        type="button"
        onClick={() => setShowAdvanced((v) => !v)}
        className="inline-flex min-h-11 items-center gap-2 rounded-full border bg-[var(--bronze-faint)] px-3 text-sm text-muted-foreground hover:text-foreground"
        aria-expanded={showAdvanced}
        aria-controls="advanced-fields"
      >
        <ChevronDown
          className={`size-4 transition-transform ${showAdvanced ? "rotate-180" : ""}`}
          aria-hidden
        />
        詳細設定 (任意)
      </button>

      {showAdvanced && (
        <div id="advanced-fields" className="grid gap-3 rounded-lg border bg-card p-3 md:grid-cols-3">
          <div className="space-y-1.5">
            <label htmlFor="subdomain" className="text-sm font-medium">
              サブ分野
            </label>
            <input
              id="subdomain"
              type="text"
              {...register("subdomain")}
              className="w-full border rounded-md px-3 py-2.5 text-base md:text-sm min-h-11"
              placeholder="例: 設計パターン"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="learning_goal" className="text-sm font-medium">
              学習目的
            </label>
            <textarea
              id="learning_goal"
              rows={2}
              {...register("learning_goal")}
              className="w-full border rounded-md px-3 py-2.5 text-base md:text-sm resize-y"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="note_context" className="text-sm font-medium">
              補足コンテキスト
            </label>
            <textarea
              id="note_context"
              rows={2}
              {...register("note_context")}
              className="w-full border rounded-md px-3 py-2.5 text-base md:text-sm resize-y"
            />
          </div>
        </div>
      )}

      {/* モバイル: sticky 下部バー / PC: インライン */}
      <div
        className="
          fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] border-t bg-background/95 backdrop-blur z-30
          p-3 grid grid-cols-[1.6fr_1fr_auto] gap-2
          md:static md:border-0 md:bg-transparent md:backdrop-blur-0
          md:p-0 md:pb-0 md:flex md:justify-end md:flex-row-reverse
        "
      >
        {showSaveAndGenerate && (
          <Button
            type="submit"
            size="lg"
            className="min-h-12 md:min-w-56"
            disabled={isSubmitting}
            onClick={() => {
              submitActionRef.current = "save-and-generate";
            }}
          >
            {isSubmitting ? "処理中..." : "保存して候補生成"}
          </Button>
        )}
        {showSaveOnly && (
          <Button
            type="submit"
            size="lg"
            variant={showSaveAndGenerate ? "outline" : "default"}
            className="min-h-12 md:min-w-36"
            disabled={isSubmitting}
            onClick={() => {
              submitActionRef.current = "save";
            }}
          >
            {isSubmitting ? "保存中..." : isEdit ? "更新" : "保存"}
          </Button>
        )}
        <Button
          type="button"
          variant="ghost"
          size="lg"
          className="min-h-11"
          onClick={() => (onCancel ? onCancel() : router.back())}
          disabled={isSubmitting}
        >
          キャンセル
        </Button>
      </div>
    </form>
  );
}
