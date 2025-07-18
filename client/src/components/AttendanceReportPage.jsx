import { AppContext } from "./AppContext";
import { apiFetch } from "./utils"; // ודא ש-apiFetch מיובא
import "../styles.css";
import { useContext, useEffect, useState, useCallback } from "react"; // הוספנו useCallback

function AttendanceReportPage() {
  const { addToast } = useContext(AppContext);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAttendance = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiFetch("/attendance");
      setAttendanceRecords(data);
    } catch (err) {
      console.error("Failed to fetch attendance records:", err);
      const errorMessage = err.message || "שגיאה בטעינת נתוני נוכחות.";
      setError(errorMessage);
      addToast(errorMessage, "danger");
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchAttendance();
    
    const intervalId = setInterval(() => {
      console.log("מבצע קריאה חוזרת לשרת..."); // תוכל לראות את זה בקונסול של הדפדפן
      fetchAttendance(); // קורא שוב ושוב לפונקציה שמביאה את הנתונים
    }, 5000);

    return () => clearInterval(intervalId);
  }, [fetchAttendance]); // ירוץ פעם אחת כשהרכיב נטען

  const formatDateTime = (dateString) => {
    if (!dateString) return "בפנים";
    return new Date(dateString).toLocaleString("he-IL");
  };

  const calculateHours = (start, end) => {
    if (!start || !end) return "-";
    const durationHours =
      (new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60 * 60);
    return durationHours.toFixed(2) + " שעות";
  };

  if (loading) return <div>טוען נתוני נוכחות...</div>;
  if (error) return <div style={{ color: "red" }}>{error}</div>;

  return (
    <>
      <div className="page-header">
        <h2>דוח נוכחות עובדים</h2>
      </div>
      <div className="card">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>שם עובד</th>
                <th>כניסה</th>
                <th>יציאה</th>
                <th>סה"כ שעות</th>
              </tr>
            </thead>
            <tbody>
              {attendanceRecords.length > 0 ? (
                attendanceRecords.map((record) => (
                  <tr key={record.id}>
                    <td>{record.employeeName || record.employee_name}</td>
                    <td>
                      {formatDateTime(record.clockIn || record.check_in_time)}
                    </td>
                    <td>
                      {formatDateTime(record.clockOut || record.check_out_time)}
                    </td>
                    <td>
                      {calculateHours(
                        record.clockIn || record.check_in_time,
                        record.clockOut || record.check_out_time
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" style={{ textAlign: "center" }}>
                    אין נתוני נוכחות להצגה.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
export default AttendanceReportPage;
