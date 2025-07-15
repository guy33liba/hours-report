import { AppContext } from "./AppContext";
import { apiFetch } from "./utils"; // ודא ש-apiFetch מיובא
import "../styles.css";
import { useContext, useEffect, useState, useCallback, useMemo } from "react";
import { Icon } from "./utils";

function AttendanceReportPage() {
  const { addToast } = useContext(AppContext);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

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

  const filteredRecords = useMemo(() => {
    if (!searchTerm) {
      return attendanceRecords; // אם אין חיפוש, החזר את כל הרשומות
    }
    return attendanceRecords.filter((record) =>
      record.employeeName?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [attendanceRecords, searchTerm]);

  useEffect(() => {
    fetchAttendance();
  }, []); // ירוץ פעם אחת כשהרכיב נטען

  // const formatDateTime = (dateString) => {
  //   if (!dateString) return "בפנים";
  //   return new Date(dateString).toLocaleString("he-IL");
  // };
  const formatDate = (dateString) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("he-IL");
  };

  // Formats only the time (e.g., "09:30")
  const formatTime = (dateString) => {
    if (!dateString) return "בפנים"; // "Still In"
    return new Date(dateString).toLocaleTimeString("he-IL", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const calculateHours = (start, end) => {
    if (!start || !end) return "-";
    const durationHours = (new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60 * 60);
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
        <div className="card" style={{ marginBottom: "20px", border: "1px solid black" }}>
          <div className="search-bar" style={{ maxWidth: "400px", margin: "0 auto" }}>
            <span className="search-icon">
              <Icon path="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
            </span>
            <input
              type="text"
              placeholder="חפש לפי שם עובד..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <div className="attendance-table-container">
          <div className="attendance-table-container-div"></div>
          <table>
            <thead className="attendance-table-container-header">
              <th>שם עובד</th>
              <th>כניסה</th>
              <th>יציאה</th>
              <th>סה"כ שעות</th>
            </thead>
            <tbody>
              {filteredRecords.length > 0 ? (
                filteredRecords.map((record) => (
                  <tr key={record.id}>
                    <td
                      style={{
                        color: "blue",
                        fontSize: "25px",
                        fontWeight: "bolder",
                      }}
                    >
                      {record.employeeName || record.employee_name}
                    </td>
                    <td
                      style={{
                        width: "200px",
                        fontSize: "1.6rem",
                        color: "blue",
                        textDecoration: "underline",
                      }}
                    >
                      {formatDate(record.clockIn || record.check_in_time)}
                    </td>
                    <td
                      style={{
                        width: "200px",
                        fontSize: "1.6rem",
                        color: "blue",
                        textDecoration: "underline",
                      }}
                    >
                      {formatTime(record.clockIn || record.check_in_time)}
                    </td>
                    <td
                      style={{
                        width: "200px",
                        fontSize: "1.6rem",
                        color: "blue",
                        textDecoration: "underline",
                      }}
                    >
                      {formatDate(record.clockOut || record.check_out_time)}
                    </td>
                    <td
                      style={{
                        width: "200px",
                        fontSize: "1.6rem",
                        color: "blue",
                        textDecoration: "underline",
                      }}
                    >
                      {formatTime(record.clockOut || record.check_out_time)}
                    </td>
                    {/* <td
                      style={{
                        width: "200px",
                        fontSize: "1.6rem",
                        color: "blue",
                        textDecoration: "underline",
                      }}
                    >
                      {formatDateTime(record.clockIn || record.check_in_time)}
                    </td>
                    <td
                      style={{
                        width: "200px",
                        fontSize: "1.6rem",
                        color: "blue",
                        textDecoration: "underline",
                      }}
                    >
                      {formatDateTime(record.clockOut || record.check_out_time)}
                    </td> */}
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
