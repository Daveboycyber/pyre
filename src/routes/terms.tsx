import { createFileRoute } from "@tanstack/react-router";
import { TermsPage } from "@/components/legal/terms-page";

export const Route = createFileRoute("/terms")({ component: Terms });

function Terms() {
  return <TermsPage />;
}
