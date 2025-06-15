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

// --- Register Chart.js components ---
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const API_BASE_URL = "http://localhost:5000/api";

// --- Reusable Components ---
const LoadingSpinner = () => <div className="loader"></div>;

function ConfirmationModal({
  show,
  onClose,
  onConfirm,
  title,
  children,
  confirmText = "אישור",
  cancelText = "ביטול",
}) {
  if (!show) return null;
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="modal-close-btn">
          ×
        </button>
        <h3 style={{ marginTop: 0, borderBottom: "none" }}>{title}</h3>
        <div className="confirmation-modal-body">{children}</div>
        <div className="confirmation-modal-actions">
          <button onClick={onClose} className="secondary">
            {cancelText}
          </button>
          <button onClick={onConfirm} className="danger">
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

function LoginModal({ show, onClose, onLogin }) {
  if (!show) return null;
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="modal-close-btn">
          ×
        </button>
        <Login onLogin={onLogin} />
      </div>
    </div>
  );
}

function MonthlyDetailsModal({ show, onClose, employee }) {
  const [details, setDetails] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [yearMonth, setYearMonth] = useState(
    new Date().toISOString().slice(0, 7)
  );
  const toaster = useToaster();

  useEffect(() => {
    if (show && employee) {
      setIsLoading(true);
      fetch(`${API_BASE_URL}/attendance/employee/${employee._id}/${yearMonth}`)
        .then((res) => {
          if (!res.ok) throw new Error("Failed to fetch details");
          return res.json();
        })
        .then((data) => {
          const sanitizedData = data.map((item) => ({
            ...item,
            durationHours: parseFloat(item.durationHours) || null,
          }));
          setDetails(sanitizedData);
        })
        .catch((err) => {
          console.error(err);
          toaster("שגיאה בטעינת פירוט שעות", "danger");
          setDetails([]);
        })
        .finally(() => setIsLoading(false));
    }
  }, [show, employee, yearMonth, toaster]);

  const totalHours = useMemo(() => {
    return details.reduce((accumulator, currentItem) => {
      const hours = Number(currentItem.durationHours);
      if (!isNaN(hours)) {
        return accumulator + hours;
      }
      return accumulator;
    }, 0);
  }, [details]);

  if (!show || !employee) return null;

  const formatTime = (dateString) =>
    dateString
      ? new Date(dateString).toLocaleTimeString("he-IL", {
          hour: "2-digit",
          minute: "2-digit",
        })
      : "טרם";
  const formatDate = (dateString) =>
    dateString
      ? new Date(dateString).toLocaleDateString("he-IL", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        })
      : "";
  const formatDuration = (hours) => {
    if (hours === null) return "משמרת פתוחה";
    if (typeof hours !== "number" || isNaN(hours) || hours <= 0) return "00:00";
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: "600px" }}
      >
        <button onClick={onClose} className="modal-close-btn">
          ×
        </button>
        <h3 style={{ marginTop: 0 }}>פירוט שעות עבור {employee.name}</h3>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "16px",
          }}
        >
          <FormInput
            label="בחר חודש:"
            type="month"
            value={yearMonth}
            onChange={(e) => setYearMonth(e.target.value)}
          />
          <div style={{ textAlign: "right" }}>
            <h4 style={{ margin: 0 }}>סה"כ שעות בחודש:</h4>
            <span style={{ fontSize: "1.5rem", fontWeight: "bold" }}>
              {formatDuration(totalHours)}
            </span>
          </div>
        </div>
        {isLoading ? (
          <LoadingSpinner />
        ) : (
          <div
            className="table-container"
            style={{ maxHeight: "400px", overflowY: "auto" }}
          >
            <table>
              <thead>
                <tr>
                  <th>תאריך</th>
                  <th>שעת כניסה</th>
                  <th>שעת יציאה</th>
                  <th>סה"כ שעות</th>
                </tr>
              </thead>
              <tbody>
                {details.length > 0 ? (
                  details.map((entry, index) => (
                    <tr key={entry.id || index}>
                      <td>{formatDate(entry.clockIn)}</td>
                      <td>{formatTime(entry.clockIn)}</td>
                      <td>{formatTime(entry.clockOut)}</td>
                      <td>{formatDuration(entry.durationHours)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan="4"
                      style={{ textAlign: "center", padding: "20px" }}
                    >
                      אין רישומי נוכחות לחודש זה.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

const Icon = ({ path, size = 18, className = "" }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
  >
    <path d={path}></path>
  </svg>
);
const FormInput = ({ label, ...props }) => (
  <div className="form-group">
    <label>{label}</label>
    <input {...props} />
  </div>
);
const FormTextarea = ({ label, ...props }) => (
  <div className="form-group">
    <label>{label}</label>
    <textarea {...props} />
  </div>
);
const ToggleSwitch = ({ label, checked, onChange, name }) => (
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
);

function EmployeeForm({ initialData, onSave, onCancel }) {
  const [formData, setFormData] = useState({
    name: "",
    department: "",
    hourlyRate: "",
    role: "employee",
  });
  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || "",
        department: initialData.department || "",
        hourlyRate: initialData.hourlyRate || "",
        role: initialData.role || "employee",
      });
    } else {
      setFormData({
        name: "",
        department: "",
        hourlyRate: "",
        role: "employee",
      });
    }
  }, [initialData]);
  const handleChange = (e) =>
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
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
          color: "var(--font-light)",
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

const ICONS = {
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
};
const STATUSES = {
  PRESENT: { key: "present", text: "נוכח", colorClass: "present" },
  SICK: { key: "sick", text: "מחלה", colorClass: "sick" },
  VACATION: { key: "vacation", text: "חופשה", colorClass: "vacation" },
  ABSENT: { key: "absent", text: "לא בעבודה", colorClass: "absent" },
};

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

const ToastContext = createContext();
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
                  : "var(--font-dark)",
            }}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};
