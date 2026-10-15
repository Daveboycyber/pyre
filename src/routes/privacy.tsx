import { createFileRoute } from "@tanstack/react-router";
import { PrivacyPage } from "@/components/legal/privacy-page";

export const Route = createFileRoute("/privacy")({ component: Privacy });

function Privacy() {
  return <PrivacyPage />;
}
