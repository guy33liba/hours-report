function AttendanceReportPage() {
  const { addToast } = useContext(AppContext);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAttendance = async () => {
      try {
        setLoading(true);
        setError(null);
        // קריאה ל-API לשליפת כל רשומות הנוכחות (למנהל)
        const data = await apiFetch("/api/attendance");
        setAttendanceRecords(data);
      } catch (err) {
        console.error("Failed to fetch attendance records:", err);
        setError("שגיאה בטעינת נתוני נוכחות.");
        addToast("שגיאה בטעינת נתוני נוכחות", "danger");
      } finally {
        setLoading(false);
      }
    };

    fetchAttendance();
  }, []); 

  if (loading) return <div>טוען נתוני נוכחות...</div>;
  if (error) return <div style={{ color: "red" }}>{error}</div>;

  return (
    <div className="page-header">
      <h2>דוח נוכחות עובדים</h2>
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
                    <td>{record.employee_name}</td>
                    <td>{new Date(record.check_in_time).toLocaleString()}</td>
                    <td>
                      {record.check_out_time
                        ? new Date(record.check_out_time).toLocaleString()
                        : "בפנים"}
                    </td>
                    <td>
                      {/* חישוב סה"כ שעות */}
                      {record.check_in_time && record.check_out_time
                        ? (
                            (new Date(record.check_out_time).getTime() -
                              new Date(record.check_in_time).getTime()) /
                            (1000 * 60 * 60)
                          ).toFixed(2) + " שעות"
                        : "-"}
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
    </div>
  );
}
export default AttendanceReportPage;
