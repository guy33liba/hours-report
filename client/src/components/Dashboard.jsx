import React from "react";

function Dashboard({ employees, attendance }) {
  const clockedInEmployees = employees.filter((emp) => {
    const lastEntry = attendance
      .filter((a) => a.employeeId === emp.id)
      .sort((a, b) => new Date(b.clockIn) - new Date(a.clockIn))[0];
    return lastEntry && !lastEntry.clockOut;
  });

  const departmentStats = employees.reduce((acc, emp) => {
    acc[emp.department] = (acc[emp.department] || 0) + 1;
    return acc;
  }, {});

  return (
    <div>
      <div className="card">
        <h2>נוכחות בזמן אמת</h2>
        <p>
          <strong>סה"כ עובדים נוכחים: {clockedInEmployees.length}</strong>
        </p>
        <ul>
          {clockedInEmployees.map((emp) => (
            <li key={emp.id}>
              {emp.name} ({emp.department})
            </li>
          ))}
        </ul>
        {clockedInEmployees.length === 0 && <p>אין עובדים נוכחים כרגע.</p>}
      </div>

      <div className="card">
        <h2>סטטיסטיקת מחלקות</h2>
        <ul>
          {Object.entries(departmentStats).map(([dept, count]) => (
            <li key={dept}>
              <strong>{dept}:</strong> {count} עובדים
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default Dashboard;
