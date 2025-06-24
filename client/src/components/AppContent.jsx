import { BrowserRouter, NavLink, Route, Routes } from "react-router-dom";
import LoginPage from "./LoginPage";
import { Icon, ICONS, Toast } from "./utils";
import Dashboard from "./Dashboard";
import { AppContext } from "./AppContext";
import "../styles.css";

function AppContent() {
  // Renamed to AppContent because App is the outer wrapper
  const { currentUser, handleLogout, toasts } = useContext(AppContext); // Get handleLogout and toasts from context

  return (
    <BrowserRouter>
      {!currentUser ? (
        <LoginPage /> // LoginPage now receives onLogin via AppContext implicitely
      ) : (
        <div className="app-layout">
          <aside className="sidebar">
            <div className="sidebar-header">
              <h1>Attend.ly</h1>
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
                    {" "}
                    {/* New NavLink for AttendanceReportPage */}
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
              <Route path="/login" element={<LoginPage />} />{" "}
              {/* Ensure login route is accessible */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      )}
      <div className="toast-container">
        {toasts.map((toast) => (
          <Toast key={toast.id} {...toast} />
        ))}
      </div>
    </BrowserRouter>
  );
}
export default AppContent;
