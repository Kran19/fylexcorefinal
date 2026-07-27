const { Client } = require('pg');
require('dotenv').config({ path: '../.env' });

async function run() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });

  try {
    await client.connect();
    console.log("Connected to DB.");

    await client.query(`
      CREATE TABLE IF NOT EXISTS "page_themes" (
        "id" SERIAL NOT NULL,
        "product_id" INTEGER NOT NULL,
        "page_name" TEXT NOT NULL,
        "theme_json" TEXT NOT NULL,
        "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP(3),

        CONSTRAINT "page_themes_pkey" PRIMARY KEY ("id")
      );
    `);

    await client.query(`
      ALTER TABLE "page_themes" DROP CONSTRAINT IF EXISTS "page_themes_product_id_fkey";
      ALTER TABLE "page_themes" ADD CONSTRAINT "page_themes_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    `);

    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "page_themes_product_id_page_name_unique" ON "page_themes"("product_id", "page_name");
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS "page_themes_product_id_index" ON "page_themes"("product_id");
    `);

    console.log("Migration complete: page_themes table created.");
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    await client.end();
  }
}

run();
