// App.js - COMPLETE VERSION WITH DETAILS MODAL
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

// --- Context for App-wide State and Functions ---
const AppContext = createContext();

// --- Initial Data ---
const initialData = {
  employees: [
    {
      id: 1,
      name: "עמי",
      department: "הנהלה",
      role: "manager",
      hourlyRate: 150,
      password: "123456",
    },
    {
      id: 2,
      name: "דנה כהן",
      department: "שיווק",
      role: "employee",
      hourlyRate: 60,
      password: "123",
    },
    {
      id: 3,
      name: "אבי לוי",
      department: "פיתוח",
      role: "employee",
      hourlyRate: 85,
      password: "123",
    },
  ],
  attendance: [],
  settings: {
    standardWorkDayHours: 8.5,
  },
};

// --- Reusable UI Components ---
const Icon = ({ path, size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d={path}></path>
  </svg>
);
const ICONS = {
  DASHBOARD: "M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z",
  EMPLOYEES:
    "M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z",
  REPORTS:
    "M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z",
  PAYROLL:
    "M21.41 11.58l-9-9C12.05 2.22 11.55 2 11 2H4c-1.1 0-2 .9-2 2v7c0 .55.22 1.05.59 1.42l9 9c.36.36.86.58 1.41.58.55 0 1.05-.22 1.41-.59l7-7c.37-.36.59-.86.59-1.41s-.22-1.05-.59-1.42zM5.5 7C4.67 7 4 6.33 4 5.5S4.67 4 5.5 4 7 4.67 7 5.5 6.33 7 5.5 7z",
  SETTINGS:
    "M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.07-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.69-1.62-0.92L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41 l-3.84,0c-0.24,0-0.44,0.17-0.48,0.41L9.2,5.59C8.6,5.82,8.08,6.13,7.58,6.51L5.19,5.55C4.97,5.48,4.72,5.55,4.6,5.77L2.68,9.09 c-0.11,0.2-0.06,0.47,0.12,0.61L4.83,11.28c-0.05,0.3-0.07,0.62-0.07,0.94c0,0.32,0.02,0.64,0.07,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.69,1.62,0.92l0.44,2.78 c0.04,0.24,0.24,0.41,0.48,0.41l3.84,0c0.24,0,0.44-0.17-0.48-0.41l0.44-2.78c0.59-0.23,1.12-0.54,1.62-0.92l2.39,0.96 c0.22,0.08,0.47,0.01,0.59-0.22l1.92-3.32c0.12-0.2,0.07-0.47-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z",
  LOGOUT:
    "M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2h8v-2H4V5z",
  DETAILS:
    "M11 17h2v-6h-2v6zm1-8c-0.55 0-1 0.45-1 1s0.45 1 1 1 1-0.45 1-1-0.45-1-1-1zM12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z",
};
const Modal = ({ show, onClose, children, title }) => {
  if (!show) return null;
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{title}</h3>
          <button onClick={onClose} className="modal-close-btn">
            ×
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
};

// --- Main Pages ---

function Dashboard() {
  const { employees, attendance, setAttendance, addToast } =
    useContext(AppContext);

  const getEmployeeStatus = (employeeId) => {
    const lastEntry = attendance
      .filter((a) => a.employeeId === employeeId)
      .sort((a, b) => new Date(b.clockIn) - new Date(a.clockIn))[0];
    if (!lastEntry || lastEntry.clockOut)
      return { text: "לא בעבודה", class: "absent" };
    if (lastEntry.onBreak) return { text: "בהפסקה", class: "on_break" };
    return { text: "נוכח", class: "present" };
  };

  const handleClockIn = (employeeId) => {
    setAttendance((prev) => [
      ...prev,
      {
        id: Date.now(),
        employeeId,
        clockIn: new Date().toISOString(),
        clockOut: null,
        onBreak: false,
      },
    ]);
    addToast("כניסה הוחתמה בהצלחה", "success");
  };

  const handleClockOut = (employeeId) => {
    setAttendance((prev) =>
      prev.map((a) =>
        !a.clockOut && a.employeeId === employeeId
          ? { ...a, clockOut: new Date().toISOString(), onBreak: false }
          : a
      )
    );
    addToast("יציאה הוחתמה בהצלחה");
  };

  const handleBreakToggle = (employeeId) => {
    let isOnBreak = false;
    setAttendance((prev) =>
      prev.map((a) => {
        if (!a.clockOut && a.employeeId === employeeId) {
          isOnBreak = !a.onBreak;
          return { ...a, onBreak: !a.onBreak };
        }
        return a;
      })
    );
    addToast(isOnBreak ? "יציאה להפסקה" : "חזרה מהפסקה");
  };

  return (
    <>
      <div className="page-header">
        <h2>לוח בקרה</h2>
      </div>
      <div className="card">
        <h3>נוכחות בזמן אמת</h3>
        <div className="employee-list-realtime">
          {employees.map((emp) => {
            const status = getEmployeeStatus(emp.id);
            const isClockedIn =
              status.class === "present" || status.class === "on_break";
            return (
              <div key={emp.id} className="employee-row">
                <div className="employee-info">
                  <span className="employee-name">{emp.name}</span>
                  <span className="employee-department">{emp.department}</span>
                </div>
                <div className="employee-status">
                  <span className={`status-dot ${status.class}`}></span>
                  {status.text}
                </div>
                <div className="employee-actions">
                  <button
                    onClick={() => handleClockIn(emp.id)}
                    disabled={isClockedIn}
                  >
                    כניסה
                  </button>
                  <button
                    onClick={() => handleBreakToggle(emp.id)}
                    disabled={!isClockedIn}
                    className="secondary"
                  >
                    {status.class === "on_break" ? "חזור מהפסקה" : "הפסקה"}
                  </button>
                  <button
                    onClick={() => handleClockOut(emp.id)}
                    disabled={!isClockedIn}
                    className="danger"
                  >
                    יציאה
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

function EmployeeListPage() {
  const { employees, setEmployees, addToast } = useContext(AppContext);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false); // NEW state for details modal
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  const handleOpenEditModal = (employee = null) => {
    setSelectedEmployee(employee);
    setIsEditModalOpen(true);
  };

  // NEW function to open the details modal
  const handleOpenDetailModal = (employee) => {
    setSelectedEmployee(employee);
    setIsDetailModalOpen(true);
  };

  const handleSaveEmployee = (employeeData) => {
    if (selectedEmployee && selectedEmployee.id) {
      setEmployees((prev) =>
        prev.map((emp) =>
          emp.id === selectedEmployee.id ? { ...emp, ...employeeData } : emp
        )
      );
      addToast("פרטי העובד עודכנו בהצלחה", "success");
    } else {
      setEmployees((prev) => [
        ...prev,
        { ...employeeData, id: Date.now(), password: "123" },
      ]);
      addToast("עובד חדש נוסף בהצלחה", "success");
    }
    setIsEditModalOpen(false);
  };

  const handleDeleteEmployee = (employeeId) => {
    if (window.confirm("האם אתה בטוח שברצונך למחוק עובד זה?")) {
      setEmployees((prev) => prev.filter((emp) => emp.id !== employeeId));
      addToast("העובד נמחק", "danger");
    }
  };

  return (
    <>
      <div className="page-header">
        <h2>ניהול עובדים</h2>
        <button onClick={() => handleOpenEditModal()}>הוסף עובד חדש</button>
      </div>
      <div className="card">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>שם</th>
                <th>מחלקה</th>
                <th>תפקיד</th>
                <th>פעולות</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((emp) => (
                <tr key={emp.id}>
                  <td>{emp.name}</td>
                  <td>{emp.department}</td>
                  <td>{emp.role === "manager" ? "מנהל" : "עובד"}</td>
                  <td className="actions-cell">
                    {/* UPDATED: "פרטים" is now a button that opens a modal */}
                    <button
                      onClick={() => handleOpenDetailModal(emp)}
                      className="secondary"
                    >
                      <Icon path={ICONS.DETAILS} size={16} /> פרטים
                    </button>
                    <button
                      onClick={() => handleOpenEditModal(emp)}
                      className="secondary"
                    >
                      ערוך
                    </button>
                    <button
                      onClick={() => handleDeleteEmployee(emp.id)}
                      className="danger secondary"
                    >
                      מחק
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <EmployeeFormModal
        show={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSave={handleSaveEmployee}
        employee={selectedEmployee}
      />
      {/* NEW: Render the details modal */}
      <EmployeeDetailModal
        show={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        employee={selectedEmployee}
      />
    </>
  );
}

// --- NEW MODAL for Employee Details ---
function EmployeeDetailModal({ show, onClose, employee }) {
  const { attendance } = useContext(AppContext);

  if (!show || !employee) return null;

  const employeeAttendance = attendance
    .filter((a) => a.employeeId === employee.id)
    .sort((a, b) => new Date(b.clockIn) - new Date(a.clockIn));

  const calculateHours = (entry) => {
    if (!entry.clockOut) return "0.00";
    return (
      (new Date(entry.clockOut) - new Date(entry.clockIn)) /
      3600000
    ).toFixed(2);
  };

  return (
    <Modal show={show} onClose={onClose} title={`פרטי עובד: ${employee.name}`}>
      <div className="details-modal-content">
        <div className="card details-card">
          <h3>פרטים אישיים</h3>
          <p>
            <strong>שם:</strong> {employee.name}
          </p>
          <p>
            <strong>מחלקה:</strong> {employee.department}
          </p>
          <p>
            <strong>תפקיד:</strong>{" "}
            {employee.role === "manager" ? "מנהל" : "עובד"}
          </p>
          <p>
            <strong>תעריף שעתי:</strong> ₪{employee.hourlyRate}
          </p>
        </div>
        <div className="card details-card">
          <h3>היסטוריית נוכחות</h3>
          {employeeAttendance.length > 0 ? (
            <div className="table-container compact-table">
              <table>
                <thead>
                  <tr>
                    <th>תאריך</th>
                    <th>כניסה</th>
                    <th>יציאה</th>
                    <th>שעות</th>
                  </tr>
                </thead>
                <tbody>
                  {employeeAttendance.map((entry) => (
                    <tr key={entry.id}>
                      <td>
                        {new Date(entry.clockIn).toLocaleDateString("he-IL")}
                      </td>
                      <td>
                        {new Date(entry.clockIn).toLocaleTimeString("he-IL", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td>
                        {entry.clockOut
                          ? new Date(entry.clockOut).toLocaleTimeString(
                              "he-IL",
                              { hour: "2-digit", minute: "2-digit" }
                            )
                          : "-"}
                      </td>
                      <td>{calculateHours(entry)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p>אין היסטוריית נוכחות.</p>
          )}
        </div>
      </div>
    </Modal>
  );
}

function ReportsPage() {
  const { employees, attendance } = useContext(AppContext);
  const [range, setRange] = useState({ start: "", end: "" });
  const reportData = useMemo(() => {
    if (!range.start || !range.end) return [];
    const startDate = new Date(range.start);
    const endDate = new Date(range.end);
    endDate.setHours(23, 59, 59, 999);
    return employees.map((emp) => {
      const empAttendance = attendance.filter(
        (a) =>
          a.employeeId === emp.id &&
          new Date(a.clockIn) >= startDate &&
          new Date(a.clockIn) <= endDate &&
          a.clockOut
      );
      const totalHours = empAttendance.reduce(
        (sum, entry) =>
          sum + (new Date(entry.clockOut) - new Date(entry.clockIn)) / 3600000,
        0
      );
      return { ...emp, totalHours };
    });
  }, [range, employees, attendance]);

  return (
    <>
      <div className="page-header">
        <h2>דוחות נוכחות</h2>
      </div>
      <div className="card">
        <div className="report-controls">
          <div className="form-group">
            <label>מתאריך</label>
            <input
              type="date"
              value={range.start}
              onChange={(e) =>
                setRange((p) => ({ ...p, start: e.target.value }))
              }
            />
          </div>
          <div className="form-group">
            <label>עד תאריך</label>
            <input
              type="date"
              value={range.end}
              onChange={(e) => setRange((p) => ({ ...p, end: e.target.value }))}
            />
          </div>
        </div>
        {reportData.length > 0 && (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>שם</th>
                  <th>מחלקה</th>
                  <th>סה"כ שעות בתקופה</th>
                </tr>
              </thead>
              <tbody>
                {reportData.map((emp) => (
                  <tr key={emp.id}>
                    <td>{emp.name}</td>
                    <td>{emp.department}</td>
                    <td>{emp.totalHours.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

function SettingsPage() {
  return (
    <>
      <div className="page-header">
        <h2>הגדרות</h2>
      </div>
      <div className="card">
        <p>כאן יוצגו הגדרות המערכת.</p>
      </div>
    </>
  );
}

function PayrollPage() {
  return (
    <>
      <div className="page-header">
        <h2>חישוב שכר</h2>
      </div>
      <div className="card">
        <p>כאן ניתן יהיה להפיק דוחות שכר.</p>
      </div>
    </>
  );
}

function EmployeeFormModal({ show, onClose, onSave, employee }) {
  const [formData, setFormData] = useState({
    name: "",
    department: "",
    hourlyRate: "",
    role: "employee",
  });
  useEffect(() => {
    setFormData(
      employee || { name: "", department: "", hourlyRate: "", role: "employee" }
    );
  }, [employee]);
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };
  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };
  return (
    <Modal
      show={show}
      onClose={onClose}
      title={employee ? "עריכת פרטי עובד" : "הוספת עובד חדש"}
    >
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="name">שם מלא</label>
          <input
            id="name"
            name="name"
            type="text"
            value={formData.name}
            onChange={handleChange}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="department">מחלקה</label>
          <input
            id="department"
            name="department"
            type="text"
            value={formData.department}
            onChange={handleChange}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="hourlyRate">תעריף שעתי (₪)</label>
          <input
            id="hourlyRate"
            name="hourlyRate"
            type="number"
            value={formData.hourlyRate}
            onChange={handleChange}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="role">תפקיד</label>
          <select
            id="role"
            name="role"
            value={formData.role}
            onChange={handleChange}
          >
            <option value="employee">עובד</option>
            <option value="manager">מנהל</option>
          </select>
        </div>
        <div className="form-actions">
          <button type="button" className="secondary" onClick={onClose}>
            ביטול
          </button>
          <button type="submit">שמור</button>
        </div>
      </form>
    </Modal>
  );
}

function LoginPage({ onLogin }) {
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { employees } = useContext(AppContext);
  const handleSubmit = (e) => {
    e.preventDefault();
    const user = employees.find(
      (emp) => emp.name === name && emp.password === password
    );
    if (user) {
      onLogin(user);
    } else {
      setError("שם משתמש או סיסמה שגויים");
    }
  };
  return (
    <div className="login-page-wrapper">
      <div className="login-container">
        <h1>Attend.ly</h1>
        <p className="subtitle">מערכת ניהול נוכחות עובדים</p>
        <form onSubmit={handleSubmit}>
          {error && <div className="login-error-message">{error}</div>}
          <div className="form-group">
            <label htmlFor="username">שם משתמש</label>
            <input
              id="username"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">סיסמה</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="button-full-width">
            התחבר
          </button>
        </form>
      </div>
    </div>
  );
}

function Toast({ message, type, onDismiss }) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 4000);
    return () => clearTimeout(timer);
  }, [onDismiss]);
  return <div className={`toast ${type}`}>{message}</div>;
}

// --- The Main App Component ---
function App() {
  const [employees, setEmployees] = useState(
    () => JSON.parse(localStorage.getItem("employees")) || initialData.employees
  );
  const [attendance, setAttendance] = useState(
    () =>
      JSON.parse(localStorage.getItem("attendance")) || initialData.attendance
  );
  const [settings] = useState(
    () => JSON.parse(localStorage.getItem("settings")) || initialData.settings
  );
  const [currentUser, setCurrentUser] = useState(
    () => JSON.parse(localStorage.getItem("currentUser")) || null
  );
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    localStorage.setItem("currentUser", JSON.stringify(currentUser));
    localStorage.setItem("employees", JSON.stringify(employees));
    localStorage.setItem("attendance", JSON.stringify(attendance));
    localStorage.setItem("settings", JSON.stringify(settings));
  }, [currentUser, employees, attendance, settings]);

  const addToast = useCallback((message, type = "info") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
  }, []);

  const handleLogin = (user) => setCurrentUser(user);
  const handleLogout = () => setCurrentUser(null);

  const contextValue = {
    employees,
    setEmployees,
    attendance,
    setAttendance,
    currentUser,
    addToast,
    settings,
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
                <Route path="*" element={<Navigate to="/" />} />
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