const useToaster = () => useContext(ToastContext);

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

const SortableHeader = ({ children, name, sortConfig, requestSort }) => {
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
};

const initialAppState = {
  settings: {
    standardWorkDayHours: 8.5,
    overtimeRatePercent: 150,
    restrictByIp: true,
    allowedIps: "127.0.0.1, ::1",
    paidVacation: true,
    paidSickLeave: true,
  },
  attendance: [],
  scheduledAbsences: [],
};
const appReducer = (state, action) => {
  switch (action.type) {
    case "SET_SETTINGS":
      return { ...state, settings: action.payload };
    default:
      return state;
  }
};
const AppContext = createContext();

function AbsenceManagementModal({
  show,
  onClose,
  employee,
  absences,
  onAdd,
  onDelete,
}) {
  const [newAbsence, setNewAbsence] = useState({
    type: "vacation",
    startDate: "",
    endDate: "",
  });
  if (!show || !employee) return null;
  const handleAddAbsence = (e) => {
    e.preventDefault();
    if (newAbsence.startDate && newAbsence.endDate) {
      onAdd(newAbsence);
      setNewAbsence({ type: "vacation", startDate: "", endDate: "" });
    }
  };
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="modal-close-btn">
          ×
        </button>
        <h3 style={{ marginTop: 0 }}>ניהול היעדרויות עבור {employee.name}</h3>
        <form
          onSubmit={handleAddAbsence}
          className="payroll-controls"
          style={{ padding: "16px", marginBottom: "24px" }}
        >
          <div className="form-group">
            <label>סוג היעדרות</label>
            <select
              value={newAbsence.type}
              onChange={(e) =>
                setNewAbsence({ ...newAbsence, type: e.target.value })
              }
            >
              <option value="vacation">חופשה</option>
              <option value="sick">מחלה</option>
            </select>
          </div>
          <div className="form-group">
            <label>מתאריך</label>
            <input
              type="date"
              value={newAbsence.startDate}
              onChange={(e) =>
                setNewAbsence({ ...newAbsence, startDate: e.target.value })
              }
              required
            />
          </div>
          <div className="form-group">
            <label>עד תאריך</label>
            <input
              type="date"
              value={newAbsence.endDate}
              onChange={(e) =>
                setNewAbsence({ ...newAbsence, endDate: e.target.value })
              }
              required
            />
          </div>
          <button type="submit" style={{ gridColumn: "1 / -1" }}>
            הוסף היעדרות
          </button>
        </form>
        <h4>היעדרויות קיימות</h4>
        {absences.length > 0 ? (
          <ul style={{ listStyle: "none", padding: 0 }}>
            {absences.map((absence) => (
              <li
                key={absence._id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "8px",
                  borderBottom: "1px solid var(--border-color)",
                }}
              >
                <div>
                  <span style={{ fontWeight: 500 }}>
                    {STATUSES[absence.type.toUpperCase()]?.text || absence.type}
                  </span>
                  :  {new Date(absence.startDate).toLocaleDateString("he-IL")} -{" "}
                  {new Date(absence.endDate).toLocaleDateString("he-IL")}
                </div>
                <button
                  onClick={() => onDelete(absence._id)}
                  className="danger secondary"
                  style={{ padding: "5px 10px" }}
                >
                  מחק
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p>אין היעדרויות מתוכננות עבור עובד זה.</p>
        )}
      </div>
    </div>
  );
}

function Dashboard() {
  const { currentUser } = useContext(AppContext);
  return (
    <>
      <div className="page-header">
        <h2>סקירה כללית</h2>
      </div>
      <div className="card">
        <p>ברוכים הבאים למערכת ניהול נוכחות.</p>
      </div>
      <div className="dashboard-grid">
        {currentUser && <RealTimePresenceCard />}
      </div>
    </>
  );
}

function SettingsPage() {
  const { state, dispatch } = useContext(AppContext);
  const [settings, setSettings] = useState(state.settings);
  const toaster = useToaster();
  useEffect(() => {
    setSettings(state.settings);
  }, [state.settings]);
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSettings((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };
  const handleSave = () => {
    dispatch({ type: "SET_SETTINGS", payload: settings });
    toaster("ההגדרות נשמרו!", "success");
  };
  return (
    <>
      <div className="page-header">
        <h2>הגדרות מערכת</h2>
        <div className="page-actions">
          <button onClick={handleSave}>שמור שינויים</button>
        </div>
      </div>
      <div className="settings-grid">
        <div className="card">
          <h3>מדיניות נוכחות</h3>
          <FormInput
            label="יום עבודה סטנדרטי (שעות)"
            type="number"
            name="standardWorkDayHours"
            value={settings.standardWorkDayHours}
            onChange={handleChange}
          />
        </div>
        <div className="card">
          <h3>מדיניות שכר</h3>
          <FormInput
            label="תעריף שעות נוספות (%)"
            type="number"
            name="overtimeRatePercent"
            value={settings.overtimeRatePercent}
            onChange={handleChange}
          />
          <ToggleSwitch
            label="תשלום עבור ימי חופשה"
            name="paidVacation"
            checked={settings.paidVacation}
            onChange={handleChange}
          />
          <ToggleSwitch
            label="תשלום עבור ימי מחלה"
            name="paidSickLeave"
            checked={settings.paidSickLeave}
            onChange={handleChange}
          />
        </div>
        <div className="card">
          <h3>אבטחה</h3>
          <ToggleSwitch
            label="הגבל החתמה לפי IP"
            name="restrictByIp"
            checked={settings.restrictByIp}
            onChange={handleChange}
          />
          {settings.restrictByIp && (
            <FormTextarea
              label="כתובות IP מורשות (מופרד בפסיק)"
              name="allowedIps"
              value={settings.allowedIps}
              onChange={handleChange}
            />
          )}
        </div>
      </div>
    </>
  );
}

function RealTimePresenceCard() {
  const [employees, setEmployees] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const toaster = useToaster();
  const [openAttendance, setOpenAttendance] = useState([]);
  const { currentUser } = useContext(AppContext);

  useEffect(() => {
    if (!currentUser) {
      setIsLoading(false);
      return;
    }
    Promise.all([
      fetch(`${API_BASE_URL}/employees`).then((res) => {
        if (!res.ok) throw new Error("Failed to fetch employees");
        return res.json();
      }),
      fetch(`${API_BASE_URL}/attendance/today/open`).then((res) => {
        if (!res.ok) throw new Error("Failed to fetch attendance");
        return res.json();
      }),
    ])
      .then(([employeesData, attendanceData]) => {
        setEmployees(employeesData);
        setOpenAttendance(attendanceData);
      })
      .catch((err) => {
        console.error(err);
        toaster("שגיאה בטעינת נתוני נוכחות", "danger");
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [toaster, currentUser]);

  const updateEmployeeInList = (updatedEmployee) => {
    setEmployees((prev) =>
      prev.map((emp) =>
        emp._id === updatedEmployee._id ? updatedEmployee : emp
      )
    );
    fetch(`${API_BASE_URL}/attendance/today/open`)
      .then((res) => res.json())
      .then(setOpenAttendance);
  };

  return (
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

  const handleClockAction = async (action) => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/attendance/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: employee._id,
          settings: state.settings,
        }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Clock action failed");
      }
      const updatedEmployee = await response.json();
      onStatusUpdate(updatedEmployee);
      toaster(
        `${updatedEmployee.name} החתים ${
          action === "clock-in" ? "כניסה" : "יציאה"
        }.`,
        "success"
      );
    } catch (error) {
      console.error(`Clock-${action} failed:`, error);
      toaster(
        `שגיאה בהחתמת ${action === "clock-in" ? "כניסה" : "יציאה"}: ${
          error.message
        }`,
        "danger"
      );
    } finally {
      setIsLoading(false);
    }
  };

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
        padding: "12px 0",
        borderBottom: "1px solid var(--border-color)",
      }}
    >
      <div
        style={{
          justifySelf: "start",
          display: "flex",
          alignItems: "center",
          gap: "20px",
        }}
      >
        <div>
          <div style={{ fontWeight: 500 }}>{employee.name}</div>
          <div style={{ fontSize: "14px", color: "var(--font-light)" }}>
            {employee.department}
          </div>
        </div>
        {isPresent && (
          <div
            style={{
              color: "var(--primary-color)",
              fontFamily: "monospace",
              fontSize: "18px",
            }}
          >
            {formatTime(elapsedTime)}
          </div>
        )}
      </div>
      <div style={{ justifySelf: "center" }}>
        <div
          style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}
        >
          <div className={`status-dot ${statusObject.colorClass}`}></div>
          <span>{statusObject.text}</span>
        </div>
      </div>
      <div style={{ justifySelf: "end", display: "flex", gap: "8px" }}>
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

