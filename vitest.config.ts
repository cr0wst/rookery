import { defineConfig } from "vitest/config";
export default defineConfig({ test: { include: ["ai/**/*.test.ts"], passWithNoTests: true } });
