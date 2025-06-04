import { useState, useEffect } from "react";
import "./App.css";

function ClockReport() {
  const [userId, setUserId] = useState("");
  const [status, setStatus] = useState("");
  const [logs, setLogs] = useState([]);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const sendClock = async (action) => {
    const res = await fetch("http://localhost:4000/clock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, action }),
    });
    const data = await res.json();
    setStatus(data.message);
    loadLogs();
  };

  const loadLogs = async (from = "", to = "") => {
    let url = "http://localhost:4000/attendance/logs";
    if (from && to) {
      url += `?from=${from}&to=${to}`;
    }
    const res = await fetch(url);
    const data = await res.json();
    setLogs(data);
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const handleFilter = () => {
    if (!fromDate || !toDate) {
      alert("אנא בחר טווח תאריכים מלא");
      return;
    }
    loadLogs(fromDate, toDate);
  };

  return (
    <div className="container">
      <h1>🕒 שעון נוכחות</h1>

      <input
        placeholder="מספר עובד"
        value={userId}
        onChange={(e) => setUserId(e.target.value)}
      />
      <div className="buttons">
        <button onClick={() => sendClock("in")}>כניסה</button>
        <button onClick={() => sendClock("out")}>יציאה</button>
      </div>

      <p className="status">{status}</p>

      <div className="filter">
        <label>מתאריך: </label>
        <input
          type="date"
          value={fromDate}
          onChange={(e) => setFromDate(e.target.value)}
        />
        <label>עד תאריך: </label>
        <input
          type="date"
          value={toDate}
          onChange={(e) => setToDate(e.target.value)}
        />
        <button onClick={handleFilter}>סנן</button>
      </div>

      <h2>רשימת דיווחים</h2>
      <ul>
        {logs.map((log) => (
          <li key={log.id} className={log.action === "in" ? "in" : "out"}>
            <strong>עובד:</strong> {log.user_id} &nbsp; | &nbsp;
            <strong>פעולה:</strong>{" "}
            {log.action === "in" ? "🟢 כניסה" : "🔴 יציאה"} &nbsp; | &nbsp;
            <strong>תאריך:</strong> {new Date(log.timestamp).toLocaleString()}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default ClockReport;
