// src/App.jsx - הגרסה המתוקנת והעובדת

import React, { useContext } from "react";
import { Routes, Route, NavLink, Navigate } from "react-router-dom";
import "./styles.css";

// ייבוא כל הרכיבים והקונטקסט
import { AppContext } from "./components/AppContext";
import LoginPage from "./components/LoginPage";
import Dashboard from "./components/Dashboard";
import EmployeeListPage from "./components/EmployeelistPage";
import ReportsPage from "./components/ReportsPage";
import PayrollPage from "./components/PayrollPage";
import AttendanceReportPage from "./components/AttendanceReportPage";
import SettingsPage from "./components/SettingsPage";
import { Icon, ICONS } from "./components/utils";

// --- רכיב עזר להגנה על נתיבים ---
// הוא בודק אם המשתמש מחובר ואם יש לו הרשאה
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { currentUser } = useContext(AppContext);

  if (!currentUser) {
    // אם אין משתמש, הפנה תמיד לדף ההתחברות
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(currentUser.role)) {
    // אם תפקיד המשתמש אינו מורשה, הפנה לדף הבית (Dashboard)
    return <Navigate to="/" replace />;
  }

  // אם הכל תקין, הצג את העמוד המבוקש
  return children;
};

// --- רכיב ראשי של האפליקציה (למשתמש מחובר) ---
// הוא מגדיר את המבנה של תפריט צד + תוכן
const MainAppLayout = () => {
  const { currentUser, handleLogout } = useContext(AppContext);

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <h1>שעון נוכחות</h1>
        </div>
        <nav>
          <NavLink to="/">
            <Icon path={ICONS.DASHBOARD} /> סקירה כללית
          </NavLink>
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
          <button onClick={handleLogout} className="secondary logout-button">
            <Icon path={ICONS.LOGOUT} /> התנתקות
          </button>
        </div>
      </aside>

      <main className="main-content">
        <Routes>
          <Route path="/" element={<Dashboard />} />
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
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
};

// --- הקומפוננטה הראשית App - "השומר בכניסה" ---
function App() {
  const { currentUser, handleLogin } = useContext(AppContext);

  return (
    <Routes>
      {currentUser ? (
        // אם המשתמש מחובר, כל הנתיבים (/*) יטופלו על ידי MainAppLayout
        <Route path="/*" element={<MainAppLayout />} />
      ) : (
        // אם המשתמש לא מחובר, הצג רק את עמוד ההתחברות
        <>
          <Route path="/login" element={<LoginPage onLogin={handleLogin} />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </>
      )}
    </Routes>
  );
}

export default App;
