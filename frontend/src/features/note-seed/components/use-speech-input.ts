"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";

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

interface BrowserSpeechRecognition extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onresult: ((event: BrowserSpeechRecognitionEvent) => void) | null;
  onerror: ((event: Event) => void) | null;
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

interface UseSpeechInputResult {
  isSupported: boolean;
  isListening: boolean;
  /** 対応/未対応や録音状態に応じてトグルする。エラー時は onError を呼ぶ。 */
  toggle: () => void;
}

interface UseSpeechInputOptions {
  /** 確定した認識テキストが得られたときに呼ばれる。 */
  onResult: (transcript: string) => void;
  /** 未対応・開始失敗などのエラー通知。 */
  onError: (message: string) => void;
}

// SSR では未対応 (false) とし、クライアントで window を読む。
// useSyncExternalStore を使うことで effect 内 setState を避けつつ
// ハイドレーション不整合も防ぐ。
const emptySubscribe = () => () => {};

function getSupportSnapshot(): boolean {
  const speechWindow = window as WindowWithSpeechRecognition;
  return !!(speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition);
}

/**
 * ブラウザ音声入力 (Web Speech API) をラップするフック。
 * 対応ブラウザでのみ動作し、確定テキストを onResult で返す。
 */
export function useSpeechInput({
  onResult,
  onError,
}: UseSpeechInputOptions): UseSpeechInputResult {
  const isSupported = useSyncExternalStore(
    emptySubscribe,
    getSupportSnapshot,
    () => false
  );
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const callbacksRef = useRef({ onResult, onError });

  useEffect(() => {
    callbacksRef.current = { onResult, onError };
  });

  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
      recognitionRef.current = null;
    };
  }, []);

  function toggle() {
    if (!isSupported) {
      callbacksRef.current.onError("このブラウザは音声入力に対応していません");
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
      callbacksRef.current.onError("音声入力を開始できませんでした");
    };
    recognition.onresult = (event) => {
      let finalTranscript = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        }
      }
      const trimmed = finalTranscript.trim();
      if (trimmed) callbacksRef.current.onResult(trimmed);
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch {
      setIsListening(false);
      callbacksRef.current.onError("音声入力を開始できませんでした");
    }
  }

  return { isSupported, isListening, toggle };
}
