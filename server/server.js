// server.js - CORRECTED AND IMPROVED VERSION
const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
const http = require("http");
const jwt = require("jsonwebtoken");
const { Server } = require("socket.io");
const JWT_SECRET = "my-ultra-secure-and-long-secret-key-for-jwt";
const PORT = 5000;

const pool = new Pool({
  user: "speakcom",
  host: "192.168.1.19",
  database: "guyliba",
  password: "051262677",
  port: 5432,
});

const broadcastAttendanceUpdate = () => {
  console.log("Broadcasting attendance update...");
  io.emit("attendance_updated");
};

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);

// עכשיו, נאתחל את Socket.IO ונחבר אותו לשרת שיצרנו.
const io = new Server(server, {
  path: "/socket.io/",
  cors: {
    origin: "*", // מאפשר לכל כתובת להתחבר. לפרודקשן כדאי להגביל לכתובת הדומיין שלך.
    methods: ["GET", "POST"],
  },
});
io.on("connection", (socket) => {
  console.log("✅ משתמש התחבר עם WebSocket! ID:", socket.id);

  socket.on("disconnect", () => {
    console.log("❌ משתמש התנתק. ID:", socket.id);
  });
});

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
  jwt.verify(token, JWT_SECRET, (error, user) => {
    if (error) {
      console.error("JWT Verification Error:", error);
      return res.status(403).json({ message: "Token is not valid" });
    }
    req.user = user;
    next();
  });
};

const authorizeManager = (req, res, next) => {
  if (req.user.role !== "manager") {
    return res.status(403).json({ message: "Access Denied: Manager role required." });
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
      { expiresIn: "24h" }
    );
    delete user.password;
    res.json({ token, user });
  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ message: "שגיאת שרת פנימית" });
  }
});

// --- Employee Routes ---
app.get("/api/employees", authenticateToken, async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT id, name, role, department, hourly_rate, status FROM employees ORDER BY name"
    );
    res.json(rows);
  } catch (error) {
    console.error("!!! FATAL ERROR fetching employees:", error);
    res.status(500).json({ message: "שגיאה קריטית בטעינת עובדים מהשרת." });
  }
});

app.post("/api/employees", authenticateToken, authorizeManager, async (req, res) => {
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
});

app.put("/api/employees/:id", authenticateToken, authorizeManager, async (req, res) => {
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
});

app.post("/api/employees/reset-password", authenticateToken, authorizeManager, async (req, res) => {
  const { userId, newPassword } = req.body;
  if (!userId || !newPassword || newPassword.trim().length < 1) {
    return res.status(400).json({ message: "נדרשים מזהה משתמש וסיסמה חוקית." });
  }
  try {
    const result = await pool.query("UPDATE employees SET password = $1 WHERE id = $2", [
      newPassword.trim(),
      parseInt(userId, 10),
    ]);
    if (result.rowCount === 0) {
      return res.status(404).json({ message: "העובד לא נמצא." });
    }
    res.json({ message: "הסיסמה עודכנה בהצלחה." });
  } catch (error) {
    console.error("Error resetting password:", error);
    res.status(500).json({ message: "שגיאת שרת פנימית." });
  }
});

app.delete("/api/employees/:id", authenticateToken, authorizeManager, async (req, res) => {
  try {
    await pool.query("DELETE FROM employees WHERE id = $1", [req.params.id]);
    res.status(204).send();
  } catch (err) {
    // FIX: Added error logging
    console.error("Error deleting employee:", err);
    res.status(500).json({ message: "שגיאה במחיקת עובד" });
  }
});

