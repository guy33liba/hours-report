// src/AppContext.jsx - הספק הראשי של הקונטקסט באפליקציה

import React, {
  createContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
// ייבוא apiFetch ו-Toast מהקובץ utils.js
import { apiFetch, Toast } from "./utils"; // וודא שהנתיב נכון

// --- מטפלי אימות (התחברות/התנתקות) ---

// הגדרת AppContext: מכיל את כל הערכים שרכיבי הילד יכולים לצרוך.
// חשוב לספק אובייקט ברירת מחדל עם כל המאפיינים כדי למנוע שגיאות destructuring
export const AppContext = createContext({
  employees: [],
  setEmployees: () => {},
  attendance: [],
  setAttendance: () => {},
  absences: [],
  setAbsences: () => {},
  settings: {
    standardWorkDayHours: 8,
    overtimeRatePercent: 150,
  },
  setSettings: () => {},
  currentUser: null,
  setCurrentUser: () => {},
  addToast: () => {},
  handleLogin: () => {},
  handleLogout: () => {},
  fetchData: () => {},
  clockIn: () => {},
  clockOut: () => {},
  breakToggle: () => {},
  loading: false,
  error: null,
  toasts: [],
});

// Toast component (can remain here or be moved to utils)
const CustomToast = ({ message, type, onDismiss }) => {
  return (
    <div className={`toast toast-${type}`}>
      {message}
      <button onClick={onDismiss} className="toast-dismiss-btn">
        ×
      </button>
    </div>
  );
};

// AppProvider: רכיב ספק הקונטקסט האמיתי שיחזיק את המצב והלוגיקה
export const AppProvider = ({ children }) => {
  const addToast = useCallback((message, type = "info") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((p) => p.filter((t) => t.id !== id));
    }, 3000); // הסרה אוטומטית לאחר 3 שניות
  }, []);

  // --- הגדרת המצבים הגלובליים של האפליקציה ---
  // FIX: Provide a default empty JSON string if localStorage.getItem returns null or undefined
  const [employees, setEmployees] = useState(() =>
    JSON.parse(localStorage.getItem("employees") || "[]")
  );
  const [attendance, setAttendance] = useState(() =>
    JSON.parse(localStorage.getItem("attendance") || "[]")
  );
  const [absences, setAbsences] = useState(() =>
    JSON.parse(localStorage.getItem("absences") || "[]")
  );
  const [settings, setSettings] = useState(
    () =>
      JSON.parse(localStorage.getItem("settings") || "{}") || {
        standardWorkDayHours: 8, // ערך ברירת מחדל
        overtimeRatePercent: 150, // ערך ברירת מחדל
      }
  );
  const [currentUser, setCurrentUser] = useState(
    () => JSON.parse(localStorage.getItem("currentUser") || "null") || null
  );

  const [toasts, setToasts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // --- אפקט לסינכרון מצבים עם Local Storage ---
  useEffect(() => {
    localStorage.setItem("currentUser", JSON.stringify(currentUser));
    localStorage.setItem("employees", JSON.stringify(employees));
    localStorage.setItem("attendance", JSON.stringify(attendance));
    localStorage.setItem("absences", JSON.stringify(absences));
    localStorage.setItem("settings", JSON.stringify(settings));
  }, [currentUser, employees, attendance, absences, settings]);

  // --- Employee Status Update Based on Absences ---
  useEffect(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Add checks for null/undefined before mapping
    if (
      !employees ||
      !Array.isArray(employees) ||
      !absences ||
      !Array.isArray(absences)
    )
      return;

    const updatedEmployees = employees.map((emp) => {
      const activeAbsence = absences.find((a) => {
        if (!a || !a.startDate || !a.endDate || a.employeeId !== emp.id)
          return false;

        const startDate = new Date(a.startDate);
        startDate.setHours(0, 0, 0, 0);
        const endDate = new Date(a.endDate);
        endDate.setHours(0, 0, 0, 0);
        return today >= startDate && today <= endDate;
      });

      const newStatus = activeAbsence
        ? activeAbsence.type
        : emp.status === "present" || emp.status === "on_break"
        ? emp.status
        : "absent"; // Preserve present/on_break status if not on active absence

      if (emp.status !== newStatus) {
        // Only update if status actually changed
        return { ...emp, status: newStatus };
      }
      return emp;
    });

    if (JSON.stringify(employees) !== JSON.stringify(updatedEmployees)) {
      setEmployees(updatedEmployees);
    }
  }, [absences, employees]);

  // --- Toast Logic ---
  const handleLogin = useCallback(
    (user, token) => {
      setCurrentUser(user);
      localStorage.setItem("token", token);
      addToast("התחברת בהצלחה", "type");
    },
    [addToast]
  );
  const handleLogout = useCallback(() => {
    setCurrentUser(null);
    localStorage.removeItem("token");
    addToast("התנתקת בהצלחה", "info");
    // נקה נתונים לאחר התנתקות כדי להבטיח מצב טרי בהתחברות הבאה
    setEmployees([]);
    setAttendance([]);
    setAbsences([]);
    setSettings({}); // Clear settings too on logout
  }, [addToast]);

  // --- לוגיקת אחזור נתונים מה-API של הבקאנד ---
  const fetchData = useCallback(async () => {
    if (!currentUser) return; // אל תבצע אחזור אם אין משתמש מחובר
    setLoading(true);
    setError(null);
    try {
      // אחזר את כל הנתונים הנדרשים במקביל
      const [employeesData, attendanceData, absencesData, settingsData] =
        await Promise.all([
          apiFetch("/employees"),
          apiFetch("/attendance"),
          apiFetch("/absences"), // וודא שנקודת קצה זו קיימת בבקאנד שלך
          apiFetch("/settings"), // וודא שנקודת קצה זו קיימת בבקאנד שלך
        ]);

      // עדכן את המצבים עם הנתונים שאוחזרו
      setEmployees(employeesData);
      setAttendance(attendanceData);
      setAbsences(absencesData);
      setSettings(settingsData);
      addToast("נתונים נטענו בהצלחה", "info");
    } catch (err) {
      setError(err);
      addToast(err.message || "שגיאה בטעינת נתונים.", "danger");
      console.error("Failed to fetch data:", err);
    } finally {
      setLoading(false);
    }
  }, [addToast, currentUser]); // `fetchData` תלוי ב-`addToast` ו-`currentUser`

  // אפקט להפעלת אחזור נתונים כאשר currentUser משתנה
  useEffect(() => {
    if (currentUser) {
      fetchData();
    }
  }, [currentUser, fetchData]);

  // --- שיחות API הקשורות לנוכחות (כניסה, יציאה, הפסקה) ---
  const clockIn = useCallback(
    async (employeeId) => {
      try {
        const data = await apiFetch("/attendance/clock-in", {
          method: "POST",
          body: JSON.stringify({ employeeId }),
        });
        setAttendance((prev) => [data.entry, ...prev]);
        addToast("כניסה נרשמה בהצלחה!", "success");
        return data.entry;
      } catch (err) {
        addToast(`שגיאת כניסה: ${err.message}`, "error");
        throw err;
      }
    },
    [addToast]
  );

  const clockOut = useCallback(
    async (employeeId) => {
      try {
        const data = await apiFetch("/attendance/clock-out", {
          method: "POST",
          body: JSON.stringify({ employeeId }),
        });
        setAttendance((prev) =>
          prev.map((entry) => (entry.id === data.entry.id ? data.entry : entry))
        );
        addToast("יציאה נרשמה בהצלחה!", "success");
        return data.entry;
      } catch (err) {
        addToast(`שגיאת יציאה: ${err.message}`, "error");
        throw err;
      }
    },
    [addToast]
  );

  const breakToggle = useCallback(
    async (employeeId) => {
      try {
        const data = await apiFetch("/attendance/break", {
          method: "POST",
          body: JSON.stringify({ employeeId }),
        });
        setAttendance((prev) =>
          prev.map((entry) => (entry.id === data.entry.id ? data.entry : entry))
        );
        addToast(
          data.entry.on_break ? "הפסקה התחילה." : "הפסקה הסתיימה.",
          "info"
        );
        return data.entry;
      } catch (err) {
        addToast(`שגיאת הפסקה: ${err.message}`, "error");
        throw err;
      }
    },
    [addToast]
  );

  // --- זיכרון ערך הקונטקסט (Memoization) ---
  const contextValue = useMemo(
    () => ({
      employees,
      setEmployees,
      attendance,
      setAttendance,
      absences,
      setAbsences,
      settings,
      setSettings,
      currentUser,
      setCurrentUser,
      addToast,
      handleLogin,
      handleLogout,
      fetchData,
      clockIn,
      clockOut,
      breakToggle,
      loading,
      error,
      toasts, // כלול את מערך ה-toasts עבור קונטיינר ה-Toast הגלובלי
    }),
    [
      employees,
      setEmployees,
      attendance,
      setAttendance,
      absences,
      setAbsences,
      settings,
      setSettings,
      currentUser,
      setCurrentUser,
      addToast,
      handleLogin,
      handleLogout,
      fetchData,
      clockIn,
      clockOut,
      breakToggle,
      loading,
      error,
      toasts,
    ]
  );

  return (
    // ספק את ערך הקונטקסט לכל רכיבי הילד
    <AppContext.Provider value={contextValue}>
      {children} {/* זה ירינדר את רכיב ה-App הראשי שלך */}
      {/* קונטיינר ה-Toast מוצג כאן, בתוך הספק, אך מחוץ לרכיבי הילד המרונדרים */}
      <div className="toast-container">
        {toasts.map((toastItem) => (
          <Toast // השתמש ברכיב Toast המיובא מ-utils
            key={toastItem.id}
            message={toastItem.message}
            type={toastItem.type}
            onDismiss={() =>
              setToasts((p) => p.filter((t) => t.id !== toastItem.id))
            }
          />
        ))}
      </div>
    </AppContext.Provider>
  );
};
