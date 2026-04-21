import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Force a one-time cache purge for all users.
// Bump this key whenever you need to force every client to drop caches & reload.
const FORCE_RELOAD_KEY = "app-force-reload-v";
const FORCE_RELOAD_VERSION = "2026-04-21-1";

(async () => {
  try {
    if (localStorage.getItem(FORCE_RELOAD_KEY) === FORCE_RELOAD_VERSION) return;

    // 1. Unregister any service workers
    if ("serviceWorker" in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
    }

    // 2. Clear Cache Storage (PWA / SW caches)
    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }

    // 3. Mark done so we don't loop, then hard-reload with a cache-busting param
    localStorage.setItem(FORCE_RELOAD_KEY, FORCE_RELOAD_VERSION);
    const url = new URL(window.location.href);
    url.searchParams.set("_r", Date.now().toString());
    window.location.replace(url.toString());
  } catch {
    // If anything fails, still mark to avoid loops
    try {
      localStorage.setItem(FORCE_RELOAD_KEY, FORCE_RELOAD_VERSION);
    } catch {}
  }
})();

createRoot(document.getElementById("root")!).render(<App />);
