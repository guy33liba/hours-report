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
} from "react-router-dom";
import "./styles.css";

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
const ICONS = {
  DASHBOARD: "M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z",
  EMPLOYEES:
    "M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z",
  REPORTS:
    "M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z",
  PAYROLL:
    "M21.41 11.58l-9-9C12.05 2.22 11.55 2 11 2H4c-1.1 0-2 .9-2 2v7c0 .55.22 1.05.59 1.42l9 9c.36.36.86.58 1.41.58.55 0 1.05-.22 1.41-.59l7-7c.37-.36.59-.86.59-1.41s-.22-1.05-.59-1.42zM5.5 7C4.67 7 4 6.33 4 5.5S4.67 4 5.5 4 7 4.67 7 5.5 6.33 7 5.5 7z",
  SETTINGS:
    "M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.07-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.69-1.62-0.92L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41 l-3.84,0c-0.24,0-0.44,0.17-0.48,0.41L9.2,5.59C8.6,5.82,8.08,6.13,7.58,6.51L5.19,5.55C4.97,5.48,4.72,5.55,4.6,5.77L2.68,9.09 c-0.11,0.2-0.06,0.47,0.12,0.61L4.83,11.28c-0.05,0.3-0.07,0.62-0.07,0.94c0,0.32,0.02,0.64,0.07,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.69,1.62,0.92l0.44,2.78 c0.04,0.24,0.24,0.41,0.48,0.41l3.84,0c0.24,0,0.44-0.17,0.48,0.41l0.44-2.78c0.59-0.23,1.12-0.54,1.62-0.92l2.39,0.96 c0.22,0.08,0.47,0.01,0.59-0.22l1.92-3.32c0.12-0.2,0.07-0.47-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z",
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

const calculateHours = (attendanceEntry) => {
  if (!attendanceEntry || !attendanceEntry.clockIn) return 0;
  const clockOutTime = attendanceEntry.clockOut
    ? new Date(attendanceEntry.clockOut)
    : new Date();
  const clockInTime = new Date(attendanceEntry.clockIn);
  const totalMilliseconds = clockOutTime - clockInTime;
  return Math.max(0, totalMilliseconds / 36e5);
};

const initialData = {
  employees: [
    {
      id: 1,
      name: "ישראל ישראלי",
      department: "פיתוח",
      role: "manager",
      hourlyRate: 120,
      status: STATUSES.ABSENT.key,
    },
    {
      id: 2,
      name: "דנה כהן",
      department: "שיווק",
      role: "employee",
      hourlyRate: 60,
      status: STATUSES.ABSENT.key,
    },
    {
      id: 3,
      name: "אבי לוי",
      department: "פיתוח",
      role: "employee",
      hourlyRate: 90,
      status: STATUSES.ABSENT.key,
    },
    {
      id: 4,
      name: "רותם חן",
      department: "תמיכה",
      role: "employee",
      hourlyRate: 55,
      status: STATUSES.ABSENT.key,
    },
  ],
  attendance: [],
  scheduledAbsences: [],
  settings: {
    standardWorkDayHours: 8.5,
    overtimeRatePercent: 150,
    restrictByIp: true,
    allowedIps: "192.168.1.1, 8.8.8.8",
    paidVacation: true,
    paidSickLeave: true,
  },
};

const dataReducer = (state, action) => {
  switch (action.type) {
    case "SET_INITIAL_DATA":
      return { ...initialData, ...action.payload };
    case "UPDATE_SETTINGS":
      return { ...state, settings: { ...state.settings, ...action.payload } };
    case "UPDATE_EMPLOYEE_STATUS":
      return {
        ...state,
        employees: state.employees.map((e) =>
          e.id === action.payload.id
            ? { ...e, status: action.payload.status }
            : e
        ),
      };
    case "ADD_ATTENDANCE":
      return { ...state, attendance: [...state.attendance, action.payload] };
    case "UPDATE_LAST_ATTENDANCE": {
      const idx = state.attendance.findLastIndex(
        (a) => a.employeeId === action.payload.employeeId && !a.clockOut
      );
      if (idx === -1) return state;
      const newAtt = [...state.attendance];
      newAtt[idx] = { ...newAtt[idx], ...action.payload.data };
      return { ...state, attendance: newAtt };
    }
    case "ADD_EMPLOYEE":
      return {
        ...state,
        employees: [
          ...state.employees,
          { ...action.payload, id: Date.now(), status: STATUSES.ABSENT.key },
        ],
      };
    case "UPDATE_EMPLOYEE":
      return {
        ...state,
        employees: state.employees.map((e) =>
          e.id === action.payload.id ? { ...e, ...action.payload } : e
        ),
      };
    case "DELETE_EMPLOYEE":
      return {
        ...state,
        employees: state.employees.filter((e) => e.id !== action.payload),
        attendance: state.attendance.filter(
          (a) => a.employeeId !== action.payload
        ),
      };
    case "ADD_ABSENCE":
      return {
        ...state,
        scheduledAbsences: [
          ...state.scheduledAbsences,
          { ...action.payload, id: Date.now() },
        ],
      };
    case "DELETE_ABSENCE":
      return {
        ...state,
        scheduledAbsences: state.scheduledAbsences.filter(
          (a) => a.id !== action.payload
        ),
      };
    default:
      return state;
  }
};

const AppContext = createContext();
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

// --- FIXED: More robust sorting hook ---
const useSortableData = (items, config = null) => {
  const [sortConfig, setSortConfig] = useState(config);

  const sortedItems = useMemo(() => {
    let sortableItems = [...items];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        const valA = a[sortConfig.key];
        const valB = b[sortConfig.key];

        // Check if the values are numbers for numeric sort
        if (typeof valA === "number" && typeof valB === "number") {
          return sortConfig.direction === "ascending"
            ? valA - valB
            : valB - valA;
        }

        // Otherwise, use string comparison
        const strA = String(valA).toLowerCase();
        const strB = String(valB).toLowerCase();

        if (strA < strB) {
          return sortConfig.direction === "ascending" ? -1 : 1;
        }
        if (strA > strB) {
          return sortConfig.direction === "ascending" ? 1 : -1;
        }
        return 0;
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
    ) {
      direction = "descending";
    }
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
    : ""; // Flipped for up/down arrow logic
  return (
    <th className="sortable" onClick={() => requestSort(name)}>
      {children}
      <Icon path={ICONS.SORT} className={`sort-icon ${directionClass}`} />
    </th>
  );
};

function Dashboard() {
  const { state } = useContext(AppContext);

  const summary = useMemo(() => {
    if (!state || !state.settings || !state.employees || !state.attendance) {
      return { totalHours: 0, overtimeHours: 0, totalPay: 0, presentCount: 0 };
    }

    let totalProjectedHours = 0;
    let totalProjectedOvertime = 0;
    let totalProjectedPay = 0;

    const todayStr = new Date().toDateString();

    state.employees.forEach((emp) => {
      const todayEntries = state.attendance.filter(
        (a) =>
          a.employeeId === emp.id &&
          new Date(a.clockIn).toDateString() === todayStr
      );

      if (todayEntries.length === 0) {
        return;
      }

      const completedHours = todayEntries
        .filter((entry) => entry.clockOut)
        .reduce((sum, entry) => sum + calculateHours(entry), 0);

      const lastEntry = todayEntries[todayEntries.length - 1];
      let hoursForCalculation;

      if (lastEntry.clockOut) {
        hoursForCalculation = completedHours;
      } else {
        hoursForCalculation = Math.max(
          state.settings.standardWorkDayHours,
          completedHours
        );
      }

      const hourlyRate = Number(emp.hourlyRate) || 0;
      const standardWorkDayHours =
        Number(state.settings.standardWorkDayHours) || 0;
      const overtimeRatePercent =
        Number(state.settings.overtimeRatePercent) || 0;

      const regularHours = Math.min(hoursForCalculation, standardWorkDayHours);
      const otHours = Math.max(0, hoursForCalculation - standardWorkDayHours);

      totalProjectedHours += hoursForCalculation;
      totalProjectedOvertime += otHours;
      totalProjectedPay +=
        regularHours * hourlyRate +
        otHours * hourlyRate * (overtimeRatePercent / 100);
    });

    const presentCount = state.employees.filter(
      (emp) => emp.status === STATUSES.PRESENT.key
    ).length;

    return {
      totalHours: totalProjectedHours,
      overtimeHours: totalProjectedOvertime,
      totalPay: totalProjectedPay,
      presentCount: presentCount,
    };
  }, [state]);
  return (
    <>
      <div className="page-header">
        <h2>סקירה כללית</h2>
      </div>
      <div
        className="dashboard-grid"
        style={{ gridTemplateColumns: "repeat(4, 1fr)", gap: "20px" }}
      >
        <div className="card kpi-card">
          <h3>סה"כ שעות היום</h3>
          <p className="kpi-value">{summary.totalHours.toFixed(2)}</p>
        </div>
        <div className="card kpi-card">
          <h3>שעות נוספות</h3>
          <p className="kpi-value">{summary.overtimeHours.toFixed(2)}</p>
        </div>
        <div className="card kpi-card">
          <h3>עובדים נוכחים</h3>
          <p className="kpi-value">{summary.presentCount}</p>
        </div>
        <div className="card kpi-card">
          <h3>שכר מוערך להיום</h3>
          <p className="kpi-value">₪{summary.totalPay.toFixed(2)}</p>
        </div>
      </div>
      <div className="dashboard-grid">
        <RealTimePresenceCard />
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
    dispatch({ type: "UPDATE_SETTINGS", payload: settings });
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
  const { state, dispatch } = useContext(AppContext);
  const toaster = useToaster();

  const handleStatusChange = async (employee, newStatusKey) => {
    if (employee.status === newStatusKey) return;
    const { settings } = state;

    if (newStatusKey === STATUSES.PRESENT.key && settings.restrictByIp) {
      try {
        const response = await fetch("https://api.ipify.org?format=json");
        if (!response.ok) throw new Error("Network response was not ok");
        const data = await response.json();
        const userIp = data.ip;

        const allowedIps = settings.allowedIps
          .split(",")
          .map((ip) => ip.trim())
          .filter((ip) => ip);

        if (!allowedIps.includes(userIp)) {
          toaster(
            `שגיאה: לא ניתן להחתים נוכחות מכתובת ה-IP הנוכחית (${userIp})`,
            "danger"
          );
          return;
        }
      } catch (error) {
        toaster("שגיאה: לא ניתן היה לאמת את כתובת ה-IP. נסה שוב.", "danger");
        console.error("IP check failed:", error);
        return;
      }
    }

    const now = new Date().toISOString();
    const newStatusObject = Object.values(STATUSES).find(
      (s) => s.key === newStatusKey
    );
    const toasterMessage = `${employee.name} שינה סטטוס ל: ${newStatusObject.text}`;

    dispatch({
      type: "UPDATE_EMPLOYEE_STATUS",
      payload: { id: employee.id, status: newStatusKey },
    });

    if (newStatusKey === STATUSES.PRESENT.key) {
      dispatch({
        type: "ADD_ATTENDANCE",
        payload: {
          id: Date.now(),
          employeeId: employee.id,
          clockIn: now,
          clockOut: null,
        },
      });
      toaster(toasterMessage, "success");
    } else if (newStatusKey === STATUSES.ABSENT.key) {
      dispatch({
        type: "UPDATE_LAST_ATTENDANCE",
        payload: { employeeId: employee.id, data: { clockOut: now } },
      });
      toaster(toasterMessage);
    }
  };
  return (
    <div className="card">
      <h3>נוכחות בזמן אמת</h3>
      {state.employees
        .filter((e) => e.role === "employee")
        .map((emp) => (
          <EmployeeRow
            key={emp.id}
            employee={emp}
            onStatusChange={handleStatusChange}
          />
        ))}
    </div>
  );
}

function EmployeeRow({ employee, onStatusChange }) {
  const { state } = useContext(AppContext);
  const [elapsedTime, setElapsedTime] = useState(0);

  useEffect(() => {
    let interval;
    if (employee.status === STATUSES.PRESENT.key) {
      const updateTimer = () => {
        const todayEntry = state.attendance.findLast(
          (a) => a.employeeId === employee.id && !a.clockOut
        );
        if (todayEntry) setElapsedTime(calculateHours(todayEntry));
      };
      updateTimer();
      interval = setInterval(updateTimer, 1000);
    } else {
      setElapsedTime(0);
    }
    return () => clearInterval(interval);
  }, [employee.status, state.attendance, employee.id]);

  const formatTime = (hours) => {
    if (hours <= 0) return "00:00:00";
    const totalSeconds = Math.floor(hours * 3600);
    const h = Math.floor(totalSeconds / 3600)
      .toString()
      .padStart(2, "0");
    const m = Math.floor((totalSeconds % 3600) / 60)
      .toString()
      .padStart(2, "0");
    const s = (totalSeconds % 60).toString().padStart(2, "0");
    return `${h}:${m}:${s}`;
  };

  const statusObject =
    Object.values(STATUSES).find((s) => s.key === employee.status) ||
    STATUSES.ABSENT;
  const isPresent = employee.status === STATUSES.PRESENT.key;
  const isAbsent = employee.status === STATUSES.ABSENT.key;

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
          onClick={() => onStatusChange(employee, STATUSES.PRESENT.key)}
          className={isPresent ? "secondary" : ""}
          disabled={
            isPresent ||
            employee.status === "vacation" ||
            employee.status === "sick"
          }
        >
          כניסה
        </button>
        <button
          onClick={() => onStatusChange(employee, STATUSES.ABSENT.key)}
          className={isAbsent ? "secondary" : ""}
          disabled={isAbsent}
        >
          יציאה
        </button>
      </div>
    </div>
  );
}

function EmployeeForm({ initialData, onSave, onCancel }) {
  const [formData, setFormData] = useState({
    name: "",
    department: "",
    hourlyRate: "",
    role: "employee",
  });
  useEffect(() => {
    if (initialData) setFormData(initialData);
    else
      setFormData({
        name: "",
        department: "",
        hourlyRate: "",
        role: "employee",
      });
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

function EmployeeModal({ show, onClose, employee, onSave }) {
  if (!show) return null;
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="modal-close-btn">
          ×
        </button>
        <EmployeeForm
          initialData={employee}
          onSave={onSave}
          onCancel={onClose}
        />
      </div>
    </div>
  );
}

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
      onAdd({ employeeId: employee.id, ...newAbsence });
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
                key={absence.id}
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
                    {STATUSES[absence.type.toUpperCase()].text}
                  </span>
                  :  {new Date(absence.startDate).toLocaleDateString("he-IL")} -{" "}
                  {new Date(absence.endDate).toLocaleDateString("he-IL")}
                </div>
                <button
                  onClick={() => onDelete(absence.id)}
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

function EmployeeList() {
  const { state, dispatch } = useContext(AppContext);
  const toaster = useToaster();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAbsenceModalOpen, setIsAbsenceModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");

  const filteredEmployees = useMemo(() => {
    return state.employees
      .filter((emp) =>
        emp.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .filter(
        (emp) => departmentFilter === "" || emp.department === departmentFilter
      );
  }, [state.employees, searchTerm, departmentFilter]);

  const {
    items: sortedEmployees,
    requestSort,
    sortConfig,
  } = useSortableData(filteredEmployees, {
    key: "name",
    direction: "ascending",
  });

  const uniqueDepartments = useMemo(() => {
    return [...new Set(state.employees.map((emp) => emp.department))];
  }, [state.employees]);

  const handleOpenEdit = (employee) => {
    setSelectedEmployee(employee);
    setIsEditModalOpen(true);
  };
  const handleOpenAbsences = (employee) => {
    setSelectedEmployee(employee);
    setIsAbsenceModalOpen(true);
  };
  const handleDeleteEmployee = (employee) => {
    if (window.confirm(`האם למחוק את ${employee.name}?`)) {
      dispatch({ type: "DELETE_EMPLOYEE", payload: employee.id });
      toaster(`${employee.name} נמחק.`);
    }
  };
  const handleSaveEmployee = (employeeData) => {
    if (selectedEmployee && selectedEmployee.id) {
      dispatch({
        type: "UPDATE_EMPLOYEE",
        payload: { ...employeeData, id: selectedEmployee.id },
      });
      toaster("פרטי העובד עודכנו!", "success");
    } else {
      dispatch({ type: "ADD_EMPLOYEE", payload: employeeData });
      toaster("עובד חדש נוסף!", "success");
    }
    setIsEditModalOpen(false);
  };
  const handleAddAbsence = (absenceData) => {
    dispatch({ type: "ADD_ABSENCE", payload: absenceData });
    toaster("היעדרות נוספה", "success");
  };
  const handleDeleteAbsence = (absenceId) => {
    dispatch({ type: "DELETE_ABSENCE", payload: absenceId });
    toaster("היעדרות נמחקה");
  };

  return (
    <>
      <div className="page-header">
        <h2>ניהול עובדים</h2>
        <div className="page-actions">
          <button
            onClick={() => {
              setSelectedEmployee(null);
              setIsEditModalOpen(true);
            }}
          >
            הוסף עובד חדש
          </button>
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
              {/* --- FIXED: Only sortable columns are wrapped --- */}
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
            {sortedEmployees.map((emp) => {
              const statusObject =
                Object.values(STATUSES).find((s) => s.key === emp.status) ||
                STATUSES.ABSENT;
              return (
                <tr key={emp.id}>
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
                      onClick={() => handleOpenAbsences(emp)}
                    >
                      היעדרויות
                    </button>
                    <button
                      className="danger secondary"
                      onClick={() => handleDeleteEmployee(emp)}
                    >
                      מחק
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <EmployeeModal
        show={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        employee={selectedEmployee}
        onSave={handleSaveEmployee}
      />
      <AbsenceManagementModal
        show={isAbsenceModalOpen}
        onClose={() => setIsAbsenceModalOpen(false)}
        employee={selectedEmployee}
        absences={
          selectedEmployee && state.scheduledAbsences
            ? state.scheduledAbsences.filter(
                (a) => a.employeeId === selectedEmployee.id
              )
            : []
        }
        onAdd={handleAddAbsence}
        onDelete={handleDeleteAbsence}
      />
    </>
  );
}

function exportToCsv(filename, rows) {
  if (!rows || !rows.length) {
    return;
  }
  const separator = ",";
  const keys = Object.keys(rows[0]);
  const csvContent =
    "\uFEFF" + // UTF-8 BOM for Excel
    keys.join(separator) +
    "\n" +
    rows
      .map((row) => {
        return keys
          .map((k) => {
            let cell = row[k] === null || row[k] === undefined ? "" : row[k];
            cell = String(cell).replace(/"/g, '""');
            return `"${cell}"`;
          })
          .join(separator);
      })
      .join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

function ReportsPage() {
  const { state } = useContext(AppContext);
  const [range, setRange] = useState({ start: "", end: "" });
  const reportData = useMemo(() => {
    if (!range.start || !range.end || !state.settings) return [];
    const startDate = new Date(range.start);
    const endDate = new Date(range.end);
    endDate.setHours(23, 59, 59, 999);
    return state.employees.map((emp) => {
      const entries = state.attendance.filter(
        (a) =>
          a.employeeId === emp.id &&
          new Date(a.clockIn) >= startDate &&
          new Date(a.clockIn) <= endDate
      );
      let totalHours = 0,
        overtime = 0,
        pay = 0;
      entries.forEach((entry) => {
        const hours = calculateHours(entry);
        totalHours += hours;
        const regular = Math.min(hours, state.settings.standardWorkDayHours);
        const ot = Math.max(0, hours - state.settings.standardWorkDayHours);
        overtime += ot;
        pay +=
          regular * emp.hourlyRate +
          ot * emp.hourlyRate * (state.settings.overtimeRatePercent / 100);
      });
      return {
        ID: emp.id,
        שם: emp.name,
        מחלקה: emp.department,
        "סהכ שעות": totalHours.toFixed(2),
        "שעות נוספות": overtime.toFixed(2),
        "שכר משוער (שח)": pay.toFixed(2),
      };
    });
  }, [range, state]);

  const handleExport = () => {
    const filename = `report_${range.start}_to_${range.end}.csv`;
    exportToCsv(filename, reportData);
  };

  return (
    <>
      <div className="page-header">
        <h2>דוחות נוכחות</h2>
        <div className="page-actions">
          <button
            className="secondary"
            onClick={handleExport}
            disabled={!reportData.length}
          >
            <Icon path={ICONS.DOWNLOAD} />
            ייצא ל-CSV
          </button>
        </div>
      </div>
      <div className="card">
        <div style={{ display: "flex", gap: 20, marginBottom: 20 }}>
          <input
            type="date"
            value={range.start}
            onChange={(e) => setRange({ ...range, start: e.target.value })}
          />
          <input
            type="date"
            value={range.end}
            onChange={(e) => setRange({ ...range, end: e.target.value })}
          />
        </div>
        <table>
          <thead>
            <tr>
              {reportData.length > 0 &&
                Object.keys(reportData[0]).map((key) => (
                  <th key={key}>{key}</th>
                ))}
            </tr>
          </thead>
          <tbody>
            {reportData.length > 0 ? (
              reportData.map((r) => (
                <tr key={r.ID}>
                  {Object.values(r).map((val, index) => (
                    <td key={index}>{val}</td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan="6"
                  style={{ textAlign: "center", padding: "20px" }}
                >
                  יש לבחור טווח תאריכים להצגת הדוח.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

function PayrollPage() {
  const { state } = useContext(AppContext);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState([]);
  const [dateRange, setDateRange] = useState({ start: "", end: "" });
  const [payrollResult, setPayrollResult] = useState(null);
  const handleEmployeeSelection = (e) => {
    const id = parseInt(e.target.value);
    setSelectedEmployeeIds((p) =>
      e.target.checked ? [...p, id] : p.filter((i) => i !== id)
    );
  };
  const handleSelectAll = (e) =>
    setSelectedEmployeeIds(
      e.target.checked
        ? state.employees
            .filter((emp) => emp.role === "employee")
            .map((emp) => emp.id)
        : []
    );

  const calculatePayroll = () => {
    if (selectedEmployeeIds.length === 0 || !dateRange.start || !dateRange.end)
      return null;

    const startDate = new Date(dateRange.start);
    const endDate = new Date(dateRange.end);
    endDate.setHours(23, 59, 59, 999);

    const details = state.employees
      .filter((emp) => selectedEmployeeIds.includes(emp.id))
      .map((emp) => {
        const {
          standardWorkDayHours,
          overtimeRatePercent,
          paidVacation,
          paidSickLeave,
        } = state.settings;

        // Work hours calculation
        const entries = state.attendance.filter(
          (a) =>
            a.employeeId === emp.id &&
            new Date(a.clockIn) >= startDate &&
            new Date(a.clockIn) <= endDate
        );
        let totalHours = 0,
          overtimeHours = 0,
          basePay = 0,
          overtimePay = 0;
        entries.forEach((entry) => {
          const hours = calculateHours(entry);
          const regularHours = Math.min(hours, standardWorkDayHours);
          const ot = Math.max(0, hours - standardWorkDayHours);
          totalHours += hours;
          overtimeHours += ot;
          basePay += regularHours * emp.hourlyRate;
          overtimePay += ot * emp.hourlyRate * (overtimeRatePercent / 100);
        });

        // Absence calculation
        let vacationDays = 0,
          sickDays = 0;
        state.scheduledAbsences
          .filter(
            (a) =>
              a.employeeId === emp.id &&
              (a.type === "vacation" || a.type === "sick")
          )
          .forEach((absence) => {
            let current = new Date(absence.startDate);
            let end = new Date(absence.endDate);
            while (current <= end) {
              if (current >= startDate && current <= endDate) {
                if (absence.type === "vacation") vacationDays++;
                else if (absence.type === "sick") sickDays++;
              }
              current.setDate(current.getDate() + 1);
            }
          });

        const vacationPay = paidVacation
          ? vacationDays * standardWorkDayHours * emp.hourlyRate
          : 0;
        const sickPay = paidSickLeave
          ? sickDays * standardWorkDayHours * emp.hourlyRate
          : 0;
        const totalPay = basePay + overtimePay + vacationPay + sickPay;

        return {
          id: emp.id,
          name: emp.name,
          regularHours: totalHours - overtimeHours,
          overtimeHours,
          basePay,
          overtimePay,
          vacationDays,
          vacationPay,
          sickDays,
          sickPay,
          totalPay,
        };
      });

    const summary = details.reduce(
      (acc, curr) => ({
        totalBasePay: acc.totalBasePay + curr.basePay,
        totalOvertimePay: acc.totalOvertimePay + curr.overtimePay,
        totalVacationPay: acc.totalVacationPay + curr.vacationPay,
        totalSickPay: acc.totalSickPay + curr.sickPay,
        totalPay: acc.totalPay + curr.totalPay,
        employeeCount: acc.employeeCount + 1,
      }),
      {
        totalBasePay: 0,
        totalOvertimePay: 0,
        totalVacationPay: 0,
        totalSickPay: 0,
        totalPay: 0,
        employeeCount: 0,
      }
    );
    return { details, summary };
  };

  const handleGenerate = () => setPayrollResult(calculatePayroll());

  const handleExport = () => {
    if (!payrollResult) return;
    const filename = `payroll_${dateRange.start}_to_${dateRange.end}.csv`;
    const dataToExport = payrollResult.details.map((d) => ({
      שם: d.name,
      "שעות רגילות": d.regularHours.toFixed(2),
      "שעות נוספות": d.overtimeHours.toFixed(2),
      "שכר בסיס": d.basePay.toFixed(2),
      'שכר ש"נ': d.overtimePay.toFixed(2),
      "ימי חופשה": d.vacationDays,
      "תשלום חופשה": d.vacationPay.toFixed(2),
      "ימי מחלה": d.sickDays,
      "תשלום מחלה": d.sickPay.toFixed(2),
      'סה"כ לתשלום': d.totalPay.toFixed(2),
    }));
    exportToCsv(filename, dataToExport);
  };

  return (
    <>
      <div className="page-header">
        <h2>הפקת דוח שכר</h2>
        <div className="page-actions">
          {payrollResult && (
            <button className="secondary" onClick={handleExport}>
              <Icon path={ICONS.DOWNLOAD} />
              ייצא ל-CSV
            </button>
          )}
        </div>
      </div>
      <div className="card">
        <div className="payroll-controls">
          <div className="control-section">
            <h3>1. בחר עובדים</h3>
            <div className="employee-select-list">
              <div className="select-all-item">
                <input
                  type="checkbox"
                  id="select-all"
                  onChange={handleSelectAll}
                  checked={
                    selectedEmployeeIds.length ===
                      state.employees.filter((e) => e.role === "employee")
                        .length &&
                    state.employees.filter((e) => e.role === "employee")
                      .length > 0
                  }
                />
                <label htmlFor="select-all">בחר הכל</label>
              </div>
              {state.employees
                .filter((emp) => emp.role === "employee")
                .map((emp) => (
                  <div key={emp.id} className="employee-select-item">
                    <input
                      type="checkbox"
                      id={`emp-${emp.id}`}
                      value={emp.id}
                      checked={selectedEmployeeIds.includes(emp.id)}
                      onChange={handleEmployeeSelection}
                    />
                    <label htmlFor={`emp-${emp.id}`}>{emp.name}</label>
                  </div>
                ))}
            </div>
          </div>
          <div className="control-section">
            <h3>2. בחר תקופה</h3>
            <FormInput
              label="מתאריך"
              type="date"
              value={dateRange.start}
              onChange={(e) =>
                setDateRange((p) => ({ ...p, start: e.target.value }))
              }
            />
            <FormInput
              label="עד תאריך"
              type="date"
              value={dateRange.end}
              onChange={(e) =>
                setDateRange((p) => ({ ...p, end: e.target.value }))
              }
            />
            <button
              onClick={handleGenerate}
              disabled={
                !(
                  selectedEmployeeIds.length > 0 &&
                  dateRange.start &&
                  dateRange.end
                )
              }
              style={{ width: "100%", marginTop: "16px" }}
            >
              הפק דוח שכר
            </button>
          </div>
        </div>

        {payrollResult && (
          <div
            style={{
              marginTop: "30px",
              borderTop: "1px solid var(--border-color)",
              paddingTop: "24px",
            }}
          >
            <h3>
              דוח שכר לתקופה:{" "}
              {new Date(dateRange.start).toLocaleDateString("he-IL")} -{" "}
              {new Date(dateRange.end).toLocaleDateString("he-IL")}
            </h3>
            <div className="payroll-summary-kpis">
              <div className="card kpi-card">
                <h3>סה"כ לתשלום</h3>
                <p className="kpi-value">
                  ₪{payrollResult.summary.totalPay.toFixed(2)}
                </p>
              </div>
              <div className="card kpi-card">
                <h3>שכר בסיס</h3>
                <p className="kpi-value">
                  ₪{payrollResult.summary.totalBasePay.toFixed(2)}
                </p>
              </div>
              <div className="card kpi-card">
                <h3>שכר ש"נ</h3>
                <p className="kpi-value">
                  ₪{payrollResult.summary.totalOvertimePay.toFixed(2)}
                </p>
              </div>
              <div className="card kpi-card">
                <h3>סה"כ עובדים</h3>
                <p className="kpi-value">
                  {payrollResult.summary.employeeCount}
                </p>
              </div>
            </div>

            <table className="payroll-table">
              <thead>
                <tr>
                  <th>שם עובד</th>
                  <th>שכר בסיס</th>
                  <th>שכר ש"נ</th>
                  <th>חופשה</th>
                  <th>מחלה</th>
                  <th>סה"כ</th>
                </tr>
              </thead>
              <tbody>
                {payrollResult.details.map((r) => (
                  <tr key={r.id}>
                    <td>{r.name}</td>
                    <td>₪{r.basePay.toFixed(2)}</td>
                    <td>₪{r.overtimePay.toFixed(2)}</td>
                    <td>
                      ₪{r.vacationPay.toFixed(2)}
                      <br />
                      <small>({r.vacationDays} ימים)</small>
                    </td>
                    <td>
                      ₪{r.sickPay.toFixed(2)}
                      <br />
                      <small>({r.sickDays} ימים)</small>
                    </td>
                    <td style={{ fontWeight: 700 }}>
                      ₪{r.totalPay.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td>סה"כ</td>
                  <td>₪{payrollResult.summary.totalBasePay.toFixed(2)}</td>
                  <td>₪{payrollResult.summary.totalOvertimePay.toFixed(2)}</td>
                  <td>₪{payrollResult.summary.totalVacationPay.toFixed(2)}</td>
                  <td>₪{payrollResult.summary.totalSickPay.toFixed(2)}</td>
                  <td>₪{payrollResult.summary.totalPay.toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

function Login({ onLogin }) {
  const { state } = useContext(AppContext);
  const [employeeId, setEmployeeId] = useState("");
  return (
    <div className="login-container">
      <form
        className="card"
        style={{ width: "350px", textAlign: "center" }}
        onSubmit={(e) => {
          e.preventDefault();
          onLogin(employeeId);
        }}
      >
        <h2>התחברות למערכת</h2>
        <select
          value={employeeId}
          onChange={(e) => setEmployeeId(e.target.value)}
          required
          style={{
            width: "100%",
            padding: "10px",
            marginBottom: "20px",
            borderRadius: "8px",
          }}
        >
          <option value="">בחר/י שם...</option>
          {state.employees.map((emp) => (
            <option key={emp.id} value={emp.id}>
              {emp.name}
            </option>
          ))}
        </select>
        <button type="submit" style={{ width: "100%" }} disabled={!employeeId}>
          התחבר
        </button>
      </form>
    </div>
  );
}

function App() {
  const [state, dispatch] = useReducer(dataReducer, initialData);
  const [currentUser, setCurrentUser] = useLocalStorage("currentUser", null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const d = localStorage.getItem("appData");
    if (d) {
      try {
        const parsedData = JSON.parse(d);
        const mergedState = {
          ...initialData,
          ...parsedData,
          settings: {
            ...initialData.settings,
            ...parsedData.settings,
          },
        };
        dispatch({ type: "SET_INITIAL_DATA", payload: mergedState });
      } catch (e) {
        console.error("Failed to parse appData from localStorage", e);
        dispatch({ type: "SET_INITIAL_DATA", payload: initialData });
      }
    }
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem("appData", JSON.stringify(state));
    }
  }, [state, isLoaded]);

  useEffect(() => {
    if (
      !state.employees ||
      state.employees.length === 0 ||
      !state.scheduledAbsences
    )
      return;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    state.employees.forEach((emp) => {
      const todaysAbsence = state.scheduledAbsences.find((a) => {
        const startDate = new Date(a.startDate);
        const endDate = new Date(a.endDate);
        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime()))
          return false;
        return (
          a.employeeId === emp.id && today >= startDate && today <= endDate
        );
      });
      if (todaysAbsence) {
        if (emp.status !== todaysAbsence.type)
          dispatch({
            type: "UPDATE_EMPLOYEE_STATUS",
            payload: { id: emp.id, status: todaysAbsence.type },
          });
      } else {
        if (emp.status === "vacation" || emp.status === "sick")
          dispatch({
            type: "UPDATE_EMPLOYEE_STATUS",
            payload: { id: emp.id, status: "absent" },
          });
      }
    });
  }, [state.employees, state.scheduledAbsences]);

  const handleLogin = (id) => {
    const user = state.employees.find((e) => e.id === parseInt(id));
    if (user) setCurrentUser(user);
  };
  const handleLogout = () => setCurrentUser(null);

  if (!isLoaded)
    return (
      <div
        style={{
          display: "flex",
          height: "100vh",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        טוען מערכת...
      </div>
    );

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      <ToastProvider>
        <BrowserRouter>
          {!currentUser ? (
            <Login onLogin={handleLogin} />
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
              <main className="main-content">
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/employees" element={<EmployeeList />} />
                  <Route path="/reports" element={<ReportsPage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                  <Route path="/payroll" element={<PayrollPage />} />
                  <Route path="*" element={<Navigate to="/" />} />
                </Routes>
              </main>
            </div>
          )}
        </BrowserRouter>
      </ToastProvider>
    </AppContext.Provider>
  );
}

export default App;
