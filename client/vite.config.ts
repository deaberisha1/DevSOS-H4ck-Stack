import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The client is served from the same origin as the API in production.
// In dev we proxy /api and /socket.io to the local server so that the
// session cookie stays first-party and nothing in src/ needs a base URL.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Wait for editor/OneDrive writes to settle before transforming modules.
    // Otherwise a truncate-and-write save can briefly cache an empty CSS module.
    watch: {
      awaitWriteFinish: { stabilityThreshold: 200, pollInterval: 50 },
    },
    proxy: {
      "/api": { target: "http://localhost:3000", changeOrigin: false },
      "/socket.io": { target: "http://localhost:3000", ws: true },
    },
  },
});
