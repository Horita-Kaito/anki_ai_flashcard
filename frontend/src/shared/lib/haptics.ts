/**
 * ハプティクスフィードバックのラッパー。
 * navigator.vibrate を使用し、未対応ブラウザでは何もしない。
 * 将来 user_settings.haptics_enabled で無効化可能にする。
 */

type HapticType = "light" | "medium" | "success" | "warning";

const PATTERNS: Record<HapticType, number | number[]> = {
  light: 10,
  medium: 30,
  success: 50,
  warning: [50, 50, 50],
};

export function haptic(type: HapticType = "light"): void {
  if (typeof navigator === "undefined") return;
  if (!("vibrate" in navigator)) return;
  navigator.vibrate(PATTERNS[type]);
}
