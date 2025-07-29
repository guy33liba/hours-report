import { useCallback, useContext, useMemo } from "react";
import DigitalClock from "./DigitalClock";
import EmployeeTimer from "./EmployeeTimer";
import { AppContext } from "./AppContext";
import { apiFetch, exportToExcel } from "./utils";
import "../styles.css";
function Dashboard() {
  // FIX 1: קבלת 'loading' מהקונטקסט. זה המפתח לדעת מתי הנתונים מוכנים.
  const { employees, attendance, setAttendance, addToast, currentUser, loading } =
    useContext(AppContext);

  // FIX 2: הוספת בדיקות בטיחות ל-useMemo. הוא לא ירוץ עד שכל הנתונים קיימים.
  const employeesToDisplay = useMemo(() => {
    // אם הנתונים עדיין בטעינה, או שאין עובדים או משתמש, החזר מערך ריק כדי למנוע קריסה.
    if (loading || !employees || !currentUser) {
      return [];
    }
    if (currentUser.role === "manager") {
      return employees;
    }
    return employees.filter((emp) => emp.id === currentUser.id);
  }, [employees, currentUser, loading]); // FIX 3: הוספת 'loading' למערך התלויות

  // FIX 4: פונקציה 'getEmployeeStatus' בטוחה יותר.
  const getEmployeeStatus = (employee) => {
    // אם אין נתוני נוכחות עדיין, אל תנסה לסנן אותם.
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

      const todaysAttendance = attendance.filter(
        (a) => a.employeeId === emp.id && a.clockIn.startsWith(todayStr)
      );

      // +++ הדפסת אבחון מספר 3: אילו רשומות נמצאו עבור העובד "להיום" +++

      const totalMillisecondsToday = todaysAttendance.reduce((total, entry) => {
        const startTime = new Date(entry.clockIn);
        const endTime = entry.clockOut ? new Date(entry.clockOut) : new Date();
        const duration = endTime - startTime;

        // +++ הדפסת אבחון מספר 4: מה החישוב עבור כל רשומה בודדת +++

        return total + duration;
      }, 0);

      const totalHoursToday = totalMillisecondsToday / (1000 * 60 * 60);

      // +++ הדפסת אבחון מספר 5: מה הסכום הסופי שחושב +++

      return {
        "שם העובד": emp.name,
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
        "סטטוס נוכחי": status.text,
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
          <DigitalClock />
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
