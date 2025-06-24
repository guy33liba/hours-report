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
  database: "guyliba",
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

  if (token == null) {
    return res.status(401).json({ message: "No token provided" });
  }

  jwt.verify(
    token,
    "my-ultra-secure-and-long-secret-key-for-jwt",
    (err, user) => {
      if (err) {
        console.error("JWT Verification Error:", err); // <-- ADD THIS LINE! This is key!
        return res.status(403).json({ message: "Token is not valid" }); // Or customize message: err.message
      }
      req.user = user;
      next();
    }
  );
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
  const { name, password } = req.body; // --- הוסף את השורות הבאות לאבחון ---

  console.log("Backend received - Name:", name);
  console.log("Backend received - Password:", password); // --- סוף הדפסה לאבחון ---

  try {
    const { rows } = await pool.query(
      "SELECT *, id FROM employees WHERE name = $1",
      [name]
    );
    if (rows.length === 0) {
      console.log("User not found in DB for name:", name); // הוסף לאבחון
      return res.status(401).json({ message: "שם משתמש או סיסמה שגויים" });
    }
    const user = rows[0];
    // --- הוסף את השורות הבאות לאבחון ---
    console.log("User found in DB - Name:", user.name);
    console.log("User found in DB - Stored Password:", user.password);
    console.log("Comparing:", password, "with", user.password);
    // --- סוף הדפסה לאבחון ---

    if (user.password !== password) {
      // זה המקום שבו ההשוואה מתרחשת
      console.log("Password mismatch!"); // הוסף לאבחון
      return res.status(401).json({ message: "שם משתמש או סיסמה שגויים" });
    }

    const token = jwt.sign(
      { userId: user.id, role: user.role, name: user.name },
      "my-ultra-secure-and-long-secret-key-for-jwt",
      { expiresIn: "8h" }
    );
    delete user.password;
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
      'SELECT id, name, department, "hourlyRate", role FROM employees'
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
    const trimmedPassword = password.trim();
    try {
      const { rows } = await pool.query(
        'INSERT INTO employees (name, department, "hourlyRate", role, password) VALUES ($1, $2, $3, $4, $5) RETURNING id, name, department, role, "hourlyRate"',
        [name, department, hourlyRate, role, trimmedPassword]
      );
      res.status(201).json(rows[0]);
    } catch (err) {
      console.error("Error creating employee:", err); // הדפסה של השגיאה המלאה ללוג השרת
      // שגיאה 23505 היא שגיאה של unique constraint
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
      const { rows } = await pool.query(
        'UPDATE employees SET name = $1, department = $2, "hourlyRate" = $3, role = $4 WHERE id = $5 RETURNING id, name, department, role, "hourlyRate"',
        [name, department, hourlyRate, role, id]
      );
      res.json(rows[0]);
    } catch (err) {
      console.error("Database error updating employee:", err.message);
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
      await pool.query("DELETE FROM employees WHERE id = $1", [req.params.id]);
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
      'SELECT employeeid as "employeeId", clock_in as "clockIn", clock_out as "clockOut", breaks, on_break as "onBreak" FROM attendance'
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: "שגיאה בטעינת נוכחות" });
  }
});

