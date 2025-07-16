import { AppContext } from "./AppContext";
import { apiFetch } from "./utils"; // ודא ש-apiFetch מיובא
import "../styles.css";
import { useContext, useEffect, useState, useCallback, useMemo } from "react";
import { Icon } from "./utils";

const getYYYYMMDD = (date) => date.toISOString().split("T")[0];

function AttendanceReportPage() {
  const { addToast } = useContext(AppContext);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [loading, setLoading] = useState(false); // שונה לברירת מחדל false
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  // הוספנו state לניהול טווח התאריכים
  const [dateRange, setDateRange] = useState({
    start: getYYYYMMDD(new Date(new Date().getFullYear(), new Date().getMonth(), 1)),
    end: getYYYYMMDD(new Date()),
  });

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

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("he-IL");
  };

  const filteredRecords = useMemo(() => {
    if (!searchTerm) {
      return attendanceRecords;
    }

    const lowerCaseSearchTerm = searchTerm.toLowerCase();

    return attendanceRecords.filter((record) => {
      const nameMatch = record.employeeName?.toLowerCase().includes(lowerCaseSearchTerm);

      const clockInMatch = formatDate(record.clockIn).includes(searchTerm);
      const clockOutMatch = formatDate(record.clockOut).includes(searchTerm);
      return nameMatch || clockInMatch || clockOutMatch;
    });
  }, [attendanceRecords, searchTerm]);
  useEffect(() => {
    fetchAttendance();
  }, []); // ירוץ פעם אחת כשהרכיב נטען

  // const formatDateTime = (dateString) => {
  //   if (!dateString) return "בפנים";
  //   return new Date(dateString).toLocaleString("he-IL");
  // };

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
        <div className="card-header" style={{ marginBottom: "20px" }}>
          <span
            style={{
              position: "relative",
              bottom: "10px",
              right: "39rem",
              textDecoration: "underline",
            }}
          >
            חיפוש לפי שם או תאריך{" "}
          </span>
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

        {/* שלב 2: החלפת מבנה הטבלה כולו */}
        <div className="attendance-table-container">
          <table>
            <thead>
              <tr>
                <th>שם עובד</th>
                <th>תאריך כניסה</th>
                <th>שעת כניסה</th>
                <th>תאריך יציאה</th>
                <th>שעת יציאה</th>
                <th>סה"כ שעות</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.length > 0 ? (
                filteredRecords.map((record) => (
                  <tr key={record.id}>
                    <td className="cell-employee-name">
                      {record.employeeName || record.employee_name}
                    </td>
                    <td className="cell-time-data">
                      {formatDate(record.clockIn || record.check_in_time)}
                    </td>
                    <td className="cell-time-data">
                      {formatTime(record.clockIn || record.check_in_time)}
                    </td>
                    <td className="cell-time-data">
                      {formatDate(record.clockOut || record.check_out_time)}
                    </td>
                    <td className="cell-time-data">
                      {formatTime(record.clockOut || record.check_out_time)}
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
                  <td colSpan="6" style={{ textAlign: "center" }}>
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
