// Usage: npm run db:seed   (insert / refresh sample data)
//        npm run db:unseed (remove it)
import { createDb } from "../src/lib/db/client";
import { seed, unseed } from "../src/lib/db/seed";

async function main() {
  const command = process.argv[2];
  if (command !== "up" && command !== "down") {
    throw new Error('Expected "up" or "down"');
  }
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set (see .env.example)");

  const { db, sql } = createDb(url);
  try {
    if (command === "up") {
      await seed(db);
      console.log("Seed data inserted.");
    } else {
      await unseed(db);
      console.log("Seed data removed.");
    }
  } finally {
    await sql.end();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