function EmployeeList() {
  const toaster = useToaster();
  const [employees, setEmployees] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [employeeToDelete, setEmployeeToDelete] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [isAbsenceModalOpen, setIsAbsenceModalOpen] = useState(false);
  const [absencesForEmployee, setAbsencesForEmployee] = useState([]);
  const [isLoadingAbsences, setIsLoadingAbsences] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [employeeForDetails, setEmployeeForDetails] = useState(null);

  const EMPLOYEES_API_URL = `${API_BASE_URL}/employees`;
  const ABSENCE_API_URL = `${API_BASE_URL}/absences`;

  useEffect(() => {
    setIsLoading(true);
    fetch(EMPLOYEES_API_URL)
      .then((res) => {
        if (!res.ok) throw new Error("Network response was not ok");
        return res.json();
      })
      .then((data) => {
        setEmployees(data);
      })
      .catch((error) => {
        console.error("Error fetching employees:", error);
        toaster("שגיאה בקבלת נתונים מהשרת", "danger");
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [toaster, EMPLOYEES_API_URL]);

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
  const handleOpenEdit = (employee) => {
    setSelectedEmployee(employee);
    setIsEditModalOpen(true);
  };
  const handleOpenAdd = () => {
    setSelectedEmployee(null);
    setIsEditModalOpen(true);
  };
  const handleOpenDeleteConfirm = (employee) => {
    setEmployeeToDelete(employee);
    setIsConfirmModalOpen(true);
  };
  const handleOpenDetailsModal = (employee) => {
    setEmployeeForDetails(employee);
    setIsDetailsModalOpen(true);
  };

  const closeModal = () => {
    setIsEditModalOpen(false);
    setIsConfirmModalOpen(false);
    setIsAbsenceModalOpen(false);
    setIsDetailsModalOpen(false);
    setSelectedEmployee(null);
    setEmployeeToDelete(null);
    setAbsencesForEmployee([]);
    setEmployeeForDetails(null);
  };

  const handleSaveEmployee = (employeeData) => {
    const isUpdating = selectedEmployee && selectedEmployee._id;
    const url = isUpdating
      ? `${EMPLOYEES_API_URL}/${selectedEmployee._id}`
      : EMPLOYEES_API_URL;
    fetch(url, {
      method: isUpdating ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(employeeData),
    })
      .then((res) => {
        if (!res.ok) throw new Error("Save operation failed");
        return res.json();
      })
      .then((savedEmployee) => {
        if (isUpdating) {
          setEmployees((prev) =>
            prev.map((emp) =>
              emp._id === savedEmployee._id ? savedEmployee : emp
            )
          );
          toaster("פרטי העובד עודכנו!", "success");
        } else {
          setEmployees((prev) => [...prev, savedEmployee]);
          toaster("עובד חדש נוסף!", "success");
        }
        closeModal();
      })
      .catch((error) => {
        console.error("Error saving employee:", error);
        toaster("שגיאה בשמירת נתוני העובד", "danger");
      });
  };

  const handleConfirmDelete = () => {
    if (!employeeToDelete) return;
    fetch(`${EMPLOYEES_API_URL}/${employeeToDelete._id}`, { method: "DELETE" })
      .then((res) => {
        if (res.ok) {
          setEmployees((prev) =>
            prev.filter((emp) => emp._id !== employeeToDelete._id)
          );
          toaster(`${employeeToDelete.name} נמחק.`);
        } else {
          throw new Error("Deletion failed");
        }
        closeModal();
      })
      .catch((error) => {
        console.error("Error deleting employee:", error);
        toaster("שגיאה במחיקת העובד.", "danger");
      });
  };

  const handleOpenAbsenceModal = (employee) => {
    setSelectedEmployee(employee);
    setIsLoadingAbsences(true);
    setIsAbsenceModalOpen(true);
    fetch(`${ABSENCE_API_URL}/employee/${employee._id}`)
      .then((res) => res.json())
      .then((data) => {
        setAbsencesForEmployee(data);
      })
      .catch((err) => {
        console.error(err);
        toaster("שגיאה בטעינת היעדרויות", "danger");
      })
      .finally(() => setIsLoadingAbsences(false));
  };

  const handleAddAbsence = (absenceData) => {
    fetch(ABSENCE_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...absenceData,
        employeeId: selectedEmployee._id,
      }),
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to add absence");
        return res.json();
      })
      .then((newAbsence) => {
        setAbsencesForEmployee((prev) => [...prev, newAbsence]);
        toaster("היעדרות נוספה בהצלחה", "success");
      })
      .catch((err) => {
        toaster("שגיאה בהוספת היעדרות", "danger");
      });
  };

  const handleDeleteAbsence = (absenceId) => {
    fetch(`${ABSENCE_API_URL}/${absenceId}`, { method: "DELETE" }).then(
      (res) => {
        if (res.ok) {
          setAbsencesForEmployee((prev) =>
            prev.filter((a) => a._id !== absenceId)
          );
          toaster("ההיעדרות נמחקה", "info");
        } else {
          toaster("שגיאה במחיקת היעדרות", "danger");
        }
      }
    );
  };

  return (
    <>
      <div className="page-header">
        <h2>ניהול עובדים</h2>
        <div className="page-actions">
          <button onClick={handleOpenAdd}>הוסף עובד חדש</button>
        </div>
      </div>
      <div className="filter-controls">
        <input
          type="text"
          placeholder="חיפוש לפי שם..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
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
      <div className="card">
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
              <th>סטטוס נוכחי</th>
              <th>פעולות</th>
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
                    <td>{emp.name}</td>
                    <td>{emp.department}</td>
                    <td>₪{emp.hourlyRate}/שעה</td>
                    <td>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                        }}
                      >
                        <div
                          className={`status-dot ${statusObject.colorClass}`}
                        ></div>
                        <span>{statusObject.text}</span>
                      </div>
                    </td>
                    <td style={{ display: "flex", gap: "8px" }}>
                      <button
                        className="secondary"
                        onClick={() => handleOpenEdit(emp)}
                      >
                        ערוך
                      </button>
                      <button
                        className="secondary"
                        onClick={() => handleOpenDetailsModal(emp)}
                      >
                        פירוט שעות
                      </button>
                      <button
                        className="secondary"
                        onClick={() => handleOpenAbsenceModal(emp)}
                      >
                        היעדרויות
                      </button>
                      <button
                        className="danger secondary"
                        onClick={() => handleOpenDeleteConfirm(emp)}
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
      <EmployeeModal
        show={isEditModalOpen}
        onClose={closeModal}
        employee={selectedEmployee}
        onSave={handleSaveEmployee}
      />
      <ConfirmationModal
        show={isConfirmModalOpen}
        onClose={closeModal}
        onConfirm={handleConfirmDelete}
        title="אישור מחיקה"
      >
        {employeeToDelete && (
          <p>
            האם אתה בטוח שברצונך למחוק את{" "}
            <strong>{employeeToDelete.name}</strong>? פעולה זו אינה הפיכה.
          </p>
        )}
      </ConfirmationModal>
      <AbsenceManagementModal
        show={isAbsenceModalOpen}
        onClose={closeModal}
        employee={selectedEmployee}
        absences={isLoadingAbsences ? [] : absencesForEmployee}
        onAdd={handleAddAbsence}
        onDelete={handleDeleteAbsence}
      />
      <MonthlyDetailsModal
        show={isDetailsModalOpen}
        onClose={closeModal}
        employee={employeeForDetails}
      />
    </>
  );
}

