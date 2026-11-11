import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import {
  ArrowLeftRight,
  Check,
  ChevronDown,
  Copy,
  ExternalLink,
  LogOut,
  PlusCircle,
  TriangleAlert,
  Wallet,
} from "lucide-react";
import { useState } from "react";
import { erc20Abi, formatEther } from "viem";
import { useAccount, useBalance, useReadContract, useSwitchChain, useWatchAsset } from "wagmi";
import { cn } from "@/lib/utils";
import { notify } from "@/lib/notify";
import { explorerAddressUrl } from "@/lib/web3/blockscout";
import { robinhoodChain } from "@/lib/web3/chain";
import { shortAddress, useWalletCleaner } from "@/lib/web3/use-wallet-cleaner";
import { formatWif, WIF_ADDRESS } from "@/lib/web3/wif";

function formatEth(wei: bigint) {
  const n = Number(formatEther(wei));
  if (n === 0) return "0";
  if (n < 0.0001) return "<0.0001";
  return n.toLocaleString("en-US", { maximumFractionDigits: 4 });
}

const itemClass =
  "flex h-10 cursor-pointer items-center gap-2.5 rounded-md px-2.5 text-sm text-foreground outline-none select-none data-[highlighted]:bg-background data-[disabled]:cursor-default data-[disabled]:opacity-60";

/**
 * Connected wallet control: an address chip that opens a menu with the
 * wallet, network, balances and the Disconnect action.
 */
