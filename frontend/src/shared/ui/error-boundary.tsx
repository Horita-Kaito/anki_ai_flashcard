"use client";

import { Component } from "react";
import type { ErrorInfo, ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error("[ErrorBoundary]", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-background px-4">
          <div className="w-full max-w-md space-y-6 text-center">
            <h1 className="text-2xl font-bold text-foreground">
              エラーが発生しました
            </h1>
            <p className="text-sm text-muted-foreground">
              予期しないエラーが発生しました。ページを再読み込みするか、ホームに戻ってください。
            </p>
            <div className="flex flex-col items-center gap-3">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="inline-flex min-h-11 items-center justify-center rounded-md bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                再読み込み
              </button>
              {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- Error Boundary must avoid React-dependent navigation */}
              <a
                href="/"
                className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
              >
                ホームに戻る
              </a>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
