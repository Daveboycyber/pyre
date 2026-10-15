import { BadgeCheck, Ban, Lock, ReceiptText } from "lucide-react";

const ITEMS = [
  {
    icon: ReceiptText,
    title: "Never more than you saw",
    body: "The fee is read from the contract at sign time. If it is higher than the review screen showed, Pyre stops instead of charging more.",
  },
  {
    icon: Ban,
    title: "No fee, no burns",
    body: "If the batch fee does not go through, no line runs and nothing is charged.",
  },
  {
    icon: Lock,
    title: "No cut of your holdings",
    body: "Pyre never takes a share of your tokens or Stock Tokens. Stock Tokens are locked and never burned.",
  },
  {
    icon: BadgeCheck,
    title: "Everything on-chain",
    body: "Fees go to a public treasury through an open-source contract whose bytecode matches this repo. Anyone can audit every payment.",
  },
];

export function Guarantees() {
  return (
    <div className="grid gap-x-8 gap-y-6 sm:grid-cols-2">
      {ITEMS.map(({ icon: Icon, title, body }) => (
        <div key={title} className="flex gap-3">
          <Icon className="mt-0.5 size-5 shrink-0 text-primary" strokeWidth={1.75} />
          <div>
            <h3 className="text-sm font-medium">{title}</h3>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{body}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
