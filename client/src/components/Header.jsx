import React from "react";
import { Link, NavLink } from "react-router-dom";

function Header({ user, onLogout }) {
  return (
    <header>
      <h1>שעון נוכחות</h1>
      <nav>
        {user.role === "manager" && (
          <>
            <NavLink to="/">סקירה כללית</NavLink>
            <NavLink to="/employees">ניהול עובדים</NavLink>
            <NavLink to="/reports">דוחות</NavLink>
          </>
        )}
        {user.role === "employee" && <NavLink to="/">הפאנל שלי</NavLink>}
      </nav>
      <div>
        <span>שלום, {user.name}</span>
        <button
          onClick={onLogout}
          style={{ marginLeft: "15px" }}
          className="secondary"
        >
          התנתק
        </button>
      </div>
    </header>
  );
}

export default Header;
