import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  createContext,
  useContext,
  useReducer,
} from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  NavLink,
  Navigate,
  Outlet,
  useLocation,
} from "react-router-dom";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar } from "react-chartjs-2";
import "./styles.css";

// 1. API SERVICE
const API_BASE_URL = "http://localhost:5000/api";

const apiFetch = async (endpoint, options = {}) => {
  const token = localStorage.getItem("token");
  const headers = { ...options.headers };

  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });
    if (response.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("currentUser");
      window.location.href = "/";
      throw new Error("פג תוקף משתמש, יש להתחבר מחדש.");
    }
    if (response.status === 204) return null;
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "אירעה שגיאה בשרת.");
    return data;
  } catch (error) {
    console.error(`API Fetch Error (${endpoint}):`, error);
    throw error;
  }
};

// 2. CONTEXT, HOOKS & CONSTANTS
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);
const AppContext = createContext();
const ToastContext = createContext();
const useToaster = () => useContext(ToastContext);

const useLocalStorage = (key, initialValue) => {
  const [value, setValue] = useState(() => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (e) {
      return initialValue;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error(e);
    }
  }, [key, value]);
  return [value, setValue];
};

const useSortableData = (items, config = null) => {
  const [sortConfig, setSortConfig] = useState(config);
  const sortedItems = useMemo(() => {
    let sortableItems = items ? [...items] : [];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        const valA = a[sortConfig.key] || "";
        const valB = b[sortConfig.key] || "";
        if (typeof valA === "number" && typeof valB === "number")
          return sortConfig.direction === "ascending"
            ? valA - valB
            : valB - valA;
        const strA = String(valA);
        const strB = String(valB);
        return sortConfig.direction === "ascending"
          ? strA.localeCompare(strB)
          : strB.localeCompare(strA);
      });
    }
    return sortableItems;
  }, [items, sortConfig]);
  const requestSort = (key) => {
    let direction = "ascending";
    if (
      sortConfig &&
      sortConfig.key === key &&
      sortConfig.direction === "ascending"
    )
      direction = "descending";
    setSortConfig({ key, direction });
  };
  return { items: sortedItems, requestSort, sortConfig };
};

const ICONS = {
  EYE_OPEN:
    "M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5C21.27 7.61 17 4.5 12 4.5zm0 12c-2.48 0-4.5-2.02-4.5-4.5S9.52 7.5 12 7.5s4.5 2.02 4.5 4.5-2.02 4.5-4.5 4.5zm0-7c-1.38 0-2.5 1.12-2.5 2.5s1.12 2.5 2.5 2.5 2.5-1.12 2.5-2.5-1.12-2.5-2.5-2.5z",
  EYE_CLOSED:
    "M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.38 1.12 2.5 2.5 2.5.22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.48 0-4.5-2.02-4.5-4.5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.38-1.12-2.5-2.5-2.5-.05 0-.1.01-.16.02z",
  DASHBOARD: "M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z",
  EMPLOYEES:
    "M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z",
  REPORTS:
    "M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z",
  PAYROLL:
    "M21.41 11.58l-9-9C12.05 2.22 11.55 2 11 2H4c-1.1 0-2 .9-2 2v7c0 .55.22 1.05.59 1.42l9 9c.36.36.86.58 1.41.58.55 0 1.05-.22 1.41-.59l7-7c.37-.36.59-.86.59-1.41s-.22-1.05-.59-1.42zM5.5 7C4.67 7 4 6.33 4 5.5S4.67 4 5.5 4 7 4.67 7 5.5 6.33 7 5.5 7z",
  SETTINGS:
    "M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.07-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.69-1.62-0.92L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41 l-3.84,0c-0.24,0-0.44,0.17-0.48,0.41L9.2,5.59C8.6,5.82,8.08,6.13,7.58,6.51L5.19,5.55C4.97,5.48,4.72,5.55,4.6,5.77L2.68,9.09 c-0.11,0.2-0.06,0.47,0.12,0.61L4.83,11.28c-0.05,0.3-0.07,0.62-0.07,0.94c0,0.32,0.02,0.64,0.07,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.69,1.62,0.92l0.44,2.78 c0.04,0.24,0.24,0.41,0.48,0.41l3.84,0c0.24,0-0.44,0.17-0.48,0.41l0.44-2.78c0.59-0.23,1.12-0.54,1.62-0.92l2.39,0.96 c0.22,0.08,0.47,0.01,0.59-0.22l1.92-3.32c0.12-0.2,0.07-0.47-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z",
  LOGOUT:
    "M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2h8v-2H4V5z",
  DOWNLOAD: "M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z",
  SORT: "M3 18h6v-2H3v2zM3 6v2h18V6H3zm0 7h12v-2H3v2z",
  MENU: "M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z",
};
const STATUSES = {
  PRESENT: { key: "present", text: "נוכח", colorClass: "present" },
  SICK: { key: "sick", text: "מחלה", colorClass: "sick" },
  VACATION: { key: "vacation", text: "חופשה", colorClass: "vacation" },
  ABSENT: { key: "absent", text: "לא בעבודה", colorClass: "absent" },
};
const initialAppState = {
  settings: {
    standardWorkDayHours: 8.5,
    overtimeRatePercent: 150,
    restrictByIp: false,
    allowedIps: "127.0.0.1, ::1",
    paidVacation: true,
    paidSickLeave: true,
  },
};
const appReducer = (state, action) => {
  switch (action.type) {
    case "SET_SETTINGS":
      return { ...state, settings: action.payload };
    default:
      return state;
  }
};

