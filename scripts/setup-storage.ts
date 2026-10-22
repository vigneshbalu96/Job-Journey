import { config as loadEnv } from "dotenv";
loadEnv({ path: [".env.local", ".env"], quiet: true });
import { createClient } from "@supabase/supabase-js";

// One-off for a new Supabase project: creates the private documents bucket.
// Local dev gets it from supabase/config.toml instead.
async function main() {
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const { error } = await admin.storage.createBucket("documents", {
    public: false,
    fileSizeLimit: "10MB",
    allowedMimeTypes: [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/markdown",
      "text/plain",
    ],
  });
  if (error && !/already exists/i.test(error.message)) throw error;
  console.log("documents bucket ready");
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
