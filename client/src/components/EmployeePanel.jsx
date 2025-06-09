import React from 'react';
import { useParams } from 'react-router-dom';

function EmployeePanel({ attendance, onClockInOut, employees, currentUser }) {
  // אם מגיעים מניתוב עם ID (מנהל צופה) או מהמשתמש המחובר (עובד)
  const { id } = useParams();
  const employeeId = id ? parseInt(id) : currentUser.id;
  const employee = employees.find(e => e.id === employeeId);
  
  if (!employee) return <div>עובד לא נמצא</div>;

  const employeeAttendance = attendance
    .filter(a => a.employeeId === employeeId)
    .sort((a, b) => new Date(b.clockIn) - new Date(a.clockIn));

  const lastEntry = employeeAttendance[0];
  const isClockedIn = lastEntry && !lastEntry.clockOut;
  
  const formatTime = (isoString) => isoString ? new Date(isoString).toLocaleTimeString('he-IL') : '---';
  const formatDate = (isoString) => isoString ? new Date(isoString).toLocaleDateString('he-IL') : '---';

  return (
    <div className="card">
      <h2>פאנל אישי - {employee.name}</h2>
      
      {/* כפתור כניסה/יציאה יוצג רק לעובד המחובר, לא למנהל שצופה */}
      {currentUser && currentUser.id === employeeId && (
          <button onClick={() => onClockInOut(employeeId)} style={{marginBottom: '20px', width: '200px', height: '50px', fontSize: '20px'}}>
            {isClockedIn ? 'החתם יציאה' : 'החתם כניסה'}
          </button>
      )}
      
      <h3>היסטוריית נוכחות</h3>
      <table style={{width: '100%', textAlign: 'right'}}>
        <thead>
          <tr>
            <th>תאריך</th>
            <th>שעת כניסה</th>
            <th>שעת יציאה</th>
          </tr>
        </thead>
        <tbody>
          {employeeAttendance.map(a => (
            <tr key={a.id}>
              <td>{formatDate(a.clockIn)}</td>
              <td>{formatTime(a.clockIn)}</td>
              <td>{formatTime(a.clockOut)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default EmployeePanel;