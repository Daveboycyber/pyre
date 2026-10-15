import { useSyncExternalStore } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { TONES } from "@/components/feedback/tones";
import { Button } from "@/components/ui/button";
import { dialogStore } from "@/lib/dialogs";
import { cn } from "@/lib/utils";

/** Renders whichever Pyre modal is open via confirmDialog / alertDialog. */
export function DialogHost() {
  const req = useSyncExternalStore(dialogStore.subscribe, dialogStore.get, () => null);
  const tone = TONES[req?.tone ?? "info"];
  const Icon = tone.icon;

  return (
    <DialogPrimitive.Root
      open={Boolean(req)}
      onOpenChange={(open) => !open && dialogStore.close(false)}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        {req ? (
          <DialogPrimitive.Content
            className={cn(
              "fixed top-1/2 left-1/2 z-50 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[22px] bg-[#1f1f1f] p-6 text-foreground",
              "shadow-[0_40px_100px_-30px_rgb(0_0_0/0.9)] duration-200",
              "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
              tone.ring,
            )}
          >
            <span
              aria-hidden="true"
              className={cn(
                "absolute -top-16 left-1/2 size-40 -translate-x-1/2 rounded-full blur-3xl",
                tone.glow,
              )}
            />
            <div className="relative flex flex-col items-center text-center">
              <span
                className={cn("flex size-12 items-center justify-center rounded-2xl", tone.tile)}
              >
                <Icon className="size-6" />
              </span>
              <DialogPrimitive.Title className="mt-4 text-lg font-medium tracking-tight">
                {req.title}
              </DialogPrimitive.Title>
              {req.description ? (
                <DialogPrimitive.Description className="mt-1.5 text-sm text-muted-foreground">
                  {req.description}
                </DialogPrimitive.Description>
              ) : (
                <DialogPrimitive.Description className="sr-only">
                  {req.title}
                </DialogPrimitive.Description>
              )}
            </div>

            {req.details && req.details.length > 0 ? (
              <dl className="relative mt-5 space-y-1.5 rounded-xl bg-background/50 p-3 text-sm">
                {req.details.map((d) => (
                  <div key={d.label} className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">{d.label}</dt>
                    <dd className="font-mono tabular-nums">{d.value}</dd>
                  </div>
                ))}
              </dl>
            ) : null}

            <div className="relative mt-6 flex flex-col-reverse gap-2 sm:flex-row">
              {req.cancelLabel ? (
                <Button
                  variant="outline"
                  className="w-full sm:w-auto sm:flex-1"
                  onClick={() => dialogStore.close(false)}
                >
                  {req.cancelLabel}
                </Button>
              ) : null}
              <Button
                autoFocus
                variant={req.tone === "error" ? "destructive" : "default"}
                className="w-full sm:w-auto sm:flex-1"
                onClick={() => dialogStore.close(true)}
              >
                {req.confirmLabel}
              </Button>
            </div>
          </DialogPrimitive.Content>
        ) : null}
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
