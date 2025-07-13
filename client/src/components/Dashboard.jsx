import { useContext, useMemo } from "react";
import DigitalClock from "./DigitalClock";
import EmployeeTimer from "./EmployeeTimer";
import { AppContext } from "./AppContext";
import "../styles.css";

function Dashboard() {
  // FIX 1: קבלת 'loading' מהקונטקסט. זה המפתח לדעת מתי הנתונים מוכנים.
  const {
    employees,
    attendance,
    setAttendance,
    addToast,
    currentUser,
    loading,
    fetchData,
  } = useContext(AppContext);

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
      await apiFetch("/api/attendance/clock-in", {
        method: "POST",
        body: JSON.stringify({ employeeId }),
      });
      // setAttendance((prev) => [
      //   ...prev,
      //   {
      //     id: Date.now(),
      //     employeeId,
      //     clockIn: new Date().toISOString(),
      //     clockOut: null,
      //     breaks: [],
      //     onBreak: false,
      //   },
      // ]);
      addToast("כניסה הוחתמה בהצלחה", "success");
    } catch (error) {
      addToast(`שגיאה בהחתמת כניסה: ${err.message}`, "danger");
    }
  };
  const handleClockOut = async (employeeId) => {
    try {
      await apiFetch("/api/attendance/clock-out", {
        method: "POST",
        body: JSON.stringify({ employeeId }),
      });
      addToast("יציאה הוחתמה בהצלחה");
      // setAttendance((prev) =>
      //   prev.map((a) =>
      //     !a.clockOut && a.employeeId === employeeId
      //       ? { ...a, clockOut: new Date().toISOString() }
      //       : a
      //   )
      // );
    } catch (err) {
      addToast(`שגיאה בהחתמת יציאה: ${err.message}`, "danger");
    }
  };
  const handleBreakToggle = async (employeeId) => {
    try {
      await apiFetch("/api/attendance/toggle-break", {
        method: "POST",
        body: JSON.stringify({ employeeId }),
      });
      let isOnBreak = false;
      // setAttendance((prev) =>
      //   prev.map((a) => {
      //     if (!a.clockOut && a.employeeId === employeeId) {
      //       const newBreakState = !a.onBreak;
      //       const now = new Date().toISOString();
      //       let newBreaks = [...(a.breaks || [])];
      //       if (newBreakState) {
      //         newBreaks.push({ start: now, end: null });
      //         isOnBreak = true;
      //       } else {
      //         const last = newBreaks.findLastIndex((b) => !b.end);
      //         if (last !== -1) newBreaks[last].end = now;
      //       }
      //       return { ...a, breaks: newBreaks, onBreak: newBreakState };
      //     }
      //     return a;
      //   })
      // );
      addToast(isOnBreak ? "יציאה להפסקה" : "חזרה מהפסקה");
    } catch (error) {
      addToast(`שגיאה בעדכון הפסקה: ${err.message}`, "danger");
    }
  };

  // FIX 5: הצגת הודעת טעינה בזמן שהנתונים מהשרת בדרך.
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
        <DigitalClock />
      </div>
      <div className="card">
        <h3>נוכחות בזמן אמת</h3>
        <div className="employee-list-realtime">
          {/* FIX 6: הצגת הודעה אם אין עובדים להציג, במקום מסך ריק. */}
          {employeesToDisplay.length > 0 ? (
            employeesToDisplay.map((emp) => {
              const status = getEmployeeStatus(emp);
              const isClockedIn =
                status.class === "present" || status.class === "on_break";
              const isDisabled =
                status.class === "sick" || status.class === "vacation";
              return (
                <div key={emp.id} className="employee-row">
                  <div className="employee-info">
                    <span className="employee-name">{emp.name}</span>
                    <span className="employee-department">
                      {emp.department}
                    </span>
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
            })
          ) : (
            <p>אין עובדים להצגה עבור המשתמש הנוכחי.</p>
          )}
        </div>
      </div>
    </>
  );
}
export default Dashboard;
