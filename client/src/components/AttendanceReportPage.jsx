//right change

import { AppContext } from "./AppContext";
import "../styles.css";
import { useContext, useEffect, useState, useCallback, useMemo } from "react";
import { exportToExcel, ICONS, apiFetch, Icon } from "./utils";
const getTodayYYYYMMDD = () => {
  return new Date().toISOString().split("T")[0];
};
function AttendanceReportPage() {
  const { addToast } = useContext(AppContext);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [filters, setFilters] = useState({
    name: "",
    startDate: getTodayYYYYMMDD(),
    endDate: getTodayYYYYMMDD(),
  });

  const handleClearFilters = () => {
    setFilters({
      name: "",
      startDate: "",
      endDate: "",
    });
  };
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

  // --- שלב 2: שדרוג לוגיקת הסינון ---
  const filteredRecords = useMemo(() => {
    // מתחילים עם כל הרשומות ומסננים אותן צעד אחר צעד
    return attendanceRecords.filter((record) => {
      const recordDate = new Date(record.clockIn || record.check_in_time);

      const nameMatch = filters.name
        ? record.employeeName?.toLowerCase().includes(filters.name.toLowerCase())
        : true;

      const startDateMatch = filters.startDate ? recordDate >= new Date(filters.startDate) : true;
      const endDateMatch = filters.endDate
        ? recordDate <= new Date(filters.endDate + "T23:59:59")
        : true;

      return nameMatch && startDateMatch && endDateMatch;
    });
  }, [attendanceRecords, filters]);

  useEffect(() => {
    fetchAttendance();
  }, [fetchAttendance]);

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
  };

  const calculateHours = (start, end) => {
    if (!start || !end) return "-";
    const durationHours = (new Date(end).getTime() - new Date(start).getTime()) / 3600000;
    return durationHours.toFixed(2) + " שעות";
  };
  const handleExport = useCallback(() => {
    if (!filteredRecords || filteredRecords.length === 0) {
      addToast("אין נתונים לייצוא", "danger");
      return;
    }
    const dataToExport = filteredRecords.map((record) => ({
      "שם עובד": record.employeeName,
      "תאריך כניסה": formatDate(record.clockIn),
      "שעת כניסה": formatTime(record.clockIn),
      "תאריך יציאה": formatDate(record.clockOut),
      "שעת יציאה": formatTime(record.clockOut),
      'סה"כ שעות': calculateHours(record.clockIn, record.clockOut).replace(" שעות", ""),
    }));
    const fileName = `Attendance_Report_${filters.startDate}_to_${filters.endDate}`;
    exportToExcel(dataToExport, fileName);
    addToast("הדוח יוצא בהצלחה!", "success");
  }, [filteredRecords, filters.startDate, filters.endDate, addToast]);

  if (loading) return <div>טוען נתוני נוכחות...</div>;
  if (error) return <div style={{ color: "red" }}>{error}</div>;

  return (
    <>
      <div className="page-header">
        <h2>דוח נוכחות עובדים</h2>

        <button
          onClick={handleClearFilters}
          className="secondary"
          style={{ position: "relative", right: "420px", width: "180px" }}
        >
          נקה סינון
        </button>
        <div className="page-actions">
          <button onClick={handleExport} className="secondary"  style={{ marginLeft:'20px' }}>
            <Icon path={ICONS.REPORTS} /> {/* Using your Icon component */}
            ייצא לאקסל
          </button>
        </div>
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
                    אין נתוני נוכחות התואמים לסינון.
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
