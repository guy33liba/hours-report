const pkg = require("pg");

const { Client } = pkg;

const client = new Client({
  user: "speakcom",
  host: "192.168.1.19",
  database: "guylibaDatabase",
  password: "051262677",
  port: 5432,
});

async function testConnection() {
  try {
    await client.connect();
    console.log("✅ Connected to PostgreSQL");
    const res = await client.query("SELECT NOW()");
    console.log(res.rows[0]);
  } catch (err) {
    console.error("❌ DB connection error:", err.message);
  }
}

testConnection();

module.exports = client;
