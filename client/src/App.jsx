import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Link, useNavigate } from "react-router-dom";
import ClockReport from "./ClockReport";
import EmployeesReport from "./EmployeesReport";
import Login from "./Login";

const Welcome = () => <div style={{ padding: "1rem" }}>ברוך הבא! בחר דוח מהתפריט למעלה.</div>;

const App = () => {
  const [userId, setUserId] = useState(() => localStorage.getItem("userId"));

  const handleLogin = (id) => {
    setUserId(id);
    localStorage.setItem("userId", id);
  };

  const handleLogout = () => {
    setUserId(null);
    localStorage.removeItem("userId");
  };

  return (
    <Router>
      {!userId ? (
        <Login onLogin={handleLogin} />
      ) : (
        <div>
          <nav style={{ padding: "1rem", backgroundColor: "#f0f0f0", direction: "rtl" }}>
            <span style={{ marginLeft: "1rem" }}>שלום משתמש #{userId}</span>
            <Link to="/clock">דוח כניסות</Link> |{" "}
            <Link to="/employees">דוח עובדים</Link> |{" "}
            <button onClick={handleLogout}>התנתק</button>
          </nav>

          <Routes>
            <Route path="/clock" element={<ClockReport />} />
            <Route path="/employees" element={<EmployeesReport />} />
            <Route path="*" element={<Welcome />} />
          </Routes>
        </div>
      )}
    </Router>
  );
};

export default App;