app.post("/api/attendance/clock-in", authenticateToken, async (req, res) => {
  const { employeeId } = req.body;
  try {
    await pool.query("UPDATE employees SET status = $1 WHERE id = $2", [
      "present",
      employeeId,
    ]);
    await pool.query(
      "INSERT INTO attendance (employeeid, clock_in, on_break) VALUES ($1, NOW(), false)",
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
    await pool.query("UPDATE employees SET status = $1 WHERE id = $2", [
      "absent",
      employeeId,
    ]);
    await pool.query(
      "UPDATE attendance SET clock_out = NOW(), on_break = false WHERE employeeid = $1 AND clock_out IS NULL",
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
      "SELECT * FROM attendance WHERE employeeid = $1 AND clock_out IS NULL",
      [employeeId]
    );
    if (current.length === 0)
      return res.status(400).json({ message: "העובד לא מחובר" });

    const entry = current[0];
    const breaks = entry.breaks || [];
    const onBreak = !entry.on_break;

    if (onBreak) {
      breaks.push({ start: now, end: null });
      await pool.query("UPDATE employees SET status = $1 WHERE id = $2", [
        "on_break",
        employeeId,
      ]);
    } else {
      const lastBreak = breaks[breaks.length - 1];
      if (lastBreak && !lastBreak.end) lastBreak.end = now;
      await pool.query("UPDATE employees SET status = $1 WHERE id = $2", [
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
      'SELECT id, employeeid as "employeeId", type, start_date as "startDate", end_date as "endDate" FROM scheduled_absences'
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
        'INSERT INTO scheduled_absences (employeeid, type, start_date, end_date) VALUES ($1, $2, $3, $4) RETURNING id, employeeid as "employeeId", type, start_date as "startDate", end_date as "endDate"',
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

    if (!userId || !newPassword) {
      return res
        .status(400)
        .json({ message: "נדרשים מזהה משתמש וסיסמה חדשה." });
    }

    let trimmedNewPassword = newPassword.trim();

    if (trimmedNewPassword.length < 1) {
      return res.status(400).json({ message: "הסיסמה לא יכולה להיות ריקה." });
    }

    try {
      const result = await pool.query(
        "UPDATE employees SET password = $1 WHERE id = $2",
        [trimmedNewPassword, parseInt(userId, 10)]
      );

      if (result.rowCount === 0) {
        return res.status(404).json({ message: "העובד לא נמצא." });
      }

      res.json({ message: "הסיסמה עודכנה בהצלחה." });
    } catch (error) {
      console.error("!!! DATABASE ERROR while resetting password:", error);
      res.status(500).json({ message: "שגיאת שרת פנימית." });
    }
  }
);

app.post("/api/attendance/toggle", authenticateToken, async (req, res) => {
  const { employeeId } = req.body;
  const now = new Date(); // הזמן הנוכחי

  // --- הדפסה לבדיקה: קבלת הנתונים והזמן בשרת ---
  console.log(
    `[Backend - Attendance Toggle] Request received for employeeId: ${employeeId}`
  );
  console.log(
    `[Backend - Attendance Toggle] Current server time: ${now.toISOString()}`
  );
  // --- סוף הדפסה ---

  try {
    const { rows: activeAttendance } = await pool.query(
      `SELECT * FROM attendance WHERE employee_id = $1 AND check_out_time IS NULL`,
      [employeeId]
    );

    if (activeAttendance.length > 0) {
      const recordToUpdate = activeAttendance[0];
      // --- הדפסה לבדיקה: רשומת יציאה ---
      console.log(
        `[Backend - Attendance Toggle] Employee ${employeeId} is checking OUT. Updating record ID: ${recordToUpdate.id}`
      );
      // --- סוף הדפסה ---
      await pool.query(
        `UPDATE attendance SET check_out_time = $1 WHERE id = $2`,
        [now, recordToUpdate.id]
      );
      res.json({
        message: "יציאה נרשמה בהצלחה.",
        status: "checked_out",
      });
    } else {
      // --- הדפסה לבדיקה: רשומת כניסה ---
      console.log(
        `[Backend - Attendance Toggle] Employee ${employeeId} is checking IN. Creating new record.`
      );
      // --- סוף הדפסה ---
      await pool.query(
        `INSERT INTO attendance (employee_id, check_in_time) VALUES ($1, $2)`,
        [employeeId, now]
      );
      res.status(201).json({
        message: "כניסה נרשמה בהצלחה.",
        status: "checked_in",
      });
    }
  } catch (error) {
    console.error("Error toggling attendance:", error);
    res.status(500).json({ message: "שגיאה בטיפול בהחתמת שעון." });
  }
});

app.get(
  "/api/attendance/:employeeId",
  authenticateToken,
  // אולי authorizeSelfOrManager כדי שעובד יוכל לראות את השעות שלו, ומנהל את של כולם
  async (req, res) => {
    const { employeeId } = req.params;
    try {
      const { rows } = await pool.query(
        `SELECT * FROM attendance WHERE employee_id = $1 ORDER BY check_in_time DESC`,
        [employeeId]
      );
      res.json(rows);
    } catch (error) {
      console.error("Error fetching attendance for employee:", error);
      res.status(500).json({ message: "שגיאה בשליפת נתוני נוכחות." });
    }
  }
);

// דוגמה ל-API למנהל שישלוף את כל רשומות הנוכחות (או לפי טווח תאריכים)
app.get(
  "/api/attendance",
  authenticateToken,
  authorizeManager, // רק מנהלים
  async (req, res) => {
    // ניתן להוסיף כאן סינון לפי תאריכים, עובדים ספציפיים וכו'.
    // לדוגמה: /api/attendance?startDate=...&endDate=...
    try {
      const { rows } = await pool.query(
        `SELECT a.*, e.name as employee_name
         FROM attendance a
         JOIN employees e ON a.employee_id = e.id
         ORDER BY a.check_in_time DESC`
      );
      res.json(rows);
    } catch (error) {
      console.error("Error fetching all attendance:", error);
      res.status(500).json({ message: "שגיאה בשליפת כל נתוני הנוכחות." });
    }
  }
);
app.listen(PORT, () => {
  console.log(`✅ Server is running on port ${PORT}`);
});
