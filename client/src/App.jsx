import React, {
 useState,
 useEffect,
 useMemo,
 useCallback,
 createContext,
 useContext,
 useReducer,
} from "react";
import { BrowserRouter, Routes, Route, NavLink, Navigate } from "react-router-dom";
import "./styles.css";

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

const Icon = ({ path, size = 18, className = "" }) => (
 <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
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
   <input type="checkbox" name={name} checked={checked} onChange={onChange} />
   <span className="slider"></span>
  </label>
 </div>
);

// --- START: ADDED MISSING EmployeeForm COMPONENT ---
function EmployeeForm({ initialData, onSave, onCancel }) {
 const [formData, setFormData] = useState({
  name: "",
  department: "",
  hourlyRate: "",
  role: "employee",
 });

 useEffect(() => {
  if (initialData) {
   // Make sure not to pass null/undefined values to the form
   setFormData({
    name: initialData.name || "",
    department: initialData.department || "",
    hourlyRate: initialData.hourlyRate || "",
    role: initialData.role || "employee",
   });
  } else {
   // Reset form for new employee
   setFormData({ name: "", department: "", hourlyRate: "", role: "employee" });
  }
 }, [initialData]);

 const handleChange = (e) => {
  setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
 };

 const handleSubmit = (e) => {
  e.preventDefault();
  onSave(formData);
 };

 return (
  <form onSubmit={handleSubmit}>
   <h3 style={{ marginTop: 0, borderBottom: "none" }}>
    {initialData ? "עריכת פרטי עובד" : "הוספת עובד חדש"}
   </h3>
   <p style={{ marginTop: 0, marginBottom: "24px", color: "var(--font-light)" }}>
    מלא את הפרטים הבאים כדי להוסיף או לעדכן עובד במערכת.
   </p>
   <FormInput label="שם מלא" name="name" value={formData.name} onChange={handleChange} required />
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
   <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end", marginTop: "24px" }}>
    <button type="button" className="secondary" onClick={onCancel}>
     ביטול
    </button>
    <button type="submit">שמור</button>
   </div>
  </form>
 );
}
// --- END: ADDED MISSING EmployeeForm COMPONENT ---

