// server.js - CORRECTED AND IMPROVED VERSION
const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
const http = require("http");
const jwt = require("jsonwebtoken");
const { Server } = require("socket.io");
const cron = require("node-cron");
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

    const token = jwt.sign({ userId: user.id, role: user.role, name: user.name }, JWT_SECRET, {
      expiresIn: "24h",
    });
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
      "SELECT id, name, role, department, hourly_rate, status, has_auto_clock, COALESCE(vacation_days,0) AS vacation_days FROM employees ORDER BY name"
    );
    res.json(rows);
  } catch (error) {
    console.error("!!! FATAL ERROR fetching employees:", error);
    res.status(500).json({ message: "שגיאה קריטית בטעינת עובדים מהשרת." });
  }
});

app.put(
  "/api/employees/:id/toggle-auto-clock",
  authenticateToken,
  authorizeManager,
  async (req, res) => {
    const { id } = req.params;
    const { hasAutoClock } = req.body; // Expecting a boolean: true or false

    // Basic validation
    if (typeof hasAutoClock !== "boolean") {
      return res.status(400).json({ message: "Invalid hasAutoClock value provided." });
    }

    try {
      const { rows } = await pool.query(
        "UPDATE employees SET has_auto_clock = $1 WHERE id = $2 RETURNING id, name, has_auto_clock",
        [hasAutoClock, id]
      );

      if (rows.length === 0) {
        return res.status(404).json({ message: "Employee not found." });
      }

      res.json({
        message: `Auto-clock for ${rows[0].name} has been ${
          hasAutoClock ? "enabled" : "disabled"
        }.`,
        employee: rows[0],
      });
    } catch (err) {
      console.error(`Error toggling auto-clock for employee ${id}:`, err);
      res.status(500).json({ message: "Server error" });
    }
  }
);