export function WalletMenu({
  className,
  onAction,
}: Readonly<{ className?: string; onAction?: () => void }>) {
  const { address, demo, credits, disconnect } = useWalletCleaner();
  const { connector, chainId } = useAccount();
  const { switchChainAsync, isPending: switching } = useSwitchChain();
  const { watchAssetAsync } = useWatchAsset();
  const [copied, setCopied] = useState(false);
  const [wifAdded, setWifAdded] = useState(false);

  const live = !demo && Boolean(address);
  const wrongNetwork = live && chainId !== undefined && chainId !== robinhoodChain.id;
  const eth = useBalance({
    address,
    chainId: robinhoodChain.id,
    query: { enabled: live, refetchInterval: 15_000 },
  });
  const wif = useReadContract({
    address: WIF_ADDRESS,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    chainId: robinhoodChain.id,
    query: { enabled: live, refetchInterval: 15_000 },
  });

  if (!address) return null;
  const walletName = demo ? "Demo wallet" : (connector?.name ?? "Wallet");

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      notify.error("Could not copy the address.");
    }
  };

  const switchNetwork = async () => {
    try {
      await switchChainAsync({ chainId: robinhoodChain.id });
    } catch {
      notify.error("Network not switched.", { description: "Approve the switch to Robinhood Chain in your wallet." });
    }
  };

  const addWif = async () => {
    try {
      const ok = await watchAssetAsync({ type: "ERC20", options: { address: WIF_ADDRESS, symbol: "WIF", decimals: 18 } });
      if (ok) setWifAdded(true);
    } catch {
      notify.error("$WIF was not added.", { description: "Your wallet declined or does not support adding tokens." });
    }
  };

  return (
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          aria-label={`${walletName} ${address}, open wallet menu`}
          className={cn(
            "group inline-flex h-10 items-center gap-2 rounded-full bg-card/70 pr-3 pl-2 text-sm shadow-[var(--shadow-border)] transition-[background-color,box-shadow] duration-200",
            "hover:shadow-[var(--shadow-border-hover)] data-[state=open]:shadow-[var(--shadow-border-hover)]",
            "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
            className,
          )}
        >
          {connector?.icon && !demo ? (
            <img src={connector.icon} alt="" className="size-5 rounded-sm" />
          ) : (
            <span className="flex size-5 items-center justify-center rounded-full bg-primary/15 text-primary">
              <Wallet className="size-3" />
            </span>
          )}
          {demo ? (
            <span className="rounded-full bg-primary/15 px-1.5 py-px text-[10px] font-medium text-primary uppercase">
              Demo
            </span>
          ) : null}
          <span className="font-mono text-xs">{shortAddress(address)}</span>
          {wrongNetwork ? (
            <TriangleAlert className="size-3.5 text-amber-400" aria-label="Wrong network" />
          ) : (
            <span className="size-2 rounded-full bg-primary" aria-hidden />
          )}
          <ChevronDown className="size-3.5 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          collisionPadding={16}
          className="z-50 w-[min(20rem,calc(100vw-2rem))] rounded-2xl bg-surface p-2 text-foreground shadow-[var(--shadow-border),0_16px_40px_rgb(0_0_0/0.45)] data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
        >
          <div className="flex items-center gap-3 px-2.5 pt-2 pb-3">
            <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-background">
              {connector?.icon && !demo ? (
                <img src={connector.icon} alt="" className="size-6" />
              ) : (
                <Wallet className="size-4 text-primary" />
              )}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{walletName}</p>
              <p className="font-mono text-xs text-muted-foreground" title={address}>
                {shortAddress(address)}
              </p>
            </div>
            <span
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px]",
                wrongNetwork ? "bg-amber-400/10 text-amber-400" : "bg-primary/10 text-primary",
              )}
            >
              <span className={cn("size-1.5 rounded-full", wrongNetwork ? "bg-amber-400" : "bg-primary")} />
              {wrongNetwork ? "Wrong network" : "Chain 4663"}
            </span>
          </div>

          {wrongNetwork ? (
            <DropdownMenu.Item
              className={cn(itemClass, "mb-1 bg-amber-400/10 text-amber-300 data-[highlighted]:bg-amber-400/15")}
              disabled={switching}
              onSelect={(e) => {
                e.preventDefault();
                void switchNetwork();
              }}
            >
              <ArrowLeftRight className="size-4" />
              {switching ? "Check your wallet…" : "Switch to Robinhood Chain"}
            </DropdownMenu.Item>
          ) : null}

          <DropdownMenu.Separator className="mx-1 my-1 h-px bg-border" />
          <DropdownMenu.Label className="px-2.5 pt-2 pb-1 text-[11px] tracking-wide text-muted-foreground uppercase">
            Assets
          </DropdownMenu.Label>
          {demo ? (
            <p className="px-2.5 pb-2 text-xs text-muted-foreground">
              Demo mode reads nothing and signs nothing.
            </p>
          ) : (
            <ul className="flex flex-col gap-1 px-1 pb-2">
              <AssetRow mark="Ξ" name="ETH" note="Pays gas" value={eth.data ? formatEth(eth.data.value) : null} />
              <AssetRow
                mark="W"
                name="$WIF"
                note="Pays the Pyre fee"
                value={wif.data !== undefined ? formatWif(wif.data).replace(" $WIF", "") : null}
                accent
              />
              <AssetRow
                mark="★"
                name="Credits"
                note="Each waives one batch fee"
                value={String(credits)}
              />
            </ul>
          )}

          <DropdownMenu.Separator className="mx-1 my-1 h-px bg-border" />
          <DropdownMenu.Item
            className={itemClass}
            onSelect={(e) => {
              e.preventDefault();
              void copy();
            }}
          >
            {copied ? <Check className="size-4 text-primary" /> : <Copy className="size-4 text-muted-foreground" />}
            {copied ? "Address copied" : "Copy address"}
          </DropdownMenu.Item>
          {!demo ? (
            <>
              <DropdownMenu.Item asChild className={itemClass}>
                <a href={explorerAddressUrl(address)} target="_blank" rel="noreferrer">
                  <ExternalLink className="size-4 text-muted-foreground" />
                  View on explorer
                </a>
              </DropdownMenu.Item>
              <DropdownMenu.Item
                className={itemClass}
                disabled={wifAdded}
                onSelect={(e) => {
                  e.preventDefault();
                  void addWif();
                }}
              >
                {wifAdded ? <Check className="size-4 text-primary" /> : <PlusCircle className="size-4 text-muted-foreground" />}
                {wifAdded ? "$WIF added to your wallet" : "Add $WIF to your wallet"}
              </DropdownMenu.Item>
            </>
          ) : null}
          <DropdownMenu.Separator className="mx-1 my-1 h-px bg-border" />
          <DropdownMenu.Item
            className={cn(itemClass, "text-destructive data-[highlighted]:bg-destructive/10")}
            onSelect={() => {
              void disconnect();
              onAction?.();
            }}
          >
            <LogOut className="size-4" />
            {demo ? "Exit demo" : "Disconnect"}
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

function AssetRow({
  mark,
  name,
  note,
  value,
  accent,
}: Readonly<{ mark: string; name: string; note: string; value: string | null; accent?: boolean }>) {
  return (
    <li className="flex items-center gap-3 rounded-md px-1.5 py-1.5">
      <span
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
          accent ? "bg-primary/15 text-primary" : "bg-background text-muted-foreground",
        )}
        aria-hidden
      >
        {mark}
      </span>
      <span className="min-w-0 flex-1 leading-tight">
        <span className="block text-sm">{name}</span>
        <span className="block text-xs text-muted-foreground">{note}</span>
      </span>
      {value === null ? (
        <span className="h-4 w-12 animate-pulse rounded bg-background" aria-label="Loading" />
      ) : (
        <span className="font-mono text-sm tabular-nums">{value}</span>
      )}
    </li>
  );
}
