import React, { useState } from "react";

function Login({ onLogin, employees }) {
  const [employeeId, setEmployeeId] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (employeeId) {
      onLogin(employeeId);
    }
  };

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "100vh",
      }}
    >
      <form onSubmit={handleSubmit} className="card" style={{ width: "300px" }}>
        <h2>כניסה למערכת</h2>
        <select
          value={employeeId}
          onChange={(e) => setEmployeeId(e.target.value)}
          required
          style={{ width: "100%", padding: "10px", marginBottom: "20px" }}
        >
          <option value="">בחר עובד...</option>
          {employees.map((emp) => (
            <option key={emp.id} value={emp.id}>
              {emp.name}
            </option>
          ))}
        </select>
        <button type="submit" style={{ width: "100%" }}>
          התחבר
        </button>
      </form>
    </div>
  );
}

export default Login;
