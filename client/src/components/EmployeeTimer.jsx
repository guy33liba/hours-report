import { useEffect, useState, useContext, useMemo } from "react";
import { calculateNetSeconds } from "./utils";
import { AppContext } from "./AppContext";
import "../styles.css";

// This is the only 'formatTime' function. It's correct.
const formatTime = (totalSeconds) => {
  const date = new Date(totalSeconds * 1000);
  const h = date.getUTCHours().toString().padStart(2, "0");
  const m = date.getUTCMinutes().toString().padStart(2, "0");
  const s = date.getUTCSeconds().toString().padStart(2, "0");
  return `${h}:${m}:${s}`;
};

function EmployeeTimer({ employeeId }) {
  const { attendance } = useContext(AppContext);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const activeEntry = useMemo(
    () => attendance?.find((a) => a.employeeId === employeeId && !a.clockOut),
    [attendance, employeeId]
  );

  useEffect(() => {
    if (!activeEntry || activeEntry.onBreak) {
      setElapsedSeconds(calculateNetSeconds(activeEntry || {}));
      return;
    }

    const timerId = setInterval(
      () => setElapsedSeconds(calculateNetSeconds(activeEntry)),
      1000
    );

    setElapsedSeconds(calculateNetSeconds(activeEntry));
    return () => clearInterval(timerId);
  }, [activeEntry, activeEntry?.onBreak]);

  // The second, incorrect formatTime function has been DELETED from here.

  if (!activeEntry) {
    // FIX: Show a consistent placeholder format
    return <div className="employee-timer">--:--:--</div>;
  }

  return <div className="employee-timer">{formatTime(elapsedSeconds)}</div>;
}

export default EmployeeTimer;
