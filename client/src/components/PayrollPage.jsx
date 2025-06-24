  import { useContext, useState, useEffect, useCallback } from "react";
import DigitalClock from "./DigitalClock";
import { calculateNetSeconds } from "./utils";
import { AppContext } from "./AppContext";
import "../styles.css";
function PayrollPage() {
  const { employees, attendance, settings, loading, error } =
    useContext(AppContext);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState([]);
  const [dateRange, setDateRange] = useState({ start: "", end: "" });
  const [payrollResult, setPayrollResult] = useState(null);

  if (loading) {
    return <div>טוען נתוני שכר...</div>;
  }

  if (error) {
    return (
      <div style={{ color: "red" }}>
        שגיאה בטעינת נתוני שכר: {error.message}
      </div>
    );
  }

  // Ensure data exists before proceeding
  if (
    !employees ||
    !attendance ||
    !settings ||
    Object.keys(settings).length === 0
  ) {
    return <div>אין מספיק נתונים לחישוב שכר.</div>;
  }
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
            .filter((emp) => emp.role === "employee")
            .map((emp) => emp.id)
        : []
    );
  };

  const calculatePayroll = useCallback(() => {
    // Basic validation for initial data load
    if (
      !employees ||
      employees.length === 0 ||
      !attendance ||
      attendance.length === 0 ||
      !settings
    ) {
      setPayrollResult(null); // Clear previous results if data is missing
      return;
    }

    const standardWorkDayHours = parseFloat(settings.standardWorkDayHours);
    const overtimeRatePercent = parseFloat(settings.overtimeRatePercent);

    // Validate settings values
    if (
      isNaN(standardWorkDayHours) ||
      standardWorkDayHours <= 0 ||
      isNaN(overtimeRatePercent) ||
      overtimeRatePercent < 0
    ) {
      addToast(
        "הגדרות שכר לא תקינות (שעות יום עבודה או אחוז שעות נוספות).",
        "danger"
      );
      setPayrollResult({ details: [] });
      return;
    }

    const startDate = new Date(dateRange.start);
    const endDate = new Date(dateRange.end);
    endDate.setHours(23, 59, 59, 999); // Set to end of the day

    // Validate date range
    if (
      isNaN(startDate.getTime()) ||
      isNaN(endDate.getTime()) ||
      startDate > endDate
    ) {
      addToast("טווח תאריכים לא תקין.", "danger");
      setPayrollResult(null);
      return;
    }

    const employeesToCalculate =
      selectedEmployeeIds.length > 0
        ? employees.filter((emp) => selectedEmployeeIds.includes(emp.id))
        : employees.filter((emp) => emp.role === "employee"); // Default to all employees if none selected

    const details = employeesToCalculate.map((emp) => {
      // Safely parse hourlyRate, default to 0 if invalid
      const hourlyRate = parseFloat(emp.hourly_rate); // Use emp.hourly_rate (snake_case from DB)
      if (isNaN(hourlyRate) || hourlyRate < 0) {
        // Log a warning or add a toast if an employee has invalid hourly rate
        console.warn(
          `Employee ${emp.name} (ID: ${emp.id}) has an invalid hourly rate: '${emp.hourly_rate}'. Setting to 0.`
        );
        return {
          id: emp.id,
          name: emp.name,
          department: emp.department,
          totalRegularHours: 0,
          totalOvertimeHours: 0,
          basePay: 0,
          overtimePay: 0,
          totalPay: 0,
        };
      }

      const empAttendance = attendance.filter(
        (a) =>
          a.employee_id === emp.id && // Use employee_id (snake_case)
          a.check_out && // Only count completed entries
          new Date(a.check_in) >= startDate &&
          new Date(a.check_in) <= endDate
      );

      let totalRegularHours = 0;
      let totalOvertimeHours = 0;

      empAttendance.forEach((entry) => {
        const totalSeconds = calculateNetSeconds(entry);
        const totalHours = totalSeconds / 3600;

        if (isNaN(totalHours) || totalHours < 0) {
          console.warn(
            `Calculated totalHours is NaN or negative for entry (skipping):`,
            entry,
            `Resulting totalSeconds:`,
            totalSeconds
          );
          return;
        }

        const overtime = Math.max(0, totalHours - standardWorkDayHours);
        const regular = totalHours - overtime;

        totalRegularHours += regular;
        totalOvertimeHours += overtime;
      });

      const basePay = totalRegularHours * hourlyRate;
      const overtimePay =
        totalOvertimeHours * hourlyRate * (overtimeRatePercent / 100);

      return {
        id: emp.id,
        name: emp.name,
        department: emp.department,
        totalRegularHours: isNaN(totalRegularHours) ? 0 : totalRegularHours,
        totalOvertimeHours: isNaN(totalOvertimeHours) ? 0 : totalOvertimeHours,
        basePay: isNaN(basePay) ? 0 : basePay,
        overtimePay: isNaN(overtimePay) ? 0 : overtimePay,
        totalPay: isNaN(basePay + overtimePay) ? 0 : basePay + overtimePay,
      };
    });
    setPayrollResult({ details });
  }, [
    employees,
    attendance,
    settings,
    selectedEmployeeIds,
    dateRange,
    addToast,
  ]);

  // Effect to re-run calculation when relevant data changes
  useEffect(() => {
    // Only generate if settings and employees are loaded AND dates are selected
    if (settings && employees.length > 0 && dateRange.start && dateRange.end) {
      calculatePayroll();
    } else {
      setPayrollResult(null); // Clear results if conditions not met
    }
  }, [
    employees,
    attendance,
    settings,
    selectedEmployeeIds,
    dateRange,
    calculatePayroll,
  ]);

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
                      .length > 0 // Ensure "select all" is only checked if there are employees and all are selected
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
          <button
            onClick={calculatePayroll} // Call calculatePayroll directly
            disabled={
              !(
                selectedEmployeeIds.length > 0 &&
                dateRange.start &&
                dateRange.end
              )
            }
          >
            הפק דוח שכר
          </button>
        </div>
      </div>
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