function ReportsPage() {
  const [reportData, setReportData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [yearMonth, setYearMonth] = useState(
    new Date().toISOString().slice(0, 7)
  );
  const toaster = useToaster();

  useEffect(() => {
    setIsLoading(true);
    fetch(`${API_BASE_URL}/reports/monthly-summary/${yearMonth}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch report data");
        return res.json();
      })
      .then((data) => {
        const chartData = {
          labels: data.map((item) => item.name),
          datasets: [
            {
              label: 'סה"כ שעות עבודה',
              data: data.map((item) => item.totalHours),
              backgroundColor: "rgba(53, 162, 235, 0.5)",
              borderColor: "rgba(53, 162, 235, 1)",
              borderWidth: 1,
            },
          ],
        };
        setReportData(chartData);
      })
      .catch((err) => {
        console.error(err);
        toaster("שגיאה בטעינת הדוח", "danger");
        setReportData(null);
      })
      .finally(() => setIsLoading(false));
  }, [yearMonth, toaster]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: "top" },
      title: {
        display: true,
        text: `סיכום שעות עבודה לחודש ${yearMonth.split("-")[1]}/${
          yearMonth.split("-")[0]
        }`,
        font: { size: 18 },
      },
      tooltip: {
        callbacks: {
          label: function (context) {
            let label = context.dataset.label || "";
            if (label) {
              label += ": ";
            }
            if (context.parsed.y !== null) {
              label += context.parsed.y.toFixed(2) + " שעות";
            }
            return label;
          },
        },
      },
    },
    scales: {
      y: { beginAtZero: true, title: { display: true, text: "שעות" } },
    },
  };

  return (
    <>
      <div className="page-header">
        <h2>דוחות</h2>
      </div>
      <div className="card">
        <div className="filter-controls" style={{ paddingBottom: "20px" }}>
          <FormInput
            label="בחר חודש לדיווח:"
            type="month"
            value={yearMonth}
            onChange={(e) => setYearMonth(e.target.value)}
          />
        </div>
        <div style={{ position: "relative", height: "400px" }}>
          {isLoading ? (
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                height: "100%",
              }}
            >
              <LoadingSpinner />
            </div>
          ) : reportData && reportData.labels.length > 0 ? (
            <Bar options={chartOptions} data={reportData} />
          ) : (
            <div style={{ textAlign: "center", paddingTop: "50px" }}>
              <p>אין נתוני נוכחות להצגה עבור החודש שנבחר.</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function PayrollPage() {
  const { state } = useContext(AppContext);
  const toaster = useToaster();
  const [allEmployees, setAllEmployees] = useState([]);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState(new Set());
  const [payrollData, setPayrollData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [yearMonth, setYearMonth] = useState(
    new Date().toISOString().slice(0, 7)
  );

  useEffect(() => {
    fetch(`${API_BASE_URL}/employees`)
      .then((res) => res.json())
      .then(setAllEmployees)
      .catch((err) => toaster("שגיאה בטעינת עובדים", "danger"));
  }, [toaster]);

  const {
    items: sortedPayrollData,
    requestSort,
    sortConfig,
  } = useSortableData(payrollData || [], {
    key: "employeeName",
    direction: "ascending",
  });

  const handleEmployeeSelect = (employeeId) => {
    setSelectedEmployeeIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(employeeId)) {
        newSet.delete(employeeId);
      } else {
        newSet.add(employeeId);
      }
      return newSet;
    });
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedEmployeeIds(new Set(allEmployees.map((emp) => emp._id)));
    } else {
      setSelectedEmployeeIds(new Set());
    }
  };

  const handleGenerateReport = async () => {
    if (selectedEmployeeIds.size === 0) {
      toaster("יש לבחור לפחות עובד אחד", "danger");
      return;
    }
    setIsLoading(true);
    setPayrollData(null);
    try {
      const response = await fetch(`${API_BASE_URL}/payroll/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          yearMonth: yearMonth,
          employeeIds: Array.from(selectedEmployeeIds),
          settings: state.settings,
        }),
      });
      if (!response.ok) {
        throw new Error("Failed to generate report");
      }
      const data = await response.json();
      setPayrollData(data);
      toaster("הדוח הופק בהצלחה!", "success");
    } catch (error) {
      console.error("Error generating report:", error);
      toaster("שגיאה בהפקת הדוח", "danger");
    } finally {
      setIsLoading(false);
    }
  };

  const grandTotal = useMemo(() => {
    if (!payrollData) return null;
    return payrollData.reduce(
      (acc, item) => {
        acc.totalHours += item.totalHours;
        acc.totalPay += item.totalPay;
        acc.vacationPay += item.vacationPay;
        acc.sickPay += item.sickPay;
        acc.grossPay += item.grossPay;
        return acc;
      },
      { totalHours: 0, totalPay: 0, vacationPay: 0, sickPay: 0, grossPay: 0 }
    );
  }, [payrollData]);

  const downloadCSV = () => {
    if (!sortedPayrollData || sortedPayrollData.length === 0) return;
    const headers = [
      "שם עובד",
      "שעות עבודה",
      "ימי חופשה",
      "ימי מחלה",
      "שכר בסיס",
      "תשלום חופשה",
      "תשלום מחלה",
      "שכר ברוטו",
    ];
    const rows = sortedPayrollData.map((item) =>
      [
        `"${item.employeeName}"`,
        item.totalHours.toFixed(2),
        item.vacationDays,
        item.sickDays,
        item.totalPay.toFixed(2),
        item.vacationPay.toFixed(2),
        item.sickPay.toFixed(2),
        item.grossPay.toFixed(2),
      ].join(",")
    );
    const csvContent =
      "data:text/csv;charset=utf-8,\uFEFF" +
      [headers.join(","), ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `payroll_report_${yearMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <>
      <div className="page-header">
        <h2>הפקת דוח שכר</h2>
        <div className="page-actions">
          {payrollData && (
            <button onClick={downloadCSV} className="secondary">
              <Icon path={ICONS.DOWNLOAD} /> הורד CSV
            </button>
          )}
          <button
            onClick={handleGenerateReport}
            disabled={isLoading || selectedEmployeeIds.size === 0}
          >
            {isLoading ? <LoadingSpinner /> : "הפק דוח"}
          </button>
        </div>
      </div>
      <div className="card payroll-controls">
        <div className="control-section">
          <h3>תקופה</h3>
          <FormInput
            label="בחר חודש ושנה"
            type="month"
            value={yearMonth}
            onChange={(e) => setYearMonth(e.target.value)}
          />
        </div>
        <div className="control-section">
          <h3>עובדים</h3>
          <div className="employee-select-list">
            <div className="select-all-item">
              <input
                type="checkbox"
                id="select-all"
                onChange={handleSelectAll}
                checked={
                  allEmployees.length > 0 &&
                  selectedEmployeeIds.size === allEmployees.length
                }
              />
              <label htmlFor="select-all" style={{ fontWeight: 700 }}>
                בחר הכל
              </label>
            </div>
            {allEmployees.map((emp) => (
              <div key={emp._id} className="employee-select-item">
                <input
                  type="checkbox"
                  id={`emp-${emp._id}`}
                  checked={selectedEmployeeIds.has(emp._id)}
                  onChange={() => handleEmployeeSelect(emp._id)}
                />
                <label htmlFor={`emp-${emp._id}`}>{emp.name}</label>
              </div>
            ))}
          </div>
        </div>
      </div>
      {isLoading && (
        <div className="card" style={{ textAlign: "center", padding: "40px" }}>
          <LoadingSpinner />
          <p style={{ marginTop: "16px" }}>מחשב נתונים...</p>
        </div>
      )}
      {payrollData && (
        <div className="card">
          <h3>
            דוח שכר לחודש {yearMonth.split("-")[1]}/{yearMonth.split("-")[0]}
          </h3>
          <table className="payroll-table">
            <thead>
              <tr>
                <SortableHeader
                  name="employeeName"
                  sortConfig={sortConfig}
                  requestSort={requestSort}
                >
                  שם עובד
                </SortableHeader>
                <SortableHeader
                  name="totalHours"
                  sortConfig={sortConfig}
                  requestSort={requestSort}
                >
                  סה"כ שעות
                </SortableHeader>
                <SortableHeader
                  name="vacationDays"
                  sortConfig={sortConfig}
                  requestSort={requestSort}
                >
                  ימי חופשה
                </SortableHeader>
                <SortableHeader
                  name="sickDays"
                  sortConfig={sortConfig}
                  requestSort={requestSort}
                >
                  ימי מחלה
                </SortableHeader>
                <SortableHeader
                  name="totalPay"
                  sortConfig={sortConfig}
                  requestSort={requestSort}
                >
                  שכר עבודה
                </SortableHeader>
                <SortableHeader
                  name="vacationPay"
                  sortConfig={sortConfig}
                  requestSort={requestSort}
                >
                  תשלום חופשה
                </SortableHeader>
                <SortableHeader
                  name="sickPay"
                  sortConfig={sortConfig}
                  requestSort={requestSort}
                >
                  תשלום מחלה
                </SortableHeader>
                <SortableHeader
                  name="grossPay"
                  sortConfig={sortConfig}
                  requestSort={requestSort}
                >
                  שכר ברוטו
                </SortableHeader>
              </tr>
            </thead>
            <tbody>
              {sortedPayrollData.map((item) => (
                <tr key={item.employeeId}>
                  <td>{item.employeeName}</td>
                  <td>{item.totalHours.toFixed(2)}</td>
                  <td>{item.vacationDays}</td>
                  <td>{item.sickDays}</td>
                  <td>₪{item.totalPay.toFixed(2)}</td>
                  <td>₪{item.vacationPay.toFixed(2)}</td>
                  <td>₪{item.sickPay.toFixed(2)}</td>
                  <td>₪{item.grossPay.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
            {grandTotal && (
              <tfoot>
                <tr>
                  <td>סה"כ</td>
                  <td>{grandTotal.totalHours.toFixed(2)}</td>
                  <td colSpan={2}></td>
                  <td>₪{grandTotal.totalPay.toFixed(2)}</td>
                  <td>₪{grandTotal.vacationPay.toFixed(2)}</td>
                  <td>₪{grandTotal.sickPay.toFixed(2)}</td>
                  <td>₪{grandTotal.grossPay.toFixed(2)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}
    </>
  );
}

function Login({ onLogin }) {
  const [allUsers, setAllUsers] = useState([]);
  const [employeeId, setEmployeeId] = useState("");
  useEffect(() => {
    fetch(`${API_BASE_URL}/employees`)
      .then((res) => res.json())
      .then((data) => setAllUsers(data))
      .catch((err) => console.error("Could not fetch users for login", err));
  }, []);
  const handleLoginSubmit = (e) => {
    e.preventDefault();
    const user = allUsers.find((u) => u._id === employeeId);
    if (user) {
      onLogin(user);
    }
  };
  return (
    <form
      style={{ width: "350px", textAlign: "center" }}
      onSubmit={handleLoginSubmit}
    >
      <h2 style={{ marginTop: 0 }}>התחברות למערכת</h2>
      <select
        value={employeeId}
        onChange={(e) => setEmployeeId(e.target.value)}
        required
        style={{
          width: "100%",
          padding: "12px",
          marginBottom: "20px",
          borderRadius: "8px",
        }}
      >
        <option value="">בחר/י שם...</option>
        {allUsers.map((emp) => (
          <option key={emp._id} value={emp._id}>
            {emp.name} ({emp.role})
          </option>
        ))}
      </select>
      <button type="submit" style={{ width: "100%" }} disabled={!employeeId}>
        התחבר
      </button>
    </form>
  );
}

const ProtectedRoute = ({ isAllowed, redirectPath = "/", children }) => {
  if (!isAllowed) {
    return <Navigate to={redirectPath} replace />;
  }
  return children ? children : <Outlet />;
};

function App() {
  const [state, dispatch] = useReducer(appReducer, initialAppState);
  const [currentUser, setCurrentUser] = useLocalStorage("currentUser", null);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const handleLogin = (user) => {
    if (user) {
      setCurrentUser(user);
      setIsLoginModalOpen(false);
    }
  };
  const handleLogout = () => setCurrentUser(null);
  const appContextValue = useMemo(
    () => ({ state, dispatch, currentUser }),
    [state, dispatch, currentUser]
  );

  return (
    <AppContext.Provider value={appContextValue}>
      <ToastProvider>
        <BrowserRouter>
          <div className="app-layout">
            <aside className="sidebar">
              <div className="sidebar-header">
                <h1>Attend.ly</h1>
              </div>
              <nav>
                <NavLink to="/">
                  <Icon path={ICONS.DASHBOARD} /> סקירה כללית
                </NavLink>
                {currentUser && currentUser.role === "manager" && (
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
                {currentUser ? (
                  <>
                    <span style={{ fontSize: "20px", marginBottom: "10px" }}>
                      שלום, {currentUser.name}
                    </span>
                    <button
                      onClick={handleLogout}
                      className="secondary"
                      style={{ width: "100%", padding: "10px" }}
                    >
                      התנתקות
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setIsLoginModalOpen(true)}
                    style={{ width: "100%", padding: "10px" }}
                  >
                    התחברות
                  </button>
                )}
              </div>
            </aside>
            <main className="main-content">
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route
                  element={
                    <ProtectedRoute
                      isAllowed={currentUser && currentUser.role === "manager"}
                    />
                  }
                >
                  <Route path="/employees" element={<EmployeeList />} />
                  <Route path="/reports" element={<ReportsPage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                  <Route path="/payroll" element={<PayrollPage />} />
                </Route>
                <Route path="*" element={<Navigate to="/" />} />
              </Routes>
            </main>
          </div>
          <LoginModal
            show={isLoginModalOpen}
            onClose={() => setIsLoginModalOpen(false)}
            onLogin={handleLogin}
          />
        </BrowserRouter>
      </ToastProvider>
    </AppContext.Provider>
  );
}

export default App;
