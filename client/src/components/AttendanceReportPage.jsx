import { AppContext } from "./AppContext";
<<<<<<< HEAD
import { apiFetch } from "./utils"; // ודא ש-apiFetch מיובא
import "../styles.css";
import { useContext, useEffect, useState, useCallback } from "react"; // הוספנו useCallback

=======
import { apiFetch } from "./utils";
import "../styles.css";
import { useContext, useEffect, useState, useCallback, useMemo } from "react";
import { Icon } from "./utils";
const getTodayYYYYMMDD = () => {
  return new Date().toISOString().split("T")[0];
};
>>>>>>> last
function AttendanceReportPage() {
  const { addToast } = useContext(AppContext);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

<<<<<<< HEAD
=======
  // --- שלב 1: הוספת משתני State חדשים עבור סינון התאריכים ---
  const [filters, setFilters] = useState({
    name: "",
    startDate: getTodayYYYYMMDD(),
    endDate: getTodayYYYYMMDD(),
  });
  // -----------------------------------------------------------
  const handleClearFilters = () => {
    setFilters({
      name: "",
      startDate: "",
      endDate: "",
    });
  };
>>>>>>> last
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

<<<<<<< HEAD
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
=======
  // --- שלב 2: שדרוג לוגיקת הסינון ---
  const filteredRecords = useMemo(() => {
    // מתחילים עם כל הרשומות ומסננים אותן צעד אחר צעד
    return attendanceRecords.filter((record) => {
      const recordDate = new Date(record.clockIn || record.check_in_time);

      // תנאי 1: בדיקת שם העובד
      const nameMatch = filters.name
        ? record.employeeName?.toLowerCase().includes(filters.name.toLowerCase())
        : true; // אם אין חיפוש שם, תמיד תחזיר אמת

      // תנאי 2: בדיקת תאריך התחלה
      const startDateMatch = filters.startDate ? recordDate >= new Date(filters.startDate) : true; // אם אין תאריך התחלה, תמיד תחזיר אמת

      // תנאי 3: בדיקת תאריך סיום
      const endDateMatch = filters.endDate
        ? recordDate <= new Date(filters.endDate + "T23:59:59")
        : true;

      // רק רשומה שעונה על כל התנאים תישאר ברשימה
      return nameMatch && startDateMatch && endDateMatch;
    });
  }, [attendanceRecords, filters]); // הלוגיקה תרוץ מחדש כל פעם שהרשומות או הפילטרים משתנים
  // ----------------------------------------------------

  useEffect(() => {
    fetchAttendance();
  }, [fetchAttendance]); // שינוי קטן: הוספת fetchAttendance למערך התלויות

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("he-IL");
  };

  const formatTime = (dateString) => {
    if (!dateString) return "בפנים";
    return new Date(dateString).toLocaleTimeString("he-IL", {
      hour: "2-digit",
      minute: "2-digit",
    });
>>>>>>> last
  };

  const calculateHours = (start, end) => {
    if (!start || !end) return "-";
<<<<<<< HEAD
    const durationHours =
      (new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60 * 60);
=======
    const durationHours = (new Date(end).getTime() - new Date(start).getTime()) / 3600000;
>>>>>>> last
    return durationHours.toFixed(2) + " שעות";
  };

  if (loading) return <div>טוען נתוני נוכחות...</div>;
  if (error) return <div style={{ color: "red" }}>{error}</div>;

  return (
    <>
      <div className="page-header">
        <h2>דוח נוכחות עובדים</h2>
<<<<<<< HEAD
      </div>
      <div className="card">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>שם עובד</th>
                <th>כניסה</th>
                <th>יציאה</th>
=======
        <button
          onClick={handleClearFilters}
          className="secondary"
          style={{ position: "relative", left: "20px", width: "200px" }}
        >
          נקה סינון
        </button>
      </div>
      <div className="card">
        {/* --- שלב 3: הוספת שדות התאריך ל-UI --- */}
        <div className="card-header report-controls" style={{ marginBottom: "20px" }}>
          {/* חיפוש לפי שם */}
          <div className="form-group">
            <label>חפש שם</label>
            <input
              type="text"
              placeholder="הקלד שם לחיפוש..."
              value={filters.name}
              onChange={(e) => setFilters((prev) => ({ ...prev, name: e.target.value }))}
            />
          </div>
          {/* סינון לפי תאריך התחלה */}
          <div className="form-group">
            <label>מתאריך</label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters((prev) => ({ ...prev, startDate: e.target.value }))}
            />
          </div>
          {/* סינון לפי תאריך סיום */}
          <div className="form-group">
            <label>עד תאריך</label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters((prev) => ({ ...prev, endDate: e.target.value }))}
            />
          </div>
        </div>
        {/* ------------------------------------------- */}

        <div className="attendance-table-container">
          <table>
            {/* ... שאר הטבלה נשאר זהה ... */}
            <thead>
              <tr>
                <th>שם עובד</th>
                <th>תאריך כניסה</th>
                <th>שעת כניסה</th>
                <th>תאריך יציאה</th>
                <th>שעת יציאה</th>
>>>>>>> last
                <th>סה"כ שעות</th>
              </tr>
            </thead>
            <tbody>
<<<<<<< HEAD
              {attendanceRecords.length > 0 ? (
                attendanceRecords.map((record) => (
                  <tr key={record.id}>
                    <td>{record.employeeName || record.employee_name}</td>
                    <td>
                      {formatDateTime(record.clockIn || record.check_in_time)}
                    </td>
                    <td>
                      {formatDateTime(record.clockOut || record.check_out_time)}
=======
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
>>>>>>> last
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
<<<<<<< HEAD
                  <td colSpan="4" style={{ textAlign: "center" }}>
                    אין נתוני נוכחות להצגה.
=======
                  <td colSpan="6" style={{ textAlign: "center" }}>
                    אין נתוני נוכחות התואמים לסינון.
>>>>>>> last
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
