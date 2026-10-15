import type { ErrorComponentProps } from "@tanstack/react-router";
import { RotateCcw, TriangleAlert } from "lucide-react";

/** Route-level crash screen: plain message, ways out, details on demand. */
export function AppErrorComponent({ error, reset }: ErrorComponentProps) {
  const detail = error instanceof Error ? error.message : String(error ?? "");

  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-5 text-foreground">
      <section
        role="alert"
        className="w-full max-w-md rounded-2xl bg-card p-6 text-center shadow-[var(--shadow-border)]"
      >
        <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-destructive/15 text-destructive">
          <TriangleAlert className="size-6" />
        </span>
        <h1 className="mt-4 text-lg font-medium">Something went wrong</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This page hit an unexpected error. Your wallet and funds are not affected, and nothing was
          signed.
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={() => reset()}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-sm bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            <RotateCcw className="size-4" />
            Try again
          </button>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="inline-flex h-11 items-center justify-center rounded-sm px-4 text-sm font-medium shadow-[var(--shadow-border)] hover:bg-surface"
          >
            Reload page
          </button>
          <a
            href="/"
            className="inline-flex h-11 items-center justify-center rounded-sm px-4 text-sm text-muted-foreground hover:text-foreground"
          >
            Back to home
          </a>
        </div>
        {detail ? (
          <details className="mt-6 text-left text-xs text-muted-foreground">
            <summary className="cursor-pointer select-none">Technical details</summary>
            <pre className="mt-2 max-h-40 overflow-auto rounded-lg bg-background/60 p-3 whitespace-pre-wrap break-words">
              {detail}
            </pre>
          </details>
        ) : null}
      </section>
    </main>
  );
}
