/**
 * Crypto Idea — Vite Configuration
 * Build tool for the PWA
 * 
 * Commands:
 *   npm run dev     → Local development server
 *   npm run build   → Production build to /dist
 *   npm run preview → Preview production build
 */
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "dist",
    sourcemap: false,
    minify: "terser",
    rollupOptions: {
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
  },
});
