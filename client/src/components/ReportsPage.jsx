import { useContext, useEffect, useState, useMemo } from "react";
import DigitalClock from "./DigitalClock";
import { AppContext } from "./AppContext";
import { apiFetch } from "./utils";
import "../styles.css";

// פונקציות עזר מחוץ לרכיב
const formatHours = (hours) => {
  return typeof hours === "number" ? hours.toFixed(2) : "0.00";
};

const formatCurrency = (amount) => {
  if (typeof amount !== "number" || isNaN(amount)) return "₪0.00";
  return new Intl.NumberFormat("he-IL", {
    style: "currency",
    currency: "ILS",
  }).format(amount);
};

const getYYYYMMDD = (date) => date.toISOString().split("T")[0];

function ReportsPage() {
  // <<< הוספה: החזרנו את 'employees' מהקונטקסט כדי לבנות את הפילטר
  const { employees } = useContext(AppContext);

  const [range, setRange] = useState({
    start: getYYYYMMDD(
      new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    ),
    end: getYYYYMMDD(new Date()),
  });

  // <<< הוספה: State חדש לשמירת העובד שנבחר
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(""); // "" = כל העובדים

  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dateError, setDateError] = useState("");

  useEffect(() => {
    if (
      range.start &&
      range.end &&
      new Date(range.start) > new Date(range.end)
    ) {
      setDateError('תאריך "מתאריך" אינו יכול להיות מאוחר מתאריך "עד תאריך".');
    } else {
      setDateError("");
    }
  }, [range.start, range.end]);

  const handleGenerateReport = async () => {
    if (dateError) return;
    setLoading(true);
    setReportData([]);
    setDateError("");
    try {
      const params = new URLSearchParams({
        startDate: range.start,
        endDate: range.end,
      });
      if (selectedEmployeeId) {
        params.append("employeeId", selectedEmployeeId);
      }

      // --- הוסף את השורה הבאה לבדיקה ---
      console.log("Requesting URL:", `/reports/hours?${params.toString()}`);
      // ------------------------------------

      const data = await apiFetch(`/reports/hours?${params.toString()}`);

      const dataWithHours = data.map((row) => ({
        ...row,
        totalHours: row.totalSeconds / 3600,
        totalPay: (row.totalSeconds / 3600) * parseFloat(row.hourlyRate || 0),
      }));
      setReportData(dataWithHours);
    } catch (error) {
      let errorMessage = "שגיאה לא צפויה בהפקת הדוח.";
      if (error instanceof Error && error.message) errorMessage = error.message;
      else if (typeof error === "string") errorMessage = error;
      setDateError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const summary = useMemo(() => {
    return reportData.reduce(
      (acc, curr) => {
        acc.totalEmployees = reportData.length; // נספר לפי התוצאות
        acc.totalHours += curr.totalHours;
        acc.totalPay += curr.totalPay;
        return acc;
      },
      { totalEmployees: 0, totalHours: 0, totalPay: 0 }
    );
  }, [reportData]);

  // ... פונקציית handleExport נשארת זהה

  return (
    <>
      <div className="page-header">
        <h2>דוחות נוכחות</h2>
        {/* ... */}
      </div>

      <div className="card">
        <h3>בחר טווח תאריכים לדוח</h3>
        <div className="report-controls">
          {/* ... שדות התאריכים נשארים זהים ... */}
          <div className="form-group">
            <label>מתאריך</label>
            <input
              type="date"
              value={range.start}
              onChange={(e) =>
                setRange((p) => ({ ...p, start: e.target.value }))
              }
              className={dateError ? "input-error" : ""}
            />
          </div>
          <div className="form-group">
            <label>עד תאריך</label>
            <input
              type="date"
              value={range.end}
              onChange={(e) => setRange((p) => ({ ...p, end: e.target.value }))}
              className={dateError ? "input-error" : ""}
            />
          </div>

          {/* <<< הוספה: תיבת הבחירה של העובדים >>> */}
          <div className="form-group">
            <label>עובד/ת</label>
            <select
              value={selectedEmployeeId}
              onChange={(e) => setSelectedEmployeeId(e.target.value)}
            >
              <option value="">כל העובדים</option>
              {employees?.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleGenerateReport}
            disabled={loading || !!dateError}
          >
            {loading ? "מפיק..." : "הפק דוח"}
          </button>
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

      {!loading && reportData.length > 0 && (
        <div className="report-results"></div>
      )}
    </>
  );
}
export default ReportsPage;
