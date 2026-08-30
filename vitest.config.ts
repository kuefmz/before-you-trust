import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url)),
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
    clearMocks: true,
    restoreMocks: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary", "html"],
      include: [
        "lib/**/*.ts",
        "components/**/*.tsx",
        "app/api/**/*.ts",
      ],
      exclude: ["**/*.test.ts", "**/*.test.tsx"],
      thresholds: {
        lines: 70,
        functions: 70,
        statements: 70,
        branches: 65,
      },
    },
  },
});
