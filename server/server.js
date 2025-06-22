// server.js - PLAIN TEXT PASSWORD VERSION
const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
const jwt = require("jsonwebtoken");

const JWT_SECRET = "my-ultra-secure-and-long-secret-key-for-jwt";
const PORT = 5000;

const pool = new Pool({
  user: "speakcom",
  host: "192.168.1.19",
  database: "guylibaDatabase",
  password: "051262677",
  port: 5432,
});

const app = express();
app.use(cors());
app.use(express.json());

// Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (token == null) return res.sendStatus(401);
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: "Token is not valid" });
    req.user = user;
    next();
  });
};

const authorizeManager = (req, res, next) => {
  if (req.user.role !== "manager")
    return res
      .status(403)
      .json({ message: "Access Denied: Manager role required." });
  next();
};

// Auth Routes
app.post("/api/auth/login", async (req, res) => {
  const { name, password } = req.body;
  try {
    const { rows } = await pool.query(
      'SELECT *, _id as "id" FROM employees WHERE name = $1',
      [name]
    );
    if (rows.length === 0 || rows[0].password !== password) {
      return res.status(401).json({ message: "שם משתמש או סיסמה שגויים" });
    }
    const user = rows[0];
    const token = jwt.sign(
      { userId: user.id, role: user.role, name: user.name },
      JWT_SECRET,
      { expiresIn: "8h" }
    );
    delete user.password; // Don't send password to the client
    res.json({ token, user });
  } catch (err) {
    console.error("Login Error:", err);
    res.status(500).json({ message: "שגיאת שרת פנימית" });
  }
});

// Employee Routes
app.get("/api/employees", authenticateToken, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT _id as "id", name, department, role, hourly_rate as "hourlyRate", status FROM employees ORDER BY name'
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: "שגיאה בטעינת עובדים" });
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
      const { rows } = await pool.query(
        'INSERT INTO employees (name, department, hourly_rate, role, password, status) VALUES ($1, $2, $3, $4, $5, $6) RETURNING _id as "id", name, department, role, hourly_rate as "hourlyRate", status',
        [name, department, hourlyRate, role, password, "absent"]
      );
      res.status(201).json(rows[0]);
    } catch (err) {
      res
        .status(500)
        .json({ message: "שגיאה ביצירת עובד, ייתכן שהשם כבר קיים." });
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
      const { rows } = await pool.query(
        'UPDATE employees SET name = $1, department = $2, hourly_rate = $3, role = $4 WHERE _id = $5 RETURNING _id as "id", name, department, role, hourly_rate as "hourlyRate", status',
        [name, department, hourlyRate, role, id]
      );
      res.json(rows[0]);
    } catch (err) {
      res.status(500).json({ message: "שגיאה בעדכון עובד" });
    }
  }
);

app.delete(
  "/api/employees/:id",
  authenticateToken,
  authorizeManager,
  async (req, res) => {
    try {
      await pool.query("DELETE FROM employees WHERE _id = $1", [req.params.id]);
      res.status(204).send();
    } catch (err) {
      res.status(500).json({ message: "שגיאה במחיקת עובד" });
    }
  }
);

// Attendance Routes
app.get("/api/attendance", authenticateToken, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT employee_id as "employeeId", clock_in as "clockIn", clock_out as "clockOut", breaks, on_break as "onBreak" FROM attendance'
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: "שגיאה בטעינת נוכחות" });
  }
});

app.post("/api/attendance/clock-in", authenticateToken, async (req, res) => {
  const { employeeId } = req.body;
  try {
    await pool.query("UPDATE employees SET status = $1 WHERE _id = $2", [
      "present",
      employeeId,
    ]);
    await pool.query(
      "INSERT INTO attendance (employee_id, clock_in, on_break) VALUES ($1, NOW(), false)",
      [employeeId]
    );
    res.status(201).json({ message: "Clock-in successful" });
  } catch (err) {
    res.status(500).json({ message: "שגיאה בהחתמת כניסה" });
  }
});

app.post("/api/attendance/clock-out", authenticateToken, async (req, res) => {
  const { employeeId } = req.body;
  try {
    await pool.query("UPDATE employees SET status = $1 WHERE _id = $2", [
      "absent",
      employeeId,
    ]);
    await pool.query(
      "UPDATE attendance SET clock_out = NOW(), on_break = false WHERE employee_id = $1 AND clock_out IS NULL",
      [employeeId]
    );
    res.json({ message: "Clock-out successful" });
  } catch (err) {
    res.status(500).json({ message: "שגיאה בהחתמת יציאה" });
  }
});

app.post("/api/attendance/break", authenticateToken, async (req, res) => {
  const { employeeId } = req.body;
  const now = new Date();
  try {
    const { rows: current } = await pool.query(
      "SELECT * FROM attendance WHERE employee_id = $1 AND clock_out IS NULL",
      [employeeId]
    );
    if (current.length === 0)
      return res.status(400).json({ message: "העובד לא מחובר" });

    const entry = current[0];
    const breaks = entry.breaks || [];
    const onBreak = !entry.on_break;

    if (onBreak) {
      breaks.push({ start: now, end: null });
      await pool.query("UPDATE employees SET status = $1 WHERE _id = $2", [
        "on_break",
        employeeId,
      ]);
    } else {
      const lastBreak = breaks[breaks.length - 1];
      if (lastBreak && !lastBreak.end) lastBreak.end = now;
      await pool.query("UPDATE employees SET status = $1 WHERE _id = $2", [
        "present",
        employeeId,
      ]);
    }

    await pool.query(
      "UPDATE attendance SET breaks = $1, on_break = $2 WHERE id = $3",
      [JSON.stringify(breaks), onBreak, entry.id]
    );
    res.json({ message: "Break status updated" });
  } catch (err) {
    res.status(500).json({ message: "שגיאה בעדכון הפסקה" });
  }
});

// Absences Routes
app.get("/api/absences", authenticateToken, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, employee_id as "employeeId", type, start_date as "startDate", end_date as "endDate" FROM scheduled_absences'
    );
    res.json(rows);
  } catch (err) {
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
      const { rows } = await pool.query(
        'INSERT INTO scheduled_absences (employee_id, type, start_date, end_date) VALUES ($1, $2, $3, $4) RETURNING id, employee_id as "employeeId", type, start_date as "startDate", end_date as "endDate"',
        [employeeId, type, startDate, endDate]
      );
      res.status(201).json(rows[0]);
    } catch (err) {
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
      res.status(500).json({ message: "שגיאה במחיקת היעדרות" });
    }
  }
);
// server.js - החלף את ה-route הקיים בגרסה משופרת זו

app.post(
  "/api/employees/reset-password",
  authenticateToken,
  authorizeManager,
  async (req, res) => {
    const { userId, newPassword } = req.body;

    // ... validation ...

    try {
      // THE FIX IS HERE: We use parseInt() on the userId
      const result = await pool.query(
        "UPDATE employees SET password = $1 WHERE _id = $2",
        [newPassword, parseInt(userId, 10)]
      );

      if (result.rowCount === 0) {
        return res.status(404).json({ message: "העובד לא נמצא." });
      }

      res.json({ message: "הסיסמה עודכנה בהצלחה." });
    } catch (error) {
      // This is the block that is likely running and causing the error
      console.error("!!! DATABASE ERROR while resetting password:", error);
      res.status(500).json({ message: "שגיאת שרת פנימית." });
    }
  }
);
app.listen(PORT, () => {
  console.log(`✅ Server is running on port ${PORT}`);
});
