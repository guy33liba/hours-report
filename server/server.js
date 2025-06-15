const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");

// --- Database Configuration ---
// השתמשתי בפרטי ההתחברות שסיפקת, אבל בתוך Pool לביצועים טובים יותר
const pool = new Pool({
  user: "speakcom",
  host: "192.168.1.19",
  database: "guylibaDatabase",
  password: "051262677",
  port: 5432,
});

// בדיקת חיבור לבסיס הנתונים
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

// Middlewares
app.use(cors({ origin: "*" })); // מאפשר גישה מכל מקור (לצורכי פיתוח)
app.use(express.json()); // מאפשר לשרת לקרוא גוף בקשה בפורמט JSON

// =================================================================
// --- API Routes (נקודות קצה) ---
// =================================================================

// --- Employee Routes ---

// GET /api/employees - קבלת כל העובדים
app.get("/api/employees", async (req, res) => {
  try {
    // הוספנו alias לשדות כדי להתאים למה שה-frontend מצפה (למשל hourlyRate במקום hourly_rate)
    const { rows } = await pool.query(
      `SELECT *, hourly_rate as "hourlyRate" FROM employees ORDER BY name ASC`
    );
    res.json(rows);
  } catch (err) {
    console.error("Error fetching employees:", err);
    res.status(500).json({ message: "Server error while fetching employees" });
  }
});

