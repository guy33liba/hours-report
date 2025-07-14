import { useContext, useState } from "react";
import DigitalClock from "./DigitalClock";
import { AppContext } from "./AppContext";
import { apiFetch } from "./utils";
import "../styles.css";

function PayrollPage() {
  const {
    employees,
    addToast,
    loading: contextLoading,
  } = useContext(AppContext);

  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState([]);
  const [dateRange, setDateRange] = useState({ start: "", end: "" });
  const [payrollResult, setPayrollResult] = useState(null);
  const [isCalculating, setIsCalculating] = useState(false);

  const handleEmployeeSelection = (e) => {
    const id = parseInt(e.target.value);
    setSelectedEmployeeIds((prev) =>
      e.target.checked ? [...prev, id] : prev.filter((empId) => empId !== id)
    );
  };

  const handleSelectAll = (e) => {
    setSelectedEmployeeIds(
      e.target.checked
        ? (employees || [])
            .filter((emp) => emp.role === "employee" || emp.role === "manager")
            .map((emp) => emp.id)
        : []
    );
  };

  const handleCalculatePayroll = async () => {
    if (
      selectedEmployeeIds.length === 0 ||
      !dateRange.start ||
      !dateRange.end
    ) {
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
      setPayrollResult(data.details);
    } catch (err) {
      addToast(err.message || "שגיאה בחישוב השכר", "danger");
    } finally {
      setIsCalculating(false);
    }
  };

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
                <input
                  type="checkbox"
                  id="select-all"
                  onChange={handleSelectAll}
                  checked={
                    selectedEmployeeIds.length ===
                      (employees || []).filter((e) => e.role === "employee")
                        .length &&
                    (employees || []).filter((e) => e.role === "employee")
                      .length > 0
                  }
                  disabled={
                    (employees || []).filter((e) => e.role === "employee")
                      .length === 0
                  }
                />
                <label htmlFor="select-all">בחר את כל העובדים</label>
              </div>
              {(employees || [])
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
                  <th>תוספת שעות נוספות</th>
                  <th>סה"כ לתשלום</th>
                </tr>
              </thead>
              <tbody>
                {payrollResult.details.length > 0 ? (
                  payrollResult.details.map((item) => (
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
