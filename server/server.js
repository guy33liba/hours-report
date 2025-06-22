const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
// const bcrypt = require("bcrypt"); // INSECURE CHANGE: bcrypt is no longer used.
const jwt = require("jsonwebtoken");
const readline = require("readline-sync");
require("dotenv").config();

// --- הגדרות ---
const JWT_SECRET = process.env.JWT_SECRET || "your_super_secret_key_12345";
const pool = new Pool({
  user: process.env.DB_USER || "speakcom",
  host: process.env.DB_HOST || "192.168.1.19",
  database: process.env.DB_NAME || "guylibaDatabase",
  password: process.env.DB_PASSWORD || "051262677",
  port: process.env.DB_PORT || 5432,
});

// --- פונקציית סקריפט ליצירת מנהל (לשימוש ידני) ---
async function createAdmin() {
  console.log("--- יצירת משתמש מנהל חדש ---");
  const name = readline.question("הזן את שם המנהל (למשל, עמי): ");
  if (!name) {
    console.error("שם הוא שדה חובה. התהליך בוטל.");
    return pool.end();
  }
  const password = readline.question("הזן סיסמה חדשה למנהל (לפחות 6 תווים): ");
  if (password.length < 6) {
    console.error("הסיסמה חייבת להכיל לפחות 6 תווים. התהליך בוטל.");
    return pool.end();
  }
  const department =
    readline.question("הזן מחלקה (ברירת מחדל: הנהלה): ") || "הנהלה";
  const hourlyRate =
    readline.question("הזן תעריף שעתי (ברירת מחדל: 150): ") || 150.0;
  try {
    const client = await pool.connect();
    console.log("מחובר לבסיס הנתונים...");
    const existingUser = await client.query(
      "SELECT * FROM employees WHERE name = $1",
      [name]
    );
    if (existingUser.rows.length > 0) {
      console.error(`שגיאה: משתמש בשם '${name}' כבר קיים במערכת.`);
      client.release();
      return;
    }

    // INSECURE CHANGE: Storing password directly without hashing.
    const password_hash = password;
    console.log(`מוסיף את '${name}' כמנהל...`);
    const query = `INSERT INTO employees (name, department, hourly_rate, role, password_hash) VALUES ($1, $2, $3, 'manager', $4) RETURNING name, role;`;
    const values = [name, department, parseFloat(hourlyRate), password_hash];
    const result = await client.query(query, values);

    console.log("\n✅ הצלחה!");
    console.log(`מנהל חדש נוצר עם הפרטים הבאים:`);
    console.log(`   - שם: ${result.rows[0].name}`);
    console.log(`   - תפקיד: ${result.rows[0].role}`);
    client.release();
  } catch (error) {
    console.error("\n❌ שגיאה בתהליך יצירת המנהל:", error.message);
  } finally {
    await pool.end();
  }
}

