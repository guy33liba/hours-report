// App.js - CORRECTED AND REFACTORED

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
import "./styles.css"; // Assuming you have this CSS file

// --- 1. ICONS & CONSTANTS ---
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
    "M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.07-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.69-1.62-0.92L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41 l-3.84,0c-0.24,0-0.44,0.17-0.48,0.41L9.2,5.59C8.6,5.82,8.08,6.13,7.58,6.51L5.19,5.55C4.97,5.48,4.72,5.55,4.6,5.77L2.68,9.09 c-0.11,0.2-0.06,0.47,0.12,0.61L4.83,11.28c-0.05,0.3-0.07,0.62-0.07,0.94c0,0.32,0.02,0.64,0.07,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.69,1.62,0.92l0.44,2.78 c0.04,0.24,0.24,0.41,0.48,0.41l3.84,0c0.24,0,0.44-0.17-0.48-0.41l0.44-2.78c0.59-0.23,1.12-0.54,1.62-0.92l2.39,0.96 c0.22,0.08,0.47,0.01,0.59-0.22l1.92-3.32c0.12-0.2,0.07-0.47-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z",
  LOGOUT:
    "M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2h8v-2H4V5z",
  ON_BREAK:
    "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z",
  SICK: "M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z",
  VACATION:
    "M21.99 8c0-.55-.45-1-1-1h-2.01V5c0-1.1-.9-2-2-2H7c-1.1 0-2 .9-2 2v2H3c-.55 0-1 .45-1 1s.45 1 1 1h18c.55 0 1-.45 1-1zM7 11h10v8H7v-8z",
  EYE_OPEN:
    "M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5C21.27 7.61 17 4.5 12 4.5zm0 12c-2.48 0-4.5-2.02-4.5-4.5S9.52 7.5 12 7.5s4.5 2.02 4.5 4.5-2.02 4.5-4.5 4.5zm0-7c-1.38 0-2.5 1.12-2.5 2.5s1.12 2.5 2.5 2.5 2.5-1.12 2.5-2.5-1.12-2.5-2.5-2.5z",
  EYE_CLOSED:
    "M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.38 1.12 2.5 2.5 2.5.22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.48 0-4.5-2.02-4.5-4.5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.38-1.12-2.5-2.5-2.5-.05 0-.1.01-.16.02z",
};

const STATUSES = {
  PRESENT: { key: "present", text: "נוכח", colorClass: "present", icon: null },
  ON_BREAK: {
    key: "on_break",
    text: "הפסקה",
    colorClass: "on_break",
    icon: ICONS.ON_BREAK,
  },
  SICK: { key: "sick", text: "מחלה", colorClass: "sick", icon: ICONS.SICK },
  VACATION: {
    key: "vacation",
    text: "חופשה",
    colorClass: "vacation",
    icon: ICONS.VACATION,
  },
  ABSENT: {
    key: "absent",
    text: "לא בעבודה",
    colorClass: "absent",
    icon: null,
  },
};

// --- 2. CONTEXT & PROVIDERS ---

const AppContext = createContext();
const ToastContext = createContext();

const useToaster = () => useContext(ToastContext);

