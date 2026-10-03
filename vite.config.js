import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    // Hashed JS/CSS go to /_app so they can be cached forever without
    // colliding with the un-hashed files in public/assets.
    assetsDir: "_app",
  },
});
