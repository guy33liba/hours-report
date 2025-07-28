import { useCallback, useContext, useMemo, useState } from "react";
import DigitalClock from "./DigitalClock";
import { AppContext } from "./AppContext";
import "../styles.css";
import { apiFetch, exportToExcel } from "./utils";
const getYYYYMMDD = (date) => date.toISOString().split("T")[0];

function PayrollPage() {
  const { employees, addToast, loading: contextLoading } = useContext(AppContext);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState([]);
  const [dateRange, setDateRange] = useState({
    start: getYYYYMMDD(new Date(new Date().getFullYear(), new Date().getMonth(), 2)),
    end: getYYYYMMDD(new Date()),
  });
  const [payrollResult, setPayrollResult] = useState(null);
  const [isCalculating, setIsCalculating] = useState(false);

  // רשימה של כל העובדים והמנהלים שניתן לבחור
  const selectableEmployees = useMemo(
    () => (employees || []).filter((emp) => emp.role === "employee" || emp.role === "manager"),
    [employees]
  );

  const handleEmployeeSelection = (e) => {
    const id = parseInt(e.target.value);
    setSelectedEmployeeIds((prev) =>
      e.target.checked ? [...prev, id] : prev.filter((empId) => empId !== id)
    );
  };

  // פונקציה פשוטה ונכונה לבחירת כולם
  const handleSelectAll = (e) => {
    setSelectedEmployeeIds(e.target.checked ? selectableEmployees.map((emp) => emp.id) : []);
  };

  const handleCalculatePayroll = async () => {
    if (selectedEmployeeIds.length === 0 || !dateRange.start || !dateRange.end) {
      addToast("יש לבחור עובדים וטווח תאריכים.", "danger");
      return;
    }

    setIsCalculating(true);
    setPayrollResult(null);
    try {
      const data = await apiFetch("/payroll", {
        method: "POST",
        body: JSON.stringify({
          employeeIds: selectedEmployeeIds,
          startDate: dateRange.start,
          endDate: dateRange.end,
        }),
      });
      // בדיקה בטיחותית לפני שמירת התוצאה
      if (data && data.details) {
        setPayrollResult(data.details);
      } else {
        setPayrollResult([]); // הצג הודעת "אין נתונים" במקום קריסה
      }
    } catch (err) {
      addToast(err.message || "שגיאה בחישוב השכר", "danger");
    } finally {
      setIsCalculating(false);
    }
  };

  const handleExport = useCallback(() => {
    if (!payrollResult || payrollResult.length === 0) {
      addToast("אין נתונים לייצוא", "danger");
      return;
    }

    // Format the data exactly as it appears in the table
    const dataToExport = payrollResult.map((item) => ({
      שם: item.name,
      "שעות רגילות": (item.totalRegularHours || 0).toFixed(2),
      "שעות נוספות": (item.totalOvertimeHours || 0).toFixed(2),
      "שכר בסיס (₪)": (item.basePay || 0).toFixed(2),
      "שעות נוספות (₪)": (item.overtimePay || 0).toFixed(2),
      'סה"כ שעות': (item.totalHours || 0).toFixed(2),
      'סה"כ לתשלום (₪)': (item.totalPay || 0).toFixed(2),
    }));

    const fileName = `Payroll_Report_${dateRange.start}_to_${dateRange.end}`;
    exportToExcel(dataToExport, fileName);
    addToast("דוח השכר יוצא בהצלחה!", "success");
  }, [payrollResult, dateRange, addToast]);

  if (contextLoading) {
    return <div>טוען נתונים...</div>;
  }

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
                {/* --- התיקון כאן: שימוש בלוגיקה הפשוטה והנכונה --- */}
                <input
                  type="checkbox"
                  id="select-all"
                  onChange={handleSelectAll}
                  checked={
                    selectableEmployees.length > 0 &&
                    selectedEmployeeIds.length === selectableEmployees.length
                  }
                  disabled={selectableEmployees.length === 0}
                />
                <label htmlFor="select-all">בחר את כולם</label>
              </div>
              {/* --- התיקון כאן: שימוש ברשימה שהכנו מראש --- */}
              {selectableEmployees.map((emp) => (
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
                onChange={(e) => setDateRange((p) => ({ ...p, start: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label>עד תאריך</label>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange((p) => ({ ...p, end: e.target.value }))}
              />
            </div>
          </div>
        </div>
        <div style={{ textAlign: "center", marginTop: "2rem" }}>
          <button onClick={handleCalculatePayroll} disabled={isCalculating}>
            {isCalculating ? "מחשב..." : "הפק דוח שכר"}
          </button>
        </div>
      </div>
      {isCalculating && (
        <div className="card">
          <p style={{ textAlign: "center" }}>מחשב דוח שכר, אנא המתן...</p>
        </div>
      )}
      {/* --- התיקון כאן: בדיקה בטוחה יותר של התוצאות --- */}
      {payrollResult && (
        <div className="card">
          <h3>תוצאות דוח שכר</h3>
          <div className="page-actions">
            <button onClick={handleExport} className="secondary">
              {/* Optional: Add an icon here */}
              ייצא לאקסל
            </button>
          </div>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>שם</th>
                  <th>שעות רגילות</th>
                  <th>שעות נוספות</th>
                  <th>שכר בסיס</th>
                  <th> שעות נוספות</th>
                  <th>סה"כ שעות</th>
                  <th>סה"כ לתשלום</th>
                </tr>
              </thead>
              <tbody>
                {payrollResult.length > 0 ? (
                  payrollResult.map((item) => (
                    <tr key={item.id}>
                      <td>{item.name}</td>
                      <td>{(item.totalRegularHours || 0).toFixed(2)}</td>
                      <td>{(item.totalOvertimeHours || 0).toFixed(2)}</td>
                      <td>₪{(item.basePay || 0).toFixed(2)}</td>
                      <td>₪{(item.overtimePay || 0).toFixed(2)}</td>
                      <td>{(item.totalHours || 0).toFixed(2)}</td>
                      <td style={{ fontWeight: "bold" }}>₪{(item.totalPay || 0).toFixed(2)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" style={{ textAlign: "center" }}>
                      אין נתוני שכר להצגה עבור התקופה והעובדים שנבחרו.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
export default PayrollPage;
