import { createFileRoute } from "@tanstack/react-router";
import { FeesPage } from "@/components/fees-page";

export const Route = createFileRoute("/fees")({ component: Fees });

function Fees() {
  return <FeesPage />;
}