// 3. UI & HELPER COMPONENTS
const LoadingSpinner = () => <div className="loader"></div>;
const Icon = React.memo(({ path, size = 18, className = "" }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
  >
    <path d={path}></path>
  </svg>
));
const FormInput = React.memo(({ label, icon, onIconClick, ...props }) => (
  <div className="form-group">
    <label>{label}</label>
    {/* המבנה הזה הוא הנכון: div אחד שעוטף את שניהם */}
    <div className="input-with-icon">
      <input {...props} />
      {icon && (
        <button
          type="button"
          className="input-icon-button"
          onClick={onIconClick}
          aria-label={props.type === "password" ? "הסתר סיסמה" : "הצג סיסמה"}
        >
          {icon}
        </button>
      )}
    </div>
  </div>
));
const FormTextarea = React.memo(({ label, ...props }) => (
  <div className="form-group">
    <label>{label}</label> <textarea {...props} />
  </div>
));
const ToggleSwitch = React.memo(({ label, checked, onChange, name }) => (
  <div className="toggle-switch">
    <span>{label}</span>
    <label className="switch">
      <input
        type="checkbox"
        name={name}
        checked={checked}
        onChange={onChange}
      />
      <span className="slider"></span>
    </label>
  </div>
));
const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const addToast = useCallback((message, type = "info") => {
    const id = Date.now();
    setToasts((p) => [...p, { id, message, type }]);
    setTimeout(() => setToasts((c) => c.filter((t) => t.id !== id)), 4000);
  }, []);
  return (
    <ToastContext.Provider value={addToast}>
      {children}
      <div className="toast-container">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="toast"
            style={{
              backgroundColor:
                t.type === "success"
                  ? "var(--success-color)"
                  : t.type === "danger"
                  ? "var(--danger-color)"
                  : "var(--text-dark)",
            }}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};
const SortableHeader = React.memo(
  ({ children, name, sortConfig, requestSort }) => {
    const isSorted = sortConfig && sortConfig.key === name;
    const directionClass = isSorted
      ? sortConfig.direction === "ascending"
        ? "desc"
        : "asc"
      : "";
    return (
      <th className="sortable" onClick={() => requestSort(name)}>
        {children}
        <Icon path={ICONS.SORT} className={`sort-icon ${directionClass}`} />
      </th>
    );
  }
);
const ProtectedRoute = ({ isAllowed, redirectPath = "/", children }) => {
  if (!isAllowed) return <Navigate to={redirectPath} replace />;
  return children ? children : <Outlet />;
};

const Modal = React.memo(({ show, onClose, children, ...props }) => {
  if (!show) return null;
  return (
    <div
      className="modal-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        {...props}
      >
        <button
          onClick={onClose}
          className="modal-close-btn"
          aria-label="סגור חלון"
        >
          ×
        </button>
        {children}
      </div>
    </div>
  );
});

