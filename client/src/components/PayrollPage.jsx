import { useContext, useState } from "react";
import DigitalClock from "./DigitalClock";
import AppContent from "./AppContent";
import { AppContext } from "../App";

function PayrollPage() {
  const { employees, attendance, settings } = useContext(AppContext);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState([]);
  const [dateRange, setDateRange] = useState({ start: "", end: "" });
  const [payrollResult, setPayrollResult] = useState(null);
  const handleEmployeeSelection = (e) => {
    const id = parseInt(e.target.value);
    setSelectedEmployeeIds((prev) =>
      e.target.checked ? [...prev, id] : prev.filter((empId) => empId !== id)
    );
  };
  const handleSelectAll = (e) => {
    setSelectedEmployeeIds(
      e.target.checked
        ? employees
            .filter((emp) => emp.role === "employee")
            .map((emp) => emp.id)
        : []
    );
  };
  const handleGenerate = () => {
    if (selectedEmployeeIds.length === 0 || !dateRange.start || !dateRange.end)
      return;
    const startDate = new Date(dateRange.start);
    const endDate = new Date(dateRange.end);
    endDate.setHours(23, 59, 59, 999);
    const details = employees
      .filter((emp) => selectedEmployeeIds.includes(emp.id))
      .map((emp) => {
        const empAttendance = attendance.filter(
          (a) =>
            a.employeeId === emp.id &&
            new Date(a.clockIn) >= startDate &&
            new Date(a.clockIn) <= endDate &&
            a.clockOut
        );
        let totalRegularHours = 0;
        let totalOvertimeHours = 0;
        empAttendance.forEach((entry) => {
          const totalHours = calculateNetSeconds(entry) / 3600;
          const overtime = Math.max(
            0,
            totalHours - settings.standardWorkDayHours
          );
          const regular = totalHours - overtime;
          totalRegularHours += regular;
          totalOvertimeHours += overtime;
        });
        const basePay = totalRegularHours * emp.hourlyRate;
        const overtimePay =
          totalOvertimeHours *
          emp.hourlyRate *
          (settings.overtimeRatePercent / 100);
        return {
          id: emp.id,
          name: emp.name,
          department: emp.department,
          totalRegularHours,
          totalOvertimeHours,
          basePay,
          overtimePay,
          totalPay: basePay + overtimePay,
        };
      });
    setPayrollResult({ details });
  };
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
                      employees.filter((e) => e.role === "employee").length &&
                    employees.length > 1
                  }
                />
                <label htmlFor="select-all">בחר את כל העובדים</label>
              </div>
              {employees
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
            onClick={handleGenerate}
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
                {payrollResult.details.map((item) => (
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
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
export default PayrollPage;
