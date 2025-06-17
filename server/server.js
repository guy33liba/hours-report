const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
const path = require("path");
const fs = require("fs");
const multer = require("multer");

const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
require("dotenv").config(); // ודא שמשתני סביבה נטענים

const JWT_SECRET = "your_super_secret_key_12345"; // הוסף מפתח סודי
const pool = new Pool({
  user: "speakcom",
  host: "192.168.1.19",
  database: "guylibaDatabase",
  password: "051262677",
  port: 5432,
});

pool.query("SELECT NOW()", (err, res) => {
  if (err) {
    console.error("❌ Database connection error", err.stack);
  } else {
    console.log(
      "✅ Database connected successfully. Server time:",
      res.rows[0].now
    );
  }
});

// --- Express App Setup ---
const app = express();

const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

// הגדרות של Multer לשמירת קבצים
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(
      null,
      file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname)
    );
  },
});

const upload = multer({ storage: storage });
// Middlewares
app.set("trust proxy", true); // Important for correct IP detection
app.use(cors({ origin: "*" }));
app.use(express.json());

// --- Helper function for IP Check ---
const checkIp = (req) => {
  const { settings } = req.body;
  if (settings && settings.restrictByIp) {
    const allowedIps = settings.allowedIps.split(",").map((ip) => ip.trim());
    const clientIp = req.ip;
    // Clean up IPv6 mapped IPv4 address
    const cleanedClientIp = clientIp.startsWith("::ffff:")
      ? clientIp.substring(7)
      : clientIp;

    // Allow 127.0.0.1 (localhost) for development
    if (
      !allowedIps.includes(cleanedClientIp) &&
      cleanedClientIp !== "127.0.0.1"
    ) {
      console.log(
        `Action blocked for IP: ${cleanedClientIp}. Allowed IPs: [${allowedIps.join(
          ", "
        )}]`
      );
      return {
        isAllowed: false,
        message: `הגישה נחסמה. כתובת ה-IP שלך (${cleanedClientIp}) אינה מורשית.`,
      };
    }
  }
  return { isAllowed: true };
};
// החלף את ה-route הקיים בגרסה הזו
app.post("/api/employees", async (req, res) => {
  const { name, department, hourlyRate, role, password } = req.body;
  if (!name || !department || !hourlyRate || !password) {
    return res.status(400).json({ message: "כל השדות, כולל סיסמה, הם חובה" });
  }

  try {
    // הצפן את הסיסמה לפני שמירתה
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const { rows } = await pool.query(
      `INSERT INTO employees (name, department, hourly_rate, role, password_hash) VALUES ($1, $2, $3, $4, $5) RETURNING *, hourly_rate as "hourlyRate"`,
      [name, department, hourlyRate, role || "employee", passwordHash]
    );

    const { password_hash, ...newUser } = rows[0];
    res.status(201).json(newUser);
  } catch (err) {
    console.error("Error adding employee:", err);
    res.status(500).json({ message: "Server error while adding employee" });
  }
});

// ============================
// --- API Routes ---
// ============================

// --- Employee Routes ---
app.get("/api/employees", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT *, hourly_rate as "hourlyRate" FROM employees ORDER BY name ASC`
    );
    res.json(rows);
  } catch (err) {
    console.error("Error fetching employees:", err);
    res.status(500).json({ message: "Server error" });
  }
});

app.post("/api/employees", async (req, res) => {
  const { name, department, hourlyRate, role } = req.body;
  if (!name || !department || !hourlyRate)
    return res.status(400).json({ message: "Missing required fields" });
  try {
    const { rows } = await pool.query(
      `INSERT INTO employees (name, department, hourly_rate, role) VALUES ($1, $2, $3, $4) RETURNING *, hourly_rate as "hourlyRate"`,
      [name, department, hourlyRate, role || "employee"]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error("Error adding employee:", err);
    res.status(500).json({ message: "Server error" });
  }
});

app.put("/api/employees/:id", async (req, res) => {
  const { id } = req.params;
  const { name, department, hourlyRate, role } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE employees SET name = $1, department = $2, hourly_rate = $3, role = $4 WHERE _id = $5 RETURNING *, hourly_rate as "hourlyRate"`,
      [name, department, hourlyRate, role, id]
    );
    if (rows.length === 0)
      return res.status(404).json({ message: "Employee not found" });
    res.json(rows[0]);
  } catch (err) {
    console.error("Error updating employee:", err);
    res.status(500).json({ message: "Server error" });
  }
});