// 4. PAGE-SPECIFIC COMPONENTS
function EmployeeForm({ initialData, onSave, onCancel }) {
  const [formData, setFormData] = useState({
    name: "",
    department: "",
    hourlyRate: "",
    role: "employee",
    password: "",
  });
  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || "",
        department: initialData.department || "",
        hourlyRate: initialData.hourlyRate || "",
        role: initialData.role || "employee",
        password: "",
      });
    } else {
      setFormData({
        name: "",
        department: "",
        hourlyRate: "",
        role: "employee",
        password: "",
      });
    }
  }, [initialData]);
  const handleChange = (e) =>
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  const handleSubmit = (e) => {
    e.preventDefault();
    const dataToSend = { ...formData };
    if (initialData && !formData.password) delete dataToSend.password;
    onSave(dataToSend);
  };
  return (
    <form onSubmit={handleSubmit}>
      <h3 style={{ marginTop: 0, borderBottom: "none" }}>
        {initialData ? "עריכת פרטי עובד" : "הוספת עובד חדש"}
      </h3>
      <p
        style={{
          marginTop: 0,
          marginBottom: "24px",
          color: "var(--text-light)",
        }}
      >
        מלא את הפרטים הבאים כדי להוסיף או לעדכן עובד במערכת.
      </p>
      <FormInput
        label="שם מלא"
        name="name"
        value={formData.name}
        onChange={handleChange}
        required
      />
      <FormInput
        label="מחלקה"
        name="department"
        value={formData.department}
        onChange={handleChange}
        required
      />
      <FormInput
        label="תעריף שעתי (₪)"
        type="number"
        name="hourlyRate"
        value={formData.hourlyRate}
        onChange={handleChange}
        required
      />
      <FormInput
        label={initialData ? "סיסמה חדשה (אופציונלי)" : "סיסמה"}
        type="password"
        name="password"
        value={formData.password}
        onChange={handleChange}
        required={!initialData}
        minLength={6}
      />
      <div className="form-group">
        <label>תפקיד</label>
        <select name="role" value={formData.role} onChange={handleChange}>
          <option value="employee">עובד</option>
          <option value="manager">מנהל</option>
        </select>
      </div>
      <div
        style={{
          display: "flex",
          gap: "12px",
          justifyContent: "flex-end",
          marginTop: "24px",
        }}
      >
        <button type="button" className="secondary" onClick={onCancel}>
          ביטול
        </button>
        <button type="submit">שמור</button>
      </div>
    </form>
  );
}

