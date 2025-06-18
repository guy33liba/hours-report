const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const bcrypt = require("bcrypt");
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

// --- פונקציית סקריפט ליצירת מנהל ---
async function createAdmin() {
  console.log("--- יצירת משתמש מנהל חדש ---");
  const name = readline.question("הזן את שם המנהל (למשל, עמי): ");
  if (!name) {
    console.error("שם הוא שדה חובה. התהליך בוטל.");
    return pool.end();
  }
  const password = readline.question("הזן סיסמה חדשה למנהל (לפחות 6 תווים): ", {
    hideEchoBack: true,
  });
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
    console.log("מצפין סיסמה...");
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    console.log(`מוסיף את '${name}' כמנהל...`);
    const query = `INSERT INTO employees (name, department, hourly_rate, role, password_hash) VALUES ($1, $2, $3, 'manager', $4) RETURNING name, role;`;
    const values = [name, department, parseFloat(hourlyRate), passwordHash];
    const result = await client.query(query, values);
    console.log("\n✅ הצלחה!");
    console.log(`מנהל חדש נוצר עם הפרטים הבאים:`);
    console.log(`   - שם: ${result.rows[0].name}`);
    console.log(`   - תפקיד: ${result.rows[0].role}`);
    console.log(`   - סיסמה: (הסיסמה שהזנת)`);
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
  app.use(cors({ origin: "*" }));
  app.use(express.json());
  app.use("/uploads", express.static(uploadsDir));

  // --- Middleware לאימות טוקן ---
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

  // --- Auth & User Routes ---
  app.post("/api/auth/login", async (req, res) => {
    const { name, password } = req.body;
    if (!name || !password) {
      return res.status(400).json({ message: "שם משתמש וסיסמה הם שדות חובה" });
    }

    try {
      // שאילתה מעודכנת שמבטיחה שהשמות של העמודות תמיד יהיו נכונים
      const query = `
            SELECT 
                _id, 
                name, 
                department, 
                role, 
                status, 
                hourly_rate as "hourlyRate", 
                password_hash 
            FROM employees 
            WHERE name = $1
        `;
      const { rows } = await pool.query(query, [name]);

      if (rows.length === 0 || !rows[0].password_hash) {
        return res.status(401).json({ message: "שם משתמש או סיסמה שגויים" });
      }

      const user = rows[0];
      const isMatch = await bcrypt.compare(password, user.password_hash);

      if (!isMatch) {
        return res.status(401).json({ message: "שם משתמש או סיסמה שגויים" });
      }

      const payload = { userId: user._id, role: user.role, name: user.name };
      const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "8h" });

      // יצירת אובייקט משתמש נקי להחזרה, ללא הסיסמה המוצפנת
      const { password_hash, ...userWithoutPassword } = user;

      res.json({ token, user: userWithoutPassword });
    } catch (err) {
      console.error("Login error:", err);
      res.status(500).json({ message: "שגיאת שרת" });
    }
  });
  // ==========================================================
  // <<< הקוד הועבר לכאן - לתוך הפונקציה startServer >>>
  // ==========================================================
  app.post("/api/auth/create-first-admin", async (req, res) => {
    const { name, password, department, hourlyRate } = req.body;

    if (!name || !password || password.length < 6) {
      return res
        .status(400)
        .json({ message: "שם וסיסמה (לפחות 6 תווים) הם שדות חובה." });
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const managerCheck = await client.query(
        "SELECT _id FROM employees WHERE role = 'manager'"
      );
      if (managerCheck.rows.length > 0) {
        await client.query("ROLLBACK");
        return res.status(403).json({
          message: "כבר קיים מנהל במערכת. לא ניתן ליצור מנהל נוסף מדף זה.",
        });
      }
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);
      const query = `INSERT INTO employees (name, department, hourly_rate, role, password_hash) VALUES ($1, $2, $3, 'manager', $4) RETURNING *, hourly_rate as "hourlyRate"`;
      const values = [
        name,
        department || "הנהלה",
        parseFloat(hourlyRate) || 150,
        passwordHash,
      ];
      const { rows } = await client.query(query, values);
      await client.query("COMMIT");
      const { password_hash, ...newUser } = rows[0];
      res.status(201).json(newUser);
    } catch (err) {
      await client.query("ROLLBACK");
      console.error("Error creating first admin:", err);
      res
        .status(500)
        .json({ message: "שגיאה ביצירת המנהל. ייתכן שהשם כבר קיים." });
    } finally {
      client.release();
    }
  });

  app.post(
    "/api/users/change-password",
    authenticateToken,
    async (req, res) => {
      const { userId, oldPassword, newPassword } = req.body;
      if (req.user.userId !== userId)
        return res.status(403).json({ message: "Forbidden" });
      if (!userId || !oldPassword || !newPassword || newPassword.length < 6)
        return res.status(400).json({ message: "קלט לא תקין" });
      try {
        const { rows } = await pool.query(
          "SELECT * FROM employees WHERE _id = $1",
          [userId]
        );
        if (rows.length === 0)
          return res.status(404).json({ message: "משתמש לא נמצא" });
        const user = rows[0];
        const isMatch = await bcrypt.compare(oldPassword, user.password_hash);
        if (!isMatch)
          return res.status(401).json({ message: "הסיסמה הישנה שגויה" });
        const salt = await bcrypt.genSalt(10);
        const newPasswordHash = await bcrypt.hash(newPassword, salt);
        await pool.query(
          "UPDATE employees SET password_hash = $1 WHERE _id = $2",
          [newPasswordHash, userId]
        );
        res.json({ message: "הסיסמה עודכנה בהצלחה" });
      } catch (err) {
        res.status(500).json({ message: "שגיאת שרת" });
      }
    }
  );

  app.post(
    "/api/users/reset-password",
    authenticateToken,
    authorizeManager,
    async (req, res) => {
      // ... all other routes ...
    }
  );

  // ... כאן מופיעות שאר הפונקציות שלך, ללא שינוי ...

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
