import path from "path";
import { defineConfig } from "vitest/config";

// Mutation tests run against a local Postgres: CI's service (which sets
// DATABASE_URL) or `docker compose up -d` (the URL in .env.example).
const LOCAL_DATABASE_URL =
  "postgres://postgres:postgres@localhost:2345/war_weeker?sslmode=disable";

export default defineConfig({
  test: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    env: {
      DATABASE_URL: process.env.DATABASE_URL ?? LOCAL_DATABASE_URL,
    },
    watch: false,
  },
});
