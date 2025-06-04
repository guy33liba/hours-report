// routes/auth.js
const express = require("express");
const router = express.Router();
const client = require("../db");

router.post("/login", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password)
    return res.status(400).json({ message: "יש למלא שם משתמש וסיסמה" });

  try {
    const result = await client.query(
      "SELECT * FROM users WHERE username = $1",
      [username]
    );

    const user = result.rows[0];
    if (!user || user.password !== password) {
      return res.status(401).json({ message: "פרטי התחברות שגויים" });
    }

    res.json({ message: "התחברות הצליחה", userId: user.id });
  } catch (err) {
    res.status(500).json({ message: "שגיאת שרת" });
  }
});

module.exports = router;
