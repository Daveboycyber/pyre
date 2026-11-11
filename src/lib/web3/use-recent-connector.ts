import { useEffect, useState } from "react";
import { useAccount, useConfig, useConnect } from "wagmi";

/**
 * The wallet this browser connected with last (wagmi keeps its id in storage),
 * if it is still installed. Re-read on every connection change.
 */
export function useRecentConnector() {
  const config = useConfig();
  const { connectors } = useConnect();
  const { status } = useAccount();
  const [id, setId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.resolve(config.storage?.getItem("recentConnectorId"))
      .then((value) => {
        if (!cancelled) setId(value ?? null);
      })
      .catch(() => {
        // Storage blocked: no recent wallet to suggest.
      });
    return () => {
      cancelled = true;
    };
  }, [config, status]);

  return connectors.find((c) => c.id === id) ?? null;
}
