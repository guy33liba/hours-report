import React, { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import "./App.css";

// Import Components
import Header from "./components/Header";
import Dashboard from "./components/Dashboard";
import EmployeePanel from "./components/EmployeePanel";
import EmployeeList from "./components/EmployeeList";
import Reports from "./components/Reports";
import Login from "./components/Login";
// נתונים ראשוניים לדוגמה

const initialEmployees = [
  { id: 1, name: "ישראל ישראלי", department: "פיתוח", role: "manager" },
  { id: 2, name: "משה כהן", department: "פיתוח", role: "employee" },
  { id: 3, name: "דנה לוי", department: "שיווק", role: "employee" },
  { id: 4, name: "אביגיל שרון", department: "מכירות", role: "employee" },
];

function App() {
  // זה ה-State המרכזי של האפליקציה. נשתמש ב-localStorage כדי לשמור נתונים בין רענונים
  const [employees, setEmployees] = useState(
    () => JSON.parse(localStorage.getItem("employees")) || initialEmployees
  );
  const [attendance, setAttendance] = useState(() =>
    JSON.parse(localStorage.getItem("attendance"))
  );
  const [currentUser, setCurrentUser] = useState(
    () => JSON.parse(localStorage.getItem("currentUser")) || null
  );

  // שמירת הנתונים ב-localStorage בכל פעם שהם משתנים
  useEffect(() => {
    localStorage.setItem("employees", JSON.stringify(employees));
  }, [employees]);

  useEffect(() => {
    localStorage.setItem("attendance", JSON.stringify(attendance));
  }, [attendance]);

  useEffect(() => {
    localStorage.setItem("currentUser", JSON.stringify(currentUser));
  }, [currentUser]);

  // פונקציות לניהול המידע
  const handleLogin = (employeeId) => {
    const user = employees.find((emp) => emp.id === parseInt(employeeId));
    if (user) {
      setCurrentUser(user);
    } else {
      alert("עובד לא נמצא");
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
  };

  // פונקציה לעדכון נוכחות (כניסה/יציאה)
  const handleClockInOut = (employeeId) => {
    const now = new Date().toISOString();
    // בדיקה אם העובד כבר נכנס היום ועדיין לא יצא
    const lastEntry = attendance
      .filter((a) => a.employeeId === employeeId)
      .sort((a, b) => new Date(b.clockIn) - new Date(a.clockIn))[0];

    if (lastEntry && !lastEntry.clockOut) {
      // אם יש כניסה פתוחה, מבצעים יציאה
      const updatedAttendance = attendance.map((a) =>
        a.id === lastEntry.id ? { ...a, clockOut: now } : a
      );
      setAttendance(updatedAttendance);
    } else {
      // אם לא, מבצעים כניסה חדשה
      const newEntry = {
        id: Date.now(), // ID ייחודי פשוט
        employeeId: employeeId,
        clockIn: now,
        clockOut: null,
      };
      setAttendance([...attendance, newEntry]);
    }
  };

  const handleAddEmployee = (employeeData) => {
    const newEmployee = { ...employeeData, id: Date.now() };
    setEmployees([...employees, newEmployee]);
  };

  const handleDeleteEmployee = (employeeId) => {
    setEmployees(employees.filter((emp) => emp.id !== employeeId));
    // אפשר גם למחוק את רשומות הנוכחות שלו
    setAttendance(attendance.filter((att) => att.employeeId !== employeeId));
  };

  const handleUpdateEmployee = (updatedEmployee) => {
    setEmployees(
      employees.map((emp) =>
        emp.id === updatedEmployee.id ? updatedEmployee : emp
      )
    );
  };

  if (!currentUser) {
    return <Login onLogin={handleLogin} employees={employees} />;
  }

  return (
    <div className="app-container">
      <BrowserRouter>
        <Header user={currentUser} onLogout={handleLogout} />
        <main>
          <Routes>
            {/* ניתוב למנהל */}
            {currentUser.role === "manager" && (
              <>
                <Route
                  path="/"
                  element={
                    <Dashboard employees={employees} attendance={attendance} />
                  }
                />
                <Route
                  path="/employees"
                  element={
                    <EmployeeList
                      employees={employees}
                      onDelete={handleDeleteEmployee}
                      onAdd={handleAddEmployee}
                      onUpdate={handleUpdateEmployee}
                    />
                  }
                />
                <Route
                  path="/reports"
                  element={
                    <Reports employees={employees} attendance={attendance} />
                  }
                />
                {/* ניתוב למקרה שהמנהל רוצה לראות פאנל עובד ספציפי */}
                <Route
                  path="/employee/:id"
                  element={
                    <EmployeePanel
                      attendance={attendance}
                      onClockInOut={handleClockInOut}
                      employees={employees}
                    />
                  }
                />
              </>
            )}

            {/* ניתוב לעובד */}
            {currentUser.role === "employee" && (
              <>
                <Route
                  path="/"
                  element={
                    <EmployeePanel
                      attendance={attendance}
                      onClockInOut={handleClockInOut}
                      employees={employees}
                      currentUser={currentUser}
                    />
                  }
                />
                {/* הפנייה אוטומטית אם עובד מנסה לגשת לדפים אחרים */}
                <Route path="*" element={<Navigate to="/" />} />
              </>
            )}
          </Routes>
        </main>
      </BrowserRouter>
    </div>
  );
}

export default App;
