import { existsSync } from "node:fs";
import { closeDb, getDb } from "../db/client";
import { resetAndSeed } from "../lib/seed";

async function main(): Promise<void> {
  // tsx does not read .env files; Next does, so share .env.local.
  if (!process.env.DATABASE_URL && existsSync(".env.local")) process.loadEnvFile(".env.local");
  try {
    await resetAndSeed(getDb());
    console.log("seeded");
  } finally {
    await closeDb();
  }
}

main().catch((err: unknown) => {
  console.error(err);
  process.exitCode = 1;
});
