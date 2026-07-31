import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    // Resolves the "@/*" alias from tsconfig natively, so tests import modules
    // exactly the way the application does rather than through relative paths.
    // (vite-tsconfig-paths is no longer needed for this.)
    tsconfigPaths: true,
  },
  test: {
    // Node, not jsdom: what is tested here is pure logic — URL round-tripping,
    // error mapping, formatting. Rendering tests would need a DOM and would
    // mostly end up testing shadcn.
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
