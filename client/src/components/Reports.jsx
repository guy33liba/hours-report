import React from "react";

function Reports({ employees, attendance }) {
  const calculateHours = (clockIn, clockOut) => {
    if (!clockIn || !clockOut) return 0;
    const diff = new Date(clockOut) - new Date(clockIn);
    return (diff / (1000 * 60 * 60)).toFixed(2); // שעות
  };

  const employeeHours = employees.map((emp) => {
    const totalHours = attendance
      .filter((a) => a.employeeId === emp.id)
      .reduce(
        (sum, a) => sum + parseFloat(calculateHours(a.clockIn, a.clockOut)),
        0
      );
    return { ...emp, totalHours: totalHours.toFixed(2) };
  });

  return (
    <div className="card">
      <h2>דוח שעות עבודה</h2>
      <table style={{ width: "100%", textAlign: "right" }}>
        <thead>
          <tr>
            <th>שם עובד</th>
            <th>מחלקה</th>
            <th>סה"כ שעות עבודה (כל הזמנים)</th>
          </tr>
        </thead>
        <tbody>
          {employeeHours.map((emp) => (
            <tr key={emp.id}>
              <td>{emp.name}</td>
              <td>{emp.department}</td>
              <td>{emp.totalHours}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default Reports;
