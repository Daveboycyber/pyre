import type { ReactNode } from "react";

/** A titled block of rows inside the review list. */
export function AssetGroup({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <div className="border-border not-first:mt-2 not-first:border-t not-first:pt-2">
      {title ? (
        <p className="px-3 py-2 text-xs tracking-wide text-muted-foreground uppercase">{title}</p>
      ) : null}
      <ul className="flex flex-col">{children}</ul>
    </div>
  );
}