// --- פונקציית הפעלת השרת ---
function startServer() {
  pool.query("SELECT NOW()", (err) => {
    if (err) {
      console.error("❌ Database connection error", err.stack);
      process.exit(1);
    }
    console.log("✅ Database connected successfully.");
  });

  const app = express();
  const uploadsDir = path.join(__dirname, "uploads");
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);

  const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, "uploads/"),
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      cb(
        null,
        file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname)
      );
    },
  });
  const upload = multer({ storage: storage });

  app.set("trust proxy", true);
  const allowedOrigins = [
    "http://localhost:5173",
    "http://localhost:3000",
    "http://192.168.1.19",
    "http://192.168.1.19:5173",
  ];

  app.use(
    cors({
      origin: function (origin, callback) {
        if (!origin || allowedOrigins.indexOf(origin) !== -1) {
          callback(null, true);
        } else {
          callback(new Error("Not allowed by CORS"));
        }
      },
    })
  );
  app.use(express.json());
  app.use("/uploads", express.static(uploadsDir));

  // --- Middleware ---
  const authenticateToken = (req, res, next) => {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];
    if (token == null) return res.sendStatus(401);
    jwt.verify(token, JWT_SECRET, (err, user) => {
      if (err) return res.sendStatus(403);
      req.user = user;
      next();
    });
  };
  const authorizeManager = (req, res, next) => {
    if (req.user.role !== "manager") {
      return res
        .status(403)
        .json({ message: "Access denied: Requires manager role." });
    }
    next();
  };

  // --- Auth Routes ---
  app.post("/api/auth/login", async (req, res) => {
    const { name, password } = req.body;
    if (!name || !password) {
      return res.status(400).json({ message: "שם משתמש וסיסמה הם שדות חובה" });
    }

    try {
      const managerCheck = await pool.query(
        "SELECT 1 FROM employees WHERE role = 'manager' LIMIT 1"
      );
      if (managerCheck.rows.length === 0) {
        return res.status(401).json({ message: "לא קיימים מנהלים במערכת" });
      }

      const query = `SELECT _id, name, department, role, status, hourly_rate as "hourlyRate", password_hash FROM employees WHERE name = $1`;
      const { rows } = await pool.query(query, [name]);

      // --- BUG FIX ---
      // The previous combined check `if (rows.length === 0 || !rows[0].password_hash)`
      // caused a crash when `rows.length` was 0 because it tried to access `rows[0]` which was undefined.
      // By separating the checks, we prevent the crash.
      if (rows.length === 0) {
        return res.status(401).json({ message: "שם משתמש או סיסמה שגויים" });
      }

      const user = rows[0];
      // Now it's safe to check user properties
      if (!user.password_hash) {
        return res.status(401).json({ message: "שם משתמש או סיסמה שגויים" });
      }

      // INSECURE CHANGE: Simple string comparison instead of bcrypt.compare.
      const isMatch = password === user.password_hash;

      if (!isMatch) {
        return res.status(401).json({ message: "שם משתמש או סיסמה שגויים" });
      }

      const payload = { userId: user._id, role: user.role, name: user.name };
      const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "8h" });

      const { password_hash, ...userWithoutPassword } = user;
      res.json({ token, user: userWithoutPassword });
    } catch (err) {
      console.error("Login error:", err);
      res.status(500).json({ message: "שגיאת שרת" });
    }
  });

  app.post("/api/auth/create-first-admin", async (req, res) => {
    try {
      const { rows: managerRows } = await pool.query(
        "SELECT COUNT(*) as count FROM employees WHERE role = 'manager'"
      );
      if (parseInt(managerRows[0].count, 10) > 0) {
        return res.status(403).json({
          message:
            "ניתן ליצור מנהל ראשון רק כאשר לא קיימים מנהלים אחרים במערכת.",
        });
      }

      const { name, password, department, hourlyRate } = req.body;
      if (!name || !password || password.length < 6) {
        return res
          .status(400)
          .json({ message: "שם וסיסמה (6+ תווים) הם שדות חובה." });
      }

      // INSECURE CHANGE: Storing password directly without hashing.
      const passwordHash = password;

      const { rows } = await pool.query(
        `INSERT INTO employees (name, department, hourly_rate, role, password_hash) VALUES ($1, $2, $3, 'manager', $4) RETURNING *, hourly_rate as "hourlyRate"`,
        [name, department || "הנהלה", hourlyRate || 150.0, passwordHash]
      );

      const { password_hash, ...newUser } = rows[0];
      res.status(201).json(newUser);
    } catch (error) {
      console.error("Error creating first admin:", error);
      res.status(500).json({ message: "שגיאה ביצירת המנהל הראשון." });
    }
  });

  app.post(
    "/api/users/reset-password",
    authenticateToken,
    authorizeManager,
    async (req, res) => {
      const { userIdToReset, newPassword } = req.body;
      if (!userIdToReset || !newPassword || newPassword.length < 6)
        return res.status(400).json({ message: "קלט לא תקין" });
      try {
        // INSECURE CHANGE: Storing new password directly without hashing.
        const newPasswordHash = newPassword;

        const { rows } = await pool.query(
          "UPDATE employees SET password_hash = $1 WHERE _id = $2 RETURNING _id",
          [newPasswordHash, userIdToReset]
        );
        if (rows.length === 0)
          return res.status(404).json({ message: "העובד לא נמצא" });
        res.json({ message: "הסיסמה אופסה בהצלחה" });
      } catch (err) {
        res.status(500).json({ message: "שגיאת שרת" });
      }
    }
  );

  // --- Employee Routes ---
  app.get(
    "/api/employees",
    authenticateToken,
    authorizeManager,
    async (req, res) => {
      try {
        const { rows } = await pool.query(
          `SELECT _id, name, department, role, status, hourly_rate as "hourlyRate" FROM employees ORDER BY name ASC`
        );
        res.json(rows);
      } catch (err) {
        res.status(500).json({ message: "Server error" });
      }
    }
  );

  app.post(
    "/api/employees",
    authenticateToken,
    authorizeManager,
    async (req, res) => {
      const { name, department, hourlyRate, role, password } = req.body;
      if (
        !name ||
        !department ||
        !hourlyRate ||
        !password ||
        password.length < 6
      ) {
        return res
          .status(400)
          .json({ message: "כל השדות, כולל סיסמה (לפחות 6 תווים), הם חובה" });
      }
      try {
        // INSECURE CHANGE: Storing password directly without hashing.
        const passwordHash = password;

        const { rows } = await pool.query(
          `INSERT INTO employees (name, department, hourly_rate, role, password_hash) VALUES ($1, $2, $3, $4, $5) RETURNING *, hourly_rate as "hourlyRate"`,
          [name, department, hourlyRate, role || "employee", passwordHash]
        );
        const { password_hash, ...newUser } = rows[0];
        res.status(201).json(newUser);
      } catch (err) {
        res
          .status(500)
          .json({ message: "שגיאה בהוספת עובד. ייתכן שהשם כבר קיים." });
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
          `UPDATE employees SET name = $1, department = $2, hourly_rate = $3, role = $4 WHERE _id = $5 RETURNING *, hourly_rate as "hourlyRate"`,
          [name, department, hourlyRate, role, id]
        );
        if (rows.length === 0)
          return res.status(404).json({ message: "Employee not found" });
        const { password_hash, ...user } = rows[0];
        res.json(user);
      } catch (err) {
        res.status(500).json({ message: "Server error" });
      }
    }
  );

  app.delete(
    "/api/employees/:id",
    authenticateToken,
    authorizeManager,
    async (req, res) => {
      const { id } = req.params;
      try {
        const result = await pool.query(
          "DELETE FROM employees WHERE _id = $1",
          [id]
        );
        if (result.rowCount === 0)
          return res.status(404).json({ message: "Employee not found" });
        res.status(204).send();
      } catch (err) {
        res.status(500).json({ message: "Server error" });
      }
    }
  );

  // --- Attendance Routes ---
  app.post("/api/attendance/clock-in", authenticateToken, async (req, res) => {
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
      const { password_hash, ...user } = rows[0];
      res.json(user);
    } catch (err) {
      await client.query("ROLLBACK");
      res.status(500).json({ message: err.message || "Server error" });
    } finally {
      client.release();
    }
  });

  app.post("/api/attendance/clock-out", authenticateToken, async (req, res) => {
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
      const { password_hash, ...user } = rows[0];
      res.json(user);
    } catch (err) {
      await client.query("ROLLBACK");
      res.status(500).json({ message: err.message || "Server error" });
    } finally {
      client.release();
    }
  });

  app.get("/api/attendance/today/open", authenticateToken, async (req, res) => {
    try {
      const { rows } = await pool.query(
        `SELECT a._id, a.clock_in as "clockIn", e._id as employee FROM attendance a JOIN employees e ON a.employee_id = e.id WHERE a.clock_out IS NULL AND a.clock_in >= CURRENT_DATE`
      );
      res.json(rows);
    } catch (err) {
      res.status(500).json({ message: "Server error" });
    }
  });

  app.get(
    "/api/attendance/employee/:employeeId/:yearMonth",
    authenticateToken,
    async (req, res) => {
      const { employeeId, yearMonth } = req.params;
      const [year, month] = yearMonth.split("-");
      try {
        const empRes = await pool.query(
          "SELECT id FROM employees WHERE _id = $1",
          [employeeId]
        );
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
    }
  );

  // --- Absence Routes ---
  app.post(
    "/api/absences",
    authenticateToken,
    upload.single("attachment"),
    async (req, res) => {
      const { employeeId, type, startDate, endDate } = req.body;
      const attachmentPath = req.file ? req.file.path : null;
      try {
        const empRes = await pool.query(
          "SELECT id FROM employees WHERE _id = $1",
          [employeeId]
        );
        if (empRes.rows.length === 0)
          return res.status(404).json({ message: "Employee not found" });
        const internalEmployeeId = empRes.rows[0].id;
        const { rows } = await pool.query(
          'INSERT INTO scheduled_absences (employee_id, absence_type, start_date, end_date, attachment_path) VALUES ($1, $2, $3, $4, $5) RETURNING _id, start_date as "startDate", end_date as "endDate", absence_type as "type", attachment_path as "attachmentPath"',
          [internalEmployeeId, type, startDate, endDate, attachmentPath]
        );
        res.status(201).json(rows[0]);
      } catch (err) {
        res.status(500).json({ message: "Server error" });
      }
    }
  );
  app.get(
    "/api/absences/employee/:employeeId",
    authenticateToken,
    async (req, res) => {
      const { employeeId } = req.params;
      try {
        const query = `
            SELECT 
                sa._id, 
                sa.start_date as "startDate", 
                sa.end_date as "endDate", 
                sa.absence_type as "type", 
                sa.attachment_path as "attachmentPath" 
            FROM scheduled_absences sa 
            JOIN employees e ON sa.employee_id = e.id 
            WHERE e._id = $1 
            ORDER BY sa.start_date DESC
        `;
        const { rows } = await pool.query(query, [employeeId]);
        res.json(rows);
      } catch (err) {
        console.error("Error fetching absences for employee:", err);
        res
          .status(500)
          .json({ message: "Server error while fetching absences" });
      }
    }
  );
  app.delete(
    "/api/absences/:id",
    authenticateToken,
    authorizeManager,
    async (req, res) => {
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
    }
  );

  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`✅ Server is running on port ${PORT}`);
  });
}

// --- נקודת ההתחלה הראשית ---
if (process.argv.includes("--create-admin")) {
  createAdmin();
} else {
  startServer();
}
