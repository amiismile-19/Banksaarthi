import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
 
export default defineConfig({
  plugins: [react(), tailwindcss()],
  cacheDir: "node_modules/.vite_dev_cache",
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});