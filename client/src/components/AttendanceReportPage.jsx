import { AppContext } from "./AppContext";
import "../styles.css";
import { useContext, useEffect, useState, useCallback, useMemo } from "react";
import { exportToExcel, ICONS, apiFetch, Icon } from "./utils";

const getTodayYYYYMMDD = () => {
  return new Date().toISOString().split("T")[0];
};
const getFirstDayOfMonthYYYYMMDD = () => {
  const today = new Date();
  // יוצר תאריך חדש עם השנה הנוכחית, החודש הנוכחי, וביום הראשון (1)
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
  return firstDay.toISOString().split("T")[0];
};
function AttendanceReportPage() {
  // 1. קבל מהקונטקסט גם את המשתמש המחובר (currentUser)
  const { addToast, currentUser } = useContext(AppContext);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [filters, setFilters] = useState({
    name: "",
    startDate: getFirstDayOfMonthYYYYMMDD(),
    endDate: getTodayYYYYMMDD(),
  });

  const handleClearFilters = () => {
    setFilters({ name: "", startDate: "", endDate: "" });
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

  useEffect(() => {
    fetchAttendance();
  }, [fetchAttendance]);

  const filteredRecords = useMemo(() => {
    // הוספנו בדיקה ש-currentUser קיים
    if (!attendanceRecords || !currentUser) return [];

    return attendanceRecords.filter((record) => {
      // 2. הסינון הדינמי - התוספת החשובה ביותר
      // אם המשתמש הוא לא מנהל, והרשומה לא שייכת לו - סנן אותה החוצה
      if (currentUser.role !== "manager" && record.employeeId !== currentUser.id) {
        return false;
      }

      // שאר הסינון נשאר זהה
      const recordDate = new Date(record.date); // Use record.date from aggregated data
      const nameMatch = filters.name
        ? record.employeeName?.toLowerCase().includes(filters.name.toLowerCase())
        : true;
      const startDateMatch = filters.startDate ? recordDate >= new Date(filters.startDate) : true;
      const endDateMatch = filters.endDate
        ? recordDate <= new Date(filters.endDate + "T23:59:59")
        : true;

      return nameMatch && startDateMatch && endDateMatch;
    });
  }, [attendanceRecords, filters, currentUser]); // הוספנו את currentUser למערך התלויות

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("he-IL");
  };

  const formatTime = (dateString) => {
    if (!dateString) return "בעבודה";
    return new Date(dateString).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" });
  };

  // Modified to use pre-calculated totalHours from backend
  const calculateHours = (totalHours) => {
    if (typeof totalHours !== 'number') return "-";
    return totalHours.toFixed(2) + " שעות";
  };

  const totalHoursSum = useMemo(() => {
    return filteredRecords.reduce((sum, record) => {
      // Sum the pre-calculated totalHours from each aggregated record
      return sum + (record.totalHours || 0);
    }, 0);
  }, [filteredRecords]); // החישוב ירוץ מחדש רק כשהסינון משתנה

  const handleExport = useCallback(() => {
    if (!filteredRecords || filteredRecords.length === 0) {
      addToast("אין נתונים לייצוא", "danger");
      return;
    }
    const dataToExport = filteredRecords.map((record) => ({
      "שם עובד": record.employeeName,
      "שעת יציאה": formatTime(record.clockOut),
      "שעת כניסה": formatTime(record.clockIn),
      "תאריך כניסה": formatDate(record.date), // Use record.date
      'סה"כ שעות': record.totalHours.toFixed(2), // Use pre-calculated totalHours
    }));

    // --- התוספות החדשות ---
    const totalHoursSum = filteredRecords.reduce((sum, record) => {
      return sum + (record.totalHours || 0);
    }, 0);

    dataToExport.push({}); // שורה ריקה
    dataToExport.push({
      "שם עובד": 'סה"כ שעות לתקופה:',
      'סה"כ שעות': totalHoursSum.toFixed(2),
    });
    // --- סוף התוספות ---

    const fileName = `Attendance_Report_${filters.startDate}_to_${filters.endDate}`;
    exportToExcel(dataToExport, fileName);
    addToast("הדוח יוצא בהצלחה!", "success");
  }, [filteredRecords, filters.startDate, filters.endDate, addToast]);
  if (loading) return <div>טוען נתוני נוכחות...</div>;
  if (error) return <div style={{ color: "red" }}>{error}</div>;

  return (
    <>
      <div className="page-header">
        {/* 4. כותרת דינמית */}
        <h2>{currentUser?.role === "manager" ? "דוח נוכחות עובדים" : "דוח הנוכחות שלי"}</h2>
        <div className="page-actions">
          <button
            onClick={handleExport}
            className="secondary"
            style={{ marginLeft: "20px", fontSize: "18px", width: "200px", padding: "11px" }}
          >
            <Icon path={ICONS.REPORTS} size={22} />
            ייצא לאקסל
          </button>
          <button
            onClick={handleClearFilters}
            className="secondary"
            style={{
              marginLeft: "20px",
              height: "30px",
              padding: "23px",
              position: "relative",
              fontSize: "18px",
              width: "200px",
            }}
          >
            <Icon path={ICONS.REFRESH} size={22} />
            נקה סינון
          </button>
        </div>
      </div>
      <div className="card">
        <div className="card-header report-controls" style={{ marginBottom: "20px" }}>
          {/* 5. הצגה מותנית של פקדי המנהל */}
          {currentUser?.role === "manager" && (
            <>
              <div className="form-group">
                <label>חפש שם</label>
                <input
                  type="text"
                  placeholder="הקלד שם לחיפוש..."
                  value={filters.name}
                  onChange={(e) => setFilters((prev) => ({ ...prev, name: e.target.value }))}
                />
              </div>
            </>
          )}

          <div className="form-group">
            <label>מתאריך</label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters((prev) => ({ ...prev, startDate: e.target.value }))}
            />
          </div>
          <div className="form-group">
            <label>עד תאריך</label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters((prev) => ({ ...prev, endDate: e.target.value }))}
            />
          </div>
        </div>

        <div className="attendance-table-container">
          <table>
            <thead>
              <tr>
                {/* 6. כותרת עמודה דינמית */}
                {currentUser?.role === "manager" && <th>שם עובד</th>}
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
                  <tr key={`${record.employeeId}-${record.date}`}>
                    {/* 7. תא דינמי */}
                    {currentUser?.role === "manager" && (
                      <td className="cell-employee-name">
                        {record.employeeName}
                      </td>
                    )}
                    <td className="cell-time-data">
                      {formatDate(record.clockIn)}
                    </td>
                    <td className="cell-time-data">
                      {formatTime(record.clockIn)}
                    </td>
                    <td className="cell-time-data">
                      {formatDate(record.clockOut)}
                    </td>
                    <td className="cell-time-data">
                      {formatTime(record.clockOut)}
                    </td>
                    <td>
                      {calculateHours(record.totalHours)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={currentUser?.role === "manager" ? 6 : 5}
                    style={{ textAlign: "center" }}
                  >
                    אין נתוני נוכחות התואמים לסינון.
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr className="summary-row">
                <td
                  colSpan={currentUser?.role === "manager" ? 5 : 4}
                  style={{ textAlign: "left", fontWeight: "bold" }}
                >
                  סה"כ שעות לתקופה:
                </td>
                <td style={{ fontWeight: "bold" }}>{totalHoursSum.toFixed(2)} שעות</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </>
  );
}
export default AttendanceReportPage;
