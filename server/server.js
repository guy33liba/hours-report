const express = require("express");
const { Pool } = require("pg");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cors = require("cors"); // For cross-origin requests from React

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = "your_jwt_secret"; // CHANGE THIS IN PRODUCTION!

// PostgreSQL connection pool
const pool = new Pool({
  user: "speakcom",
  host: "192.168.1.19",
  database: "guylibaDatabase",
  password: "051262677",
  port: 5432,
});

app.use(cors());
app.use(express.json()); // For parsing JSON request bodies

// Middleware for authenticating JWTs
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (token == null) return res.sendStatus(401);

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user; // user contains { id, email, isAdmin }
    next();
  });
};

// Middleware for admin access
const authorizeAdmin = (req, res, next) => {
  if (!req.user || !req.user.isAdmin) {
    return res
      .status(403)
      .json({ message: "Access denied: Admin privileges required." });
  }
  next();
};

// --- Auth Endpoints ---

// Register
app.post("/api/register", async (req, res) => {
  const { email, password, name } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      "INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3) RETURNING id, email, name, is_admin",
      [email, hashedPassword, name]
    );
    res
      .status(201)
      .json({ message: "User registered successfully", user: result.rows[0] });
  } catch (err) {
    console.error("Registration error:", err);
    if (err.code === "23505") {
      // Duplicate email error code
      return res.status(409).json({ message: "Email already exists." });
    }
    res.status(500).json({ message: "Error registering user." });
  }
});

// Login
app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await pool.query("SELECT * FROM users WHERE email = $1", [
      email,
    ]);
    const user = result.rows[0];

    if (!user) {
      return res.status(400).json({ message: "Invalid credentials." });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials." });
    }

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        isAdmin: user.is_admin,
        name: user.name,
      },
      JWT_SECRET,
      { expiresIn: "1h" }
    );
    res.json({
      message: "Logged in successfully",
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        isAdmin: user.is_admin,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Error logging in." });
  }
});

// --- Attendance Endpoints ---

// Clock In
app.post("/api/attendance/clock-in", authenticateToken, async (req, res) => {
  const { id: userId, name: userName } = req.user;
  const now = new Date();
  const today = now.toISOString().split("T")[0]; // YYYY-MM-DD

  try {
    // Check for active session
    const activeSession = await pool.query(
      "SELECT * FROM attendance_sessions WHERE user_id = $1 AND clock_out_time IS NULL",
      [userId]
    );

    if (activeSession.rows.length > 0) {
      return res.status(400).json({
        message: "You have an active session. Please clock out first.",
      });
    }

    const result = await pool.query(
      "INSERT INTO attendance_sessions (user_id, user_name, clock_in_time, date) VALUES ($1, $2, $3, $4) RETURNING *",
      [userId, userName, now, today]
    );
    res
      .status(201)
      .json({ message: "Clocked in successfully", session: result.rows[0] });
  } catch (err) {
    console.error("Clock-in error:", err);
    res.status(500).json({ message: "Error clocking in." });
  }
});

// Clock Out
app.put(
  "/api/attendance/clock-out/:sessionId",
  authenticateToken,
  async (req, res) => {
    const { sessionId } = req.params;
    const { id: userId } = req.user;
    const now = new Date();

    try {
      const sessionResult = await pool.query(
        "SELECT clock_in_time FROM attendance_sessions WHERE id = $1 AND user_id = $2 AND clock_out_time IS NULL",
        [sessionId, userId]
      );

      const session = sessionResult.rows[0];
      if (!session) {
        return res
          .status(404)
          .json({ message: "Active session not found or not owned by user." });
      }

      const clockInTime = new Date(session.clock_in_time);
      const durationMs = now.getTime() - clockInTime.getTime();

      const result = await pool.query(
        "UPDATE attendance_sessions SET clock_out_time = $1, duration_ms = $2 WHERE id = $3 RETURNING *",
        [now, durationMs, sessionId]
      );
      res.json({
        message: "Clocked out successfully",
        session: result.rows[0],
      });
    } catch (err) {
      console.error("Clock-out error:", err);
      res.status(500).json({ message: "Error clocking out." });
    }
  }
);

// Get Daily Logs
app.get("/api/attendance/daily-logs", authenticateToken, async (req, res) => {
  const userIdToQuery = req.query.userId || req.user.id; // Allow admin to query other users
  const today = new Date().toISOString().split("T")[0];

  // Ensure only admin can query other users
  if (userIdToQuery !== req.user.id && !req.user.isAdmin) {
    return res
      .status(403)
      .json({ message: "Access denied: Cannot view other users' logs." });
  }

  try {
    const result = await pool.query(
      "SELECT * FROM attendance_sessions WHERE user_id = $1 AND date = $2 ORDER BY clock_in_time DESC",
      [userIdToQuery, today]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Get daily logs error:", err);
    res.status(500).json({ message: "Error fetching daily logs." });
  }
});

// Generate Report
app.get("/api/reports", authenticateToken, async (req, res) => {
  const { startDate, endDate, userId } = req.query;
  const userIdToQuery = userId || req.user.id; // Allow admin to query specific user or all if not specified

  if (!startDate || !endDate) {
    return res
      .status(400)
      .json({ message: "Start date and end date are required." });
  }

  // Admin can get reports for any user, non-admin only for themselves
  if (userId && userId !== req.user.id && !req.user.isAdmin) {
    return res.status(403).json({
      message: "Access denied: Cannot generate reports for other users.",
    });
  }

  try {
    const queryParams = [startDate, endDate];
    let queryString = `
            SELECT * FROM attendance_sessions
            WHERE clock_in_time >= $1::timestamp AND clock_in_time < ($2::timestamp + INTERVAL '1 day')
        `;

    if (userIdToQuery && req.user.isAdmin) {
      queryString += ` AND user_id = '${userIdToQuery}'`;
    } else if (!req.user.isAdmin) {
      queryString += ` AND user_id = '${req.user.id}'`;
    }

    queryString += ` ORDER BY clock_in_time DESC`;

    const result = await pool.query(queryString, queryParams);

    // Calculate total duration (in milliseconds)
    const totalDuration = result.rows.reduce(
      (sum, session) => sum + (session.duration_ms || 0),
      0
    );

    // Get user name for the report (if a specific user was queried)
    let userNameForReport = req.user.name;
    if (userIdToQuery && userIdToQuery !== req.user.id) {
      const userResult = await pool.query(
        "SELECT name FROM users WHERE id = $1",
        [userIdToQuery]
      );
      if (userResult.rows.length > 0) {
        userNameForReport = userResult.rows[0].name;
      }
    }

    res.json({
      sessions: result.rows,
      totalDuration: totalDuration,
      userName: userNameForReport,
    });
  } catch (err) {
    console.error("Generate report error:", err);
    res.status(500).json({ message: "Error generating report." });
  }
});

// Get all users (Admin only)
app.get("/api/users", authenticateToken, authorizeAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, email, name, is_admin, created_at FROM users ORDER BY created_at DESC"
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Get users error:", err);
    res.status(500).json({ message: "Error fetching users." });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
