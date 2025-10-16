import { useCallback, useContext, useMemo, useState, useEffect } from "react";
import DigitalClock from "./DigitalClock";
import EmployeeTimer from "./EmployeeTimer";
import { AppContext } from "./AppContext";
import { apiFetch, exportToExcel } from "./utils";
import "../styles.css";
function Dashboard() {
  // FIX 1: קבלת 'loading' מהקונטקסט. זה המפתח לדעת מתי הנתונים מוכנים.
  const { employees, attendance, setAttendance, addToast, currentUser, loading } = useContext(AppContext);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");

  useEffect(() => {
    if (currentUser && employees.length > 0) {
      if (currentUser.role === "manager") {
        setSelectedEmployeeId(""); // Managers see all by default
      } else {
        setSelectedEmployeeId(currentUser.id); // Employees see only themselves
      }
    }
  }, [currentUser, employees]);

  // FIX 2: הוספת בדיקות בטיחות ל-useMemo. הוא לא ירוץ עד שכל הנתונים קיימים.
  const employeesToDisplay = useMemo(() => {
    if (loading || !employees || !currentUser) {
      return [];
    }

    let filteredEmployees = employees;

    if (currentUser.role === "manager" && selectedEmployeeId) {
      filteredEmployees = employees.filter((emp) => emp.id === selectedEmployeeId);
    } else if (currentUser.role !== "manager") {
      filteredEmployees = employees.filter((emp) => emp.id === currentUser.id);
    }

    return filteredEmployees;
  }, [employees, currentUser, loading, selectedEmployeeId]);

  const getEmployeeStatus = (employee) => {
    if (!attendance) {
      return { text: "טוען...", class: "loading" };
    }

    if (employee.status === "sick" || employee.status === "vacation") {
      return {
        text: employee.status === "sick" ? "מחלה" : "חופשה",
        class: employee.status,
      };
    }

    const lastEntry = attendance
      .filter((a) => a.employeeId === employee.id)
      .sort((a, b) => new Date(b.clockIn) - new Date(a.clockIn))[0];

    if (!lastEntry || lastEntry.clockOut) {
      return { text: "לא בעבודה", class: "absent" };
    }
    if (lastEntry.onBreak) {
      return { text: "בהפסקה", class: "on_break" };
    }
    return { text: "נוכח", class: "present" };
  };

  const dashboardStats = useMemo(() => {
    if (loading || !attendance || !employees) {
      return { presentCount: 0, totalHoursToday: 0, totalPayToday: 0 };
    }

    const todayStr = new Date().toISOString().split("T")[0];
    let presentCount = 0;
    let totalMillisecondsToday = 0;
    let totalPayToday = 0;

    employeesToDisplay.forEach((emp) => {
      const hourlyRate = parseFloat(emp.hourly_rate) || 0;

      if (attendance.some((a) => a.employeeId === emp.id && !a.clockOut)) {
        presentCount++;
      }

      attendance
        .filter((a) => a.employeeId === emp.id && a.clockIn.startsWith(todayStr))
        .forEach((entry) => {
          const startTime = new Date(entry.clockIn);
          const endTime = entry.clockOut ? new Date(entry.clockOut) : new Date();
          let durationMs = Math.max(0, endTime - startTime);

          // Subtract break durations
          if (entry.breaks && entry.breaks.length > 0) {
            const totalBreakMs = entry.breaks.reduce((breakTotal, b) => {
              const breakStart = new Date(b.start);
              const breakEnd = b.end ? new Date(b.end) : new Date(); // If break is ongoing, use current time
              return breakTotal + Math.max(0, breakEnd - breakStart);
            }, 0);
            durationMs = Math.max(0, durationMs - totalBreakMs);
          }

          totalMillisecondsToday += durationMs;
          totalPayToday += (durationMs / 3600000) * hourlyRate;
        });
    });

    return {
      presentCount,
      totalHoursToday: totalMillisecondsToday / 3600000,
      totalPayToday,
    };
  }, [attendance, employeesToDisplay, loading]);
  // כל פונקציות ה-handle... נשארות כפי שהן, הן תקינות.
  const handleClockIn = async (employeeId) => {
    try {
      await apiFetch("/attendance/clock-in", {
        method: "POST",
        body: JSON.stringify({ employeeId }),
      });
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
    } catch (error) {
      addToast(`שגיאה בהחתמת כניסה: ${error.message}`, "danger");
    }
  };
  const handleClockOut = async (employeeId) => {
    try {
      await apiFetch("/attendance/clock-out", {
        method: "POST",
        body: JSON.stringify({ employeeId }),
      });
      addToast("יציאה הוחתמה בהצלחה");
      setAttendance((prev) =>
        prev.map((a) =>
          !a.clockOut && a.employeeId === employeeId
            ? { ...a, clockOut: new Date().toISOString() }
            : a
        )
      );
    } catch (error) {
      addToast(`שגיאה בהחתמת יציאה: ${error.message}`, "danger");
    }
  };

  const handleExport = useCallback(() => {
    if (!employeesToDisplay || employeesToDisplay.length === 0) {
      addToast("אין נתונים לייצוא", "danger");
      return;
    }

    const formatDuration = (hours) => {
      if (typeof hours !== "number" || isNaN(hours) || hours <= 0) return "00:00";
      const h = Math.floor(hours);
      const m = Math.round((hours - h) * 60);
      return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    };
    const formatDate = (dateString) => {
      if (!dateString) return "";
      return new Date(dateString).toLocaleDateString("he-IL", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    };
    const formatTime = (dateString) => {
      if (!dateString) return "";
      return new Date(dateString).toLocaleTimeString("he-IL", {
        hour: "2-digit",
        minute: "2-digit",
      });
    };

    const dataToExport = employeesToDisplay.map((emp) => {
      const status = getEmployeeStatus(emp);
      const lastEntry = attendance
        .filter((a) => a.employeeId === emp.id)
        .sort((a, b) => new Date(b.clockIn) - new Date(a.clockIn))[0];

      // +++ הדפסת אבחון מספר 2: על איזה עובד אנחנו עובדים +++

      const todayStr = new Date().toISOString().split("T")[0];

      // +++ הדפסת אבחון מספר 3: אילו רשומות נמצאו עבור העובד "להיום" +++
      const today = new Date();
      today.setHours(0, 0, 0, 0); // The very beginning of today (midnight)
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1); // The beginning of tomorrow

      const todaysAttendance = attendance.filter(
        (a) =>
          a.employeeId === emp.id &&
          new Date(a.clockIn) < tomorrow &&
          (!a.clockOut || new Date(a.clockOut) > today)
      );

      const totalMillisecondsToday = todaysAttendance.reduce((total, entry) => {
        const startTime = new Date(entry.clockIn);
        const endTime = entry.clockOut ? new Date(entry.clockOut) : new Date();
        const todayStart = new Date(todayStr + "T00:00:00");
        const todayEnd = new Date(todayStr + "T23:59:59");
        if (startTime < todayStart) startTime.setTime(todayStart.getTime());
        if (endTime > todayEnd) endTime.setTime(todayEnd.getTime());
        const duration = Math.max(0, endTime - startTime);

        // +++ הדפסת אבחון מספר 4: מה החישוב עבור כל רשומה בודדת +++

        return total + duration;
      }, 0);

      const totalHoursToday = totalMillisecondsToday / (1000 * 60 * 60);

      // +++ הדפסת אבחון מספר 5: מה הסכום הסופי שחושב +++

      return {
        "שם העובד": emp.name,
        "סטטוס נוכחי": status.text,
        מחלקה: emp.department,
        "תאריך כניסה": lastEntry ? formatDate(lastEntry.clockIn) : "",
        "שעת כניסה": lastEntry ? formatTime(lastEntry.clockIn) : "",
        "שעת יציאה":
          lastEntry && lastEntry.clockOut
            ? formatTime(lastEntry.clockOut)
            : status.class.includes("present") || status.class.includes("break")
              ? "בעבודה"
              : "",
        'סה"כ שעות להיום': formatDuration(totalHoursToday),
      };
    });

    exportToExcel(dataToExport, "Realtime_Attendance_Report");
    addToast("הנתונים יוצאו בהצלחה!", "success");
  }, [employeesToDisplay, attendance, getEmployeeStatus, addToast]);

  if (loading) {
    return (
      <div className="page-header">
        <h2>לוח בקרה</h2>
        <div className="card">
          <h3>טוען נתוני נוכחות...</h3>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="page-header">
        <h2>לוח בקרה</h2>

        <div className="page-actions">
          {currentUser.role === "manager" && (
            <select
              value={selectedEmployeeId}
              onChange={(e) => setSelectedEmployeeId(e.target.value)}
              className="employee-select"
            >
              <option value="">כל העובדים</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name}
                </option>
              ))}
            </select>
          )}
          <DigitalClock />
        </div>
      </div>

      <div className="kpi-grid">
        <div className="card kpi-card">
          <h4>נוכחים כרגע</h4>
          <p className="kpi-value">{dashboardStats.presentCount}</p>
        </div>
        <div className="card kpi-card">
          <h4>סה"כ שעות להיום</h4>
          <p className="kpi-value">{dashboardStats.totalHoursToday.toFixed(2)}</p>
        </div>
        <div className="card kpi-card">
          <h4>עלות שכר להיום (משוערת)</h4>
          <p className="kpi-value">
            {new Intl.NumberFormat("he-IL", { style: "currency", currency: "ILS" }).format(
              dashboardStats.totalPayToday
            )}
          </p>
        </div>
      </div>
      <div className="card">
        <h3>נוכחות בזמן אמת</h3>
        <div className="employee-list-realtime">
          {employeesToDisplay.length > 0 ? (
            employeesToDisplay.map((emp) => {
              const status = getEmployeeStatus(emp);
              const isClockedIn = status.class === "present" || status.class === "on_break";
              const isDisabled = status.class === "sick" || status.class === "vacation";
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
                    {/* <button
                      onClick={() => handleBreakToggle(emp.id)}
                      disabled={!isClockedIn || isDisabled}
                      className="secondary"
                    >
                      {status.class === "on_break" ? "חזור מהפסקה" : "הפסקה"}
                    </button> */}
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
            })
          ) : (
            <p>אין עובדים להצגה עבור המשתמש הנוכחי.</p>
          )}
        </div>
        <button
          onClick={handleExport}
          className="secondary"
          style={{ position: "relative", top: "20px" }}
        >
          ייצא לאקסל
        </button>
      </div>
    </>
  );
}
export default Dashboard;

// const handleBreakToggle = async (employeeId) => {
//   try {
//     await apiFetch("/attendance/toggle-break", {
//       method: "POST",
//       body: JSON.stringify({ employeeId }),
//     });
//     let isOnBreak = false;
//     setAttendance((prev) =>
//       prev.map((a) => {
//         if (!a.clockOut && a.employeeId === employeeId) {
//           const newBreakState = !a.onBreak;
//           const now = new Date().toISOString();
//           let newBreaks = [...(a.breaks || [])];
//           if (newBreakState) {
//             newBreaks.push({ start: now, end: null });
//             isOnBreak = true;
//           } else {
//             const last = newBreaks.findLastIndex((b) => !b.end);
//             if (last !== -1) newBreaks[last].end = now;
//           }
//           return { ...a, breaks: newBreaks, onBreak: newBreakState };
//         }
//         return a;
//       })
//     );
//     addToast(isOnBreak ? "יציאה להפסקה" : "חזרה מהפסקה");
//   } catch (error) {
//     addToast(`שגיאה בעדכון הפסקה: ${error.message}`, "danger");
//   }
// };
