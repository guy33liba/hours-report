const express = require("express");
const router = express.Router();
const client = require("../db");

// יצירת הטבלה (רק פעם אחת, אפשר גם להוציא לקובץ נפרד להרצה ידנית)
client
  .query(`
    CREATE TABLE IF NOT EXISTS attendance (
      id SERIAL PRIMARY KEY,
      user_id VARCHAR(50),
      action VARCHAR(10),
      timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `)
  .then(() => {
    console.log("✅ attendance table ready");
  })
  .catch((err) => {
    console.error("❌ Error creating table:", err.message);
  });

// POST - רישום כניסה/יציאה
router.post("/clock", async (req, res) => {
  const { userId, action } = req.body;
  if (!userId || !action || !["in", "out"].includes(action)) {
    return res.status(400).json({ message: "פרמטרים לא תקינים" });
  }

  try {
    await client.query(
      "INSERT INTO attendance (user_id, action) VALUES ($1, $2)",
      [userId, action]
    );
    res.json({ message: `✔️ ${action === "in" ? "כניסה" : "יציאה"} נרשמה` });
  } catch (err) {
    res.status(500).json({ message: "שגיאה במסד הנתונים" });
  }
});

// GET - שליפת לוגים (אפשרות סינון לפי תאריכים)
router.get("/logs", async (req, res) => {
  try {
    const { from, to } = req.query;
    let query = "SELECT * FROM attendance";
    let params = [];

    if (from && to) {
      query += " WHERE timestamp BETWEEN $1 AND $2 ORDER BY timestamp DESC";
      params = [from + " 00:00:00", to + " 23:59:59"];
    } else {
      query += " ORDER BY timestamp DESC";
    }

    const result = await client.query(query, params);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
