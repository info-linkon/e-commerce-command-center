import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import fs from "fs";
import { componentTagger } from "lovable-tagger";

// Plugin: emit version.json with a unique build hash for client cache busting
function versionPlugin(): Plugin {
  const version = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return {
    name: "emit-version-json",
    apply: "build",
    generateBundle() {
      this.emitFile({
        type: "asset",
        fileName: "version.json",
        source: JSON.stringify({ version, builtAt: new Date().toISOString() }),
      });
    },
    closeBundle() {
      // Also write to public for dev preview parity (optional)
      try {
        const publicDir = path.resolve(__dirname, "public");
        if (fs.existsSync(publicDir)) {
          fs.writeFileSync(
            path.join(publicDir, "version.json"),
            JSON.stringify({ version, builtAt: new Date().toISOString() }),
          );
        }
      } catch {}
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), mode === "development" && componentTagger(), versionPlugin()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
