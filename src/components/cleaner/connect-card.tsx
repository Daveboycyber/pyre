import { Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";

export function ConnectCard({ onConnect, onDemo }: { readonly onConnect: () => void; readonly onDemo: () => void }) {
  return (
    <section className="flex flex-col gap-4 rounded-2xl bg-card p-5 shadow-(--shadow-border)">
      <Eyebrow>Robinhood Chain · 4663</Eyebrow>
      <h1 className="text-2xl font-medium tracking-tight">
        Clean spam without touching Stock Tokens.
      </h1>
      <p className="text-sm text-muted-foreground">
        Connect a wallet, scan junk, and burn or sweep. Locked holdings stay protected. Nothing
        moves until you sign.
      </p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button size="lg" onClick={onConnect}>
          <Wallet />
          Connect wallet
        </Button>
        <Button size="lg" variant="outline" onClick={onDemo}>
          Preview the flow
        </Button>
      </div>
    </section>
  );
}
