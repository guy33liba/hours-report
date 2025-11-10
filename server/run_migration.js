const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");

// Read SQL file
const sqlPath = path.join(__dirname, "migrations", "001-add-vacation-days.sql");
const sql = fs.readFileSync(sqlPath, "utf8");

// Use same DB config as server.js (adjust if you store credentials differently)
const pool = new Pool({
  user: "speakcom",
  host: "192.168.1.19",
  database: "guyliba",
  password: "051262677",
  port: 5432,
});

(async () => {
  const client = await pool.connect();
  try {
    console.log("Running migration: 001-add-vacation-days.sql");
    await client.query("BEGIN");
    await client.query(sql);
    await client.query("COMMIT");
    console.log("Migration applied successfully.");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Migration failed:", err);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
})();
