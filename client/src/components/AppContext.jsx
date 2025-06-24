import React, {
  createContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";

export const AppContext = createContext();

const Toast = ({ message, type }) => {
  return <div className={`toast toast-${type}`}>{message}</div>;
};

const useToast = () => {
  const [toasts, setToasts] = useState([]);

  const addToast = (message, type = "info") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 3000);
  };

  return { toasts, addToast };
};

export const AppProvider = ({ children }) => {
  const [employees, setEmployees] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [settings, setSettings] = useState(null);
  const [currentUser, setCurrentUser] = useState({
    id: 1,
    name: "מנהל מערכת",
    role: "manager",
  }); // Example
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { toasts, addToast } = useToast();

  const API_BASE_URL = "http://localhost:5000/api";

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [employeesRes, attendanceRes] = await Promise.all([
        fetch(`${API_BASE_URL}/employees`),
        fetch(`${API_BASE_URL}/attendance`),
      ]);

      if (!employeesRes.ok)
        throw new Error(
          `HTTP error! status: ${employeesRes.status} for employees`
        );
      if (!attendanceRes.ok)
        throw new Error(
          `HTTP error! status: ${attendanceRes.status} for attendance`
        );

      const employeesData = await employeesRes.json();
      const attendanceData = await attendanceRes.json();

      setEmployees(employeesData);
      setAttendance(attendanceData);
    } catch (err) {
      setError(err.message);
      addToast(`שגיאה בטעינת נתונים: ${err.message}`, "error");
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const clockIn = async (employeeId) => {
    try {
      const res = await fetch(`${API_BASE_URL}/attendance/clock-in`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to clock in");
      }
      setAttendance((prev) => [data.entry, ...prev]);
      return data.entry;
    } catch (err) {
      addToast(`שגיאת כניסה: ${err.message}`, "error");
      throw err;
    }
  };

  const clockOut = async (employeeId) => {
    try {
      const res = await fetch(`${API_BASE_URL}/attendance/clock-out`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to clock out");
      }
      setAttendance((prev) =>
        prev.map((entry) => (entry.id === data.entry.id ? data.entry : entry))
      );
      return data.entry;
    } catch (err) {
      addToast(`שגיאת יציאה: ${err.message}`, "error");
      throw err;
    }
  };

  const breakToggle = async (employeeId) => {
    try {
      const res = await fetch(`${API_BASE_URL}/attendance/break`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to toggle break");
      }
      setAttendance((prev) =>
        prev.map((entry) => (entry.id === data.entry.id ? data.entry : entry))
      );
      return data.entry;
    } catch (err) {
      addToast(`שגיאת הפסקה: ${err.message}`, "error");
      throw err;
    }
  };

  const contextValue = useMemo(
    () => ({
      employees,
      attendance,
      settings,
      currentUser,
      loading,
      error,
      fetchData,
      clockIn,
      clockOut,
      breakToggle,
      addToast,
    }),
    [
      employees,
      attendance,
      settings,
      currentUser,
      loading,
      error,
      fetchData,
      clockIn,
      clockOut,
      breakToggle,
      addToast,
    ]
  );

  return (
    <AppContext.Provider value={contextValue}>
      {children}
      <div className="toast-container">
        {toasts.map((toast) => (
          <Toast key={toast.id} message={toast.message} type={toast.type} />
        ))}
      </div>
    </AppContext.Provider>
  );
};