app.delete("/api/employees/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query("DELETE FROM employees WHERE _id = $1", [
      id,
    ]);
    if (result.rowCount === 0)
      return res.status(404).json({ message: "Employee not found" });
    res.status(204).send();
  } catch (err) {
    console.error("Error deleting employee:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// --- Attendance Routes ---
app.post("/api/attendance/clock-in", async (req, res) => {
  const ipCheck = checkIp(req);
  if (!ipCheck.isAllowed) {
    return res.status(403).json({ message: ipCheck.message });
  }

  const { employeeId } = req.body;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const empRes = await client.query(
      "SELECT id FROM employees WHERE _id = $1",
      [employeeId]
    );
    if (empRes.rows.length === 0) throw new Error("Employee not found");
    const internalEmployeeId = empRes.rows[0].id;

    const existing = await client.query(
      "SELECT * FROM attendance WHERE employee_id = $1 AND clock_out IS NULL",
      [internalEmployeeId]
    );
    if (existing.rows.length > 0)
      return res.status(400).json({ message: "העובד כבר החתים כניסה" });

    await client.query(
      "INSERT INTO attendance (employee_id, clock_in) VALUES ($1, NOW())",
      [internalEmployeeId]
    );
    const { rows } = await client.query(
      `UPDATE employees SET status = 'present' WHERE id = $1 RETURNING *, hourly_rate as "hourlyRate"`,
      [internalEmployeeId]
    );
    await client.query("COMMIT");
    res.json(rows[0]);
  } catch (err) {
    await client.query("ROLLBACK");
    res.status(500).json({ message: err.message || "Server error" });
  } finally {
    client.release();
  }
});

app.post("/api/attendance/clock-out", async (req, res) => {
  const ipCheck = checkIp(req);
  if (!ipCheck.isAllowed) {
    return res.status(403).json({ message: ipCheck.message });
  }

  const { employeeId } = req.body;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const empRes = await client.query(
      "SELECT id FROM employees WHERE _id = $1",
      [employeeId]
    );
    if (empRes.rows.length === 0) throw new Error("Employee not found");
    const internalEmployeeId = empRes.rows[0].id;

    const attendanceRes = await client.query(
      "UPDATE attendance SET clock_out = NOW() WHERE id = (SELECT id FROM attendance WHERE employee_id = $1 AND clock_out IS NULL ORDER BY clock_in DESC LIMIT 1) RETURNING id",
      [internalEmployeeId]
    );
    if (attendanceRes.rows.length === 0)
      return res.status(400).json({ message: "לא נמצאה החתמת כניסה פתוחה" });

    const { rows } = await client.query(
      `UPDATE employees SET status = 'absent' WHERE id = $1 RETURNING *, hourly_rate as "hourlyRate"`,
      [internalEmployeeId]
    );
    await client.query("COMMIT");
    res.json(rows[0]);
  } catch (err) {
    await client.query("ROLLBACK");
    res.status(500).json({ message: err.message || "Server error" });
  } finally {
    client.release();
  }
});

