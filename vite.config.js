/**
 * Crypto Idea — Vite Configuration
 *
 * Multi-page setup:
 *   index.html  → static marketing landing ("/")
 *   app.html    → the React tracker (served for /app, /edge, /pro-success)
 *
 * Commands:
 *   npm run dev     → Local dev server
 *   npm run build   → Production build to /dist
 *   npm run preview → Preview production build
 */
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

const r = (p) => fileURLToPath(new URL(p, import.meta.url));

// In dev, map the clean app routes to the React entry (app.html) so they load
// the tracker. Firebase Hosting does the same via rewrites in production.
const appRoutes = ["/app", "/edge", "/pro-success"];
const cleanUrlsDev = {
  name: "clean-urls-dev",
  configureServer(server) {
    server.middlewares.use((req, _res, next) => {
      const [path, query] = (req.url || "").split("?");
      if (appRoutes.includes(path)) {
        req.url = "/app.html" + (query ? "?" + query : "");
      }
      next();
    });
  },
};

export default defineConfig({
  plugins: [react(), cleanUrlsDev],
  build: {
    outDir: "dist",
    sourcemap: false,
    minify: "terser",
    rollupOptions: {
      input: {
        main: r("./index.html"),
        app: r("./app.html"),
      },
      output: {
        manualChunks: {
          vendor: ["react", "react-dom"],
        },
      },
    },
  },
  server: {
    port: 3000,
    open: true,
    // Forward /api/* to the local Functions emulator (the CoinGecko proxy).
    // In production, Firebase Hosting rewrites /api/** to the same function.
    proxy: {
      "/api": {
        target: "http://127.0.0.1:5001",
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api/, "/demo-crypto-idea/us-central1/api"),
      },
    },
  },
});
