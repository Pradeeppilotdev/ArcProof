import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { nodePolyfills } from "vite-plugin-node-polyfills";

export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      include: ["crypto", "assert", "buffer", "process", "stream"],
    }),
  ],
  server: {
    port: 5173,
    host: true,
  },
});