function ChangePasswordForm() {
  const { currentUser } = useContext(AppContext);
  const toaster = useToaster();
  const [passwords, setPasswords] = useState({
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const handleChange = (e) =>
    setPasswords((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      if (passwords.newPassword !== passwords.confirmPassword)
        return toaster("הסיסמאות החדשות אינן תואמות", "danger");
      if (passwords.newPassword.length < 6)
        return toaster("סיסמה חדשה חייבת להכיל לפחות 6 תווים", "danger");
      setIsLoading(true);
      try {
        const data = await apiFetch("/users/change-password", {
          method: "POST",
          body: JSON.stringify({
            userId: currentUser._id,
            oldPassword: passwords.oldPassword,
            newPassword: passwords.newPassword,
          }),
        });
        toaster(data.message, "success");
        setPasswords({ oldPassword: "", newPassword: "", confirmPassword: "" });
      } catch (error) {
        toaster(error.message, "danger");
      } finally {
        setIsLoading(false);
      }
    },
    [passwords, currentUser, toaster]
  );
  return (
    <form onSubmit={handleSubmit}>
      <FormInput
        label="סיסמה נוכחית"
        type="password"
        name="oldPassword"
        value={passwords.oldPassword}
        onChange={handleChange}
        required
      />
      <FormInput
        label="סיסמה חדשה"
        type="password"
        name="newPassword"
        value={passwords.newPassword}
        onChange={handleChange}
        required
        minLength={6}
      />
      <FormInput
        label="אימות סיסמה חדשה"
        type="password"
        name="confirmPassword"
        value={passwords.confirmPassword}
        onChange={handleChange}
        required
        minLength={6}
      />
      <div
        style={{
          display: "flex",
          justifyContent: "flex-start",
          marginTop: "1.5rem",
        }}
      >
        <button type="submit" disabled={isLoading}>
          {isLoading ? <LoadingSpinner /> : "שמור סיסמה חדשה"}
        </button>
      </div>
    </form>
  );
}

function EmployeeRow({ employee, attendanceRecord, onStatusUpdate }) {
  const { state } = useContext(AppContext);
  const toaster = useToaster();
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let interval;
    if (employee.status === STATUSES.PRESENT.key && attendanceRecord) {
      const updateTimer = () => {
        const clockInTime = new Date(attendanceRecord.clockIn);
        const now = new Date();
        const diff = now - clockInTime;
        setElapsedTime(Math.max(0, diff / 36e5));
      };
      updateTimer();
      interval = setInterval(updateTimer, 1000);
    } else {
      setElapsedTime(0);
    }
    return () => clearInterval(interval);
  }, [employee.status, attendanceRecord]);

  const handleClockAction = useCallback(
    async (action) => {
      if (isLoading) return;
      setIsLoading(true);
      try {
        const updatedEmployee = await apiFetch(`/attendance/${action}`, {
          method: "POST",
          body: JSON.stringify({
            employeeId: employee._id,
            settings: state.settings,
          }),
        });
        onStatusUpdate(updatedEmployee);
        toaster(
          `${updatedEmployee.name} החתים ${
            action === "clock-in" ? "כניסה" : "יציאה"
          }.`,
          "success"
        );
      } catch (error) {
        toaster(
          `שגיאה בהחתמת ${action === "clock-in" ? "כניסה" : "יציאה"}: ${
            error.message
          }`,
          "danger"
        );
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading, employee._id, state.settings, onStatusUpdate, toaster]
  );

  const formatTime = (hours) => {
    if (hours <= 0) return "00:00:00";
    const totalSeconds = Math.floor(hours * 3600);
    const h = String(Math.floor(totalSeconds / 3600)).padStart(2, "0");
    const m = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, "0");
    const s = String(totalSeconds % 60).padStart(2, "0");
    return `${h}:${m}:${s}`;
  };

  const statusObject =
    Object.values(STATUSES).find((s) => s.key === employee.status) ||
    STATUSES.ABSENT;
  const isPresent = employee.status === STATUSES.PRESENT.key;

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "2fr 1fr 1fr",
        alignItems: "center",
        padding: "1rem 0",
        borderBottom: "1px solid var(--border-color)",
      }}
    >
      <div
        style={{
          justifySelf: "start",
          display: "flex",
          alignItems: "center",
          gap: "1rem",
        }}
      >
        <div>
          <div style={{ fontWeight: 500 }}>{employee.name}</div>
          <div style={{ fontSize: "0.875rem", color: "var(--text-light)" }}>
            {employee.department}
          </div>
        </div>
        {isPresent && (
          <div
            style={{
              color: "var(--primary-color)",
              fontFamily: "monospace",
              fontSize: "1.125rem",
            }}
          >
            {formatTime(elapsedTime)}
          </div>
        )}
      </div>
      <div style={{ justifySelf: "center" }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.5rem",
          }}
        >
          <div className={`status-dot ${statusObject.colorClass}`}></div>
          <span>{statusObject.text}</span>
        </div>
      </div>
      <div style={{ justifySelf: "end", display: "flex", gap: "0.5rem" }}>
        <button
          onClick={() => handleClockAction("clock-in")}
          disabled={isPresent || isLoading}
        >
          כניסה
        </button>
        <button
          onClick={() => handleClockAction("clock-out")}
          disabled={!isPresent || isLoading}
        >
          יציאה
        </button>
      </div>
    </div>
  );
}

function Dashboard() {
  const { currentUser } = useContext(AppContext);
  const [employees, setEmployees] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const toaster = useToaster();
  const [openAttendance, setOpenAttendance] = useState([]);

  const fetchData = useCallback(async () => {
    if (!currentUser) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const [employeesData, attendanceData] = await Promise.all([
        apiFetch("/employees"),
        apiFetch("/attendance/today/open"),
      ]);
      setEmployees(employeesData);
      setOpenAttendance(attendanceData);
    } catch (err) {
      if (currentUser.role === "manager") toaster(err.message, "danger");
    } finally {
      setIsLoading(false);
    }
  }, [toaster, currentUser]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const updateEmployeeInList = useCallback((updatedEmployee) => {
    setEmployees((prev) =>
      prev.map((emp) =>
        emp._id === updatedEmployee._id ? updatedEmployee : emp
      )
    );
    apiFetch("/attendance/today/open")
      .then(setOpenAttendance)
      .catch(() => {});
  }, []);

  return (
    <>
      <div className="page-header">
        <h2>סקירה כללית</h2>
      </div>
      <div className="card">
        <h3>נוכחות בזמן אמת</h3>
        {isLoading ? (
          <LoadingSpinner />
        ) : (
          employees
            .filter((e) => {
              if (currentUser.role === "manager") return e.role === "employee";
              if (currentUser.role === "employee")
                return e._id === currentUser._id;
              return false;
            })
            .map((emp) => {
              const attendanceRecord = openAttendance.find(
                (att) => att.employee === emp._id
              );
              return (
                <EmployeeRow
                  key={emp._id}
                  employee={emp}
                  attendanceRecord={attendanceRecord}
                  onStatusUpdate={updateEmployeeInList}
                />
              );
            })
        )}
      </div>
    </>
  );
}

