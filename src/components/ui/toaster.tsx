import { Toaster as Sonner } from "sonner";

/** App-wide toast host, styled to match the dark lime theme. */
export function Toaster() {
  return (
    <Sonner
      theme="dark"
      position="bottom-center"
      closeButton
      toastOptions={{
        classNames: {
          toast:
            "!bg-card !text-foreground !border-0 !shadow-[var(--shadow-border),0_20px_50px_-20px_rgb(0_0_0/0.8)] !rounded-xl",
          description: "!text-muted-foreground",
          actionButton: "!bg-primary !text-primary-foreground !font-medium",
          success: "[&_[data-icon]]:!text-primary",
          error: "[&_[data-icon]]:!text-destructive",
        },
      }}
    />
  );
}
