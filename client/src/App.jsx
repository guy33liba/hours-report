import React, { useState, useEffect } from "react";
import "./App.css"; // Assuming your CSS remains similar

// --- Helper Functions (can be moved to a separate file) ---
const formatDuration = (ms) => {
  if (!ms) return "לא זמין";
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  return `${hours} שעות ${minutes} דקות`;
};

const formatTimestamp = (isoString) => {
  if (!isoString) return "לא זמין";
  return new Date(isoString).toLocaleString("he-IL");
};

// --- Modal Component (remains the same) ---
const Modal = ({ message, onConfirm, onCancel, showCancel = false }) => {
  if (!message) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <p className="modal-message">{message}</p>
        <div className="modal-actions">
          <button
            onClick={onConfirm}
            className="modal-button modal-button-primary"
          >
            אישור
          </button>
          {showCancel && (
            <button
              onClick={onCancel}
              className="modal-button modal-button-secondary"
            >
              ביטול
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const App = () => {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [clockedInSession, setClockedInSession] = useState(null);
  const [dailyLogs, setDailyLogs] = useState([]);
  const [reportData, setReportData] = useState(null);
  const [reportStartDate, setReportStartDate] = useState("");
  const [reportEndDate, setReportEndDate] = useState("");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [usersList, setUsersList] = useState([]);
  const [activeTab, setActiveTab] = useState("attendance");
  const [modalMessage, setModalMessage] = useState("");
  const [modalCallback, setModalCallback] = useState(null);
  const [showModalCancel, setShowModalCancel] = useState(false);
  const [isClockingIn, setIsClockingIn] = useState(false);
  const [isClockingOut, setIsClockingOut] = useState(false);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [registerName, setRegisterName] = useState("");
  const [showLogin, setShowLogin] = useState(true);
  const [showRegister, setShowRegister] = useState(false);

  const API_BASE_URL = "http://localhost:5000/api"; // Your backend server URL

  // Helper to get auth headers
  const getAuthHeaders = () => {
    const token = localStorage.getItem("token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  // Modal handling remains largely the same
  const showCustomModal = (
    message,
    onConfirm,
    showCancel = false,
    onCancel = () => {}
  ) => {
    setModalMessage(message);
    setModalCallback({ confirm: onConfirm, cancel: onCancel });
    setShowModalCancel(showCancel);
  };

  const handleModalConfirm = () => {
    modalCallback?.confirm?.();
    closeModal();
  };

  const handleModalCancel = () => {
    modalCallback?.cancel?.();
    closeModal();
  };

  const closeModal = () => {
    setModalMessage("");
    setModalCallback(null);
    setShowModalCancel(false);
  };

  // --- Authentication ---
  useEffect(() => {
    const storedToken = localStorage.getItem("token");
    const storedUser = localStorage.getItem("user"); // Store user info (id, name, isAdmin, etc.)

    if (storedToken && storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
        setIsAdmin(parsedUser.isAdmin || false);
        setShowLogin(false);
        setShowRegister(false);
      } catch (e) {
        console.error("Failed to parse user from local storage", e);
        localStorage.clear(); // Clear potentially corrupted data
        setUser(null);
        setIsAdmin(false);
        setShowLogin(true);
      }
    }
  }, []);

  const handleLogin = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Login failed");
      }

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user)); // Store user details
      setUser(data.user);
      setIsAdmin(data.user.isAdmin);
      setShowLogin(false);
    } catch (error) {
      showCustomModal(`שגיאה בהתחברות: ${error.message}`, () => {});
    }
  };

  const handleRegister = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: registerEmail,
          password: registerPassword,
          name: registerName,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Registration failed");
      }

      showCustomModal("הרשמה בוצעה בהצלחה! אנא התחברו", () => {
        setShowRegister(false);
        setShowLogin(true);
      });
    } catch (error) {
      showCustomModal(`שגיאה בהרשמה: ${error.message}`, () => {});
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    setIsAdmin(false);
    setClockedInSession(null);
    setDailyLogs([]);
    setReportData(null);
    setUsersList([]);
    setShowLogin(true);
    setShowRegister(false);
    setActiveTab("attendance");
  };

  // --- Data Fetching ---

  // Load users list (for admin)
  useEffect(() => {
    const fetchUsers = async () => {
      if (!isAdmin) return;
      try {
        const response = await fetch(`${API_BASE_URL}/users`, {
          headers: getAuthHeaders(),
        });
        const data = await response.json();
        if (!response.ok)
          throw new Error(data.message || "Failed to fetch users");
        setUsersList(data);
      } catch (error) {
        console.error("Error fetching users:", error);
        // showCustomModal(`שגיאה בטעינת עובדים: ${error.message}`, () => {});
      }
    };

    // You'd typically use a WebSocket or polling for real-time updates here
    // For simplicity, we'll just fetch once on admin status change.
    fetchUsers();
  }, [isAdmin]);

  // Load daily attendance logs
  useEffect(() => {
    const fetchDailyLogs = async () => {
      if (!user) return;

      const userIdToQuery =
        isAdmin && selectedUserId ? selectedUserId : user.id;

      try {
        const response = await fetch(
          `${API_BASE_URL}/attendance/daily-logs?userId=${userIdToQuery}`,
          {
            headers: getAuthHeaders(),
          }
        );
        const data = await response.json();
        if (!response.ok)
          throw new Error(data.message || "Failed to fetch daily logs");

        // Sort by clockInTime (newest first)
        setDailyLogs(
          data.sort(
            (a, b) =>
              new Date(b.clock_in_time).getTime() -
              new Date(a.clock_in_time).getTime()
          )
        );

        // Find active session
        const activeSession = data.find((session) => !session.clock_out_time);
        setClockedInSession(activeSession || null);
      } catch (error) {
        console.error("Error fetching daily logs:", error);
        // showCustomModal(`שגיאה בטעינת יומן נוכחות: ${error.message}`, () => {});
      }
    };

    // Fetch logs whenever user, admin status, or selectedUserId changes
    // For real-time, you'd integrate WebSockets here.
    fetchDailyLogs();
    const intervalId = setInterval(fetchDailyLogs, 30000); // Poll every 30 seconds for updates
    return () => clearInterval(intervalId); // Cleanup interval
  }, [user, isAdmin, selectedUserId]);

  // --- Attendance Actions ---

  const handleClockIn = async () => {
    if (!user) return;

    setIsClockingIn(true);
    try {
      const response = await fetch(`${API_BASE_URL}/attendance/clock-in`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Clock-in failed");
      }

      showCustomModal("נכנסת למשמרת בהצלחה!", () => {});
      // Re-fetch daily logs to update UI
      // The useEffect for daily logs will handle this if polling,
      // otherwise, you'd trigger a manual fetch here.
    } catch (error) {
      showCustomModal(`שגיאה בכניסה למשמרת: ${error.message}`, () => {});
    } finally {
      setIsClockingIn(false);
    }
  };

  const handleClockOut = async () => {
    if (!user || !clockedInSession) return;

    setIsClockingOut(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/attendance/clock-out/${clockedInSession.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            ...getAuthHeaders(),
          },
        }
      );

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Clock-out failed");
      }

      showCustomModal("יצאת מהמשמרת בהצלחה!", () => {});
      // Re-fetch daily logs to update UI
    } catch (error) {
      showCustomModal(`שגיאה ביציאה מהמשמרת: ${error.message}`, () => {});
    } finally {
      setIsClockingOut(false);
    }
  };

  // --- Report Generation ---

  const generateReport = async () => {
    if (!reportStartDate || !reportEndDate) {
      showCustomModal("אנא בחר תאריך התחלה וסיום", () => {});
      return;
    }

    const startDate = new Date(reportStartDate);
    const endDate = new Date(reportEndDate);
    // Firebase timestamp comparison was inclusive of the end date, adjust for JS Date objects
    // and backend where we want to query up to the start of the *next* day.
    endDate.setDate(endDate.getDate()); // No need to add day if backend handles the +1 day logic

    if (startDate > endDate) {
      showCustomModal("תאריך ההתחלה חייב להיות לפני תאריך הסיום", () => {});
      return;
    }

    setIsGeneratingReport(true);
    try {
      const userIdParam =
        isAdmin && selectedUserId ? `&userId=${selectedUserId}` : "";
      const response = await fetch(
        `${API_BASE_URL}/reports?startDate=${reportStartDate}&endDate=${reportEndDate}${userIdParam}`,
        {
          headers: getAuthHeaders(),
        }
      );

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Report generation failed");
      }

      setReportData(data);
    } catch (error) {
      showCustomModal(`שגיאה ביצירת דוח: ${error.message}`, () => {});
    } finally {
      setIsGeneratingReport(false);
    }
  };

  // --- Render Logic (remains largely the same) ---
  if (!user) {
    return (
      <div className="auth-container">
        {showLogin && (
          <div className="auth-form">
            <h2>התחברות למערכת</h2>
            <input
              type="email"
              placeholder="אימייל"
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
            />
            <input
              type="password"
              placeholder="סיסמה"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
            />
            <button onClick={handleLogin}>התחברות</button>
            <p
              className="auth-switch"
              onClick={() => {
                setShowLogin(false);
                setShowRegister(true);
              }}
            >
              אין לך חשבון? הירשם עכשיו
            </p>
          </div>
        )}

        {showRegister && (
          <div className="auth-form">
            <h2>הרשמה למערכת</h2>
            <input
              type="text"
              placeholder="שם מלא"
              value={registerName}
              onChange={(e) => setRegisterName(e.target.value)}
            />
            <input
              type="email"
              placeholder="אימייל"
              value={registerEmail}
              onChange={(e) => setRegisterEmail(e.target.value)}
            />
            <input
              type="password"
              placeholder="סיסמה"
              value={registerPassword}
              onChange={(e) => setRegisterPassword(e.target.value)}
            />
            <button onClick={handleRegister}>הרשמה</button>
            <p
              className="auth-switch"
              onClick={() => {
                setShowRegister(false);
                setShowLogin(true);
              }}
            >
              כבר יש לך חשבון? התחבר עכשיו
            </p>
          </div>
        )}
      </div>
    );
  }

  // Main App UI
  return (
    <div className="app-container">
      <Modal
        message={modalMessage}
        onConfirm={handleModalConfirm}
        onCancel={handleModalCancel}
        showCancel={showModalCancel}
      />

      <header className="header-container">
        <h1 className="header-title">מערכת נוכחות עובדים</h1>
        <div className="user-info">
          <span>
            {user.name} ({user.email})
          </span>
          {isAdmin && <span className="admin-badge">מנהל</span>}
          <button onClick={handleLogout} className="logout-button">
            התנתק
          </button>
        </div>
      </header>

      <nav className="nav-tabs">
        <button
          onClick={() => setActiveTab("attendance")}
          className={`nav-tab-button ${
            activeTab === "attendance" ? "active" : ""
          }`}
        >
          נוכחות
        </button>
        <button
          onClick={() => setActiveTab("reports")}
          className={`nav-tab-button ${
            activeTab === "reports" ? "active" : ""
          }`}
        >
          דוחות
        </button>
        {isAdmin && (
          <button
            onClick={() => setActiveTab("admin")}
            className={`nav-tab-button ${
              activeTab === "admin" ? "active" : ""
            }`}
          >
            ניהול
          </button>
        )}
      </nav>

      {activeTab === "attendance" && (
        <main className="main-content">
          <section className="clock-section">
            <h2 className="section-title">כניסה / יציאה ממשמרת</h2>
            {isAdmin && (
              <div className="user-selector">
                <label>בחר עובד:</label>
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                >
                  <option value="">-- בחר עובד --</option>
                  {usersList.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.email})
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="clock-buttons-container">
              <button
                onClick={handleClockIn}
                disabled={clockedInSession !== null || isClockingIn}
                className="clock-button clock-button-in"
              >
                {isClockingIn ? "בתהליך כניסה..." : "כניסה למשמרת"}
              </button>
              <button
                onClick={handleClockOut}
                disabled={clockedInSession === null || isClockingOut}
                className="clock-button clock-button-out"
              >
                {isClockingOut ? "בתהליך יציאה..." : "יציאה ממשמרת"}
              </button>
            </div>
            {clockedInSession && (
              <p className="clocked-in-message">
                במשמרת מאז:{" "}
                <span className="clocked-in-time">
                  {formatTimestamp(clockedInSession.clock_in_time)}
                </span>
              </p>
            )}
          </section>

          <section className="logs-section">
            <h2 className="section-title">יומן נוכחות יומי</h2>
            {dailyLogs.length === 0 ? (
              <p className="no-records-message">אין רשומות להיום</p>
            ) : (
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>שעת כניסה</th>
                      <th>שעת יציאה</th>
                      <th>משך זמן</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dailyLogs.map((log) => (
                      <tr key={log.id}>
                        <td>{formatTimestamp(log.clock_in_time)}</td>
                        <td>
                          {log.clock_out_time ? (
                            formatTimestamp(log.clock_out_time)
                          ) : (
                            <span className="active-session">פעיל</span>
                          )}
                        </td>
                        <td>{formatDuration(log.duration_ms)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </main>
      )}

      {activeTab === "reports" && (
        <main className="main-content">
          <section className="report-controls">
            <h2 className="section-title">יצירת דוח</h2>
            {isAdmin && (
              <div className="user-selector">
                <label>בחר עובד:</label>
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                >
                  <option value="">כל העובדים</option>
                  {usersList.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.email})
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="date-inputs">
              <div className="form-group">
                <label htmlFor="startDate">תאריך התחלה:</label>
                <input
                  type="date"
                  id="startDate"
                  value={reportStartDate}
                  onChange={(e) => setReportStartDate(e.target.value)}
                  max={new Date().toISOString().split("T")[0]}
                />
              </div>
              <div className="form-group">
                <label htmlFor="endDate">תאריך סיום:</label>
                <input
                  type="date"
                  id="endDate"
                  value={reportEndDate}
                  onChange={(e) => setReportEndDate(e.target.value)}
                  max={new Date().toISOString().split("T")[0]}
                />
              </div>
              <button
                onClick={generateReport}
                disabled={isGeneratingReport}
                className="generate-button"
              >
                {isGeneratingReport ? "מייצר דוח..." : "צור דוח"}
              </button>
            </div>
          </section>

          <section className="report-results">
            <h2 className="section-title">נתוני דוח</h2>
            {reportData ? (
              reportData.sessions.length > 0 ? (
                <div>
                  <p className="report-summary">
                    סה"כ נוכחות{" "}
                    {reportData.userName && `של ${reportData.userName}`}:{" "}
                    <span className="total-duration">
                      {formatDuration(reportData.totalDuration)}
                    </span>
                  </p>
                  <div className="table-container">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>תאריך</th>
                          <th>שעת כניסה</th>
                          <th>שעת יציאה</th>
                          <th>משך זמן</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportData.sessions
                          .sort(
                            (a, b) =>
                              new Date(b.clock_in_time).getTime() -
                              new Date(a.clock_in_time).getTime()
                          )
                          .map((session) => (
                            <tr key={session.id}>
                              <td>{session.date}</td>
                              <td>{formatTimestamp(session.clock_in_time)}</td>
                              <td>
                                {session.clock_out_time ? (
                                  formatTimestamp(session.clock_out_time)
                                ) : (
                                  <span className="active-session">פעיל</span>
                                )}
                              </td>
                              <td>{formatDuration(session.duration_ms)}</td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <p className="no-records-message">
                  לא נמצאו משמרות בתאריכים שנבחרו
                </p>
              )
            ) : (
              <p className="no-records-message">בחר תאריכים וצור דוח</p>
            )}
          </section>
        </main>
      )}

      {activeTab === "admin" && isAdmin && (
        <main className="main-content">
          <section className="admin-section">
            <h2 className="section-title">ניהול עובדים</h2>
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>שם</th>
                    <th>אימייל</th>
                    <th>תאריך הרשמה</th>
                    <th>פעולות</th>
                  </tr>
                </thead>
                <tbody>
                  {usersList.map((user) => (
                    <tr key={user.id}>
                      <td>{user.name}</td>
                      <td>{user.email}</td>
                      <td>
                        {new Date(user.created_at).toLocaleDateString("he-IL")}
                      </td>
                      <td>
                        <button
                          className="action-button"
                          onClick={() => {
                            // Placeholder for edit/delete functionality
                          }}
                        >
                          ערוך
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </main>
      )}
    </div>
  );
};

export default App;
