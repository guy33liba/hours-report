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
  Link,
} from "react-router-dom";
import "./styles.css";

const AppContext = createContext();

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
      department: "תמיכה",
      role: "employee",
      hourlyRate: 60,
      password: "123",
    },
    {
      id: 3,
      name: "אבי לוי",
      department: "תמיכה",
      role: "employee",
      hourlyRate: 85,
      password: "123",
    },
  ],
  attendance: [],
  absences: [],
  settings: {
    standardWorkDayHours: 8.5,
    overtimeRatePercent: 150,
  },
};

const calculateNetSeconds = (entry) => {
  if (!entry || !entry.clockIn) return 0;
  const clockOutTime = entry.clockOut ? new Date(entry.clockOut) : new Date();
  let totalSeconds = (clockOutTime - new Date(entry.clockIn)) / 1000;
  if (entry.breaks && entry.breaks.length > 0) {
    const totalBreakSeconds = entry.breaks.reduce((acc, breakItem) => {
      const breakEnd = breakItem.end ? new Date(breakItem.end) : new Date();
      return acc + (breakEnd - new Date(breakItem.start)) / 1000;
    }, 0);
    totalSeconds -= totalBreakSeconds;
  }
  return Math.max(0, totalSeconds);
};

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
    "M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.07-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.69-1.62-0.92L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41 l-3.84,0c-0.24,0-0.44,0.17-0.48,0.41L9.2,5.59C8.6,5.82,8.08,6.13,7.58,6.51L5.19,5.55C4.97,5.48,4.72,5.55,4.6,5.77L2.68,9.09 c-0.11,0.2-0.06,0.47,0.12,0.61L4.83,11.28c-0.05,0.3-0.07,0.62-0.07,0.94c0,0.32,0.02,0.64,0.07,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.69,1.62,0.92l0.44,2.78 c0.04,0.24,0.24,0.41,0.48,0.41l3.84,0c0.24,0-0.44-0.17-0.48-0.41l0.44-2.78c0.59-0.23,1.12-0.54,1.62-0.92l2.39,0.96 c0.22,0.08,0.47,0.01,0.59-0.22l1.92-3.32c0.12-0.2,0.07-0.47-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z",
  LOGOUT:
    "M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2h8v-2H4V5z",
};

const DigitalClock = () => {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const timerId = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timerId);
  }, []);
  return (
    <div className="digital-clock">{time.toLocaleTimeString("he-IL")}</div>
  );
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
const ToggleSwitch = ({ label, checked, onChange, name }) => (
  <div className="toggle-switch">
    <label htmlFor={name}>{label}</label>
    <label className="switch">
      <input
        type="checkbox"
        id={name}
        name={name}
        checked={checked}
        onChange={onChange}
      />
      <span className="slider"></span>
    </label>
  </div>
);

function EmployeeTimer({ employeeId }) {
  const { attendance } = useContext(AppContext);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const activeEntry = useMemo(
    () => attendance.find((a) => a.employeeId === employeeId && !a.clockOut),
    [attendance, employeeId]
  );
  useEffect(() => {
    if (!activeEntry || activeEntry.onBreak) {
      setElapsedSeconds(calculateNetSeconds(activeEntry || {}));
      return;
    }
    const timerId = setInterval(
      () => setElapsedSeconds(calculateNetSeconds(activeEntry)),
      1000
    );
    setElapsedSeconds(calculateNetSeconds(activeEntry));
    return () => clearInterval(timerId);
  }, [activeEntry, activeEntry?.onBreak]);
  const formatTime = (totalSeconds) => {
    const h = Math.floor(totalSeconds / 3600)
      .toString()
      .padStart(2, "0");
    const m = Math.floor((totalSeconds % 3600) / 60)
      .toString()
      .padStart(2, "0");
    const s = Math.floor(totalSeconds % 60)
      .toString()
      .padStart(2, "0");
    return `${h}:${m}:${s}`;
  };
  if (!activeEntry) return <div className="employee-timer-placeholder"></div>;
  return <div className="employee-timer">{formatTime(elapsedSeconds)}</div>;
}

