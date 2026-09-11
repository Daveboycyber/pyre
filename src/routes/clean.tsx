import { createFileRoute } from "@tanstack/react-router";
import { CleanerPage } from "@/components/cleaner/cleaner-page";

export const Route = createFileRoute("/clean")({ component: Clean });

function Clean() {
  return <CleanerPage />;
}