// Constants and Global Hooks...
const ICONS = {
 DASHBOARD: "M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z",
 EMPLOYEES:
  "M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z",
 REPORTS:
  "M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z",
 PAYROLL:
  "M21.41 11.58l-9-9C12.05 2.22 11.55 2 11 2H4c-1.1 0-2 .9-2 2v7c0 .55.22 1.05.59 1.42l9 9c.36.36.86.58 1.41.58.55 0 1.05-.22 1.41-.59l7-7c.37-.36.59-.86.59-1.41s-.22-1.05-.59-1.42zM5.5 7C4.67 7 4 6.33 4 5.5S4.67 4 5.5 4 7 4.67 7 5.5 6.33 7 5.5 7z",
 SETTINGS:
  "M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.07-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.69-1.62-0.92L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41 l-3.84,0c-0.24,0-0.44,0.17-0.48,0.41L9.2,5.59C8.6,5.82,8.08,6.13,7.58,6.51L5.19,5.55C4.97,5.48,4.72,5.55,4.6,5.77L2.68,9.09 c-0.11,0.2-0.06,0.47,0.12,0.61L4.83,11.28c-0.05,0.3-0.07,0.62-0.07,0.94c0,0.32,0.02,0.64,0.07,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.69,1.62,0.92l0.44,2.78 c0.04,0.24,0.24,0.41,0.48,0.41l3.84,0c0.24,0,0.44,0.17,0.48,0.41l0.44-2.78c0.59-0.23,1.12-0.54,1.62-0.92l2.39,0.96 c0.22,0.08,0.47,0.01,0.59-0.22l1.92-3.32c0.12-0.2,0.07-0.47-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z",
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
 const clockOutTime = attendanceEntry.clockOut ? new Date(attendanceEntry.clockOut) : new Date();
 const clockInTime = new Date(attendanceEntry.clockIn);
 const totalMilliseconds = clockOutTime - clockInTime;
 return Math.max(0, totalMilliseconds / 36e5);
};
const useSortableData = (items, config = null) => {
 const [sortConfig, setSortConfig] = useState(config);
 const sortedItems = useMemo(() => {
  let sortableItems = [...items];
  if (sortConfig !== null) {
   sortableItems.sort((a, b) => {
    const valA = a[sortConfig.key];
    const valB = b[sortConfig.key];
    if (typeof valA === "number" && typeof valB === "number") {
     return sortConfig.direction === "ascending" ? valA - valB : valB - valA;
    }
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
  if (sortConfig && sortConfig.key === key && sortConfig.direction === "ascending") {
   direction = "descending";
  }
  setSortConfig({ key, direction });
 };
 return { items: sortedItems, requestSort, sortConfig };
};
const SortableHeader = ({ children, name, sortConfig, requestSort }) => {
 const isSorted = sortConfig && sortConfig.key === name;
 const directionClass = isSorted ? (sortConfig.direction === "ascending" ? "desc" : "asc") : "";
 return (
  <th className="sortable" onClick={() => requestSort(name)}>
   {children}
   <Icon path={ICONS.SORT} className={`sort-icon ${directionClass}`} />
  </th>
 );
};

// Simplified Global State Management
const initialAppState = {
 settings: {
  standardWorkDayHours: 8.5,
  overtimeRatePercent: 150,
  restrictByIp: true,
  allowedIps: "192.168.1.1, 8.8.8.8",
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
  case "SET_ATTENDANCE":
   return { ...state, attendance: action.payload };
  case "SET_ABSENCES":
   return { ...state, scheduledAbsences: action.payload };
  default:
   return state;
 }
};
const AppContext = createContext();

// --- Main Page and Modal Components ---

function EmployeeModal({ show, onClose, employee, onSave }) {
 if (!show) return null;
 return (
  <div className="modal-backdrop" onClick={onClose}>
   <div className="modal-content" onClick={(e) => e.stopPropagation()}>
    <button onClick={onClose} className="modal-close-btn">
     ×
    </button>
    <EmployeeForm initialData={employee} onSave={onSave} onCancel={onClose} />
   </div>
  </div>
 );
}

function AbsenceManagementModal({ show, onClose, employee, absences, onAdd, onDelete }) {
 // This component will also need to be refactored to use an API
 // For now, its functionality is local and won't persist.
 const [newAbsence, setNewAbsence] = useState({ type: "vacation", startDate: "", endDate: "" });
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
       onChange={(e) => setNewAbsence({ ...newAbsence, type: e.target.value })}
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
       onChange={(e) => setNewAbsence({ ...newAbsence, startDate: e.target.value })}
       required
      />
     </div>
     <div className="form-group">
      <label>עד תאריך</label>
      <input
       type="date"
       value={newAbsence.endDate}
       onChange={(e) => setNewAbsence({ ...newAbsence, endDate: e.target.value })}
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
         <span style={{ fontWeight: 500 }}>{STATUSES[absence.type.toUpperCase()].text}</span>:  
         {new Date(absence.startDate).toLocaleDateString("he-IL")} -
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

function Dashboard() {
 return (
  <>
   <div className="page-header">
    <h2>סקירה כללית</h2>
   </div>
   <div className="card">
    <p>דף הסקירה הכללית ייבנה מחדש כדי להציג נתונים מהשרת.</p>
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
  setSettings((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
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

 useEffect(() => {
  Promise.all([
   fetch("http://localhost:3001/api/employees").then((res) => {
    if (!res.ok) throw new Error("Failed to fetch employees");
    return res.json();
   }),
   fetch("http://localhost:3001/api/attendance/today/open").then((res) => {
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
 }, [toaster]);

 const updateEmployeeInList = (updatedEmployee) => {
  setEmployees((prev) =>
   prev.map((emp) => (emp._id === updatedEmployee._id ? updatedEmployee : emp))
  );
  fetch("http://localhost:3001/api/attendance/today/open")
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
     .filter((e) => e.role === "employee")
     .map((emp) => {
      const attendanceRecord = openAttendance.find((att) => att.employee === emp._id);
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

 const handleClockIn = async () => {
  if (isLoading) return;
  setIsLoading(true);
  try {
   const response = await fetch("http://localhost:3001/api/attendance/clock-in", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ employeeId: employee._id }),
   });
   if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || "Clock-in failed");
   }
   const updatedEmployee = await response.json();
   onStatusUpdate(updatedEmployee);
   toaster(`${updatedEmployee.name} החתים כניסה.`, "success");
  } catch (error) {
   console.error("Clock-in failed:", error);
   toaster(`שגיאה בהחתמת כניסה: ${error.message}`, "danger");
  } finally {
   setIsLoading(false);
  }
 };
 const handleClockOut = async () => {
  if (isLoading) return;
  setIsLoading(true);
  try {
   const response = await fetch("http://localhost:3001/api/attendance/clock-out", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ employeeId: employee._id }),
   });
   if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || "Clock-out failed");
   }
   const updatedEmployee = await response.json();
   onStatusUpdate(updatedEmployee);
   toaster(`${updatedEmployee.name} החתים יציאה.`, "success");
  } catch (error) {
   console.error("Clock-out failed:", error);
   toaster(`שגיאה בהחתמת יציאה: ${error.message}`, "danger");
  } finally {
   setIsLoading(false);
  }
 };
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
  Object.values(STATUSES).find((s) => s.key === employee.status) || STATUSES.ABSENT;
 const isPresent = employee.status === STATUSES.PRESENT.key;
 const isNotClockable = employee.status === "vacation" || employee.status === "sick";

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
   <div style={{ justifySelf: "start", display: "flex", alignItems: "center", gap: "20px" }}>
    <div>
     <div style={{ fontWeight: 500 }}>{employee.name}</div>
     <div style={{ fontSize: "14px", color: "var(--font-light)" }}>{employee.department}</div>
    </div>
    {isPresent && (
     <div style={{ color: "var(--primary-color)", fontFamily: "monospace", fontSize: "18px" }}>
      {formatTime(elapsedTime)}
     </div>
    )}
   </div>
   <div style={{ justifySelf: "center" }}>
    <div style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
     <div className={`status-dot ${statusObject.colorClass}`}></div>
     <span>{statusObject.text}</span>
    </div>
   </div>
   <div style={{ justifySelf: "end", display: "flex", gap: "8px" }}>
    <button
     onClick={handleClockIn}
     className={isPresent ? "secondary" : ""}
     disabled={isPresent || isNotClockable || isLoading}
    >
     {isLoading ? <LoadingSpinner /> : "כניסה"}
    </button>
    <button onClick={handleClockOut} disabled={!isPresent || isLoading}>
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
 const API_URL = "http://localhost:3001/api/employees";

 useEffect(() => {
  setIsLoading(true);
  fetch(API_URL)
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
 }, [toaster]);
 const filteredEmployees = useMemo(() => {
  return employees
   .filter((emp) => emp.name.toLowerCase().includes(searchTerm.toLowerCase()))
   .filter((emp) => departmentFilter === "" || emp.department === departmentFilter);
 }, [employees, searchTerm, departmentFilter]);
 const {
  items: sortedEmployees,
  requestSort,
  sortConfig,
 } = useSortableData(filteredEmployees, { key: "name", direction: "ascending" });
 const uniqueDepartments = useMemo(() => {
  return [...new Set(employees.map((emp) => emp.department))];
 }, [employees]);
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
 const closeModal = () => {
  setIsEditModalOpen(false);
  setIsConfirmModalOpen(false);
  setSelectedEmployee(null);
  setEmployeeToDelete(null);
 };
 const handleSaveEmployee = (employeeData) => {
  const isUpdating = selectedEmployee && selectedEmployee._id;
  const url = isUpdating ? `${API_URL}/${selectedEmployee._id}` : API_URL;
  const method = isUpdating ? "PUT" : "POST";
  fetch(url, {
   method: method,
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
      prev.map((emp) => (emp._id === savedEmployee._id ? savedEmployee : emp))
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
  fetch(`${API_URL}/${employeeToDelete._id}`, { method: "DELETE" })
   .then((res) => {
    if (res.ok) {
     setEmployees((prev) => prev.filter((emp) => emp._id !== employeeToDelete._id));
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
    <select value={departmentFilter} onChange={(e) => setDepartmentFilter(e.target.value)}>
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
       <SortableHeader name="name" sortConfig={sortConfig} requestSort={requestSort}>
        שם
       </SortableHeader>
       <SortableHeader name="department" sortConfig={sortConfig} requestSort={requestSort}>
        מחלקה
       </SortableHeader>
       <SortableHeader name="hourlyRate" sortConfig={sortConfig} requestSort={requestSort}>
        תעריף
       </SortableHeader>
       <th>סטטוס נוכחי</th>
       <th>פעולות</th>
      </tr>
     </thead>
     <tbody>
      {isLoading ? (
       <tr>
        <td colSpan="5" style={{ textAlign: "center", padding: "40px" }}>
         <LoadingSpinner />
        </td>
       </tr>
      ) : sortedEmployees.length === 0 ? (
       <tr>
        <td colSpan="5" style={{ textAlign: "center", padding: "20px" }}>
         לא נמצאו עובדים.
        </td>
       </tr>
      ) : (
       sortedEmployees.map((emp) => {
        const statusObject =
         Object.values(STATUSES).find((s) => s.key === emp.status) || STATUSES.ABSENT;
        return (
         <tr key={emp._id}>
          <td>{emp.name}</td>
          <td>{emp.department}</td>
          <td>₪{emp.hourlyRate}/שעה</td>
          <td>
           <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div className={`status-dot ${statusObject.colorClass}`}></div>
            <span>{statusObject.text}</span>
           </div>
          </td>
          <td style={{ display: "flex", gap: "8px" }}>
           <button className="secondary" onClick={() => handleOpenEdit(emp)}>
            ערוך
           </button>
           <button className="secondary" disabled>
            היעדרויות
           </button>
           <button className="danger secondary" onClick={() => handleOpenDeleteConfirm(emp)}>
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
      האם אתה בטוח שברצונך למחוק את <strong>{employeeToDelete.name}</strong>? פעולה זו אינה הפיכה.
     </p>
    )}
   </ConfirmationModal>
  </>
 );
}

function ReportsPage() {
 return (
  <>
   <div className="page-header">
    <h2>דוחות נוכחות</h2>
   </div>
   <div className="card">
    <p>דף זה זקוק לשכתוב כדי למשוך נתונים מהשרת.</p>
   </div>
  </>
 );
}
function PayrollPage() {
 return (
  <>
   <div className="page-header">
    <h2>הפקת דוח שכר</h2>
   </div>
   <div className="card">
    <p>דף זה זקוק לשכתוב כדי למשוך נתונים מהשרת.</p>
   </div>
  </>
 );
}

function Login({ onLogin }) {
 const [allUsers, setAllUsers] = useState([]);
 const [employeeId, setEmployeeId] = useState("");
 useEffect(() => {
  fetch("http://localhost:3001/api/employees")
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
  <div className="login-container">
   <form
    className="card"
    style={{ width: "350px", textAlign: "center" }}
    onSubmit={handleLoginSubmit}
   >
    <h2>התחברות למערכת</h2>
    <select
     value={employeeId}
     onChange={(e) => setEmployeeId(e.target.value)}
     required
     style={{ width: "100%", padding: "12px", marginBottom: "20px", borderRadius: "8px" }}
    >
     <option value="">בחר/י שם...</option>
     {allUsers.map((emp) => (
      <option key={emp._id} value={emp._id}>
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
 const [state, dispatch] = useReducer(appReducer, initialAppState);
 const [currentUser, setCurrentUser] = useLocalStorage("currentUser", null);
 const handleLogin = (user) => {
  if (user) {
   setCurrentUser(user);
  }
 };
 const handleLogout = () => setCurrentUser(null);

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
         <span style={{ fontSize: "25px" }}>שלום, {currentUser.name}</span>
         <button
          onClick={handleLogout}
          className="secondary"
          style={{ width: "100%", padding: "10px", border: "1px solid black" }}
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