// POST /api/employees - הוספת עובד חדש
app.post("/api/employees", async (req, res) => {
  const { name, department, hourlyRate, role } = req.body;
  if (!name || !department || !hourlyRate) {
    return res.status(400).json({ message: "Missing required fields" });
  }
  try {
    const { rows } = await pool.query(
      'INSERT INTO employees (name, department, hourly_rate, role) VALUES ($1, $2, $3, $4) RETURNING *, hourly_rate as "hourlyRate"',
      [name, department, hourlyRate, role || "employee"]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error("Error adding employee:", err);
    res.status(500).json({ message: "Server error while adding employee" });
  }
});

// PUT /api/employees/:id - עדכון עובד
app.put("/api/employees/:id", async (req, res) => {
  const { id } = req.params; // זהו ה- _id מה-frontend
  const { name, department, hourlyRate, role } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE employees SET name = $1, department = $2, hourly_rate = $3, role = $4 
       WHERE _id = $5 
       RETURNING *, hourly_rate as "hourlyRate"`,
      [name, department, hourlyRate, role, id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ message: "Employee not found" });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error("Error updating employee:", err);
    res.status(500).json({ message: "Server error while updating employee" });
  }
});

// DELETE /api/employees/:id - מחיקת עובד
app.delete("/api/employees/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query("DELETE FROM employees WHERE _id = $1", [
      id,
    ]);
    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Employee not found" });
    }
    res.status(204).send();
  } catch (err) {
    console.error("Error deleting employee:", err);
    res.status(500).json({ message: "Server error while deleting employee" });
  }
});

// --- Attendance Routes ---

// POST /api/attendance/clock-in - החתמת כניסה
app.post("/api/attendance/clock-in", async (req, res) => {
  const { employeeId } = req.body; // זהו ה- _id
  const client = await pool.connect();
  try {
    await client.query("BEGIN"); // התחלת טרנזקציה

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
    if (existing.rows.length > 0) {
      return res.status(400).json({ message: "Employee already clocked in" });
    }

    await client.query(
      "INSERT INTO attendance (employee_id, clock_in) VALUES ($1, NOW())",
      [internalEmployeeId]
    );
    const { rows } = await client.query(
      `UPDATE employees SET status = 'present' WHERE id = $1 RETURNING *, hourly_rate as "hourlyRate"`,
      [internalEmployeeId]
    );

    await client.query("COMMIT"); // סיום טרנזקציה בהצלחה
    res.json(rows[0]);
  } catch (err) {
    await client.query("ROLLBACK"); // ביטול הטרנזקציה במקרה של שגיאה
    console.error("Clock-in error:", err);
    res
      .status(500)
      .json({ message: err.message || "Server error during clock-in" });
  } finally {
    client.release(); // שחרור החיבור חזרה ל-Pool
  }
});

// POST /api/attendance/clock-out - החתמת יציאה
app.post("/api/attendance/clock-out", async (req, res) => {
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

    if (attendanceRes.rows.length === 0) {
      return res
        .status(400)
        .json({ message: "No open clock-in record found to clock-out" });
    }

    const { rows } = await client.query(
      `UPDATE employees SET status = 'absent' WHERE id = $1 RETURNING *, hourly_rate as "hourlyRate"`,
      [internalEmployeeId]
    );

    await client.query("COMMIT");
    res.json(rows[0]);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Clock-out error:", err);
    res
      .status(500)
      .json({ message: err.message || "Server error during clock-out" });
  } finally {
    client.release();
  }
});

// GET /api/attendance/today/open - קבלת רשומות נוכחות פתוחות
app.get("/api/attendance/today/open", async (req, res) => {
  try {
    const { rows } = await pool.query(`
            SELECT a._id, a.clock_in as "clockIn", e._id as employee FROM attendance a
            JOIN employees e ON a.employee_id = e.id
            WHERE a.clock_out IS NULL AND a.clock_in >= CURRENT_DATE
        `);
    res.json(rows);
  } catch (err) {
    console.error("Error fetching open attendance:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// --- Absence Routes ---

// GET /api/absences/employee/:employeeId - קבלת היעדרויות של עובד
app.get("/api/absences/employee/:employeeId", async (req, res) => {
  const { employeeId } = req.params;
  try {
    const { rows } = await pool.query(
      `
            SELECT sa._id, sa.start_date as "startDate", sa.end_date as "endDate", sa.absence_type as "type"
            FROM scheduled_absences sa
            JOIN employees e ON sa.employee_id = e.id
            WHERE e._id = $1
            ORDER BY sa.start_date DESC
        `,
      [employeeId]
    );
    res.json(rows);
  } catch (err) {
    console.error("Error fetching absences:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// POST /api/absences - הוספת היעדרות
app.post("/api/absences", async (req, res) => {
  const { employeeId, type, startDate, endDate } = req.body;
  try {
    const empRes = await pool.query("SELECT id FROM employees WHERE _id = $1", [
      employeeId,
    ]);
    if (empRes.rows.length === 0)
      return res.status(404).json({ message: "Employee not found" });
    const internalEmployeeId = empRes.rows[0].id;

    const { rows } = await pool.query(
      'INSERT INTO scheduled_absences (employee_id, absence_type, start_date, end_date) VALUES ($1, $2, $3, $4) RETURNING _id, start_date as "startDate", end_date as "endDate", absence_type as "type"',
      [internalEmployeeId, type, startDate, endDate]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error("Error adding absence:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// DELETE /api/absences/:id - מחיקת היעדרות
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
    console.error("Error deleting absence:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// --- Payroll Route ---

// POST /api/payroll/report - הפקת דוח שכר
app.post("/api/payroll/report", async (req, res) => {
  const { yearMonth, employeeIds, settings } = req.body;

  if (!yearMonth || !employeeIds || employeeIds.length === 0) {
    return res.status(400).json({ message: "Missing parameters" });
  }

  try {
    const [year, month] = yearMonth.split("-");

    const { rows } = await pool.query(
      `
            WITH emp AS (
                SELECT id, _id, name, hourly_rate
                FROM employees
                WHERE _id = ANY($1::varchar[])
            ),
            work_hours AS (
                SELECT
                    e.id as employee_id,
                    COALESCE(SUM(EXTRACT(EPOCH FROM (clock_out - clock_in))) / 3600, 0) as total_hours
                FROM emp e
                LEFT JOIN attendance a ON e.id = a.employee_id
                WHERE a.clock_out IS NOT NULL
                  AND EXTRACT(YEAR FROM a.clock_in) = $2
                  AND EXTRACT(MONTH FROM a.clock_in) = $3
                GROUP BY e.id
            ),
            absences AS (
                SELECT
                    e.id as employee_id,
                    COALESCE(SUM(CASE WHEN sa.absence_type = 'vacation' THEN sa.end_date - sa.start_date + 1 ELSE 0 END), 0) as vacation_days,
                    COALESCE(SUM(CASE WHEN sa.absence_type = 'sick' THEN sa.end_date - sa.start_date + 1 ELSE 0 END), 0) as sick_days
                FROM emp e
                LEFT JOIN scheduled_absences sa ON e.id = sa.employee_id
                WHERE (
                    (EXTRACT(YEAR FROM sa.start_date) = $2 AND EXTRACT(MONTH FROM sa.start_date) = $3) OR
                    (EXTRACT(YEAR FROM sa.end_date) = $2 AND EXTRACT(MONTH FROM sa.end_date) = $3)
                )
                GROUP BY e.id
            )
            SELECT
                e._id as "employeeId",
                e.name as "employeeName",
                e.hourly_rate,
                COALESCE(wh.total_hours, 0) as "totalHours",
                COALESCE(ab.vacation_days, 0) as "vacationDays",
                COALESCE(ab.sick_days, 0) as "sickDays"
            FROM emp e
            LEFT JOIN work_hours wh ON e.id = wh.employee_id
            LEFT JOIN absences ab ON e.id = ab.employee_id
        `,
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
    console.error("Error generating payroll report:", err);
    res.status(500).json({ message: "Server error generating report" });
  }
});

app.get("/api/attendance/employee/:employeeId/:yearMonth", async (req, res) => {
  const { employeeId, yearMonth } = req.params; // employeeId הוא _id
  const [year, month] = yearMonth.split("-");

  try {
    const empRes = await pool.query("SELECT id FROM employees WHERE _id = $1", [
      employeeId,
    ]);
    if (empRes.rows.length === 0) {
      return res.status(404).json({ message: "Employee not found" });
    }
    const internalEmployeeId = empRes.rows[0].id;

    const { rows } = await pool.query(
      `
    SELECT 
        id,
        clock_in as "clockIn",
        clock_out as "clockOut",
        -- --- שינוי כאן ---
        -- אם המשמרת פתוחה, החזר NULL. אחרת, חשב את הזמן.
        CASE 
            WHEN clock_out IS NOT NULL THEN
                EXTRACT(EPOCH FROM (clock_out - clock_in)) / 3600
            ELSE NULL 
        END as "durationHours"
    FROM attendance
    WHERE employee_id = $1
      AND EXTRACT(YEAR FROM clock_in) = $2
      AND EXTRACT(MONTH FROM clock_in) = $3
    ORDER BY clock_in DESC
`,
      [internalEmployeeId, year, month]
    );

    res.json(rows);
  } catch (err) {
    console.error("Error fetching monthly attendance for employee:", err);
    res
      .status(500)
      .json({ message: "Server error while fetching attendance details" });
  }
});
app.get("/api/reports/monthly-summary/:yearMonth", async (req, res) => {
  const { yearMonth } = req.params;
  const [year, month] = yearMonth.split("-");

  try {
    const { rows } = await pool.query(
      `
            SELECT
                e.name,
                COALESCE(SUM(EXTRACT(EPOCH FROM (a.clock_out - a.clock_in))) / 3600, 0) as "totalHours"
            FROM employees e
            LEFT JOIN attendance a ON e.id = a.employee_id
            WHERE
                e.role = 'employee' AND
                a.clock_out IS NOT NULL AND
                EXTRACT(YEAR FROM a.clock_in) = $1 AND
                EXTRACT(MONTH FROM a.clock_in) = $2
            GROUP BY e.id, e.name
            HAVING SUM(EXTRACT(EPOCH FROM (a.clock_out - a.clock_in))) > 0
            ORDER BY "totalHours" DESC
        `,
      [year, month]
    );

    res.json(rows);
  } catch (err) {
    console.error("Error fetching monthly summary report:", err);
    res.status(500).json({ message: "Server error generating summary report" });
  }
});
const PORT = 5000;
app.listen(PORT, () => {
  console.log(`✅ Server is running on port ${PORT}`);
});
