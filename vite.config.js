/**
 * CryptoIdea — Vite Configuration
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

// In dev, map clean routes to their HTML entry. Firebase Hosting does the same
// via rewrites in production.
//   /app, /edge, /pro-success → app.html (React tracker)
//   /admin                     → admin.html (separate admin app)
// (The free DCA calculator is a section of the landing, index.html#dca — not its own page.)
const appRoutes = ["/app", "/edge", "/pro-success"];
const cleanUrlsDev = {
  name: "clean-urls-dev",
  configureServer(server) {
    server.middlewares.use((req, _res, next) => {
      const [path, query] = (req.url || "").split("?");
      if (appRoutes.includes(path)) req.url = "/app.html" + (query ? "?" + query : "");
      else if (path === "/admin") req.url = "/admin.html" + (query ? "?" + query : "");
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
        admin: r("./admin.html"),
        privacy: r("./privacy.html"),
        terms: r("./terms.html"),
      },
      output: {
        // Split big, rarely-changing deps into their own chunks so they load in
        // parallel and stay cached across deploys (your app code changes far more
        // often than the React/Firebase SDKs do).
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          if (id.includes("@firebase") || id.includes("/firebase/")) return "firebase";
          return "vendor"; // react, react-dom, and the rest
        },
      },
    },
  },
  server: {
    // Honor a PORT override (e.g. a second instance / preview runner) and only
    // auto-open a browser for the default local dev run.
    port: process.env.PORT ? Number(process.env.PORT) : 3000,
    open: !process.env.PORT,
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
  // Vitest unit tests (component/hook regression net). Scoped to tests/unit/ so it
  // never picks up the node:test files in tests/ (firestore-rules, data-layer).
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./tests/unit/setup.js",
    include: ["tests/unit/**/*.test.{js,jsx}"],
  },
});
