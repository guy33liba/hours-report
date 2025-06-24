// server.js - CORRECTED AND IMPROVED VERSION
const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
const jwt = require("jsonwebtoken");

const JWT_SECRET = "my-ultra-secure-and-long-secret-key-for-jwt";
const PORT = 5000;

const pool = new Pool({
  user: "speakcom",
  host: "192.168.1.19",
  database: "guyliba",
  password: "051262677",
  port: 5432,
});

const app = express();
app.use(cors());
app.use(express.json());

// =================================================================
// Middleware
// =================================================================

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (token == null) {
    return res.status(401).json({ message: "No token provided" });
  }

  // FIX: Using the JWT_SECRET constant for consistency.
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      console.error("JWT Verification Error:", err);
      return res.status(403).json({ message: "Token is not valid" });
    }
    req.user = user;
    next();
  });
};

const authorizeManager = (req, res, next) => {
  if (req.user.role !== "manager") {
    return res
      .status(403)
      .json({ message: "Access Denied: Manager role required." });
  }
  next();
};

// =================================================================
// Routes
// =================================================================

// --- Auth Routes ---
app.post("/api/auth/login", async (req, res) => {
  const { name, password } = req.body;
  try {
    // FIX: Standardized query to use snake_case for hourly_rate
    const { rows } = await pool.query(
      "SELECT id, name, password, role, department, hourly_rate FROM employees WHERE name = $1",
      [name]
    );

    if (rows.length === 0) {
      return res.status(401).json({ message: "שם משתמש או סיסמה שגויים" });
    }

    const user = rows[0];

    if (user.password !== password) {
      return res.status(401).json({ message: "שם משתמש או סיסמה שגויים" });
    }

    const token = jwt.sign(
      { userId: user.id, role: user.role, name: user.name },
      JWT_SECRET, // FIX: Used constant
      { expiresIn: "8h" }
    );
    delete user.password;
    res.json({ token, user });
  } catch (err) {
    console.error("Login Error:", err);
    res.status(500).json({ message: "שגיאת שרת פנימית" });
  }
});

// --- Settings Route ---
// NEW: Added the missing route to prevent 404 errors
app.get("/api/settings", authenticateToken, (req, res) => {
  // Return any relevant application settings here
  // For now, returning a dummy object is fine
  res.json({
    companyName: "SpeakCom",
    allowBreaks: true,
  });
});

// --- Employee Routes ---
app.get("/api/employees", authenticateToken, async (req, res) => {
  try {
    // FIX: Standardized column name to hourly_rate
    const { rows } = await pool.query(
      "SELECT id, name, department, hourly_rate, role, status FROM employees"
    );
    res.json(rows);
  } catch (err) {
    console.error("Error fetching employees:", err);
    res.status(500).json({ message: "שגיאה בטעינת עובדים מהשרת." });
  }
});

app.post(
  "/api/employees",
  authenticateToken,
  authorizeManager,
  async (req, res) => {
    const { name, department, hourlyRate, role } = req.body;
    const password = "123"; // Default password
    try {
      // FIX: Standardized to hourly_rate
      const { rows } = await pool.query(
        "INSERT INTO employees (name, department, hourly_rate, role, password) VALUES ($1, $2, $3, $4, $5) RETURNING id, name, department, role, hourly_rate",
        [name, department, hourlyRate, role, password]
      );
      res.status(201).json(rows[0]);
    } catch (err) {
      console.error("Error creating employee:", err);
      if (err.code === "23505") {
        res.status(409).json({ message: "שם עובד כבר קיים במערכת." });
      } else {
        res.status(500).json({ message: "שגיאה ביצירת עובד." });
      }
    }
  }
);

app.put(
  "/api/employees/:id",
  authenticateToken,
  authorizeManager,
  async (req, res) => {
    const { id } = req.params;
    const { name, department, hourlyRate, role } = req.body;
    try {
      // FIX: Standardized to hourly_rate
      const { rows } = await pool.query(
        "UPDATE employees SET name = $1, department = $2, hourly_rate = $3, role = $4 WHERE id = $5 RETURNING id, name, department, role, hourly_rate",
        [name, department, hourlyRate, role, id]
      );
      res.json(rows[0]);
    } catch (err) {
      console.error("Database error updating employee:", err);
      res.status(500).json({ message: "שגיאה בעדכון עובד" });
    }
  }
);

