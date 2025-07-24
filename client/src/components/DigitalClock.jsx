import { useEffect, useState } from "react";
import "../styles.css";
const DigitalClock = () => {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const timerId = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timerId);
  }, []);
  return (
    <div className="digital-clock">{time.toLocaleTimeString("he-IL")}</div>
  );
};
export default DigitalClock;
//sdfasdf