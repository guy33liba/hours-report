import React from "react";
import ClockReport from "./ClockReport";
import EmployeesReport from "./EmployeesReport";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";

const App = () => {
  return (
    <Router>
      <nav>
        <Link to="/clock">דוח כניסות</Link> |{" "}
        <Link to="/employees">דוח עובדים</Link>
      </nav>
      <Routes>
        <Route path="/clock" element={<ClockReport />} />
        <Route path="/employees" element={<EmployeesReport />} />
        <Route
          path="*"
          element={<div>ברוך הבא! בחר דוח מהתפריט למעלה.</div>}
        />
      </Routes>
    </Router>
  );
};

export default App;