app.get("/api/attendance/today/open", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT a._id, a.clock_in as "clockIn", e._id as employee FROM attendance a JOIN employees e ON a.employee_id = e.id WHERE a.clock_out IS NULL AND a.clock_in >= CURRENT_DATE`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

app.get("/api/attendance/employee/:employeeId/:yearMonth", async (req, res) => {
  const { employeeId, yearMonth } = req.params;
  const [year, month] = yearMonth.split("-");
  try {
    const empRes = await pool.query("SELECT id FROM employees WHERE _id = $1", [
      employeeId,
    ]);
    if (empRes.rows.length === 0)
      return res.status(404).json({ message: "Employee not found" });
    const internalEmployeeId = empRes.rows[0].id;
    const { rows } = await pool.query(
      `SELECT id, clock_in as "clockIn", clock_out as "clockOut", CASE WHEN clock_out IS NOT NULL THEN EXTRACT(EPOCH FROM (clock_out - clock_in)) / 3600 ELSE NULL END as "durationHours" FROM attendance WHERE employee_id = $1 AND EXTRACT(YEAR FROM clock_in) = $2 AND EXTRACT(MONTH FROM clock_in) = $3 ORDER BY clock_in DESC`,
      [internalEmployeeId, year, month]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// --- Absence Routes ---
app.get("/api/absences/employee/:employeeId", async (req, res) => {
  const { employeeId } = req.params;
  try {
    const { rows } = await pool.query(
      `SELECT sa._id, sa.start_date as "startDate", sa.end_date as "endDate", sa.absence_type as "type" FROM scheduled_absences sa JOIN employees e ON sa.employee_id = e.id WHERE e._id = $1 ORDER BY sa.start_date DESC`,
      [employeeId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});
app.post("/api/absences", upload.single("attachment"), async (req, res) => {
  // upload.single('attachment') - זהו ה-middleware של multer
  const { employeeId, type, startDate, endDate } = req.body;
  const attachmentPath = req.file ? req.file.path : null; // הנתיב לקובץ אם הוא הועלה

  try {
    const empRes = await pool.query("SELECT id FROM employees WHERE _id = $1", [
      employeeId,
    ]);
    if (empRes.rows.length === 0)
      return res.status(404).json({ message: "Employee not found" });
    const internalEmployeeId = empRes.rows[0].id;

    const { rows } = await pool.query(
      // הוספנו את attachment_path לשאילתה
      'INSERT INTO scheduled_absences (employee_id, absence_type, start_date, end_date, attachment_path) VALUES ($1, $2, $3, $4, $5) RETURNING _id, start_date as "startDate", end_date as "endDate", absence_type as "type", attachment_path as "attachmentPath"',
      [internalEmployeeId, type, startDate, endDate, attachmentPath]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error("Error adding absence:", err);
    res.status(500).json({ message: "Server error" });
  }
});

app.delete("/api/absences/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      "DELETE FROM scheduled_absences WHERE _id = $1",
      [id]
    );
    if (result.rowCount === 0)
      return res.status(404).json({ message: "Absence not found" });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// --- Reports & Payroll ---
app.get("/api/reports/monthly-summary/:yearMonth", async (req, res) => {
  const { yearMonth } = req.params;
  const [year, month] = yearMonth.split("-");
  try {
    const { rows } = await pool.query(
      `SELECT e.name, COALESCE(SUM(EXTRACT(EPOCH FROM (a.clock_out - a.clock_in))) / 3600, 0) as "totalHours" FROM employees e LEFT JOIN attendance a ON e.id = a.employee_id WHERE e.role = 'employee' AND a.clock_out IS NOT NULL AND EXTRACT(YEAR FROM a.clock_in) = $1 AND EXTRACT(MONTH FROM a.clock_in) = $2 GROUP BY e.id, e.name HAVING SUM(EXTRACT(EPOCH FROM (a.clock_out - a.clock_in))) > 0 ORDER BY "totalHours" DESC`,
      [year, month]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

app.post("/api/payroll/report", async (req, res) => {
  const { yearMonth, employeeIds, settings } = req.body;
  if (!yearMonth || !employeeIds || employeeIds.length === 0)
    return res.status(400).json({ message: "Missing parameters" });
  try {
    const [year, month] = yearMonth.split("-");
    const { rows } = await pool.query(
      `WITH emp AS (SELECT id, _id, name, hourly_rate FROM employees WHERE _id = ANY($1::varchar[])), work_hours AS (SELECT e.id as employee_id, COALESCE(SUM(EXTRACT(EPOCH FROM (clock_out - clock_in))) / 3600, 0) as total_hours FROM emp e LEFT JOIN attendance a ON e.id = a.employee_id WHERE a.clock_out IS NOT NULL AND EXTRACT(YEAR FROM a.clock_in) = $2 AND EXTRACT(MONTH FROM a.clock_in) = $3 GROUP BY e.id), absences AS (SELECT e.id as employee_id, COALESCE(SUM(CASE WHEN sa.absence_type = 'vacation' THEN sa.end_date - sa.start_date + 1 ELSE 0 END), 0) as vacation_days, COALESCE(SUM(CASE WHEN sa.absence_type = 'sick' THEN sa.end_date - sa.start_date + 1 ELSE 0 END), 0) as sick_days FROM emp e LEFT JOIN scheduled_absences sa ON e.id = sa.employee_id WHERE ((EXTRACT(YEAR FROM sa.start_date) = $2 AND EXTRACT(MONTH FROM sa.start_date) = $3) OR (EXTRACT(YEAR FROM sa.end_date) = $2 AND EXTRACT(MONTH FROM sa.end_date) = $3)) GROUP BY e.id) SELECT e._id as "employeeId", e.name as "employeeName", e.hourly_rate, COALESCE(wh.total_hours, 0) as "totalHours", COALESCE(ab.vacation_days, 0) as "vacationDays", COALESCE(ab.sick_days, 0) as "sickDays" FROM emp e LEFT JOIN work_hours wh ON e.id = wh.employee_id LEFT JOIN absences ab ON e.id = ab.employee_id`,
      [employeeIds, year, month]
    );
    const report = rows.map((r) => {
      const totalPay = r.totalHours * parseFloat(r.hourly_rate);
      const vacationPay = settings.paidVacation
        ? r.vacationDays *
          settings.standardWorkDayHours *
          parseFloat(r.hourly_rate)
        : 0;
      const sickPay = settings.paidSickLeave
        ? r.sickDays * settings.standardWorkDayHours * parseFloat(r.hourly_rate)
        : 0;
      const grossPay = totalPay + vacationPay + sickPay;
      return {
        employeeId: r.employeeId,
        employeeName: r.employeeName,
        totalHours: parseFloat(r.totalHours),
        vacationDays: parseInt(r.vacationDays, 10),
        sickDays: parseInt(r.sickDays, 10),
        totalPay,
        vacationPay,
        sickPay,
        grossPay,
      };
    });
    res.json(report);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// הוסף את ה-route הזה מתחת לשאר ה-import-ים
app.post("/api/auth/login", async (req, res) => {
  const { name, password } = req.body;
  if (!name || !password) {
    return res.status(400).json({ message: "שם משתמש וסיסמה הם שדות חובה" });
  }

  try {
    // מצא את העובד לפי השם
    const { rows } = await pool.query(
      'SELECT *, hourly_rate as "hourlyRate" FROM employees WHERE name = $1',
      [name]
    );
    if (rows.length === 0) {
      return res.status(401).json({ message: "שם משתמש או סיסמה שגויים" });
    }
    const user = rows[0];

    // השווה את הסיסמה שסופקה עם ה-hash השמור ב-DB
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ message: "שם משתמש או סיסמה שגויים" });
    }

    // אם הסיסמה נכונה, צור טוקן
    const payload = { userId: user._id, role: user.role, name: user.name };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "8h" });

    // שלח את הטוקן והמשתמש (ללא הסיסמה) ללקוח
    const { password_hash, ...userWithoutPassword } = user;
    res.json({ token, user: userWithoutPassword });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "שגיאת שרת בעת ניסיון התחברות" });
  }
});
// ודא שהתיקייה קיימת

app.post("/api/users/change-password", async (req, res) => {
  const { userId, oldPassword, newPassword } = req.body; // userId הוא _id

  if (!userId || !oldPassword || !newPassword) {
    return res.status(400).json({ message: "כל השדות הם חובה" });
  }
  if (newPassword.length < 6) {
    return res
      .status(400)
      .json({ message: "סיסמה חדשה חייבת להכיל לפחות 6 תווים" });
  }

  try {
    // מצא את המשתמש לפי ה-ID שלו
    const { rows } = await pool.query(
      "SELECT * FROM employees WHERE _id = $1",
      [userId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ message: "משתמש לא נמצא" });
    }
    const user = rows[0];

    // ודא שהסיסמה הישנה נכונה
    const isMatch = await bcrypt.compare(oldPassword, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ message: "הסיסמה הישנה שגויה" });
    }

    // אם הכל תקין, הצפן את הסיסמה החדשה
    const salt = await bcrypt.genSalt(10);
    const newPasswordHash = await bcrypt.hash(newPassword, salt);

    // עדכן את הסיסמה בבסיס הנתונים
    await pool.query("UPDATE employees SET password_hash = $1 WHERE _id = $2", [
      newPasswordHash,
      userId,
    ]);

    res.json({ message: "הסיסמה עודכנה בהצלחה" });
  } catch (err) {
    console.error("Change password error:", err);
    res.status(500).json({ message: "שגיאת שרת בעת ניסיון שינוי סיסמה" });
  }
});

app.post("/api/users/reset-password", async (req, res) => {
  const { userIdToReset, newPassword } = req.body; // userIdToReset הוא _id של המשתמש שמאפסים לו

  if (!userIdToReset || !newPassword) {
    return res.status(400).json({ message: "יש לספק מזהה משתמש וסיסמה חדשה" });
  }
  if (newPassword.length < 6) {
    return res
      .status(400)
      .json({ message: "סיסמה חדשה חייבת להכיל לפחות 6 תווים" });
  }

  try {
    const salt = await bcrypt.genSalt(10);
    const newPasswordHash = await bcrypt.hash(newPassword, salt);

    const { rows } = await pool.query(
      "UPDATE employees SET password_hash = $1 WHERE _id = $2 RETURNING _id",
      [newPasswordHash, userIdToReset]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "העובד לא נמצא" });
    }

    res.json({ message: "הסיסמה אופסה בהצלחה" });
  } catch (err) {
    console.error("Reset password error:", err);
    res.status(500).json({ message: "שגיאת שרת בעת איפוס הסיסמה" });
  }
});
const PORT = 5000;
app.listen(PORT, () => {
  console.log(`✅ Server is running on port ${PORT}`);
});
