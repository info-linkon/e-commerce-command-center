import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { toast } from "sonner";

/**
 * Lightweight version check — runs ONLY on route changes (no background polling).
 * Fetches /version.json and compares against the version captured on first load.
 * If a new build is detected, shows a toast with a "Refresh" button.
 */
export function useVersionCheck() {
  const { pathname } = useLocation();
  const initialVersionRef = useRef<string | null>(null);
  const notifiedRef = useRef(false);
  const lastCheckRef = useRef(0);

  useEffect(() => {
    // Throttle: at most one check per 30s, even if user navigates rapidly
    const now = Date.now();
    if (now - lastCheckRef.current < 30_000) return;
    lastCheckRef.current = now;

    if (notifiedRef.current) return;

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/version.json?t=${now}`, { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as { version?: string };
        if (cancelled || !data?.version) return;

        if (initialVersionRef.current === null) {
          initialVersionRef.current = data.version;
          return;
        }

        if (data.version !== initialVersionRef.current && !notifiedRef.current) {
          notifiedRef.current = true;
          toast("גרסה חדשה זמינה", {
            description: "רענן כדי לקבל את העדכון האחרון",
            duration: Infinity,
            action: {
              label: "רענן",
              onClick: () => window.location.reload(),
            },
          });
        }
      } catch {
        // silent — offline or 404; no spam
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [pathname]);
}
