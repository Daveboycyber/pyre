import { STEPS } from "@/components/cleaner/steps";
import { cn } from "@/lib/utils";

export function Stepper({ current }: { readonly current: number }) {
  return (
    <ol className="grid grid-cols-4 gap-2" aria-label="Cleanup steps">
      {STEPS.map((label, i) => {
        let stateClass = "text-muted-foreground";
        if (i === current) {
          stateClass = "bg-primary text-primary-foreground";
        } else if (i < current) {
          stateClass = "bg-card text-foreground shadow-(--shadow-border)";
        }

        return (
          <li key={label} className={cn("rounded-md px-2 py-1.5 text-center text-xs", stateClass)}>
            {label}
          </li>
        );
      })}
    </ol>
  );
}
