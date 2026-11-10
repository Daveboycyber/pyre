import { createFileRoute } from "@tanstack/react-router";
import { StatsPage } from "@/components/stats/stats-page";

export const Route = createFileRoute("/stats")({
  head: () => ({
    meta: [
      { title: "Stats · Pyre" },
      {
        name: "description",
        content:
          "Live Pyre usage on Robinhood Chain: wallets, batch cleans and the tokens burned or swept, read from on-chain events.",
      },
    ],
  }),
  component: Stats,
});

function Stats() {
  return <StatsPage />;
}