function EmployeeList() {
  const toaster = useToaster();
  const [employees, setEmployees] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [isAbsenceModalOpen, setIsAbsenceModalOpen] = useState(false);
  const [absencesForEmployee, setAbsencesForEmployee] = useState([]);
  const [isLoadingAbsences, setIsLoadingAbsences] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isResetPasswordModalOpen, setIsResetPasswordModalOpen] =
    useState(false);

  const fetchEmployees = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await apiFetch("/employees");
      setEmployees(data);
    } catch (error) {
      toaster(error.message, "danger");
    } finally {
      setIsLoading(false);
    }
  }, [toaster]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  const {
    items: sortedEmployees,
    requestSort,
    sortConfig,
  } = useSortableData(
    employees.filter(
      (emp) =>
        emp.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
        (departmentFilter === "" || emp.department === departmentFilter)
    ),
    { key: "name", direction: "ascending" }
  );
  const uniqueDepartments = useMemo(
    () => [...new Set(employees.map((emp) => emp.department))],
    [employees]
  );

  const closeModal = useCallback(() => {
    setIsEditModalOpen(false);
    setIsConfirmModalOpen(false);
    setIsAbsenceModalOpen(false);
    setIsDetailsModalOpen(false);
    setIsResetPasswordModalOpen(false);
    setSelectedEmployee(null);
  }, []);

  const handleOpenAbsenceModal = useCallback(
    async (employee) => {
      setSelectedEmployee(employee);
      setIsLoadingAbsences(true);
      setIsAbsenceModalOpen(true);
      try {
        const data = await apiFetch(`/absences/employee/${employee._id}`);
        setAbsencesForEmployee(data);
      } catch (err) {
        toaster(err.message, "danger");
      } finally {
        setIsLoadingAbsences(false);
      }
    },
    [toaster]
  );

  const handleSaveEmployee = useCallback(
    async (employeeData) => {
      const isUpdating = selectedEmployee && selectedEmployee._id;
      const endpoint = isUpdating
        ? `/employees/${selectedEmployee._id}`
        : "/employees";
      const method = isUpdating ? "PUT" : "POST";
      try {
        await apiFetch(endpoint, {
          method,
          body: JSON.stringify(employeeData),
        });
        toaster(`העובד ${isUpdating ? "עודכן" : "נוסף"} בהצלחה!`, "success");
        closeModal();
        fetchEmployees();
      } catch (error) {
        toaster(error.message, "danger");
      }
    },
    [selectedEmployee, closeModal, fetchEmployees, toaster]
  );

  const handleConfirmDelete = useCallback(async () => {
    if (!selectedEmployee) return;
    try {
      await apiFetch(`/employees/${selectedEmployee._id}`, {
        method: "DELETE",
      });
      toaster(`${selectedEmployee.name} נמחק.`);
      closeModal();
      fetchEmployees();
    } catch (error) {
      toaster(error.message, "danger");
    }
  }, [selectedEmployee, closeModal, fetchEmployees, toaster]);

  const handleAddAbsence = useCallback(
    async (absenceData) => {
      try {
        const newAbsence = await apiFetch("/absences", {
          method: "POST",
          body: JSON.stringify({
            ...absenceData,
            employeeId: selectedEmployee._id,
          }),
        });
        setAbsencesForEmployee((prev) => [...prev, newAbsence]);
        toaster("היעדרות נוספה בהצלחה", "success");
      } catch (err) {
        toaster(err.message, "danger");
      }
    },
    [selectedEmployee, toaster]
  );

  const handleDeleteAbsence = useCallback(
    async (absenceId) => {
      try {
        await apiFetch(`/absences/${absenceId}`, { method: "DELETE" });
        setAbsencesForEmployee((prev) =>
          prev.filter((a) => a._id !== absenceId)
        );
        toaster("ההיעדרות נמחקה", "info");
      } catch (err) {
        toaster(err.message, "danger");
      }
    },
    [toaster]
  );

  const handleResetPassword = useCallback(
    async (newPassword) => {
      if (!selectedEmployee) return;
      try {
        await apiFetch("/users/reset-password", {
          method: "POST",
          body: JSON.stringify({
            userIdToReset: selectedEmployee._id,
            newPassword,
          }),
        });
        toaster("הסיסמה אופסה בהצלחה", "success");
        closeModal();
      } catch (err) {
        toaster(err.message, "danger");
      }
    },
    [selectedEmployee, closeModal, toaster]
  );

  return (
    <>
      <div className="page-header">
        <h2>ניהול עובדים</h2>
        <div className="page-actions">
          <button onClick={() => setIsEditModalOpen(true)}>
            הוסף עובד חדש
          </button>
        </div>
      </div>
      <div className="filter-controls">
        <FormInput
          type="text"
          placeholder="חיפוש לפי שם..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <div className="form-group">
          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
          >
            <option value="">כל המחלקות</option>
            {uniqueDepartments.map((dep) => (
              <option key={dep} value={dep}>
                {dep}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="card">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <SortableHeader
                  name="name"
                  sortConfig={sortConfig}
                  requestSort={requestSort}
                >
                  שם
                </SortableHeader>
                <SortableHeader
                  name="department"
                  sortConfig={sortConfig}
                  requestSort={requestSort}
                >
                  מחלקה
                </SortableHeader>
                <SortableHeader
                  name="hourlyRate"
                  sortConfig={sortConfig}
                  requestSort={requestSort}
                >
                  תעריף
                </SortableHeader>
                <th>סטטוס נוכחי</th> <th>פעולות</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td
                    colSpan="5"
                    style={{ textAlign: "center", padding: "40px" }}
                  >
                    <LoadingSpinner />
                  </td>
                </tr>
              ) : sortedEmployees.length === 0 ? (
                <tr>
                  <td
                    colSpan="5"
                    style={{ textAlign: "center", padding: "20px" }}
                  >
                    לא נמצאו עובדים.
                  </td>
                </tr>
              ) : (
                sortedEmployees.map((emp) => {
                  const statusObject =
                    Object.values(STATUSES).find((s) => s.key === emp.status) ||
                    STATUSES.ABSENT;
                  return (
                    <tr key={emp._id}>
                      <td>{emp.name}</td> <td>{emp.department}</td>
                      <td>₪{emp.hourlyRate}/שעה</td>
                      <td>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.5rem",
                          }}
                        >
                          <div
                            className={`status-dot ${statusObject.colorClass}`}
                          ></div>
                          <span>{statusObject.text}</span>
                        </div>
                      </td>
                      <td
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: "0.5rem",
                        }}
                      >
                        <button
                          className="secondary"
                          onClick={() => {
                            setSelectedEmployee(emp);
                            setIsEditModalOpen(true);
                          }}
                        >
                          ערוך
                        </button>
                        <button
                          className="secondary"
                          onClick={() => {
                            setSelectedEmployee(emp);
                            setIsDetailsModalOpen(true);
                          }}
                        >
                          פירוט
                        </button>
                        <button
                          className="secondary"
                          onClick={() => {
                            setSelectedEmployee(emp);
                            setIsResetPasswordModalOpen(true);
                          }}
                        >
                          איפוס סיסמה
                        </button>
                        <button
                          className="secondary"
                          onClick={() => handleOpenAbsenceModal(emp)}
                        >
                          היעדרויות
                        </button>
                        <button
                          className="danger secondary"
                          onClick={() => {
                            setSelectedEmployee(emp);
                            setIsConfirmModalOpen(true);
                          }}
                        >
                          מחק
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
      <Modal show={isEditModalOpen} onClose={closeModal}>
        <EmployeeForm
          initialData={selectedEmployee}
          onSave={handleSaveEmployee}
          onCancel={closeModal}
        />
      </Modal>
      {/* Implement other modals here... */}
    </>
  );
}
// הוסף את הקוד הזה ליד שאר המודאלים
function CreateAdminModal({ show, onClose, onAdminCreated }) {
  const toaster = useToaster();
  const [formData, setFormData] = useState({
    name: "",
    password: "",
    department: "הנהלה",
    hourlyRate: "150",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const handleChange = (e) =>
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const togglePasswordVisibility = () => {
    setIsPasswordVisible((prev) => !prev);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.password || formData.password.length < 6) {
      toaster("שם וסיסמה (לפחות 6 תווים) הם שדות חובה.", "danger");
      return;
    }
    setIsLoading(true);
    try {
      const newUser = await apiFetch("/auth/create-first-admin", {
        method: "POST",
        body: JSON.stringify(formData),
      });
      toaster(`מנהל "${newUser.name}" נוצר בהצלחה!`, "success");
      onAdminCreated();
    } catch (error) {
      toaster(error.message, "danger");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal show={show} onClose={onClose}>
      <form onSubmit={handleSubmit} className="modal-form">
        <h3>יצירת מנהל ראשון</h3>
        <p className="modal-subtitle">
          זוהי פעולה חד פעמית ליצירת המשתמש הראשי במערכת.
        </p>

        <FormInput
          label="שם מנהל"
          name="name"
          value={formData.name}
          onChange={handleChange}
          required
          autoFocus
        />

        <FormInput
          label="סיסמה"
          type={isPasswordVisible ? "text" : "password"}
          name="password"
          value={formData.password}
          onChange={handleChange}
          required
          minLength={6}
          icon={
            <Icon
              path={isPasswordVisible ? ICONS.EYE_CLOSED : ICONS.EYE_OPEN}
              size={20}
            />
          }
          onIconClick={togglePasswordVisibility}
        />

        {/* שימוש ב-Grid Layout לסידור השדות בשורה */}
        <div className="form-grid">
          <FormInput
            label="מחלקה"
            name="department"
            value={formData.department}
            onChange={handleChange}
          />
          <FormInput
            label="תעריף שעתי"
            type="number"
            name="hourlyRate"
            value={formData.hourlyRate}
            onChange={handleChange}
          />
        </div>

        {/* אזור הכפתורים עם קלאס ייעודי */}
        <div className="form-actions">
          <button type="button" className="secondary" onClick={onClose}>
            ביטול
          </button>
          <button type="submit" disabled={isLoading}>
            {isLoading ? <LoadingSpinner /> : "צור מנהל"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
function Login({ onLogin }) {
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);

  // State לניהול נראות הסיסמה בדף הלוגין
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const toaster = useToaster();

  const handleLoginSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      setError("");
      setIsLoading(true);
      try {
        const data = await apiFetch("/auth/login", {
          method: "POST",
          body: JSON.stringify({ name, password }),
        });
        localStorage.setItem("token", data.token);
        onLogin(data.user);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    },
    [name, password, onLogin]
  );

  // פונקציה שמפעילה/מכבה את נראות הסיסמה
  const togglePasswordVisibility = () => {
    setIsPasswordVisible((prev) => !prev);
  };

  return (
    <>
      <div className="login-page-wrapper">
        <div className="login-container">
          <h1>Attend.ly</h1>
          <p className="subtitle">מערכת ניהול נוכחות עובדים</p>
          <form className="login-form" onSubmit={handleLoginSubmit}>
            {error && <div className="login-error-message">{error}</div>}
            <FormInput
              label="שם משתמש"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
            />

            {/* --- התיקון כאן --- */}
            <FormInput
              label="סיסמה"
              type={isPasswordVisible ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              icon={
                <Icon
                  path={isPasswordVisible ? ICONS.EYE_CLOSED : ICONS.EYE_OPEN}
                  size={20}
                />
              }
              // מעבירים את הפונקציה ל-prop הנכון: onIconClick
              onIconClick={togglePasswordVisibility}
            />

            <button
              type="submit"
              style={{ width: "100%", marginTop: "1rem" }}
              disabled={isLoading}
            >
              {isLoading ? <LoadingSpinner /> : "התחבר"}
            </button>
          </form>
          <div
            style={{
              marginTop: "2rem",
              paddingTop: "1rem",
              borderTop: "1px solid var(--border-color)",
            }}
          >
            <p style={{ color: "var(--text-light)", marginBottom: "0.5rem" }}>
              אין לך עדיין מנהל במערכת?
            </p>
            <button
              className="secondary"
              onClick={() => setIsAdminModalOpen(true)}
            >
              צור מנהל ראשון
            </button>
          </div>
        </div>
      </div>

      <CreateAdminModal
        show={isAdminModalOpen}
        onClose={() => setIsAdminModalOpen(false)}
        onAdminCreated={() => {
          setIsAdminModalOpen(false);
          toaster("כעת תוכל להתחבר עם הפרטים שיצרת.", "info");
        }}
      />
    </>
  );
}

function App() {
  const { currentUser, handleLogout } = useContext(AppContext);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    if (isSidebarOpen) setIsSidebarOpen(false);
  }, [location]);

  const toggleSidebar = useCallback(
    () => setIsSidebarOpen((prev) => !prev),
    []
  );

  return (
    <div className="app-layout">
      <button
        className="mobile-nav-toggle"
        onClick={toggleSidebar}
        aria-label="פתח תפריט"
      >
        <Icon path={ICONS.MENU} size={24} />
      </button>

      <aside className={`sidebar ${isSidebarOpen ? "is-open" : ""}`}>
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
              {/* <NavLink to="/reports"><Icon path={ICONS.REPORTS} /> דוחות</NavLink> */}
              {/* <NavLink to="/payroll"><Icon path={ICONS.PAYROLL} /> חישוב שכר</NavLink> */}
              {/* <NavLink to="/settings"><Icon path={ICONS.SETTINGS} /> הגדרות</NavLink> */}
            </>
          )}
          {/* {currentUser.role === "employee" && <NavLink to="/my-area"><Icon path={ICONS.EMPLOYEES} /> אזור אישי</NavLink> } */}
        </nav>
        <div className="sidebar-footer">
          <span>שלום, {currentUser.name}</span>
          <button
            onClick={handleLogout}
            className="secondary"
            style={{ width: "100%" }}
          >
            התנתקות
          </button>
        </div>
      </aside>

      {isSidebarOpen && (
        <div className="sidebar-overlay" onClick={toggleSidebar}></div>
      )}

      <main className="main-content">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route
            element={
              <ProtectedRoute isAllowed={currentUser?.role === "manager"} />
            }
          >
            <Route path="/employees" element={<EmployeeList />} />
            {/* <Route path="/reports" element={<ReportsPage />} /> */}
            {/* <Route path="/settings" element={<SettingsPage />} /> */}
            {/* <Route path="/payroll" element={<PayrollPage />} /> */}
          </Route>
          {/* <Route element={<ProtectedRoute isAllowed={currentUser?.role === "employee"} />}> */}
          {/* <Route path="/my-area" element={<MyAreaPage />} /> */}
          {/* </Route> */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
    </div>
  );
}

// קומפוננטה חדשה שמחליטה מה להציג
function AppRouter() {
  const { currentUser, handleLogin } = useContext(AppContext);

  // אם אין משתמש מחובר, הצג את דף הלוגין
  if (!currentUser) {
    return <Login onLogin={handleLogin} />;
  }

  // אם יש משתמש, הצג את האפליקציה הראשית
  return <App />;
}

function Root() {
  const [state, dispatch] = useReducer(appReducer, initialAppState);
  const [currentUser, setCurrentUser] = useLocalStorage("currentUser", null);

  const handleLogin = useCallback(
    (user) => {
      if (user) setCurrentUser(user);
    },
    [setCurrentUser]
  );

  const handleLogout = useCallback(() => {
    setCurrentUser(null);
    localStorage.removeItem("token");
  }, [setCurrentUser]);

  const appContextValue = useMemo(
    () => ({
      state,
      dispatch,
      currentUser,
      handleLogin,
      handleLogout,
    }),
    [state, dispatch, currentUser, handleLogin, handleLogout]
  );

  return (
    <AppContext.Provider value={appContextValue}>
      <ToastProvider>
        <BrowserRouter>
          {/* קוראים לקומפוננטה החדשה כאן */}
          <AppRouter />
        </BrowserRouter>
      </ToastProvider>
    </AppContext.Provider>
  );
}

export default Root;