function Dashboard() {
  const { employees, attendance, setAttendance, addToast, currentUser } =
    useContext(AppContext);
  const employeesToDisplay = useMemo(() => {
    if (currentUser.role === "manager") return employees;
    return employees.filter((emp) => emp.id === currentUser.id);
  }, [employees, currentUser]);
  const getEmployeeStatus = (employee) => {
    if (employee.status === "sick" || employee.status === "vacation")
      return {
        text: employee.status === "sick" ? "מחלה" : "חופשה",
        class: employee.status,
      };
    const lastEntry = attendance
      .filter((a) => a.employeeId === employee.id)
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
        breaks: [],
        onBreak: false,
      },
    ]);
    addToast("כניסה הוחתמה בהצלחה", "success");
  };
  const handleClockOut = (employeeId) => {
    setAttendance((prev) =>
      prev.map((a) =>
        !a.clockOut && a.employeeId === employeeId
          ? { ...a, clockOut: new Date().toISOString() }
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
          const newBreakState = !a.onBreak;
          const now = new Date().toISOString();
          let newBreaks = [...(a.breaks || [])];
          if (newBreakState) {
            newBreaks.push({ start: now, end: null });
            isOnBreak = true;
          } else {
            const last = newBreaks.findLastIndex((b) => !b.end);
            if (last !== -1) newBreaks[last].end = now;
          }
          return { ...a, breaks: newBreaks, onBreak: newBreakState };
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
        <DigitalClock />
      </div>
      <div className="card">
        <h3>נוכחות בזמן אמת</h3>
        <div className="employee-list-realtime">
          {employeesToDisplay.map((emp) => {
            const status = getEmployeeStatus(emp);
            const isClockedIn =
              status.class === "present" || status.class === "on_break";
            const isDisabled =
              status.class === "sick" || status.class === "vacation";
            return (
              <div key={emp.id} className="employee-row">
                <div className="employee-info">
                  <span className="employee-name">{emp.name}</span>
                  <span className="employee-department">{emp.department}</span>
                </div>
                <EmployeeTimer employeeId={emp.id} />
                <div className="employee-status">
                  <span className={`status-dot ${status.class}`}></span>
                  {status.text}
                </div>
                <div className="employee-actions">
                  <button
                    onClick={() => handleClockIn(emp.id)}
                    disabled={isClockedIn || isDisabled}
                  >
                    כניסה
                  </button>
                  <button
                    onClick={() => handleBreakToggle(emp.id)}
                    disabled={!isClockedIn || isDisabled}
                    className="secondary"
                  >
                    {status.class === "on_break" ? "חזור מהפסקה" : "הפסקה"}
                  </button>
                  <button
                    onClick={() => handleClockOut(emp.id)}
                    disabled={!isClockedIn || isDisabled}
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

// --- NEW COMPONENT FOR PASSWORD RESET ---
function ResetPasswordModal({ show, onClose, employee }) {
  const { addToast, setEmployees } = useContext(AppContext);
  const [newPassword, setNewPassword] = useState("");

  useEffect(() => {
    // Clear password field when modal is closed or employee changes
    if (!show) {
      setNewPassword("");
    }
  }, [show]);

  if (!show || !employee) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      addToast("הסיסמה חייבת להכיל לפחות 6 תווים", "danger");
      return;
    }

    // Update the employee's password in the main state
    setEmployees((prevEmployees) =>
      prevEmployees.map((emp) =>
        emp.id === employee.id ? { ...emp, password: newPassword } : emp
      )
    );

    addToast(`הסיסמה של ${employee.name} אופסה בהצלחה!`, "success");
    onClose(); // Close the modal
  };

  return (
    <Modal
      show={show}
      onClose={onClose}
      title={`איפוס סיסמה עבור ${employee.name}`}
    >
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="newPassword">סיסמה חדשה</label>
          <input
            id="newPassword"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            minLength={6}
            autoFocus
          />
        </div>
        <div className="form-actions">
          <button type="button" className="secondary" onClick={onClose}>
            ביטול
          </button>
          <button type="submit">אפס סיסמה</button>
        </div>
      </form>
    </Modal>
  );
}

function EmployeeListPage() {
  const { employees, setEmployees, setAbsences, addToast } =
    useContext(AppContext);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAbsenceModalOpen, setIsAbsenceModalOpen] = useState(false);
  // New state for the password reset modal
  const [isResetPasswordModalOpen, setIsResetPasswordModalOpen] =
    useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  const handleOpenEditModal = (employee = null) => {
    setSelectedEmployee(employee);
    setIsEditModalOpen(true);
  };
  const handleOpenAbsenceModal = (employee) => {
    setSelectedEmployee(employee);
    setIsAbsenceModalOpen(true);
  };
  // New function to open the password reset modal
  const handleOpenResetPasswordModal = (employee) => {
    setSelectedEmployee(employee);
    setIsResetPasswordModalOpen(true);
  };

  const handleSaveEmployee = (employeeData) => {
    if (selectedEmployee) {
      setEmployees((prev) =>
        prev.map((emp) =>
          emp.id === selectedEmployee.id ? { ...emp, ...employeeData } : emp
        )
      );
      addToast("פרטי העובד עודכנו", "success");
    } else {
      setEmployees((prev) => [
        ...prev,
        { ...employeeData, id: Date.now(), password: "123", status: "absent" },
      ]);
      addToast("עובד חדש נוסף", "success");
    }
    setIsEditModalOpen(false);
  };
  const handleDeleteEmployee = (employeeId) => {
    if (window.confirm("למחוק עובד זה?")) {
      setEmployees((prev) => prev.filter((emp) => emp.id !== employeeId));
      setAbsences((prev) =>
        prev.filter((abs) => abs.employeeId !== employeeId)
      );
      addToast("העובד נמחק", "danger");
    }
  };
  return (
    <>
      <div className="page-header">
        <h2>ניהול עובדים</h2>
        <DigitalClock />
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
                    <button
                      onClick={() => handleOpenAbsenceModal(emp)}
                      className="secondary"
                    >
                      היעדרויות
                    </button>
                    <button
                      onClick={() => handleOpenEditModal(emp)}
                      className="secondary"
                    >
                      ערוך
                    </button>
                    {/* THIS CONDITION IS NOW REMOVED, a manager can reset any password */}
                    <button
                      onClick={() => handleOpenResetPasswordModal(emp)}
                      className="secondary warning"
                    >
                      אפס סיסמה
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
      <AbsenceManagementModal
        show={isAbsenceModalOpen}
        onClose={() => setIsAbsenceModalOpen(false)}
        employee={selectedEmployee}
      />
      {/* New Modal Render */}
      <ResetPasswordModal
        show={isResetPasswordModalOpen}
        onClose={() => setIsResetPasswordModalOpen(false)}
        employee={selectedEmployee}
      />
    </>
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
    return employees
      .map((emp) => {
        const empAttendance = attendance.filter(
          (a) =>
            a.employeeId === emp.id &&
            new Date(a.clockIn) >= startDate &&
            new Date(a.clockIn) <= endDate &&
            a.clockOut
        );
        const totalHours = empAttendance.reduce(
          (sum, entry) => sum + calculateNetSeconds(entry) / 3600,
          0
        );
        const totalPay = totalHours * emp.hourlyRate;
        return { ...emp, totalHours, totalPay };
      })
      .filter((emp) => emp.totalHours > 0);
  }, [range, employees, attendance]);
  const summary = useMemo(() => {
    return reportData.reduce(
      (acc, curr) => {
        acc.totalEmployees += 1;
        acc.totalHours += curr.totalHours;
        acc.totalPay += curr.totalPay;
        return acc;
      },
      { totalEmployees: 0, totalHours: 0, totalPay: 0 }
    );
  }, [reportData]);
  const handleExport = () => {
    if (!reportData.length) return;
    let csvContent =
      "data:text/csv;charset=utf-8,\uFEFF" +
      "שם העובד,מחלקה,סהכ שעות,עלות שכר משוערת\r\n";
    reportData.forEach((item) => {
      csvContent +=
        [
          `"${item.name}"`,
          `"${item.department}"`,
          item.totalHours.toFixed(2),
          item.totalPay.toFixed(2),
        ].join(",") + "\r\n";
    });
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", `report_${range.start}_to_${range.end}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  return (
    <>
      <div className="page-header">
        <h2>דוחות נוכחות</h2>
        <div className="page-actions">
          <DigitalClock />
          <button
            onClick={handleExport}
            disabled={!reportData.length}
            className="secondary"
          >
            ייצא ל-CSV
          </button>
        </div>
      </div>
      <div className="card">
        <h3>בחר טווח תאריכים לדוח</h3>
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
      </div>
      {reportData.length > 0 && (
        <div className="report-results">
          <div className="kpi-grid">
            <div className="card kpi-card">
              <h4>עובדים בדוח</h4>
              <p className="kpi-value">{summary.totalEmployees}</p>
            </div>
            <div className="card kpi-card">
              <h4>סה"כ שעות עבודה</h4>
              <p className="kpi-value">{summary.totalHours.toFixed(2)}</p>
            </div>
            <div className="card kpi-card">
              <h4>עלות שכר משוערת</h4>
              <p className="kpi-value">₪{summary.totalPay.toFixed(2)}</p>
            </div>
          </div>
          <div className="card">
            <h3>פירוט לפי עובד</h3>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>שם העובד</th>
                    <th>מחלקה</th>
                    <th>סה"כ שעות בתקופה</th>
                    <th>עלות שכר משוערת</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.map((emp) => (
                    <tr key={emp.id}>
                      <td>{emp.name}</td>
                      <td>{emp.department}</td>
                      <td>{emp.totalHours.toFixed(2)}</td>
                      <td style={{ fontWeight: "bold" }}>
                        ₪{emp.totalPay.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
      {range.start && range.end && reportData.length === 0 && (
        <div className="card">
          <p style={{ textAlign: "center" }}>
            לא נמצאו נתוני נוכחות לתקופה שנבחרה.
          </p>
        </div>
      )}
    </>
  );
}

function SettingsPage() {
  const { settings, setSettings, addToast } = useContext(AppContext);
  const [localSettings, setLocalSettings] = useState(settings);
  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const val =
      type === "checkbox"
        ? checked
        : type === "number"
        ? parseFloat(value)
        : value;
    setLocalSettings((prev) => ({ ...prev, [name]: val }));
  };
  const handleSave = (e) => {
    e.preventDefault();
    setSettings(localSettings);
    addToast("ההגדרות נשמרו בהצלחה!", "success");
  };
  return (
    <>
      <div className="page-header">
        <h2>הגדרות מערכת</h2>
        <DigitalClock />
      </div>
      <div className="card">
        <form onSubmit={handleSave}>
          <h3>מדיניות נוכחות ושכר</h3>
          <div className="form-group">
            <label htmlFor="standardWorkDayHours">
              יום עבודה סטנדרטי (בשעות)
            </label>
            <p className="form-group-description">
              מספר השעות שמעבר לו כל שעת עבודה תיחשב כשעה נוספת.
            </p>
            <input
              id="standardWorkDayHours"
              name="standardWorkDayHours"
              type="number"
              step="0.1"
              value={localSettings.standardWorkDayHours}
              onChange={handleChange}
            />
          </div>
          <div className="form-group">
            <label htmlFor="overtimeRatePercent">
              אחוז תשלום שעות נוספות (%)
            </label>
            <p className="form-group-description">
              התעריף לתשלום עבור כל שעה נוספת. לדוגמה: 150.
            </p>
            <input
              id="overtimeRatePercent"
              name="overtimeRatePercent"
              type="number"
              step="1"
              value={localSettings.overtimeRatePercent}
              onChange={handleChange}
            />
          </div>
          <div className="form-actions">
            <button type="submit">שמור הגדרות</button>
          </div>
        </form>
      </div>
    </>
  );
}

function PayrollPage() {
  const { employees, attendance, settings } = useContext(AppContext);
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
        ? employees
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
    const details = employees
      .filter((emp) => selectedEmployeeIds.includes(emp.id))
      .map((emp) => {
        const empAttendance = attendance.filter(
          (a) =>
            a.employeeId === emp.id &&
            new Date(a.clockIn) >= startDate &&
            new Date(a.clockIn) <= endDate &&
            a.clockOut
        );
        let totalRegularHours = 0;
        let totalOvertimeHours = 0;
        empAttendance.forEach((entry) => {
          const totalHours = calculateNetSeconds(entry) / 3600;
          const overtime = Math.max(
            0,
            totalHours - settings.standardWorkDayHours
          );
          const regular = totalHours - overtime;
          totalRegularHours += regular;
          totalOvertimeHours += overtime;
        });
        const basePay = totalRegularHours * emp.hourlyRate;
        const overtimePay =
          totalOvertimeHours *
          emp.hourlyRate *
          (settings.overtimeRatePercent / 100);
        return {
          id: emp.id,
          name: emp.name,
          department: emp.department,
          totalRegularHours,
          totalOvertimeHours,
          basePay,
          overtimePay,
          totalPay: basePay + overtimePay,
        };
      });
    setPayrollResult({ details });
  };
  return (
    <>
      <div className="page-header">
        <h2>חישוב שכר</h2>
        <DigitalClock />
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
                      employees.filter((e) => e.role === "employee").length &&
                    employees.length > 1
                  }
                />
                <label htmlFor="select-all">בחר את כל העובדים</label>
              </div>
              {employees
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
            <div className="form-group">
              <label>מתאריך</label>
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) =>
                  setDateRange((p) => ({ ...p, start: e.target.value }))
                }
              />
            </div>
            <div className="form-group">
              <label>עד תאריך</label>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) =>
                  setDateRange((p) => ({ ...p, end: e.target.value }))
                }
              />
            </div>
          </div>
        </div>
        <div style={{ textAlign: "center", marginTop: "2rem" }}>
          <button
            onClick={handleGenerate}
            disabled={
              !(
                selectedEmployeeIds.length > 0 &&
                dateRange.start &&
                dateRange.end
              )
            }
          >
            הפק דוח שכר
          </button>
        </div>
      </div>
      {payrollResult && (
        <div className="card">
          <h3>תוצאות דוח שכר</h3>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>שם</th>
                  <th>שעות רגילות</th>
                  <th>שעות נוספות</th>
                  <th>שכר בסיס</th>
                  <th>תוספת ש"נ</th>
                  <th>סה"כ לתשלום</th>
                </tr>
              </thead>
              <tbody>
                {payrollResult.details.map((item) => (
                  <tr key={item.id}>
                    <td>{item.name}</td>
                    <td>{item.totalRegularHours.toFixed(2)}</td>
                    <td>{item.totalOvertimeHours.toFixed(2)}</td>
                    <td>₪{item.basePay.toFixed(2)}</td>
                    <td>₪{item.overtimePay.toFixed(2)}</td>
                    <td style={{ fontWeight: "bold" }}>
                      ₪{item.totalPay.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}

function AbsenceManagementModal({ show, onClose, employee }) {
  const { absences, setAbsences, addToast } = useContext(AppContext);
  const [type, setType] = useState("vacation");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  if (!show || !employee) return null;
  const employeeAbsences = absences.filter((a) => a.employeeId === employee.id);
  const handleAddAbsence = (e) => {
    e.preventDefault();
    if (new Date(endDate) < new Date(startDate)) {
      addToast("תאריך סיום לא יכול להיות לפני תאריך ההתחלה", "danger");
      return;
    }
    setAbsences((prev) => [
      ...prev,
      { id: Date.now(), employeeId: employee.id, type, startDate, endDate },
    ]);
    addToast("היעדרות נוספה בהצלחה", "success");
    setStartDate("");
    setEndDate("");
  };
  const handleDeleteAbsence = (id) => {
    setAbsences((prev) => prev.filter((a) => a.id !== id));
    addToast("היעדרות נמחקה");
  };
  return (
    <Modal
      show={show}
      onClose={onClose}
      title={`ניהול היעדרויות: ${employee.name}`}
    >
      <form onSubmit={handleAddAbsence} className="absence-form">
        <div className="form-group">
          <label>סוג היעדרות</label>
          <select value={type} onChange={(e) => setType(e.target.value)}>
            <option value="vacation">חופשה</option>
            <option value="sick">מחלה</option>
          </select>
        </div>
        <div className="form-group">
          <label>מתאריך</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label>עד תאריך</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            required
          />
        </div>
        <button type="submit">הוסף היעדרות</button>
      </form>
      <div className="absences-list">
        <h4>היעדרויות קיימות</h4>
        {employeeAbsences.length > 0 ? (
          <table>
            <tbody>
              {employeeAbsences.map((abs) => (
                <tr key={abs.id}>
                  <td>
                    <strong>{abs.type === "sick" ? "מחלה" : "חופשה"}</strong>
                  </td>
                  <td>{abs.startDate}</td>
                  <td>{abs.endDate}</td>
                  <td>
                    <button
                      onClick={() => handleDeleteAbsence(abs.id)}
                      className="danger-text"
                    >
                      מחק
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>אין היעדרויות רשומות.</p>
        )}
      </div>
    </Modal>
  );
}
function EmployeeFormModal({ show, onClose, onSave, employee }) {
  const [formData, setFormData] = useState({
    name: "",
    department: "תמיכה",
    hourlyRate: "",
    role: "employee",
  });
  useEffect(() => {
    setFormData(
      employee || {
        name: "",
        department: "תמיכה",
        hourlyRate: "",
        role: "employee",
      }
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
          <select
            id="department"
            name="department"
            value={formData.department}
            onChange={handleChange}
          >
            <option value="תמיכה">תמיכה</option>
            <option value="הנהלה">הנהלה</option>
          </select>
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

function App() {
  const [employees, setEmployees] = useState(
    () => JSON.parse(localStorage.getItem("employees")) || initialData.employees
  );
  const [attendance, setAttendance] = useState(
    () =>
      JSON.parse(localStorage.getItem("attendance")) || initialData.attendance
  );
  const [absences, setAbsences] = useState(
    () => JSON.parse(localStorage.getItem("absences")) || initialData.absences
  );
  const [settings, setSettings] = useState(
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
  const handleLogin = (user) => setCurrentUser(user);
  const handleLogout = () => setCurrentUser(null);
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
