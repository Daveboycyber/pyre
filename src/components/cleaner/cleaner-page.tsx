import { ConnectCard } from "@/components/cleaner/connect-card";
import { DemoBanner } from "@/components/cleaner/demo-banner";
import { LastRunNotice } from "@/components/cleaner/last-run-notice";
import { Notice } from "@/components/cleaner/notice";
import { ResultPanel } from "@/components/cleaner/result-panel";
import { ReviewPanel } from "@/components/cleaner/review-panel";
import { ScanningCard } from "@/components/cleaner/scanning-card";
import { SigningPanel } from "@/components/cleaner/signing-panel";
import { Stepper } from "@/components/cleaner/stepper";
import { stepIndex } from "@/components/cleaner/steps";
import { useCleanToasts } from "@/components/cleaner/use-clean-toasts";
import { SiteHeader } from "@/components/layout/site-header";
import { Button } from "@/components/ui/button";
import { WalletDialog } from "@/components/wallet/wallet-dialog";
import { useWalletCleaner } from "@/lib/web3/use-wallet-cleaner";

export function CleanerPage() {
  const {
    connected,
    demo,
    status,
    lastClean,
    scanError,
    previousClean,
    setOpen,
    enterDemo,
    runScan,
    dismissPreviousClean,
  } = useWalletCleaner();
  useCleanToasts(lastClean, demo);

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <SiteHeader />
      <main className="mx-auto flex max-w-lg flex-col gap-5 px-5 py-6">
        <Stepper current={stepIndex(status, connected)} />
        {demo ? <DemoBanner /> : null}

        {status === "idle" && !connected ? (
          <ConnectCard onConnect={() => setOpen(true)} onDemo={enterDemo} />
        ) : null}

        {previousClean && !lastClean && (status === "ready" || status === "scanning") ? (
          <LastRunNotice saved={previousClean} onDismiss={dismissPreviousClean} />
        ) : null}

        {status === "scanning" ? <ScanningCard /> : null}

        {scanError ? (
          <Notice
            tone="error"
            title="Scan failed"
            actions={
              <Button size="sm" onClick={() => void runScan()}>
                Try again
              </Button>
            }
          >
            {scanError}
          </Notice>
        ) : null}

        {status === "ready" ? <ReviewPanel /> : null}
        {status === "signing" ? <SigningPanel /> : null}
        {status === "done" && lastClean ? <ResultPanel result={lastClean} /> : null}

        <WalletDialog />
      </main>
    </div>
  );
}