const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const addToast = useCallback((message, type = "info") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(
      () => setToasts((current) => current.filter((t) => t.id !== id)),
      4000
    );
  }, []);

  return (
    <ToastContext.Provider value={addToast}>
      {children}
      <div className="toast-container">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.type}`}>
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

// --- 3. HELPER HOOKS & FUNCTIONS ---

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

const calculateNetHours = (attendanceEntry) => {
  if (!attendanceEntry || !attendanceEntry.clockIn) return 0;
  const clockOutTime = attendanceEntry.clockOut
    ? new Date(attendanceEntry.clockOut)
    : new Date();
  const clockInTime = new Date(attendanceEntry.clockIn);
  let totalMilliseconds = clockOutTime - clockInTime;

  if (attendanceEntry.breaks && attendanceEntry.breaks.length > 0) {
    const totalBreakMilliseconds = attendanceEntry.breaks.reduce(
      (acc, breakItem) => {
        if (breakItem.start && breakItem.end) {
          return acc + (new Date(breakItem.end) - new Date(breakItem.start));
        }
        if (breakItem.start && !breakItem.end) {
          return acc + (new Date() - new Date(breakItem.start));
        }
        return acc;
      },
      0
    );
    totalMilliseconds -= totalBreakMilliseconds;
  }
  return Math.max(0, totalMilliseconds / 36e5);
};

// --- 4. DATA MANAGEMENT (Reducer & Initial State) ---

const initialData = {
  employees: [
    {
      id: 1,
      name: "ישראל ישראלי",
      department: "פיתוח",
      role: "manager",
      hourlyRate: 120,
      status: "absent",
      password: "123",
    },
    {
      id: 2,
      name: "דנה כהן",
      department: "שיווק",
      role: "employee",
      hourlyRate: 60,
      status: "absent",
      password: "123",
    },
  ],
  attendance: [],
  scheduledAbsences: [],
  settings: {
    standardWorkDayHours: 8.5,
    overtimeRatePercent: 150,
    restrictByIp: false,
    allowedIps: "127.0.0.1, ::1",
    alertOnLateArrival: true,
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
    case "START_BREAK": {
      const idx = state.attendance.findLastIndex(
        (a) => a.employeeId === action.payload.employeeId && !a.clockOut
      );
      if (idx === -1) return state;
      const newAtt = [...state.attendance];
      const currentEntry = { ...newAtt[idx] };
      if (!currentEntry.breaks) currentEntry.breaks = [];
      currentEntry.breaks.push({ start: action.payload.time, end: null });
      newAtt[idx] = currentEntry;
      return { ...state, attendance: newAtt };
    }
    case "END_BREAK": {
      const idx = state.attendance.findLastIndex(
        (a) => a.employeeId === action.payload.employeeId && !a.clockOut
      );
      if (idx === -1) return state;
      const newAtt = [...state.attendance];
      const currentEntry = { ...newAtt[idx] };
      const lastBreakIdx = currentEntry.breaks?.findLastIndex((b) => !b.end);
      if (lastBreakIdx > -1) {
        currentEntry.breaks[lastBreakIdx].end = action.payload.time;
      }
      newAtt[idx] = currentEntry;
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

// --- 5. UI COMPONENTS ---

const FormInput = ({ label, icon, onIconClick, ...props }) => {
  const id = props.id || props.name;
  return (
    <div className="form-group">
      <label htmlFor={id}>{label}</label>
      <div className="input-with-icon">
        <input {...props} id={id} />
        {icon && (
          <button
            type="button"
            className="input-icon-button"
            onClick={onIconClick}
          >
            {icon}
          </button>
        )}
      </div>
    </div>
  );
};
const FormTextarea = ({ label, ...props }) => (
  <div className="form-group">
    {" "}
    <label>{label}</label> <textarea {...props} />{" "}
  </div>
);
const ToggleSwitch = ({ label, checked, onChange, name }) => (
  <div className="toggle-switch">
    {" "}
    <span>{label}</span>{" "}
    <label className="switch">
      {" "}
      <input
        type="checkbox"
        name={name}
        checked={checked}
        onChange={onChange}
      />{" "}
      <span className="slider"></span>{" "}
    </label>{" "}
  </div>
);

const Modal = ({ show, onClose, children }) => {
  if (!show) return null;
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="modal-close-btn">
          ×
        </button>
        {children}
      </div>
    </div>
  );
};

// --- 6. PAGE COMPONENTS ---

function Dashboard() {
  const { state, dispatch } = useContext(AppContext);
  const toaster = useToaster();

  const handleStatusChange = useCallback(
    async (employee, newStatusKey) => {
      if (employee.status === newStatusKey) return;
      const { settings } = state;

      if (
        newStatusKey === STATUSES.PRESENT.key &&
        employee.status === STATUSES.ABSENT.key &&
        settings.restrictByIp
      ) {
        try {
          const response = await fetch("https://api.ipify.org?format=json");
          if (!response.ok) throw new Error("Network response was not ok");
          const data = await response.json();
          const userIp = data.ip;
          const allowedIps = settings.allowedIps
            .split(",")
            .map((ip) => ip.trim());
          if (!allowedIps.includes(userIp)) {
            toaster(
              `שגיאה: לא ניתן להחתים נוכחות מכתובת ה-IP הנוכחית (${userIp})`,
              "danger"
            );
            return;
          }
        } catch (error) {
          toaster("שגיאה: לא ניתן היה לאמת את כתובת ה-IP. נסה שוב.", "danger");
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

      if (
        newStatusKey === STATUSES.PRESENT.key &&
        employee.status === STATUSES.ABSENT.key
      ) {
        dispatch({
          type: "ADD_ATTENDANCE",
          payload: {
            id: Date.now(),
            employeeId: employee.id,
            clockIn: now,
            clockOut: null,
            breaks: [],
          },
        });
        toaster(toasterMessage, "success");
      } else if (newStatusKey === STATUSES.ON_BREAK.key) {
        dispatch({
          type: "START_BREAK",
          payload: { employeeId: employee.id, time: now },
        });
        toaster(toasterMessage);
      } else if (
        newStatusKey === STATUSES.PRESENT.key &&
        employee.status === STATUSES.ON_BREAK.key
      ) {
        dispatch({
          type: "END_BREAK",
          payload: { employeeId: employee.id, time: now },
        });
        toaster(toasterMessage);
      } else if (newStatusKey === STATUSES.ABSENT.key) {
        if (employee.status === STATUSES.ON_BREAK.key) {
          dispatch({
            type: "END_BREAK",
            payload: { employeeId: employee.id, time: now },
          });
        }
        dispatch({
          type: "UPDATE_LAST_ATTENDANCE",
          payload: { employeeId: employee.id, data: { clockOut: now } },
        });
        toaster(toasterMessage);
      }
    },
    [state, dispatch, toaster]
  );

  const summary = useMemo(() => {
    if (!state || !state.settings || !state.employees || !state.attendance) {
      return { totalHours: 0, overtimeHours: 0, totalPay: 0, presentCount: 0 };
    }
    let totalHours = 0,
      overtimeHours = 0,
      totalPay = 0;
    const todayStr = new Date().toDateString();
    const activeEmployees = state.employees.filter(
      (emp) =>
        emp.status !== STATUSES.ABSENT.key &&
        emp.status !== STATUSES.SICK.key &&
        emp.status !== STATUSES.VACATION.key
    );
    activeEmployees.forEach((emp) => {
      const todayEntries = state.attendance.filter(
        (a) =>
          a.employeeId === emp.id &&
          new Date(a.clockIn).toDateString() === todayStr
      );
      let empTodayHours = todayEntries.reduce(
        (acc, entry) => acc + calculateNetHours(entry),
        0
      );
      const { standardWorkDayHours, overtimeRatePercent } = state.settings;
      totalHours += empTodayHours;
      const empOvertime = Math.max(0, empTodayHours - standardWorkDayHours);
      overtimeHours += empOvertime;
      const empRegular = empTodayHours - empOvertime;
      totalPay +=
        empRegular * emp.hourlyRate +
        empOvertime * emp.hourlyRate * (overtimeRatePercent / 100);
    });
    return {
      totalHours: totalHours || 0,
      overtimeHours: overtimeHours || 0,
      totalPay: totalPay || 0,
      presentCount: activeEmployees.length,
    };
  }, [state]);

  return (
    <>
      <h2>סקירה כללית</h2>
      <div className="dashboard-grid kpi-grid">
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
    </>
  );
}

function EmployeeRow({ employee, onStatusChange }) {
  const { state } = useContext(AppContext);
  const [elapsedTime, setElapsedTime] = useState(0);

  useEffect(() => {
    let interval;
    const isPresentOrOnBreak =
      employee.status === STATUSES.PRESENT.key ||
      employee.status === STATUSES.ON_BREAK.key;

    if (isPresentOrOnBreak) {
      const updateTimer = () => {
        const todayEntry = state.attendance.findLast(
          (a) => a.employeeId === employee.id && !a.clockOut
        );
        if (todayEntry) setElapsedTime(calculateNetHours(todayEntry));
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
  const isWorking = employee.status === STATUSES.PRESENT.key;
  const isOnBreak = employee.status === STATUSES.ON_BREAK.key;
  const isAbsent = employee.status === STATUSES.ABSENT.key;
  const isScheduledAbsence =
    employee.status === STATUSES.SICK.key ||
    employee.status === STATUSES.VACATION.key;

  return (
    <div className="employee-row">
      <div className="employee-info">
        <div className="employee-name">{employee.name}</div>
        <div className="employee-department">{employee.department}</div>
      </div>
      {!isAbsent && !isScheduledAbsence && (
        <div className="employee-timer">{formatTime(elapsedTime)}</div>
      )}
      <div className="employee-status">
        <div className={`status-dot ${statusObject.colorClass}`}></div>
        <span>{statusObject.text}</span>
      </div>
      <div className="employee-actions">
        <button
          onClick={() => onStatusChange(employee, STATUSES.PRESENT.key)}
          className={isWorking ? "secondary" : ""}
          disabled={isWorking || isScheduledAbsence}
          title={isOnBreak ? "חזרה לעבודה" : "התחלת עבודה"}
        >
          {isOnBreak ? "חזור לעבודה" : "כניסה"}
        </button>
        <button
          onClick={() => onStatusChange(employee, STATUSES.ON_BREAK.key)}
          className="warning"
          disabled={!isWorking}
          title="יציאה להפסקה"
        >
          הפסקה
        </button>
        <button
          onClick={() => onStatusChange(employee, STATUSES.ABSENT.key)}
          disabled={isAbsent || isScheduledAbsence}
          title="סיום עבודה"
        >
          יציאה
        </button>
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

  const handleOpenEdit = (employee) => {
    setSelectedEmployee(employee);
    setIsEditModalOpen(true);
  };
  const handleOpenAbsences = (employee) => {
    setSelectedEmployee(employee);
    setIsAbsenceModalOpen(true);
  };

  const handleDeleteEmployee = (employee) => {
    if (window.confirm(`האם אתה בטוח שברצונך למחוק את ${employee.name}?`)) {
      dispatch({ type: "DELETE_EMPLOYEE", payload: employee.id });
      toaster(`${employee.name} נמחק בהצלחה.`);
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
      toaster("עובד חדש נוסף בהצלחה!", "success");
    }
    setIsEditModalOpen(false);
  };

  const handleAddAbsence = (absenceData) => {
    dispatch({ type: "ADD_ABSENCE", payload: absenceData });
    toaster("היעדרות נוספה בהצלחה", "success");
  };

  const handleDeleteAbsence = (absenceId) => {
    dispatch({ type: "DELETE_ABSENCE", payload: absenceId });
    toaster("היעדרות נמחקה");
  };

  return (
    <>
      <div className="page-header">
        <h2>ניהול עובדים</h2>
        <button
          onClick={() => {
            setSelectedEmployee(null);
            setIsEditModalOpen(true);
          }}
        >
          הוסף עובד חדש
        </button>
      </div>
      <div className="card">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>שם</th>
                <th>מחלקה</th>
                <th>תעריף</th>
                <th>סטטוס נוכחי</th>
                <th>פעולות</th>
              </tr>
            </thead>
            <tbody>
              {state.employees.map((emp) => {
                const statusObject =
                  Object.values(STATUSES).find((s) => s.key === emp.status) ||
                  STATUSES.ABSENT;
                return (
                  <tr key={emp.id}>
                    <td>{emp.name}</td>
                    <td>{emp.department}</td>
                    <td>₪{emp.hourlyRate}/שעה</td>
                    <td>
                      <div className="status-indicator">
                        <div
                          className={`status-dot ${statusObject.colorClass}`}
                        ></div>
                        <span>{statusObject.text}</span>
                      </div>
                    </td>
                    <td className="actions-cell">
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
          selectedEmployee
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

function EmployeeModal({ show, onClose, employee, onSave }) {
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
    <Modal show={show} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <h3 style={{ marginTop: 0 }}>
          {employee ? "עריכת פרטי עובד" : "הוספת עובד חדש"}
        </h3>
        <p className="modal-subtitle">
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
    <Modal show={show} onClose={onClose}>
      <h3>ניהול היעדרויות עבור {employee.name}</h3>
      <form onSubmit={handleAddAbsence} className="absence-form">
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
        <FormInput
          label="מתאריך"
          type="date"
          value={newAbsence.startDate}
          onChange={(e) =>
            setNewAbsence({ ...newAbsence, startDate: e.target.value })
          }
          required
        />
        <FormInput
          label="עד תאריך"
          type="date"
          value={newAbsence.endDate}
          onChange={(e) =>
            setNewAbsence({ ...newAbsence, endDate: e.target.value })
          }
          required
        />
        <button type="submit">הוסף היעדרות</button>
      </form>

      <h4>היעדרויות קיימות</h4>
      {absences.length > 0 ? (
        <ul className="absence-list">
          {absences.map((absence) => (
            <li key={absence.id}>
              <div>
                <span>{STATUSES[absence.type.toUpperCase()].text}</span>:{" "}
                {new Date(absence.startDate).toLocaleDateString("he-IL")} -{" "}
                {new Date(absence.endDate).toLocaleDateString("he-IL")}
              </div>
              <button
                onClick={() => onDelete(absence.id)}
                className="danger-text"
              >
                מחק
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p>אין היעדרויות מתוכננות עבור עובד זה.</p>
      )}
    </Modal>
  );
}

function ReportsPage() {
  // This component remains the same as your provided code, as it was well-structured.
  // It is included here for completeness.
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
        const hours = calculateNetHours(entry);
        const { standardWorkDayHours, overtimeRatePercent } = state.settings;
        totalHours += hours;
        const ot = Math.max(0, hours - standardWorkDayHours);
        const regular = hours - ot;
        overtime += ot;
        pay +=
          regular * emp.hourlyRate +
          ot * emp.hourlyRate * (overtimeRatePercent / 100);
      });
      return {
        id: emp.id,
        name: emp.name,
        department: emp.department,
        totalHours,
        overtime,
        pay,
      };
    });
  }, [range, state]);

  const summary = useMemo(
    () =>
      reportData.reduce(
        (acc, curr) => {
          acc.totalHours += curr.totalHours;
          acc.overtime += curr.overtime;
          acc.pay += curr.pay;
          return acc;
        },
        { totalHours: 0, overtime: 0, pay: 0 }
      ),
    [reportData]
  );

  const handleExportCSV = () => {
    if (reportData.length === 0) return;
    const headers = [
      "שם עובד",
      "מחלקה",
      'סה"כ שעות',
      "שעות נוספות",
      "שכר משוער",
    ];
    const rows = reportData.map((r) => [
      `"${r.name}"`,
      `"${r.department}"`,
      r.totalHours.toFixed(2),
      r.overtime.toFixed(2),
      r.pay.toFixed(2),
    ]);
    let csvContent =
      "data:text/csv;charset=utf-8,\uFEFF" +
      headers.join(",") +
      "\n" +
      rows.map((e) => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `report_${range.start}_to_${range.end}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => window.print();

  return (
    <>
      <style>{`@media print { body * { visibility: hidden; } #print-area, #print-area * { visibility: visible; } #print-area { position: absolute; left: 0; top: 0; width: 100%; } .no-print { display: none; } }`}</style>
      <div className="page-header no-print">
        <h2>דוחות נוכחות</h2>
        <div className="page-actions">
          <button
            onClick={handleExportCSV}
            className="secondary"
            disabled={reportData.length === 0}
          >
            ייצא ל-CSV
          </button>
          <button
            onClick={handlePrint}
            className="secondary"
            disabled={reportData.length === 0}
          >
            הדפס
          </button>
        </div>
      </div>
      <div className="card">
        <div className="payroll-controls no-print">
          <FormInput
            label="מתאריך"
            type="date"
            value={range.start}
            onChange={(e) => setRange({ ...range, start: e.target.value })}
          />
          <FormInput
            label="עד תאריך"
            type="date"
            value={range.end}
            onChange={(e) => setRange({ ...range, end: e.target.value })}
          />
        </div>
        <div id="print-area">
          {reportData.length > 0 ? (
            <>
              <h3 className="report-title">
                סיכום לתקופה:{" "}
                {new Date(range.start).toLocaleDateString("he-IL")} -{" "}
                {new Date(range.end).toLocaleDateString("he-IL")}
              </h3>
              <div className="dashboard-grid kpi-grid report-kpis">
                <div className="card kpi-card">
                  <h4>סה"כ שעות</h4>
                  <p className="kpi-value">{summary.totalHours.toFixed(2)}</p>
                </div>
                <div className="card kpi-card">
                  <h4>שעות נוספות</h4>
                  <p className="kpi-value">{summary.overtime.toFixed(2)}</p>
                </div>
                <div className="card kpi-card">
                  <h4>עלות שכר</h4>
                  <p className="kpi-value">₪{summary.pay.toFixed(2)}</p>
                </div>
              </div>
              <table>
                <thead>
                  <tr>
                    <th>שם עובד</th>
                    <th>מחלקה</th>
                    <th>סה"כ שעות</th>
                    <th>שעות נוספות</th>
                    <th>שכר משוער</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.map((r) => (
                    <tr key={r.id}>
                      <td>{r.name}</td>
                      <td>{r.department}</td>
                      <td>{r.totalHours.toFixed(2)}</td>
                      <td>{r.overtime.toFixed(2)}</td>
                      <td>₪{r.pay.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          ) : (
            <div className="placeholder-text">
              יש לבחור טווח תאריכים כדי להציג את הדוח.
            </div>
          )}
        </div>
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
    toaster("ההגדרות נשמרו בהצלחה!", "success");
  };
  return (
    <>
      <div className="page-header">
        <h2>הגדרות מערכת</h2>
        <button onClick={handleSave}>שמור שינויים</button>
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
          <ToggleSwitch
            label="התראה על איחור"
            name="alertOnLateArrival"
            checked={settings.alertOnLateArrival}
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

function PayrollPage() {
  // This component remains the same as your provided code. Included for completeness.
  const { state } = useContext(AppContext);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState([]);
  const [dateRange, setDateRange] = useState({ start: "", end: "" });
  const [payrollResult, setPayrollResult] = useState(null);

  const handleEmployeeSelection = (e) => {
    const id = parseInt(e.target.value);
    setSelectedEmployeeIds((prev) =>
      e.target.checked ? [...prev, id] : prev.filter((empId) => empId !== id)
    );
  };
  const handleSelectAll = (e) => {
    setSelectedEmployeeIds(
      e.target.checked
        ? state.employees
            .filter((emp) => emp.role === "employee")
            .map((emp) => emp.id)
        : []
    );
  };

  const handleGenerate = () => {
    if (selectedEmployeeIds.length === 0 || !dateRange.start || !dateRange.end)
      return;
    const startDate = new Date(dateRange.start);
    const endDate = new Date(dateRange.end);
    endDate.setHours(23, 59, 59, 999);
    const details = state.employees
      .filter((emp) => selectedEmployeeIds.includes(emp.id))
      .map((emp) => {
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
          const hours = calculateNetHours(entry);
          const { standardWorkDayHours, overtimeRatePercent } = state.settings;
          totalHours += hours;
          const overtime = Math.max(0, hours - standardWorkDayHours);
          const regular = hours - overtime;
          overtimeHours += overtime;
          basePay += regular * emp.hourlyRate;
          overtimePay +=
            overtime * emp.hourlyRate * (overtimeRatePercent / 100);
        });
        return {
          id: emp.id,
          name: emp.name,
          regularHours: totalHours - overtimeHours,
          overtimeHours,
          basePay,
          overtimePay,
          totalPay: basePay + overtimePay,
        };
      });
    const summary = details.reduce(
      (acc, curr) => {
        acc.totalRegularHours += curr.regularHours;
        acc.totalOvertime += curr.overtimeHours;
        acc.totalBasePay += curr.basePay;
        acc.totalOvertimePay += curr.overtimePay;
        acc.totalPay += curr.totalPay;
        return acc;
      },
      {
        totalRegularHours: 0,
        totalOvertime: 0,
        totalBasePay: 0,
        totalOvertimePay: 0,
        totalPay: 0,
      }
    );
    setPayrollResult({ details, summary });
  };

  const handleExportCSV = () => {
    if (!payrollResult || payrollResult.details.length === 0) return;
    const headers = [
      "שם עובד",
      "שעות רגילות",
      "שעות נוספות",
      "שכר בסיס",
      'תוספת ש"נ',
      'סה"כ לתשלום',
    ];
    const rows = payrollResult.details.map((r) => [
      `"${r.name}"`,
      r.regularHours.toFixed(2),
      r.overtimeHours.toFixed(2),
      r.basePay.toFixed(2),
      r.overtimePay.toFixed(2),
      r.totalPay.toFixed(2),
    ]);
    let csvContent =
      "data:text/csv;charset=utf-8,\uFEFF" +
      headers.join(",") +
      "\n" +
      rows.map((e) => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `payroll_${dateRange.start}_to_${dateRange.end}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const isReady =
    selectedEmployeeIds.length > 0 && dateRange.start && dateRange.end;

  return (
    <>
      <div className="page-header">
        <h2>הפקת דוח שכר</h2>
        <button
          onClick={handleExportCSV}
          className="secondary"
          disabled={!payrollResult}
        >
          ייצא ל-CSV
        </button>
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
                        .length && state.employees.length > 1
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
          </div>
        </div>
        <div style={{ textAlign: "center", marginTop: "24px" }}>
          <button onClick={handleGenerate} disabled={!isReady}>
            הפק דוח שכר
          </button>
        </div>
        {payrollResult && (
          <div className="payroll-result">
            <h3>
              דוח שכר לתקופה:{" "}
              {new Date(dateRange.start).toLocaleDateString("he-IL")} -{" "}
              {new Date(dateRange.end).toLocaleDateString("he-IL")}
            </h3>
            <table className="payroll-table">
              <thead>
                <tr>
                  <th>שם עובד</th>
                  <th>שעות רגילות</th>
                  <th>שעות נוספות</th>
                  <th>שכר בסיס</th>
                  <th>תוספת ש"נ</th>
                  <th>סה"כ לתשלום</th>
                </tr>
              </thead>
              <tbody>
                {payrollResult.details.map((r) => (
                  <tr key={r.id}>
                    <td>{r.name}</td>
                    <td>{r.regularHours.toFixed(2)}</td>
                    <td>{r.overtimeHours.toFixed(2)}</td>
                    <td>₪{r.basePay.toFixed(2)}</td>
                    <td>₪{r.overtimePay.toFixed(2)}</td>
                    <td className="total-pay">₪{r.totalPay.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td>סה"כ</td>
                  <td>{payrollResult.summary.totalRegularHours.toFixed(2)}</td>
                  <td>{payrollResult.summary.totalOvertime.toFixed(2)}</td>
                  <td>₪{payrollResult.summary.totalBasePay.toFixed(2)}</td>
                  <td>₪{payrollResult.summary.totalOvertimePay.toFixed(2)}</td>
                  <td className="total-pay">
                    ₪{payrollResult.summary.totalPay.toFixed(2)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

function Login({ onLogin, employees }) {
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const handleLoginSubmit = (e) => {
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
        <form className="login-form" onSubmit={handleLoginSubmit}>
          {error && <div className="login-error-message">{error}</div>}
          <FormInput
            label="שם משתמש"
            type="text"
            name="username"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoFocus
          />
          <FormInput
            label="סיסמה"
            type={isPasswordVisible ? "text" : "password"}
            name="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            icon={
              <Icon
                path={isPasswordVisible ? ICONS.EYE_CLOSED : ICONS.EYE_OPEN}
                size={20}
              />
            }
            onIconClick={() => setIsPasswordVisible((p) => !p)}
          />
          <button type="submit" style={{ width: "100%", marginTop: "1rem" }}>
            התחבר
          </button>
        </form>
      </div>
    </div>
  );
}

// --- 7. ROOT APP COMPONENT ---

function App() {
  const [state, dispatch] = useReducer(dataReducer, null);
  const [currentUser, setCurrentUser] = useLocalStorage("currentUser", null);

  // Effect for loading and saving data from/to localStorage
  useEffect(() => {
    try {
      const savedData = localStorage.getItem("appData");
      if (savedData) {
        dispatch({ type: "SET_INITIAL_DATA", payload: JSON.parse(savedData) });
      } else {
        dispatch({ type: "SET_INITIAL_DATA", payload: initialData });
      }
    } catch (error) {
      dispatch({ type: "SET_INITIAL_DATA", payload: initialData });
    }
  }, []);

  useEffect(() => {
    if (state) {
      localStorage.setItem("appData", JSON.stringify(state));
    }
  }, [state]);

  // Effect for auto-updating employee status based on scheduled absences
  useEffect(() => {
    if (!state || !state.employees || !state.scheduledAbsences) return;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    state.employees.forEach((emp) => {
      const todaysAbsence = state.scheduledAbsences.find((a) => {
        const startDate = new Date(a.startDate);
        const endDate = new Date(a.endDate);
        return (
          a.employeeId === emp.id && today >= startDate && today <= endDate
        );
      });

      if (todaysAbsence) {
        if (emp.status !== todaysAbsence.type) {
          dispatch({
            type: "UPDATE_EMPLOYEE_STATUS",
            payload: { id: emp.id, status: todaysAbsence.type },
          });
        }
      } else {
        if (emp.status === "vacation" || emp.status === "sick") {
          dispatch({
            type: "UPDATE_EMPLOYEE_STATUS",
            payload: { id: emp.id, status: "absent" },
          });
        }
      }
    });
  }, [state?.employees, state?.scheduledAbsences, dispatch]);

  const handleLogin = (user) => {
    setCurrentUser(user);
  };
  const handleLogout = () => {
    setCurrentUser(null);
  };

  if (!state) {
    return <div className="loading-container">טוען מערכת...</div>;
  }

  const appContextValue = { state, dispatch, currentUser };

  return (
    <AppContext.Provider value={appContextValue}>
      <ToastProvider>
        <BrowserRouter>
          {!currentUser ? (
            <Login onLogin={handleLogin} employees={state.employees} />
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
