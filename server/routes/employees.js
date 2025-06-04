// routes/employees.js
const express = require("express");
const router = express.Router();
const client = require("../db");

// נתיב לקבלת רשימת עובדים
router.get("/", async (req, res) => {
  try {
    const result = await client.query(
      "SELECT * FROM employees ORDER BY full_name"
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// יצירת עובד חדש
router.post("/", async (req, res) => {
  try {
    const { employee_number, full_name, department, position } = req.body;
    const query = `
      INSERT INTO employees (employee_number, full_name, department, position)
      VALUES ($1, $2, $3, $4) RETURNING *
    `;
    const values = [employee_number, full_name, department, position];
    const result = await client.query(query, values);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
