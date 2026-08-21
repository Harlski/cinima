import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@cinima/shared": path.resolve(__dirname, "../../packages/shared/src/index.ts"),
    },
  },
  test: {
    include: ["tests/**/*.test.ts"],
    fileParallelism: false,
    pool: "forks",
  },
});
