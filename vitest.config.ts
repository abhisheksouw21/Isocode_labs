import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
  test: {
    environment: "node",
    globalSetup: ["./tests/global-setup.ts"],
    fileParallelism: false,
    env: {
      DATABASE_URL: process.env.TEST_DATABASE_URL ?? "postgresql://resort:resort@localhost:5432/resort_test",
      DB_POOL_MAX: "25",
      SESSION_SECRET: "test-secret-test-secret-test-secret-123",
      LLM_API_KEY: "",
    },
  },
});