app.post(
  "/api/employees/reset-password",
  authenticateToken,
  authorizeManager,
  async (req, res) => {
    const { userId, newPassword } = req.body;
    if (!userId || !newPassword || newPassword.trim().length < 1) {
      return res
        .status(400)
        .json({ message: "נדרשים מזהה משתמש וסיסמה חוקית." });
    }
    try {
      const result = await pool.query(
        "UPDATE employees SET password = $1 WHERE id = $2",
        [newPassword.trim(), parseInt(userId, 10)]
      );
      if (result.rowCount === 0) {
        return res.status(404).json({ message: "העובד לא נמצא." });
      }
      res.json({ message: "הסיסמה עודכנה בהצלחה." });
    } catch (error) {
      console.error("Error resetting password:", error);
      res.status(500).json({ message: "שגיאת שרת פנימית." });
    }
  }
);

app.delete(
  "/api/employees/:id",
  authenticateToken,
  authorizeManager,
  async (req, res) => {
    try {
      await pool.query("DELETE FROM employees WHERE id = $1", [req.params.id]);
      res.status(204).send();
    } catch (err) {
      // FIX: Added error logging
      console.error("Error deleting employee:", err);
      res.status(500).json({ message: "שגיאה במחיקת עובד" });
    }
  }
);

// --- Attendance Routes (REFACTORED AND CLEANED) ---

app.get("/api/attendance", authenticateToken, async (req, res) => {
  try {
    let query;
    const params = [];

    // A manager gets all attendance, a regular user gets only their own.
    if (req.user.role === "manager") {
      query = `SELECT id, employee_id as "employeeId", clock_in as "clockIn", clock_out as "clockOut", breaks, on_break as "onBreak" FROM attendance ORDER BY clock_in DESC`;
    } else {
      query = `SELECT id, employee_id as "employeeId", clock_in as "clockIn", clock_out as "clockOut", breaks, on_break as "onBreak" FROM attendance WHERE employee_id = $1 ORDER BY clock_in DESC`;
      params.push(req.user.userId);
    }
    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error("Error fetching attendance:", err);
    res.status(500).json({ message: "שגיאה בטעינת נוכחות" });
  }
});

// --- Absences Routes ---

app.get("/api/absences", authenticateToken, async (req, res) => {
  try {
    // FIX: Standardized column name to employee_id
    const { rows } = await pool.query(
      'SELECT id, employee_id as "employeeId", type, start_date as "startDate", end_date as "endDate" FROM scheduled_absences'
    );
    res.json(rows);
  } catch (err) {
    // FIX: Added error logging
    console.error("Error fetching absences:", err);
    res.status(500).json({ message: "שגיאה בטעינת היעדרויות" });
  }
});

app.post(
  "/api/absences",
  authenticateToken,
  authorizeManager,
  async (req, res) => {
    const { employeeId, type, startDate, endDate } = req.body;
    try {
      // FIX: Standardized to employee_id
      const { rows } = await pool.query(
        'INSERT INTO scheduled_absences (employee_id, type, start_date, end_date) VALUES ($1, $2, $3, $4) RETURNING id, employee_id as "employeeId", type, start_date as "startDate", end_date as "endDate"',
        [employeeId, type, startDate, endDate]
      );
      res.status(201).json(rows[0]);
    } catch (err) {
      // FIX: Added error logging
      console.error("Error adding absence:", err);
      res.status(500).json({ message: "שגיאה בהוספת היעדרות" });
    }
  }
);

app.delete(
  "/api/absences/:id",
  authenticateToken,
  authorizeManager,
  async (req, res) => {
    try {
      await pool.query("DELETE FROM scheduled_absences WHERE id = $1", [
        req.params.id,
      ]);
      res.status(204).send();
    } catch (err) {
      // FIX: Added error logging
      console.error("Error deleting absence:", err);
      res.status(500).json({ message: "שגיאה במחיקת היעדרות" });
    }
  }
);

// =================================================================
// Server Start
// =================================================================

app.listen(PORT, () => {
  console.log(`✅ Server is running on port ${PORT}`);
});
