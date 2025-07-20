import { useContext, useState } from "react";
import DigitalClock from "./DigitalClock";
import { AppContext } from "./AppContext";
import { apiFetch, exportToExcel } from "./utils";
import "../styles.css";

// פונקציות עזר קטנות ונקיות
const formatHours = (hours) => {
  const num = parseFloat(hours);
  return !isNaN(num) ? num.toFixed(2) : "0.00";
};
const formatCurrency = (amount) =>
  new Intl.NumberFormat("he-IL", { style: "currency", currency: "ILS" }).format(amount || 0);
const getYYYYMMDD = (date) => date.toISOString().split("T")[0];

function ReportsPage() {
  const { employees } = useContext(AppContext);

  const [range, setRange] = useState({
    start: getYYYYMMDD(new Date(new Date().getFullYear(), new Date().getMonth(), 1)),
    end: getYYYYMMDD(new Date()),
  });
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleGenerateReport = async () => {
    setError("");
    if (new Date(range.start) > new Date(range.end)) {
      setError('תאריך "מתאריך" אינו יכול להיות מאוחר מתאריך "עד תאריך".');
      return;
    }

    setLoading(true);
    setReportData(null);

    try {
      const params = new URLSearchParams({
        startDate: range.start,
        endDate: range.end,
      });
      if (selectedEmployeeId) {
        params.append("employeeId", selectedEmployeeId);
      }

      const dataFromServer = await apiFetch(`/reports/hours?${params.toString()}`);

      const finalData = {
        details: dataFromServer,
      };

      finalData.summary = finalData.details.reduce(
        (acc, row) => {
          acc.totalHours += parseFloat(row.totalHours) || 0;
          acc.totalPay += parseFloat(row.totalPay) || 0;
          return acc;
        },
        { totalHours: 0, totalPay: 0, totalEmployees: finalData.details.length }
      );

      setReportData(finalData);
    } catch (err) {
      setError(err.message || "שגיאה לא צפויה בהפקת הדוח.");
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    if (!reportData || !reportData.details) {
      alert("יש להפיק דוח לפני הייצוא.");
      return;
    }

    const dataToExport = reportData.details.map((row) => ({
      "שם עובד": row.employeeName,
      מחלקה: row.department,
      "תעריף שעתי (₪)": parseFloat(row.hourlyRate).toFixed(2),
      "שעות רגילות": formatHours(row.regularHours),
      "שעות נוספות": formatHours(row.overtimeHours),
      'סה"כ שעות': formatHours(row.totalHours),
      "עלות שכר משוערת (₪)": parseFloat(row.totalPay).toFixed(2),
    }));

    exportToExcel(dataToExport, "Report_Attendance_Hours");
  };

  return (
    <>
      <div className="page-header">
        <h2>דוחות נוכחות</h2>
        <DigitalClock />
      </div>

      <div className="card">
        <h3>בחר פרמטרים לדוח</h3>
        <div className="report-controls">
          <div className="form-group">
            <label>מתאריך</label>
            <input
              style={{ fontSize: "20px" }}
              type="date"
              value={range.start}
              onChange={(e) => setRange((p) => ({ ...p, start: e.target.value }))}
            />
          </div>
          <div className="form-group">
            <label>עד תאריך</label>
            <input
              style={{ fontSize: "20px" }}
              type="date"
              value={range.end}
              onChange={(e) => setRange((p) => ({ ...p, end: e.target.value }))}
            />
          </div>
          <div className="form-group">
            <label>עובד/ת</label>
            <select
              style={{ fontSize: "20px" }}
              value={selectedEmployeeId}
              onChange={(e) => setSelectedEmployeeId(e.target.value)}
            >
              <option value="">כל העובדים</option>
              {employees
                ?.filter((e) => e.role === "employee")
                .map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name}
                  </option>
                ))}
            </select>
          </div>
          <button onClick={handleGenerateReport} disabled={loading}>
            {loading ? "מפיק..." : "הפק דוח"}
          </button>
        </div>
        {error && (
          <p
            className="error-message"
            style={{ color: "red", textAlign: "center", marginTop: "10px" }}
          >
            {error}
          </p>
        )}
      </div>

      {loading && (
        <div className="card">
          <p style={{ textAlign: "center" }}>טוען דוח, אנא המתן...</p>
        </div>
      )}

      {reportData && (
        <>
          <div className="kpi-grid">
            <div className="card kpi-card">
              <h4>עובדים בדוח</h4>
              <p className="kpi-value">{reportData.summary.totalEmployees}</p>
            </div>
            <div className="card kpi-card">
              <h4>סה"כ שעות</h4>
              <p className="kpi-value">{formatHours(reportData.summary.totalHours)}</p>
            </div>
            <div className="card kpi-card">
              <h4>עלות שכר כוללת</h4>
              <p className="kpi-value">{formatCurrency(reportData.summary.totalPay)}</p>
            </div>
          </div>

          <div className="card">
            <div className="report-table-header">
              <h3 style={{ marginBottom: "20px" }}>פירוט לפי עובד</h3>
              <button onClick={handleExport} className="secondary">
                ייצוא לאקסל
              </button>
            </div>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>שם העובד</th>
                    <th>מחלקה</th>
                    <th>תעריף שעתי</th>
                    <th>שעות רגילות</th>
                    <th>שעות נוספות</th>
                    <th>סה"כ שעות</th>
                    <th>עלות שכר משוערת</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.details.length > 0 ? (
                    reportData.details.map((row) => (
                      <tr key={row.employeeId}>
                        <td>{row.employeeName}</td>
                        <td>{row.department}</td>
                        <td>{formatCurrency(row.hourlyRate)}</td>
                        <td>{formatHours(row.regularHours)}</td>
                        <td>{formatHours(row.overtimeHours)}</td>
                        <td>{formatHours(row.totalHours)}</td>
                        <td style={{ fontWeight: "bold" }}>{formatCurrency(row.totalPay)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      {/* ⭐️⭐️⭐️ התיקון נמצא כאן ⭐️⭐️⭐️ */}
                      <td colSpan="7" style={{ textAlign: "center" }}>
                        לא נמצאו נתונים עבור הבחירה הנוכחית.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {!loading && !reportData && !error && (
        <div className="card">
          <p style={{ textAlign: "center" }}>נא לבחור פרמטרים ולהפיק דוח.</p>
        </div>
      )}
    </>
  );
}

export default ReportsPage;
