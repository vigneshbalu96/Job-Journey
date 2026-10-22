import { config as loadEnv } from "dotenv";
loadEnv({ path: [".env.local", ".env"], quiet: true });
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    // Use the direct (session-mode, port 5432) connection for migrations.
    url: process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL!,
  },
  strict: true,
  verbose: true,
});
