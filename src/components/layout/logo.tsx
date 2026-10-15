import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <svg viewBox="0 0 32 32" aria-hidden="true" className="size-6 shrink-0">
        <rect width="32" height="32" rx="7" fill="#1C1C1C" />
        <path
          fill="#CCFF00"
          d="M16 5c5 7.4 9 11 9 16.4A9 9 0 1 1 7 21.4C7 16 11 12.4 16 5z"
        />
      </svg>
      <span className="text-[15px] font-medium tracking-tight">Pyre</span>
    </span>
  );
}
