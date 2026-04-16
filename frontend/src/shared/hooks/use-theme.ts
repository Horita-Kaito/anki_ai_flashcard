"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";

type Theme = "light" | "dark" | "system";

const STORAGE_KEY = "theme";

function getSystemTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function getStoredTheme(): Theme {
  if (typeof window === "undefined") return "system";
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark" || stored === "system") {
      return stored;
    }
  } catch {
    // localStorage unavailable
  }
  return "system";
}

function applyTheme(theme: Theme) {
  const resolved = theme === "system" ? getSystemTheme() : theme;
  const root = document.documentElement;
  root.classList.toggle("dark", resolved === "dark");
}

// Simple pub/sub for external store
let listeners: Array<() => void> = [];
function emitChange() {
  for (const listener of listeners) {
    listener();
  }
}

function subscribe(listener: () => void) {
  listeners = [...listeners, listener];
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}

function getSnapshot(): Theme {
  return getStoredTheme();
}

function getServerSnapshot(): Theme {
  return "system";
}

/**
 * Theme management hook.
 * Manages "light" | "dark" | "system" state, syncs with localStorage
 * and document.documentElement.classList.
 */
export function useTheme() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setTheme = useCallback((next: Theme) => {
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // localStorage unavailable
    }
    applyTheme(next);
    emitChange();
  }, []);

  // Apply theme on mount and listen for system preference changes
  useEffect(() => {
    applyTheme(theme);

    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      // Only re-apply if user chose "system"
      if (getStoredTheme() === "system") {
        applyTheme("system");
        emitChange();
      }
    };
    mql.addEventListener("change", handleChange);
    return () => mql.removeEventListener("change", handleChange);
  }, [theme]);

  const resolvedTheme: "light" | "dark" =
    theme === "system" ? getSystemTheme() : theme;

  return { theme, resolvedTheme, setTheme } as const;
}
