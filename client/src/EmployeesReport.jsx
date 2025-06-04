import { useEffect, useState } from "react";

function EmployeesReport() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEmployees();
  }, []);
  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const res = await fetch("http://localhost:4000/employees");
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      const data = await res.json();
      setEmployees(data);
    } catch (error) {
      console.error("Error loading employees:", error);
      alert("Error loading employees: " + error.message);
    }
    setLoading(false);
  };
  return (
    <div style={{ padding: "1rem", direction: "rtl", fontFamily: "Arial" }}>
      <h2>דוח עובדים</h2>

      {loading ? (
        <p>טוען...</p>
      ) : (
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            textAlign: "right",
          }}
        >
          <thead>
            <tr style={{ backgroundColor: "#f0f0f0" }}>
              <th style={{ border: "1px solid #ccc", padding: "8px" }}>
                מספר עובד
              </th>
              <th style={{ border: "1px solid #ccc", padding: "8px" }}>
                שם מלא
              </th>
              <th style={{ border: "1px solid #ccc", padding: "8px" }}>
                מחלקה
              </th>
              <th style={{ border: "1px solid #ccc", padding: "8px" }}>
                תפקיד
              </th>
              <th style={{ border: "1px solid #ccc", padding: "8px" }}>
                תאריך יצירה
              </th>
            </tr>
          </thead>
          <tbody>
            {employees.map((emp) => (
              <tr key={emp.id}>
                <td style={{ border: "1px solid #ccc", padding: "8px" }}>
                  {emp.employee_number}
                </td>
                <td style={{ border: "1px solid #ccc", padding: "8px" }}>
                  {emp.full_name}
                </td>
                <td style={{ border: "1px solid #ccc", padding: "8px" }}>
                  {emp.department || "-"}
                </td>
                <td style={{ border: "1px solid #ccc", padding: "8px" }}>
                  {emp.position || "-"}
                </td>
                <td style={{ border: "1px solid #ccc", padding: "8px" }}>
                  {new Date(emp.created_at).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default EmployeesReport;
