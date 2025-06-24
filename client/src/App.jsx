  // src/App.jsx - רכיב האפליקציה הראשי (פרוסות ניווט ופריסה)

  import React, { useContext } from "react";
  import {
    BrowserRouter,
    Routes,
    Route,
    NavLink,
    Navigate,
  } from "react-router-dom";
  import "./styles.css"; // ייבוא סגנונות גלובליים

  // ייבוא AppContext מהקובץ AppContext.jsx החדש
  // ייבוא רכיבי העמודים שלך
  import AttendanceReportPage from "./components/AttendanceReportPage";
  import Dashboard from "./components/Dashboard";
  import LoginPage from "./components/LoginPage";
  import PayrollPage from "./components/PayrollPage";
  import ReportsPage from "./components/ReportsPage";
  import SettingsPage from "./components/SettingsPage";
  // ייבוא Icon ו-ICONS מקובץ utils
  import { Icon, ICONS } from "./components/utils";
  import EmployeeListPage from "./components/EmployeelistPage";
  import { AppContext } from "./components/AppContext";

  function App() {
    // צרוך את הקונטקסט מ-AppProvider
    const { currentUser, handleLogout, handleLogin } = useContext(AppContext);

    // רכיב ProtectedRoute לניהול גישה מבוססת תפקידים
    const ProtectedRoute = ({ children, allowedRoles }) => {
      const { currentUser: contextUser } = useContext(AppContext); // השתמש בכינוי למניעת התנגשויות שמות

      if (!contextUser) {
        // אם אין משתמש, הפנה לדף ההתחברות
        return <Navigate to="/login" replace />;
      }

      if (allowedRoles && !allowedRoles.includes(contextUser.role)) {
        // אם תפקיד המשתמש אינו תואם את התפקידים המורשים, הפנה לדשבורד
        return <Navigate to="/dashboard" replace />;
      }

      return children;
    };

    return (
      <BrowserRouter>
        <div className="app-layout">
          {/* סרגל צד: מרונדר רק אם משתמש מחובר */}
          {currentUser && (
            <aside className="sidebar">
              <div className="sidebar-header">
                <h1>Attend.ly</h1>
              </div>
              <nav>
                <NavLink to="/">
                  <Icon path={ICONS.DASHBOARD} /> סקירה כללית
                </NavLink>
                {/* קישורי ניווט ספציפיים למנהל */}
                {currentUser.role === "manager" && (
                  <>
                    <NavLink to="/employees">
                      <Icon path={ICONS.EMPLOYEES} /> ניהול עובדים
                    </NavLink>
                    <NavLink to="/reports">
                      <Icon path={ICONS.REPORTS} /> דוחות
                    </NavLink>
                    <NavLink to="/payroll">
                      <Icon path={ICONS.PAYROLL} /> חישוב שכר
                    </NavLink>
                    <NavLink to="/attendance-report">
                      <Icon path={ICONS.ATTENDANCE_REPORT} /> דוח נוכחות
                    </NavLink>
                    <NavLink to="/settings">
                      <Icon path={ICONS.SETTINGS} /> הגדרות
                    </NavLink>
                  </>
                )}
              </nav>
              <div className="sidebar-footer">
                <span>שלום, {currentUser.name}</span>
                <button
                  onClick={handleLogout}
                  className="secondary logout-button"
                >
                  <Icon path={ICONS.LOGOUT} /> התנתקות
                </button>
              </div>
            </aside>
          )}

          {/* אזור תוכן ראשי: משתמש בקלאס שונה אם אין משתמש מחובר (עבור דף התחברות במסך מלא) */}
          <main className={currentUser ? "main-content" : "main-content-full"}>
            {/* מסלולים תמיד פעילים בתוך BrowserRouter */}
            <Routes>
              {/* דף התחברות: תמיד נגיש */}
              <Route
                path="/login"
                element={<LoginPage onLogin={handleLogin} />} // onLogin עדיין נשלח כ-prop ל-LoginPage
              />

              {/* מסלול ברירת מחדל למשתמשים מחוברים (דשבורד) או הפניה להתחברות */}
              <Route
                path="/"
                element={
                  currentUser ? <Dashboard /> : <Navigate to="/login" replace />
                }
              />
              <Route
                path="/dashboard"
                element={
                  currentUser ? <Dashboard /> : <Navigate to="/login" replace />
                }
              />

              {/* מסלולים מוגנים למנהלים */}
              <Route
                path="/employees"
                element={
                  <ProtectedRoute allowedRoles={["manager"]}>
                    <EmployeeListPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/reports"
                element={
                  <ProtectedRoute allowedRoles={["manager"]}>
                    <ReportsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/payroll"
                element={
                  <ProtectedRoute allowedRoles={["manager"]}>
                    <PayrollPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/attendance-report"
                element={
                  <ProtectedRoute allowedRoles={["manager"]}>
                    <AttendanceReportPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/settings"
                element={
                  <ProtectedRoute allowedRoles={["manager"]}>
                    <SettingsPage />
                  </ProtectedRoute>
                }
              />

              {/* מסלול כללי (catch-all): מפנה בהתאם למצב ההתחברות */}
              <Route
                path="*"
                element={
                  currentUser ? (
                    <Navigate to="/" replace />
                  ) : (
                    <Navigate to="/login" replace />
                  )
                }
              />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    );
  }

  export default App;
