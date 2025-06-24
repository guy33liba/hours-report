import { useEffect, useState } from "react";
import { useContext, useMemo } from "react";
import { calculateNetSeconds } from "./utils";
import { AppContext } from "./AppContext";
import "../styles.css";
function EmployeeTimer({ employeeId }) {
  const { attendance } = useContext(AppContext);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const activeEntry = useMemo(
    () => attendance.find((a) => a.employeeId === employeeId && !a.clockOut),
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
  const formatTime = (totalSeconds) => {
    const h = Math.floor(totalSeconds / 3600)
      .toString()
      .padStart(2, "0");
    const m = Math.floor((totalSeconds % 3600) / 60)
      .toString()
      .padStart(2, "0");
    const s = Math.floor(totalSeconds % 60)
      .toString()
      .padStart(2, "0");
    return `${h}:${m}:${s}`;
  };
  if (!activeEntry) return <div className="employee-timer-placeholder"></div>;
  return <div className="employee-timer">{formatTime(elapsedSeconds)}</div>;
}
export default EmployeeTimer;
