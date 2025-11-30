import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/

export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },

  plugins: [react(), mode === "development" && componentTagger()].filter(
    Boolean
  ),

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },

  // ⭐ ADD THIS SECTION ⭐
  build: {
    outDir: "dist", // required by Capacitor
    sourcemap: false, // production recommended
    minify: "esbuild", // fastest + best for React
    target: "esnext",
    cssCodeSplit: true,
    emptyOutDir: true, // clears old builds automatically

    // OPTIONAL: remove comments
    terserOptions: {
      format: {
        comments: false,
      },
    },
  },

  // ⭐ If you meant "true" for global constants, add here ⭐
  define: {
    __APP_VERSION__: JSON.stringify("1.0.0"),
    __DEV__: mode === "development",
  },
}));
