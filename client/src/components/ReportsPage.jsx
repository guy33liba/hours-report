import { useContext, useEffect, useMemo, useState } from "react";
import DigitalClock from "./DigitalClock";
import AppContent from "./AppContent";
import { AppContext } from "./AppContext";
import { calculateNetSeconds } from "./utils";
import "../styles.css";
function ReportsPage() {
  const { employees, attendance } = useContext(AppContext);
  const [range, setRange] = useState({ start: "", end: "" });
  const [dateError, setDateError] = useState(""); // מצב חדש לשגיאת תאריכים

  // useEffect שיבדוק את התאריכים בכל פעם שהם משתנים
  useEffect(() => {
    if (range.start && range.end) {
      const startDate = new Date(range.start);
      const endDate = new Date(range.end);

      if (startDate > endDate) {
        setDateError('תאריך "מתאריך" אינו יכול להיות מאוחר מתאריך "עד תאריך".');
      } else {
        setDateError(""); // נקה שגיאה אם הכל תקין
      }
    } else {
      setDateError(""); // נקה שגיאה אם אחד מהתאריכים ריק
    }
  }, [range.start, range.end]); // תלויות: יופעל מחדש כשמתאריך/עד תאריך משתנים

  const reportData = useMemo(() => {
    // אם יש שגיאה בתאריכים, אל תחשב את הדוח
    if (dateError) {
      return [];
    }

    const defaultStartDate = new Date("2000-01-01");
    const defaultEndDate = new Date("2099-12-31");
    defaultEndDate.setHours(23, 59, 59, 999);

    const effectiveStartDate = range.start
      ? new Date(range.start)
      : defaultStartDate;
    const effectiveEndDate = range.end ? new Date(range.end) : defaultEndDate;
    effectiveEndDate.setHours(23, 59, 59, 999);

    return employees
      .map((emp) => {
        const empAttendance = attendance.filter(
          (a) =>
            a.employeeId === emp.id &&
            new Date(a.clockIn) >= effectiveStartDate &&
            new Date(a.clockIn) <= effectiveEndDate &&
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
  }, [range, employees, attendance, dateError]); // הוסף את dateError כתלות כדי שיחושב מחדש כשיש שגיאה

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
    // אל תאפשר ייצוא אם יש שגיאה בתאריכים
    if (!reportData.length || dateError) return;

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
    const fileName =
      range.start && range.end
        ? `report_${range.start}_to_${range.end}.csv`
        : `report_all_data.csv`;
    link.setAttribute("download", fileName);
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
            disabled={!reportData.length || dateError} // כפתור הייצוא יהיה מנוטרל אם יש שגיאה
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
              // הוסף קלאס שגיאה אם יש שגיאה וזה שדה ההתחלה
              className={
                dateError &&
                range.start &&
                new Date(range.start) > new Date(range.end)
                  ? "input-error"
                  : ""
              }
            />
          </div>
          <div className="form-group">
            <label>עד תאריך</label>
            <input
              type="date"
              value={range.end}
              onChange={(e) => setRange((p) => ({ ...p, end: e.target.value }))}
              // הוסף קלאס שגיאה אם יש שגיאה וזה שדה הסיום
              className={
                dateError &&
                range.end &&
                new Date(range.start) > new Date(range.end)
                  ? "input-error"
                  : ""
              }
            />
          </div>
        </div>
        {dateError && (
          <p
            className="error-message"
            style={{ color: "red", textAlign: "center", marginTop: "10px" }}
          >
            {dateError}
          </p>
        )}
      </div>

      {/* הצגת הנתונים או הודעת אין נתונים */}
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
      {/* הודעה אם אין נתונים בדוח - רק אם אין שגיאת תאריכים */}
      {!dateError && reportData.length === 0 && (range.start || range.end) && (
        <div className="card">
          <p style={{ textAlign: "center" }}>
            לא נמצאו נתוני נוכחות לתקופה שנבחרה.
          </p>
        </div>
      )}
      {/* הודעה אם אין נתונים בכלל (ולא נבחרו תאריכים ולא קיימת שגיאת תאריכים) */}
      {!dateError && reportData.length === 0 && !range.start && !range.end && (
        <div className="card">
          <p style={{ textAlign: "center" }}>אין נתוני נוכחות זמינים להצגה.</p>
        </div>
      )}
    </>
  );
}
export default ReportsPage;
