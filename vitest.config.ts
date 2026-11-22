import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    setupFiles: ["tests/helpers/setup.ts"],
    // PGlite boots a WASM Postgres per integration file: allow time for it.
    testTimeout: 20_000,
    hookTimeout: 30_000,
  },
});
