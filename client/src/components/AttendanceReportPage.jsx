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
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 2);
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

  const aggregatedRecords = useMemo(() => {
    if (!attendanceRecords || !currentUser) return [];

    const grouped = attendanceRecords.reduce((acc, record) => {
      const employeeId = record.employeeId || record.employee_id;
      const dateKey = new Date(record.clockIn || record.check_in_time).toLocaleDateString("en-CA"); // YYYY-MM-DD

      // Filter by current user if not manager
      if (currentUser.role !== "manager" && employeeId !== currentUser.id) {
        return acc;
      }

      // Apply date filters
      const recordDate = new Date(record.clockIn || record.check_in_time);
      const startDateMatch = filters.startDate ? recordDate >= new Date(filters.startDate) : true;
      const endDateMatch = filters.endDate
        ? recordDate <= new Date(filters.endDate + "T23:59:59")
        : true;

      if (!startDateMatch || !endDateMatch) {
        return acc;
      }

      const key = `${employeeId}-${dateKey}`;
      if (!acc[key]) {
        acc[key] = {
          employeeId: employeeId,
          employeeName: record.employeeName || record.employee_name,
          date: dateKey,
          shifts: [],
          totalDuration: 0,
          hasOpenShift: false,
        };
      }
      acc[key].shifts.push(record);
      return acc;
    }, {});

    return Object.values(grouped)
      .map((group) => {
        let totalHours = 0;
        let hasOpenShift = false;
        let firstClockIn = null;
        let lastClockOut = null;

        group.shifts.forEach((shift) => {
          const clockIn = new Date(shift.clockIn || shift.check_in_time);
          const clockOut = shift.clockOut || shift.check_out_time ? new Date(shift.clockOut || shift.check_out_time) : null;

          if (clockIn && clockOut) {
            totalHours += (clockOut.getTime() - clockIn.getTime()) / 3600000;
          } else if (clockIn && !clockOut) {
            hasOpenShift = true;
            // For open shifts, calculate hours up to now for display, but don't add to totalHoursSum for export
            // This will be handled in the display logic
          }

          if (!firstClockIn || clockIn < firstClockIn) {
            firstClockIn = clockIn;
          }
          if (clockOut && (!lastClockOut || clockOut > lastClockOut)) {
            lastClockOut = clockOut;
          }
        });

        // If there's an open shift, the "lastClockOut" for display purposes is "בעבודה"
        // The actual calculation for total hours will be done in the table rendering
        const displayClockOut = hasOpenShift ? null : lastClockOut;

        return {
          employeeId: group.employeeId,
          employeeName: group.employeeName,
          date: group.date,
          firstClockIn: firstClockIn,
          lastClockOut: displayClockOut, // This will be null if hasOpenShift is true
          totalHours: totalHours, // Sum of completed shifts
          hasOpenShift: hasOpenShift,
        };
      })
      .filter((record) => {
        // Apply name filter after aggregation
        const nameMatch = filters.name
          ? record.employeeName?.toLowerCase().includes(filters.name.toLowerCase())
          : true;
        return nameMatch;
      })
      .sort((a, b) => new Date(b.date) - new Date(a.date)); // Sort by date descending
  }, [attendanceRecords, filters, currentUser]);

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("he-IL");
  };

  const formatTime = (dateString) => {
    if (!dateString) return "בעבודה";
    return new Date(dateString).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" });
  };

  const calculateHours = (start, end) => {
    if (!start || !end) return "-";
    const durationHours = (new Date(end).getTime() - new Date(start).getTime()) / 3600000;
    return durationHours.toFixed(2) + " שעות";
  };
  const totalHoursSum = useMemo(() => {
    return aggregatedRecords.reduce((sum, record) => sum + record.totalHours, 0);
  }, [aggregatedRecords]); // החישוב ירוץ מחדש רק כשהסינון משתנה

  const handleExport = useCallback(() => {
    if (!aggregatedRecords || aggregatedRecords.length === 0) {
      addToast("אין נתונים לייצוא", "danger");
      return;
    }
    const dataToExport = aggregatedRecords.map((record) => ({
      "שם עובד": record.employeeName,
      "תאריך": formatDate(record.date),
      "שעת כניסה ראשונה": formatTime(record.firstClockIn),
      "שעת יציאה אחרונה": record.hasOpenShift ? "בעבודה" : formatTime(record.lastClockOut),
      'סה"כ שעות': record.totalHours.toFixed(2),
    }));

    dataToExport.push({}); // שורה ריקה
    dataToExport.push({
      "שם עובד": 'סה"כ שעות לתקופה:',
      'סה"כ שעות': totalHoursSum.toFixed(2),
    });

    const fileName = `Attendance_Report_${filters.startDate}_to_${filters.endDate}`;
    exportToExcel(dataToExport, fileName);
    addToast("הדוח יוצא בהצלחה!", "success");
  }, [aggregatedRecords, filters.startDate, filters.endDate, addToast, totalHoursSum]);
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
                <th>תאריך</th>
                <th>שעת כניסה ראשונה</th>
                <th>שעת יציאה אחרונה</th>
                <th>סה"כ שעות</th>
              </tr>
            </thead>
            <tbody>
              {aggregatedRecords.length > 0 ? (
                aggregatedRecords.map((record) => (
                  <tr key={`${record.employeeId}-${record.date}`}>
                    {currentUser?.role === "manager" && (
                      <td className="cell-employee-name">{record.employeeName}</td>
                    )}
                    <td className="cell-time-data">{formatDate(record.date)}</td>
                    <td className="cell-time-data">{formatTime(record.firstClockIn)}</td>
                    <td className="cell-time-data">
                      {record.hasOpenShift ? "בעבודה" : formatTime(record.lastClockOut)}
                    </td>
                    <td>
                      {record.hasOpenShift
                        ? calculateHours(record.firstClockIn, new Date())
                        : record.totalHours.toFixed(2) + " שעות"}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={currentUser?.role === "manager" ? 4 : 3}
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
                  colSpan={currentUser?.role === "manager" ? 4 : 3}
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
