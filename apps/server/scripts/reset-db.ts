import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { sql } from "drizzle-orm";
import { closeDb, getDb } from "../db/client";
import { resetAndSeed } from "../lib/seed";

// Every MarginLog table, v1 and v2. Dropping with CASCADE lets drizzle-kit recreate them without rename prompts.
const TABLES = [
  "sales",
  "purchases",
  "cart_items",
  "order_lines",
  "orders",
  "invoice_images",
  "invoices",
  "quotes",
  "supplier_products",
  "recipe_lines",
  "menus",
  "market_index",
  "ingredient_aliases",
  "suppliers",
  "ingredients",
  "stores",
  "sessions",
  "users",
];

function pushSchema(): Promise<void> {
  return new Promise((resolve, reject) => {
    // --force auto-approves data-loss statements so the push never waits for input.
    const child = spawn("npx", ["drizzle-kit", "push", "--force"], { stdio: ["ignore", "inherit", "inherit"] });
    child.on("error", reject);
    child.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`drizzle-kit push exited with ${code}`))));
  });
}

async function main(): Promise<void> {
  // tsx does not read .env files; Next does, so share .env.local.
  if (!process.env.DATABASE_URL && existsSync(".env.local")) process.loadEnvFile(".env.local");
  try {
    await getDb().execute(sql.raw(`DROP TABLE IF EXISTS ${TABLES.map((t) => `"${t}"`).join(", ")} CASCADE`));
    console.log(`dropped ${TABLES.length} tables`);
    await pushSchema();
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