// --- Attendance Routes (REFACTORED AND CLEANED) ---
app.get("/api/attendance", authenticateToken, async (req, res) => {
  try {
    const { rows } = await pool.query(`
        SELECT 
            att.id,                         -- חד משמעי: קח את ה-id מטבלת הנוכחות
            att.employee_id AS "employeeId",
            emp.name AS "employeeName",
            att.clock_in AS "clockIn", 
            att.clock_out AS "clockOut", 
            att.breaks, 
            att.on_break AS "onBreak" 
        FROM 
            attendance AS att               -- תן לטבלה את הכינוי "att"
        JOIN 
            employees AS emp ON att.employee_id = emp.id -- תן לטבלה את הכינוי "emp"
        ORDER BY 
            att.clock_in DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error("!!! FATAL ERROR fetching attendance with employee names:", err);
    res.status(500).json({ message: "שגיאה בטעינת דוח נוכחות" });
  }
});

app.post("/api/attendance/clock-in", authenticateToken, async (req, res) => {
  const { employeeId } = req.body;
  try {
    await pool.query(`INSERT INTO attendance (employee_id, clock_in) VALUES ($1, NOW())`, [
      employeeId,
    ]);
    await pool.query("UPDATE employees SET status = 'נוכח' WHERE id = $1", [employeeId]);

    broadcastAttendanceUpdate();
    res.status(201).send();
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

app.post("/api/attendance/clock-out", authenticateToken, async (req, res) => {
  const { employeeId } = req.body;
  try {
    console.log("employeeId:", employeeId);
    if (!employeeId) {
      return res.status(400).json({ message: "Missing employeeId" });
    }
    await pool.query(
      `UPDATE attendance SET clock_out = NOW() WHERE employee_id = $1 AND clock_out IS NULL`,
      [employeeId]
    );
    await pool.query("UPDATE employees SET status = 'לא בעבודה' WHERE id = $1", [employeeId]);
    broadcastAttendanceUpdate();
    res.status(200).send();
  } catch (err) {
    console.error("Error during clock-out:", err);
    res.status(500).json({ message: "Server error" });
  }
});

app.post("/api/attendance/toggle-break", authenticateToken, async (req, res) => {
  const { employeeId } = req.body;
  if (!employeeId) {
    return res.status(400).json({ message: "Employee ID is required" });
  }

  try {
    const lastEntryResult = await pool.query(
      `SELECT * FROM attendance WHERE employee_id = $1 AND clock_out IS NULL ORDER BY clock_in DESC LIMIT 1`,
      [employeeId]
    );

    if (lastEntryResult.rows.length === 0) {
      return res.status(404).json({ message: "No active clock-in found." });
    }

    const entry = lastEntryResult.rows[0];
    const newBreakState = !entry.on_break;
    const now = new Date();
    let breaks = entry.breaks || [];

    if (newBreakState) {
      breaks.push({ start: now, end: null });
    } else {
      const lastBreakIndex = breaks.findLastIndex((b) => b.end === null);
      if (lastBreakIndex !== -1) {
        breaks[lastBreakIndex].end = now;
      }
    }

    await pool.query(`UPDATE attendance SET on_break = $1, breaks = $2 WHERE id = $3`, [
      newBreakState,
      JSON.stringify(breaks),
      entry.id,
    ]);

    broadcastAttendanceUpdate();

    res.status(200).json({ message: "Break status toggled." });
  } catch (err) {
    console.error("ERROR during break toggle:", err);
    res.status(500).json({ message: "Server error." });
  }
});

// Absences Routes/////////////////////////

app.get("/api/absences", authenticateToken, async (req, res) => {
  try {
    // --- שאילתה מתוקנת ומותאמת ---
    const { rows } = await pool.query(`
      SELECT 
        id, 
        employee_id AS "employeeId", 
        type, 
        start_date AS "startDate", 
        end_date AS "endDate",
        notes
      FROM scheduled_absences
    `);
    res.json(rows);
  } catch (err) {
    // --- לוג שגיאות מפורט והודעה כללית ---
    console.error("!!! FATAL ERROR fetching absences:", err);
    res.status(500).json({ message: "שגיאה בטעינת היעדרויות" });
  }
});
app.post("/api/absences", authenticateToken, authorizeManager, async (req, res) => {
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
});

app.delete("/api/absences/:id", authenticateToken, authorizeManager, async (req, res) => {
  try {
    await pool.query("DELETE FROM scheduled_absences WHERE id = $1", [req.params.id]);
    res.status(204).send();
  } catch (err) {
    // FIX: Added error logging
    console.error("Error deleting absence:", err);
    res.status(500).json({ message: "שגיאה במחיקת היעדרות" });
  }
});

// ב-server.js

// ✅✅✅ מחק את כל הפונקציה הישנה והדבק את כל זאת במקומה ✅✅✅


app.get("/api/reports/hours", authenticateToken, authorizeManager, async (req, res) => {
  // ⭐️⭐️⭐️ התיקון נמצא כאן! שיניתי חזרה ל-req.query ⭐️⭐️⭐️
  const { startDate, endDate, employeeId } = req.query;

  console.log("--- [גרסה 100% מתוקנת] מתחיל הפקת דוח שעות ---");
  console.log("--- [גרסה 100% מתוקנת] פרמטרים שהתקבלו מ-URL:", { startDate, endDate, employeeId });

  if (!startDate || !endDate) {
    return res.status(400).json({ message: "נדרשים תאריך התחלה וסיום." });
  }

  try {
    // שלב 1: שליפת הגדרות מהטבלה הנכונה - application_settings
    const settingsResult = await pool.query(
      "SELECT standard_work_day_hours, overtime_rate_percent FROM application_settings WHERE id = 1"
    );

    const dbSettings = settingsResult.rows[0] || {};
    const dailyOvertimeThreshold = parseFloat(dbSettings.standard_work_day_hours || "8.5");
    const overtimeMultiplier = parseFloat(dbSettings.overtime_rate_percent || "125") / 100.0;

    console.log("--- [גרסה 100% מתוקנת] משתמש בהגדרות היומיות:", { dailyOvertimeThreshold, overtimeMultiplier });

    // שלב 2: השאילתה המורכבת לחישוב שעות נוספות יומיות
    let query = `
      WITH DailyHours AS (
        SELECT
          a.employee_id,
          a.clock_in::date AS work_day,
          SUM(
            EXTRACT(EPOCH FROM (a.clock_out - a.clock_in)) -
            COALESCE((
              SELECT SUM(EXTRACT(EPOCH FROM (b.end::TIMESTAMP - b.start::TIMESTAMP)))
              FROM jsonb_to_recordset(a.breaks) AS b(start TEXT, "end" TEXT)
              WHERE b.start IS NOT NULL AND b.end IS NOT NULL
            ), 0)
          ) / 3600.0 AS hours_worked_on_day
        FROM attendance a
        WHERE a.clock_out IS NOT NULL AND a.clock_in::date >= $1 AND a.clock_in::date <= $2
        GROUP BY a.employee_id, work_day
      )
      SELECT
        e.id AS "employeeId", e.name AS "employeeName", e.department, e.hourly_rate AS "hourlyRate",
        COALESCE(SUM(LEAST(dh.hours_worked_on_day, $3)), 0) AS "regularHours",
        COALESCE(SUM(GREATEST(0, dh.hours_worked_on_day - $3)), 0) AS "overtimeHours",
        COALESCE(SUM(dh.hours_worked_on_day), 0) AS "totalHours",
        (
            COALESCE(SUM(LEAST(dh.hours_worked_on_day, $3)), 0) * e.hourly_rate +
            COALESCE(SUM(GREATEST(0, dh.hours_worked_on_day - $3)), 0) * e.hourly_rate * $4
        ) AS "totalPay"
      FROM employees e
      LEFT JOIN DailyHours dh ON e.id = dh.employee_id
      WHERE 1=1
    `;

    const params = [startDate, endDate, dailyOvertimeThreshold, overtimeMultiplier];
    let paramIndex = 5;

    if (employeeId) {
        query += ` AND e.id = $${paramIndex++}`;
        params.push(employeeId);
    } else {
        query += ` AND e.role = 'employee'`;
    }

    query += `
      GROUP BY e.id
      HAVING COALESCE(SUM(dh.hours_worked_on_day), 0) > 0
      ORDER BY e.name;
    `;

    console.log("--- [גרסה 100% מתוקנת] מריץ שאילתה...");
    const { rows } = await pool.query(query, params);

    console.log("--- [גרסה 100% מתוקנת] שאילתה הסתיימה, שולח חזרה ללקוח:", rows);
    res.json(rows);

  } catch (err) {
    console.error("!!! FATAL ERROR בנקודת הקצה של דוח שעות יומי:", err);
    res.status(500).json({ message: "שגיאה בהפקת הדוח." });
  }
});

//SETTINGS////////////////////////

// ✅✅✅ הקוד השלם, הנקי והסופי. יש להחליף את כל הפונקציה שלך בזה. ✅✅✅
app.post("/api/payroll", authenticateToken, authorizeManager, async (req, res) => {
  const { employeeIds, startDate, endDate } = req.body;

  if (
    !employeeIds ||
    !Array.isArray(employeeIds) ||
    employeeIds.length === 0 ||
    !startDate ||
    !endDate
  ) {
    return res.status(400).json({ message: "נדרשים עובדים וטווח תאריכים." });
  }

  try {
    // שלב 1: שליפת כל הנתונים הנדרשים ממסד הנתונים
    const { rows: employeesData } = await pool.query(
      `SELECT id, name, department, hourly_rate FROM employees WHERE id = ANY($1::int[])`,
      [employeeIds]
    );

    if (employeesData.length === 0) {
      return res.json({ details: [] });
    }

    const { rows: allAttendanceData } = await pool.query(
      `SELECT employee_id, clock_in, clock_out, breaks FROM attendance 
             WHERE employee_id = ANY($1::int[]) AND clock_out IS NOT NULL 
             AND clock_in::date >= $2 AND clock_in::date <= $3`,
      [employeeIds, startDate, endDate]
    );

    const { rows: settingsRows } = await pool.query(
      "SELECT standard_work_day_hours, overtime_rate_percent FROM application_settings WHERE id = 1"
    );

    const dbSettings = settingsRows[0] || {};
    const settings = {
      standardWorkDayHours: parseFloat(dbSettings.standard_work_day_hours || 8.5),
      overtimeRatePercent: parseFloat(dbSettings.overtime_rate_percent || 125.0),
    };

    // שלב 2: חישוב השכר עבור כל עובד בנפרד
    const payrollDetails = employeesData.map((employee) => {
      try {
        const hourlyRate = parseFloat(employee.hourly_rate) || 0;

        // סינון רשומות הנוכחות הרלוונטיות לעובד זה בלבד
        const employeeSpecificAttendance = allAttendanceData.filter(
          (entry) => entry.employee_id === employee.id
        );

        // חישוב סך שעות העבודה לכל יום
        const dailyHours = employeeSpecificAttendance.reduce((acc, entry) => {
          const clockInTime = new Date(entry.clock_in).getTime();
          const clockOutTime = new Date(entry.clock_out).getTime();
          if (isNaN(clockInTime) || isNaN(clockOutTime)) return acc;

          let totalDurationMs = clockOutTime - clockInTime;
          let totalBreakMs = 0;
          if (Array.isArray(entry.breaks)) {
            entry.breaks.forEach((b) => {
              if (b.start && b.end) {
                totalBreakMs += new Date(b.end).getTime() - new Date(b.start).getTime();
              }
            });
          }
          const netWorkHours = Math.max(0, (totalDurationMs - totalBreakMs) / 3600000);
          const entryDate = new Date(entry.clock_in).toISOString().split("T")[0];
          acc[entryDate] = (acc[entryDate] || 0) + netWorkHours;
          return acc;
        }, {});

        // חישוב שעות רגילות ונוספות
        let totalRegularHours = 0;
        let totalOvertimeHours = 0;
        for (const date in dailyHours) {
          const hoursOnDay = dailyHours[date];
          const dailyOvertime = Math.max(0, hoursOnDay - settings.standardWorkDayHours);
          const dailyRegular = hoursOnDay - dailyOvertime;

          totalOvertimeHours += dailyOvertime;
          totalRegularHours += dailyRegular;
        }

        // חישוב התשלום הסופי
        const basePay = totalRegularHours * hourlyRate;
        const overtimePay = totalOvertimeHours * hourlyRate * (settings.overtimeRatePercent / 100);
        const totalHours = totalOvertimeHours + totalRegularHours;
        const totalPay = basePay + overtimePay;

        return {
          id: employee.id,
          name: employee.name,
          department: employee.department,
          totalRegularHours,
          totalOvertimeHours,
          basePay,
          overtimePay,
          totalHours,
          totalPay,
        };
      } catch (innerErr) {
        console.error(
          `!!! FAILED TO PROCESS PAYROLL FOR EMPLOYEE: ${employee.name} (ID: ${employee.id}) !!!`,
          innerErr
        );
        return {
          id: employee.id,
          name: employee.name,
          department: employee.department,
          totalRegularHours: 0,
          totalOvertimeHours: 0,
          basePay: 0,
          overtimePay: 0,
          totalPay: 0,
        };
      }
    });

    // שלב 3: שליחת התוצאה הסופית
    res.json({ details: payrollDetails });
  } catch (err) {
    console.error("FATAL ERROR Generating Payroll Report:", err);
    res.status(500).json({ message: "שגיאה קריטית בהפקת דוח השכר." });
  }
});
app.get("/api/settings", authenticateToken, (req, res) => {
  // Return any relevant application settings here
  // For now, returning a dummy object is fine
  res.json({
    companyName: "SpeakCom",
    allowBreaks: true,
  });
});

app.put("/api/settings", authenticateToken, authorizeManager, async (req, res) => {
  const { standardWorkDayHours, overtimeRatePercent } = req.body;
  console.log("Received settings update request with body:", req.body);
  if (standardWorkDayHours === undefined || overtimeRatePercent === undefined) {
    return res.status(400).json({ message: "נדרש לספק את כל ערכי ההגדרות." });
  }
  console.log("2131");

  try {
    await pool.query(
      "UPDATE application_settings SET standard_work_day_hours = $1, overtime_rate_percent = $2 WHERE id = 1",
      [standardWorkDayHours, overtimeRatePercent]
    );
    res.json({ message: "ההגדרות עודכנו בהצלחה." });
  } catch (err) {
    console.error("Error updating settings:", err);
    res.status(500).json({ message: "שגיאה בעדכון ההגדרות." });
  }
});
console.log("kakai");
server.listen(PORT, () => {
  console.log(`✅ Server is running on port ${PORT}`);
});
