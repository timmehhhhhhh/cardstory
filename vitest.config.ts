import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

// First test runner introduced into this repo — Vitest, chosen for its
// native ESM/TS support (no Babel/webpack config needed). `tsconfigPaths()`
// resolves the existing `@/*` alias from tsconfig.json without duplicating
// that mapping here. `environment: "node"` since every test in scope is
// pure-function/domain-logic (src/lib/scanning) with no DOM involved.
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