app.post("/api/employees", authenticateToken, authorizeManager, async (req, res) => {
  const { name, department, hourlyRate, role, vacationDays } = req.body;
  const password = "123"; // Default password
  const initialVacation = Number.isFinite(parseInt(vacationDays)) ? parseInt(vacationDays) : 0;
  try {
    // FIX: Standardized to hourly_rate and include vacation_days
    const { rows } = await pool.query(
      "INSERT INTO employees (name, department, hourly_rate, role, password, vacation_days) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, name, department, role, hourly_rate, vacation_days",
      [name, department, hourlyRate, role, password, initialVacation]
    );
    console.log(
      `Created employee ${rows[0].name} (id=${rows[0].id}) with ${rows[0].vacation_days} vacation days`
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
  const { name, department, hourlyRate, role, vacationDays } = req.body;
  try {
    // FIX: Standardized to hourly_rate and include vacation_days
    const { rows } = await pool.query(
      "UPDATE employees SET name = $1, department = $2, hourly_rate = $3, role = $4, vacation_days = $5 WHERE id = $6 RETURNING id, name, department, role, hourly_rate, vacation_days",
      [name, department, hourlyRate, role, vacationDays, id]
    );
    console.log(
      `Updated employee ${rows[0].name} (id=${rows[0].id}) -> vacation_days=${rows[0].vacation_days}`
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
  // Or use the provided employeeId if an admin/manager is clocking someone in.
  const employeeId = req.body.employeeId || req.user.id;
  const now = new Date();

  try {
    const client = await pool.connect(); // Use a client for transaction

    // --- NEW, SAFER LOGIC STARTS HERE ---

    // 1. Check if this employee has a shift that is still open (clock_out IS NULL).
    const { rows: openShifts } = await client.query(
      `SELECT * FROM attendance WHERE employee_id = $1 AND clock_out IS NULL ORDER BY clock_in DESC`,
      [employeeId]
    );

    // 2. If there are any open shifts, we must handle them.
    if (openShifts.length > 0) {
      console.warn(`WARN: Employee ${employeeId} has an open shift. Auto-closing it.`);

      for (const shift of openShifts) {
        // Option 1: A simple auto-clock-out. You could make this smarter.
        // Let's assume a shift cannot be longer than 12 hours.
        const clockInTime = new Date(shift.clock_in);
        const autoClockOutTime = new Date(clockInTime.getTime() + 12 * 60 * 60 * 1000); // 12 hours after clock-in

        await client.query(`UPDATE attendance SET clock_out = $1 WHERE id = $2`, [
          autoClockOutTime,
          shift.id,
        ]);
        console.warn(`- Auto-closed shift ID ${shift.id} which started at ${shift.clock_in}`);
      }
    }

    // --- END OF NEW LOGIC ---

    // 3. Now that any old shifts are closed, we can safely create the new clock-in record.
    const { rows: newEntries } = await client.query(
      `INSERT INTO attendance (employee_id, clock_in) VALUES ($1, $2) RETURNING *`,
      [employeeId, now]
    );

    // 4. Update the employee's main status.
    await client.query(`UPDATE employees SET status = 'present' WHERE id = $1`, [employeeId]);

    client.release(); // Release the client back to the pool

    // Notify all clients that the data has changed
    broadcastAttendanceUpdate();

    // Return the newly created entry to the frontend for an immediate UI update
    res.status(201).json({ message: "Clocked in successfully", entry: newEntries[0] });
  } catch (err) {
    console.error("Error during clock-in:", err);
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
  // If type is vacation, we'll decrement employee.vacation_days accordingly (transactionally)
  if (!employeeId || !type || !startDate || !endDate) {
    return res.status(400).json({ message: "נדרשים employeeId, type, startDate, endDate" });
  }

  const start = new Date(startDate);
  const end = new Date(endDate);
  // Calculate inclusive days
  const msPerDay = 24 * 60 * 60 * 1000;
  const days = Math.round((end.setHours(0, 0, 0, 0) - start.setHours(0, 0, 0, 0)) / msPerDay) + 1;

  const clientDb = await pool.connect();
  try {
    await clientDb.query("BEGIN");

    if (type === "vacation") {
      // Lock employee row
      const { rows: empRows } = await clientDb.query(
        "SELECT id, name, COALESCE(vacation_days,0) AS vacation_days FROM employees WHERE id = $1 FOR UPDATE",
        [employeeId]
      );
      if (empRows.length === 0) {
        await clientDb.query("ROLLBACK");
        return res.status(404).json({ message: "Employee not found" });
      }
      const emp = empRows[0];
      console.log(
        `Employee ${emp.name} has ${emp.vacation_days} vacation days before booking ${days} day(s)`
      );
      if (emp.vacation_days < days) {
        await clientDb.query("ROLLBACK");
        return res.status(400).json({ message: "אין מספיק ימי חופשה" });
      }
      // insert absence
      const { rows: inserted } = await clientDb.query(
        'INSERT INTO scheduled_absences (employee_id, type, start_date, end_date) VALUES ($1, $2, $3, $4) RETURNING id, employee_id as "employeeId", type, start_date as "startDate", end_date as "endDate"',
        [employeeId, type, startDate, endDate]
      );
      // decrement vacation days
      const newBalance = emp.vacation_days - days;
      await clientDb.query("UPDATE employees SET vacation_days = $1 WHERE id = $2", [
        newBalance,
        employeeId,
      ]);
      await clientDb.query("COMMIT");
      console.log(`Booked ${days} vacation day(s) for ${emp.name}. New balance: ${newBalance}`);
      broadcastAttendanceUpdate();
      return res.status(201).json(inserted[0]);
    } else {
      // Non-vacation: simple insert
      const { rows } = await clientDb.query(
        'INSERT INTO scheduled_absences (employee_id, type, start_date, end_date) VALUES ($1, $2, $3, $4) RETURNING id, employee_id as "employeeId", type, start_date as "startDate", end_date as "endDate"',
        [employeeId, type, startDate, endDate]
      );
      await clientDb.query("COMMIT");
      broadcastAttendanceUpdate();
      return res.status(201).json(rows[0]);
    }
  } catch (err) {
    await clientDb.query("ROLLBACK");
    console.error("Error adding absence (transaction):", err);
    return res.status(500).json({ message: "שגיאה בהוספת היעדרות" });
  } finally {
    clientDb.release();
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

// Endpoint to set vacation days explicitly for an employee
app.put(
  "/api/employees/:id/vacation-days",
  authenticateToken,
  authorizeManager,
  async (req, res) => {
    const { id } = req.params;
    const { vacationDays } = req.body;
    if (vacationDays === undefined || isNaN(parseInt(vacationDays))) {
      return res.status(400).json({ message: "vacationDays must be provided as a number" });
    }
    try {
      const { rows } = await pool.query(
        "UPDATE employees SET vacation_days = $1 WHERE id = $2 RETURNING id, name, vacation_days",
        [parseInt(vacationDays, 10), id]
      );
      if (rows.length === 0) return res.status(404).json({ message: "Employee not found" });
      console.log(
        `Set vacation_days for employee ${rows[0].name} (id=${rows[0].id}) -> ${rows[0].vacation_days}`
      );
      res.json(rows[0]);
    } catch (err) {
      console.error("Error setting vacation days:", err);
      res.status(500).json({ message: "שגיאה בעדכון ימי חופשה" });
    }
  }
);

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

    console.log("--- [גרסה 100% מתוקנת] משתמש בהגדרות היומיות:", {
      dailyOvertimeThreshold,
      overtimeMultiplier,
    });

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

  console.log("\n\n--- PAYROLL REPORT STARTED ---");
  console.log(`Received request for employees [${employeeIds}] from ${startDate} to ${endDate}`);

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
    // --- שלב 1: שליפת נתונים ---
    const { rows: employeesData } = await pool.query(
      `SELECT id, name, department, hourly_rate FROM employees WHERE id = ANY($1::int[])`,
      [employeeIds]
    );
    console.log(`Step 1.1: Found ${employeesData.length} employees in the database.`);

    if (employeesData.length === 0) return res.json({ details: [] });

    const { rows: allAttendanceData } = await pool.query(
      `SELECT id, employee_id, clock_in, clock_out, breaks FROM attendance 
       WHERE employee_id = ANY($1::int[]) AND clock_out IS NOT NULL 
       AND clock_in::date <= $3::date AND clock_out::date >= $2::date`,
      [employeeIds, startDate, endDate]
    );
    console.log(`Step 1.2: Found ${allAttendanceData.length} relevant attendance records.`);

    const { rows: settingsRows } = await pool.query(
      "SELECT * FROM application_settings WHERE id = 1"
    );
    const settings = {
      standardWorkDayHours: parseFloat(settingsRows[0]?.standard_work_day_hours || 8.5),
      overtimeRatePercent: parseFloat(settingsRows[0]?.overtime_rate_percent || 125.0),
    };
    console.log("Step 1.3: Using settings:", settings);

    // --- שלב 2: חישוב השכר ---
    const payrollDetails = employeesData.map((employee) => {
      try {
        const hourlyRate = parseFloat(employee.hourly_rate) || 0;
        const employeeAttendance = allAttendanceData.filter((e) => e.employee_id === employee.id);

        const dailyHours = {};

        for (const entry of employeeAttendance) {
          console.log(
            `    -> Analyzing entry ID ${entry.id}: from ${entry.clock_in} to ${entry.clock_out}`
          );
          let current = new Date(entry.clock_in);
          let end = new Date(entry.clock_out);

          while (current < end) {
            const dayEnd = new Date(current);
            dayEnd.setHours(23, 59, 59, 999);
            const effectiveEnd = end < dayEnd ? end : dayEnd;
            let durationMs = effectiveEnd - current;
            const netWorkHours = Math.max(0, durationMs / 3600000);
            const entryDate = current.toISOString().split("T")[0];

            if (entryDate >= startDate && entryDate <= endDate) {
              if (!dailyHours[entryDate]) dailyHours[entryDate] = 0;
              dailyHours[entryDate] += netWorkHours;
              console.log(
                `       - Allocated ${netWorkHours.toFixed(2)} hours to date: ${entryDate}`
              );
            }
            current = new Date(dayEnd.getTime() + 1);
          }
        }

        console.log("  Finished splitting shifts. Calculated daily hours:", dailyHours);

        let totalRegularHours = 0;
        let totalOvertimeHours = 0;
        for (const date in dailyHours) {
          const hoursOnDay = dailyHours[date];
          const dailyOvertime = Math.max(0, hoursOnDay - settings.standardWorkDayHours);
          totalOvertimeHours += dailyOvertime;
          totalRegularHours += hoursOnDay - dailyOvertime;
        }

        console.log(
          `  Total Regular Hours: ${totalRegularHours.toFixed(
            2
          )}, Total Overtime Hours: ${totalOvertimeHours.toFixed(2)}`
        );

        const basePay = totalRegularHours * hourlyRate;
        const overtimePay = totalOvertimeHours * hourlyRate * (settings.overtimeRatePercent / 100);
        const totalHours = totalOvertimeHours + totalRegularHours;
        const totalPay = basePay + overtimePay;

        console.log(
          `  Final Pay: Base=₪${basePay.toFixed(2)}, Overtime=₪${overtimePay.toFixed(
            2
          )}, Total=₪${totalPay.toFixed(2)}`
        );

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
        console.error(`!!! FAILED TO PROCESS PAYROLL FOR ${employee.name} !!!`, innerErr);
        return { id: employee.id, name: employee.name, error: true };
      }
    });

    console.log("\n--- PAYROLL REPORT FINISHED ---\n");
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
console.log("SCHEDULER: Test mode is ACTIVE. Tasks will run every minute.");

// Task 1: Auto Clock-In Test (runs every minute)
cron.schedule(
  "*/1 * * * *",
  async () => {
    const currentTime = new Date().toLocaleTimeString("he-IL");
    console.log(`\n--- [${currentTime}] SCHEDULER: Waking up to check for CLOCK-INS ---`);

    try {
      console.log("   Step 1: Looking for employees with has_auto_clock = true...");
      const { rows: employeesToClockIn } = await pool.query(
        `SELECT id, name FROM employees WHERE has_auto_clock = true`
      );

      if (employeesToClockIn.length === 0) {
        console.log("   Step 2: No employees found for auto clock-in. Task finished.");
        return;
      }

      console.log(
        `   Step 2: Found ${employeesToClockIn.length} employee(s): [${employeesToClockIn
          .map((e) => e.name)
          .join(", ")}]`
      );

      for (const employee of employeesToClockIn) {
        console.log(`   -> Processing ${employee.name} (ID: ${employee.id})...`);

        const { rows: existing } = await pool.query(
          `SELECT id FROM attendance WHERE employee_id = $1 AND clock_out IS NULL`,
          [employee.id]
        );

        if (existing.length === 0) {
          console.log(`      - Status: Not clocked in. Creating new record.`);
          await pool.query(`INSERT INTO attendance (employee_id, clock_in) VALUES ($1, NOW())`, [
            employee.id,
          ]);
          // Use consistent internal status values
          await pool.query("UPDATE employees SET status = 'present' WHERE id = $1", [employee.id]);
          console.log(`      - SUCCESS: Auto-clocked in ${employee.name}.`);
        } else {
          console.log(`      - Status: Already clocked in. Skipping.`);
        }
      }
      console.log(`--- [${currentTime}] SCHEDULER: CLOCK-IN check finished. ---`);
    } catch (err) {
      console.error("SCHEDULER: FATAL ERROR during auto clock-in task:", err);
    }
  },
  {
    timezone: "Asia/Jerusalem",
  }
);

// Task 2: Auto Clock-Out Test (runs every minute, but only acts between 17:00 and 17:01 for safety)
cron.schedule(
  "*/1 * * * *",
  async () => {
    const currentTime = new Date().toLocaleTimeString("he-IL");
    const currentHour = new Date().getHours();

    // Safety check to prevent accidental clock-outs during the day while testing
    if (currentHour < 17) {
      // console.log(`--- [${currentTime}] SCHEDULER: It's before 5 PM, skipping CLOCK-OUT check. ---`);
      return;
    }

    try {
      console.log("   Step 1: Looking for clocked-in employees with has_auto_clock = true...");
      const { rows: employeesToClockOut } = await pool.query(
        `SELECT id, name FROM employees WHERE has_auto_clock = true AND status = 'נוכח'`
      );

      if (employeesToClockOut.length === 0) {
        console.log("   Step 2: No employees found for auto clock-out. Task finished.");
        return;
      }

      for (const employee of employeesToClockOut) {
        await pool.query(
          `UPDATE attendance SET clock_out = NOW() WHERE employee_id = $1 AND clock_out IS NULL`,
          [employee.id]
        );
        // Use consistent internal status values
        await pool.query("UPDATE employees SET status = 'not_working' WHERE id = $1", [
          employee.id,
        ]);
      }
    } catch (err) {
      console.error("SCHEDULER: FATAL ERROR during auto clock-out task:", err);
    }
  },
  {
    timezone: "Asia/Jerusalem",
  }
);

server.listen(PORT, () => {
  console.log(`✅ Server is running on port ${PORT}`);
});
