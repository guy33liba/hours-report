// App.js - FINAL STABLE VERSION WITH PASSWORD RESET
import React, {
  useState,
  useEffect,
  createContext,
  useContext,
  useCallback,
  useMemo,
} from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  NavLink,
  Navigate,
} from "react-router-dom";
import "./styles.css";
import AttendanceReportPage from "./components/AttendanceReportPage";
import Dashboard from "./components/Dashboard";
import EmployeeListPage from "./components/EmployeelistPage";
import LoginPage from "./components/LoginPage";
import PayrollPage from "./components/PayrollPage";
import ReportsPage from "./components/ReportsPage";
import SettingsPage from "./components/SettingsPage";
import { apiFetch, Icon, ICONS, Toast } from "./components/utils";
export const AppContext = createContext();

function App() {
  const [employees, setEmployees] = useState(() =>
    JSON.parse(localStorage.getItem("employees"))
  );
  const [attendance, setAttendance] = useState(() =>
    JSON.parse(localStorage.getItem("attendance"))
  );
  const [absences, setAbsences] = useState(() =>
    JSON.parse(localStorage.getItem("absences"))
  );
  const [settings, setSettings] = useState(() =>
    JSON.parse(localStorage.getItem("settings"))
  );
  const [currentUser, setCurrentUser] = useState(
    () => JSON.parse(localStorage.getItem("currentUser")) || null
  );

  const [toasts, setToasts] = useState([]);
  useEffect(() => {
    localStorage.setItem("currentUser", JSON.stringify(currentUser));
    localStorage.setItem("employees", JSON.stringify(employees));
    localStorage.setItem("attendance", JSON.stringify(attendance));
    localStorage.setItem("absences", JSON.stringify(absences));
    localStorage.setItem("settings", JSON.stringify(settings));
  }, [currentUser, employees, attendance, absences, settings]);
  useEffect(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const updatedEmployees = employees.map((emp) => {
      const activeAbsence = absences.find((a) => {
        const startDate = new Date(a.startDate);
        startDate.setHours(0, 0, 0, 0);
        const endDate = new Date(a.endDate);
        endDate.setHours(0, 0, 0, 0);
        return (
          a.employeeId === emp.id && today >= startDate && today <= endDate
        );
      });
      const newStatus = activeAbsence ? activeAbsence.type : "absent";
      if (
        emp.status === "sick" ||
        emp.status === "vacation" ||
        (activeAbsence && emp.status !== newStatus)
      ) {
        return { ...emp, status: newStatus };
      }
      return emp;
    });
    if (JSON.stringify(employees) !== JSON.stringify(updatedEmployees)) {
      setEmployees(updatedEmployees);
    }
  }, [absences, employees]);
  const addToast = useCallback((message, type = "info") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
  }, []);
  const handleLogin = (user, token) => {
    setCurrentUser(user);
    localStorage.setItem("token", token);
    addToast("התחברת בהצלחה", "success");
  };

  const handleLogout = () => setCurrentUser(null);
  const fetchData = useCallback(async () => {
    try {
      // קריאה ל-Backend כדי לקבל את רשימת העובדים
      const data = await apiFetch("/employees"); // מניח שיש לך GET /api/employees
      setEmployees(data); // עדכן את הסטייט של העובדים
    } catch (error) {
      addToast(error.message || "שגיאה בטעינת נתוני עובדים.", "danger");
      console.error("Failed to fetch employees:", error);
    }
  }, [addToast]); // תלוי ב-addToast

  // Effect לטעינת נתונים בעת טעינת הקומפוננטה או שינוי משתמש
  useEffect(() => {
    if (currentUser) {
      fetchData(); // This calls fetchData
    }
  }, [currentUser, fetchData]);
  const contextValue = {
    employees,
    setEmployees,
    attendance,
    setAttendance,
    absences,
    setAbsences,
    currentUser,
    addToast,
    settings,
    setSettings,
    fetchData,
  };
  const ProtectedRoute = ({ children, allowedRoles }) => {
    const { currentUser } = useContext(AppContext);

    if (!currentUser) {
      // אם אין משתמש, הפנה לדף ההתחברות
      return <Navigate to="/login" replace />;
    }

    if (allowedRoles && !allowedRoles.includes(currentUser.role)) {
      // אם למשתמש אין את התפקיד המתאים, הפנה לדף לא מורשה או דשבורד
      return <Navigate to="/dashboard" replace />; // או לדף שגיאה
    }

    return children;
  };

  return (
    <AppContext.Provider value={contextValue}>
      <BrowserRouter>
        {!currentUser ? (
          <LoginPage onLogin={handleLogin} />
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
                <Route path="/employees" element={<EmployeeListPage />} />
                <Route path="/reports" element={<ReportsPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/payroll" element={<PayrollPage />} />
                <Route path="*" element={<Navigate to="/" />} />{" "}
                <Route
                  path="/attendance-report" // הנתיב שתוכלו לגשת אליו בדפדפן
                  element={
                    <ProtectedRoute allowedRoles={["manager"]}>
                      <AttendanceReportPage /> {/* הצבת הקומפוננטה כאן */}
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/"
                  element={<Navigate to="/dashboard" replace />}
                />
              </Routes>
            </main>
          </div>
        )}
      </BrowserRouter>
      <div className="toast-container">
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            {...toast}
            onDismiss={() =>
              setToasts((p) => p.filter((t) => t.id !== toast.id))
            }
          />
        ))}
      </div>
    </AppContext.Provider>
  );
}

export default App;
