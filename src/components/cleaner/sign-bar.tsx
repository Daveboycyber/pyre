import { Flame } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatFeeEth } from "@/lib/web3/fees";
import { WIF_FEE_LABEL } from "@/lib/web3/wif";

function signLabel(
  actions: number,
  feeWei: bigint,
  waived: boolean,
  preferWif: boolean,
) {
  const lines = `${actions} action${actions === 1 ? "" : "s"}`;
  if (actions === 0) return "Select something to clean";
  if (waived) return `Sign ${lines} · fee waived`;
  if (feeWei > 0n && preferWif) return `Sign ${lines} · ${WIF_FEE_LABEL}`;
  if (feeWei > 0n) return `Sign ${lines} · ${formatFeeEth(feeWei)}`;
  return `Sign ${lines} · free`;
}

export function SignBar({
  actions,
  feeWei,
  waived,
  preferWif = false,
  onSign,
}: Readonly<{
  actions: number;
  feeWei: bigint;
  waived: boolean;
  preferWif?: boolean;
  onSign: () => void;
}>) {
  return (
    <div className="sticky bottom-0 -mx-5 border-t border-border bg-background/95 px-5 py-4 backdrop-blur">
      <Button size="lg" className="w-full" onClick={onSign} disabled={actions <= 0}>
        <Flame />
        {signLabel(actions, feeWei, waived, preferWif)}
      </Button>
    </div>
  );
}
