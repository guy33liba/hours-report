import React, { useState, useEffect, useMemo, useCallback, createContext, useContext, useReducer } from 'react';
import { BrowserRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom';

const GlobalCSS = `
  @import url('https://fonts.googleapis.com/css2?family=Rubik:wght@300;400;500;600;700&display=swap');
  :root {
    --primary-color: #6366F1; --primary-hover: #4F46E5; --primary-light: #EEF2FF;
    --secondary-color: #6B7280; --danger-color: #EF4444; --warning-color: #F59E0B;
    --success-color: #22C55E; --bg-main: #F9FAFB; --bg-sidebar: #FFFFFF;
    --font-dark: #1F2937; --font-light: #6B7280; --border-color: #E5E7EB;
    --shadow: 0 1px 2px rgba(0, 0, 0, 0.05); --radius: 8px;
  }
  body { font-family: 'Rubik', sans-serif; background-color: var(--bg-main); margin: 0; color: var(--font-dark); direction: rtl; }
  .app-layout { display: flex; }
  .sidebar { width: 260px; height: 100vh; position: sticky; top: 0; background-color: var(--bg-sidebar); border-left: 1px solid var(--border-color); display: flex; flex-direction: column; padding: 20px; box-sizing: border-box; }
  .main-content { flex-grow: 1; padding: 30px; height: 100vh; overflow-y: auto; }
  .sidebar-header { text-align: center; margin-bottom: 30px; }
  .sidebar-header h1 { margin: 0; color: var(--primary-color); font-weight: 700; }
  .sidebar nav { flex-grow: 1; }
  .sidebar nav a { cursor: pointer; display: flex; align-items: center; gap: 12px; padding: 10px 12px; margin-bottom: 4px; border-radius: 6px; text-decoration: none; color: var(--font-light); font-weight: 500; transition: all 0.2s ease; }
  .sidebar nav a:hover { background-color: var(--primary-light); color: var(--primary-color); }
  .sidebar nav a.active { background-color: var(--primary-light); color: var(--primary-color); font-weight: 600; }
  .sidebar-footer { margin-top: auto; border-top: 1px solid var(--border-color); padding-top: 20px; }
  .dashboard-grid, .settings-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(350px, 1fr)); gap: 24px; }
  h2, h3 { color: var(--font-dark); }
  h2 { font-size: 24px; font-weight: 600; margin-bottom: 24px; }
  h3 { font-size: 18px; font-weight: 600; margin-bottom: 16px; border-bottom: 1px solid var(--border-color); padding-bottom: 12px; }
  .card { background-color: var(--bg-sidebar); border-radius: var(--radius); box-shadow: var(--shadow); padding: 24px; margin-bottom: 24px; border: 1px solid var(--border-color); }
  button { background-color: var(--primary-color); color: white; border: none; padding: 10px 18px; border-radius: var(--radius); cursor: pointer; font-size: 14px; font-family: 'Rubik', sans-serif; transition: all 0.2s ease-in-out; font-weight: 500; display: inline-flex; align-items: center; gap: 8px; justify-content: center; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
  button:hover:not(:disabled) { background-color: var(--primary-hover); transform: translateY(-1px); box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1); }
  button:disabled { background-color: #E2E8F0; border-color: #E2E8F0; color: #94A3B8; cursor: not-allowed; }
  button.secondary { background-color: white; color: var(--font-dark); border: 1px solid #CBD5E1; }
  button.secondary:hover:not(:disabled) { background-color: #F8FAFC; }
  .form-group { margin-bottom: 16px; }
  .form-group label { display: block; font-size: 14px; font-weight: 500; margin-bottom: 6px; }
  input, select, textarea { width: 100%; padding: 8px 12px; border: 1px solid #CBD5E1; border-radius: 6px; box-sizing: border-box; transition: all 0.2s ease; }
  input:focus, select:focus, textarea:focus { border-color: var(--primary-color); box-shadow: 0 0 0 2px var(--primary-light); outline: none; }
  .toggle-switch { display: flex; align-items: center; justify-content: space-between; padding: 8px 0; }
  .switch { position: relative; display: inline-block; width: 40px; height: 22px; }
  .switch input { opacity: 0; width: 0; height: 0; }
  .slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #CBD5E1; transition: .4s; border-radius: 22px; }
  .slider:before { position: absolute; content: ""; height: 16px; width: 16px; left: 3px; bottom: 3px; background-color: white; transition: .4s; border-radius: 50%; }
  input:checked + .slider { background-color: var(--primary-color); }
  input:checked + .slider:before { transform: translateX(18px); }
  .login-container { display: flex; align-items: center; justify-content: center; height: 100vh; background-color: var(--bg-main); }
  table { width: 100%; border-collapse: collapse; margin-top: 20px; }
  th, td { padding: 12px 15px; text-align: right; border-bottom: 1px solid var(--border-color); }
  th { background-color: #F8FAFC; font-weight: 600; color: var(--font-light); font-size: 12px; text-transform: uppercase; }
  .kpi-card { text-align: center; }
  .kpi-value { font-size: 28px; font-weight: 700; color: var(--primary-color); margin: 5px 0; }
  .status-dot { width: 8px; height: 8px; border-radius: 50%; }
  .status-dot.present { background-color: var(--success-color); }
  .status-dot.on_break { background-color: var(--warning-color); }
  .status-dot.absent { background-color: #94A3B8; }
  .modal-backdrop { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background-color: rgba(15, 23, 42, 0.6); display: flex; justify-content: center; align-items: center; z-index: 1000; animation: fadeIn 0.3s ease-out; }
  .modal-content { background: var(--bg-sidebar); padding: 24px; border-radius: var(--radius); box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1); width: 100%; max-width: 500px; position: relative; animation: scaleUp 0.3s ease-out; }
  .modal-close-btn { position: absolute; top: 16px; left: 16px; background: none; border: none; color: var(--font-light); font-size: 24px; cursor: pointer; line-height: 1; }
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  @keyframes scaleUp { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
  .payroll-controls { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 24px; background-color: #F8FAFC; padding: 24px; border-radius: var(--radius); margin-bottom: 24px; border: 1px solid var(--border-color); }
  .control-section h3 { margin-top: 0; border: none; padding-bottom: 0; margin-bottom: 16px; }
  .employee-select-list { max-height: 150px; overflow-y: auto; border: 1px solid var(--border-color); border-radius: var(--radius); padding: 10px; background: white; }
  .employee-select-item, .select-all-item { cursor: pointer; display: flex; align-items: center; padding: 8px; border-radius: 4px; transition: background-color 0.2s; }
  .employee-select-item:hover, .select-all-item:hover { background-color: var(--primary-light); }
  .select-all-item { padding-bottom: 10px; border-bottom: 1px solid var(--border-color); margin-bottom: 5px; }
  .employee-select-item input[type="checkbox"], .select-all-item input[type="checkbox"] { cursor: pointer; width: auto; margin: 0 0 0 12px; }
  .payroll-table tfoot td { font-weight: 700; background-color: var(--primary-light); color: var(--primary-hover); border-top: 2px solid var(--primary-color); font-size: 16px; }
  .toast-container { position: fixed; bottom: 20px; right: 20px; z-index: 1000; }
  .toast { background-color: var(--font-dark); color: white; padding: 15px 25px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); margin-bottom: 10px; display: flex; align-items: center; gap: 10px; animation: slideInUp 0.5s ease, fadeOut 0.5s ease 4.5s forwards; }
`;

const STATUSES = {
    ABSENT: {
        key: 'absent',
        text: 'לא בעבודה',
        colorClass: 'absent'
    },
    PRESENT: {
        key: 'present',
        text: 'נוכח',
        colorClass: 'present'
    },
    ON_BREAK: {
        key: 'on_break',
        text: 'בהפסקה',
        colorClass: 'on_break'
    },
    SICK: {
        key: 'sick',
        text: 'מחלה',
        colorClass: 'warning' // נשתמש בצבע של אזהרה
    },
    VACATION: {
        key: 'vacation',
        text: 'חופשה',
        colorClass: 'info' // נוסיף צבע 'info' אם צריך, או נשתמש באחר
    }
};

const Icon = ({ path, size = 18 }) => { /* ... */ };
// ... שאר הקוד בחלק זה ...
const Icon = ({ path, size = 18 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor"><path d={path}></path></svg>;
const ICONS = { DASHBOARD: "M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z", EMPLOYEES: "M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z", REPORTS: "M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z", PAYROLL: "M21.41 11.58l-9-9C12.05 2.22 11.55 2 11 2H4c-1.1 0-2 .9-2 2v7c0 .55.22 1.05.59 1.42l9 9c.36.36.86.58 1.41.58.55 0 1.05-.22 1.41-.59l7-7c.37-.36.59-.86.59-1.41s-.22-1.05-.59-1.42zM5.5 7C4.67 7 4 6.33 4 5.5S4.67 4 5.5 4 7 4.67 7 5.5 6.33 7 5.5 7z", SETTINGS: "M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.07-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.69-1.62-0.92L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41 l-3.84,0c-0.24,0-0.44,0.17-0.48,0.41L9.2,5.59C8.6,5.82,8.08,6.13,7.58,6.51L5.19,5.55C4.97,5.48,4.72,5.55,4.6,5.77L2.68,9.09 c-0.11,0.2-0.06,0.47,0.12,0.61L4.83,11.28c-0.05,0.3-0.07,0.62-0.07,0.94c0,0.32,0.02,0.64,0.07,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.69,1.62,0.92l0.44,2.78 c0.04,0.24,0.24,0.41,0.48,0.41l3.84,0c0.24,0,0.44-0.17,0.48-0.41l0.44-2.78c0.59-0.23,1.12-0.54,1.62-0.92l2.39,0.96 c0.22,0.08,0.47,0.01,0.59-0.22l1.92-3.32c0.12-0.2,0.07-0.47-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z", LOGOUT: "M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2h8v-2H4V5z"};
const useLocalStorage = (key, initialValue) => { const [value, setValue] = useState(() => { try { const item = localStorage.getItem(key); return item ? JSON.parse(item) : initialValue; } catch (e) { return initialValue; }}); useEffect(() => { try { localStorage.setItem(key, JSON.stringify(value)); } catch(e) { console.error(e); }}, [key, value]); return [value, setValue]; };
const ToastContext = createContext();
const ToastProvider = ({ children }) => { const [toasts, setToasts] = useState([]); const addToast = useCallback((message, type='info') => { const id = Date.now(); setToasts(p => [...p, {id,message,type}]); setTimeout(() => setToasts(c => c.filter(t => t.id !== id)), 4000) }, []); return <ToastContext.Provider value={addToast}>{children}<div className="toast-container">{toasts.map(t=><div key={t.id} className="toast" style={{backgroundColor: t.type === 'success' ? 'var(--success-color)' : 'var(--font-dark)'}}>{t.message}</div>)}</div></ToastContext.Provider> };
const useToaster = () => useContext(ToastContext);
const calculateHours = (start, end) => end ? ((new Date(end) - new Date(start)) / 36e5) : 0;

const initialData = {
    employees: [
        { id: 1, name: "ישראל ישראלי", department: "פיתוח", role: "manager", hourlyRate: 120, status: STATUSES.ABSENT.key },
        { id: 2, name: "דנה כהן", department: "שיווק", role: "employee", hourlyRate: 60, status: STATUSES.ABSENT.key }
    ],
    // ... שאר הנתונים ...
};
const dataReducer = (state, action) => {
  switch (action.type) {
    case 'SET_INITIAL_DATA': return { ...action.payload, settings: {...initialData.settings, ...(action.payload.settings || {})} };
    case 'UPDATE_SETTINGS': return { ...state, settings: { ...state.settings, ...action.payload } };
    case 'UPDATE_EMPLOYEE_STATUS': return { ...state, employees: state.employees.map(e => e.id === action.payload.id ? {...e, status: action.payload.status} : e) };
    case 'ADD_ATTENDANCE': return { ...state, attendance: [...state.attendance, action.payload] };
    case 'UPDATE_LAST_ATTENDANCE': { const idx = state.attendance.findLastIndex(a => a.employeeId === action.payload.employeeId && !a.clockOut); if (idx === -1) return state; const newAtt = [...state.attendance]; newAtt[idx] = { ...newAtt[idx], ...action.payload.data }; return { ...state, attendance: newAtt }; }
    case 'ADD_EMPLOYEE': return { ...state, employees: [...state.employees, { ...action.payload, id: Date.now(), status: 'absent' }] };
    case 'UPDATE_EMPLOYEE': return { ...state, employees: state.employees.map(e => e.id === action.payload.id ? {...e, ...action.payload} : e) };
    case 'DELETE_EMPLOYEE': return { ...state, employees: state.employees.filter(e => e.id !== action.payload), attendance: state.attendance.filter(a => a.employeeId !== action.payload) };
    default: return state;
  }
};

const AppContext = createContext();
const ToggleSwitch = ({ label, checked, onChange, name }) => ( <div className="toggle-switch"><span>{label}</span><label className="switch"><input type="checkbox" name={name} checked={checked} onChange={onChange} /><span className="slider"></span></label></div> );
const FormInput = ({ label, ...props }) => (<div className="form-group"><label>{label}</label><input {...props} /></div>);
const FormTextarea = ({ label, ...props }) => (<div className="form-group"><label>{label}</label><textarea {...props} /></div>);

function Dashboard() {
    const { state } = useContext(AppContext);
    const summary = useMemo(() => {
        if (!state || !state.settings || !state.employees || !state.attendance) { return { totalHours: 0, overtimeHours: 0, totalPay: 0, presentCount: 0 }; }
        let totalHours = 0, overtimeHours = 0, totalPay = 0;
        const todayStr = new Date().toDateString();
        const activeEmployees = state.employees.filter(emp => emp.status !== 'absent');
        activeEmployees.forEach(emp => {
            const todayEntries = state.attendance.filter(a => a.employeeId === emp.id && new Date(a.clockIn).toDateString() === todayStr);
            let empTodayHours = 0;
            todayEntries.forEach(entry => { empTodayHours += calculateHours(entry.clockIn, entry.clockOut || (emp.status !== 'absent' ? new Date().toISOString() : null)); });
            const validEmpHours = Number(empTodayHours) || 0;
            const maxHours = Number(state.settings.standardWorkDayHours) || 9;
            const hourlyRate = Number(emp.hourlyRate) || 0;
            const overtimeRatePercent = Number(state.settings.overtimeRatePercent) || 150;
            totalHours += validEmpHours;
            const empRegular = Math.min(validEmpHours, maxHours);
            const empOvertime = Math.max(0, validEmpHours - maxHours);
            overtimeHours += empOvertime;
            totalPay += (empRegular * hourlyRate) + (empOvertime * hourlyRate * (overtimeRatePercent / 100));
        });
        return { totalHours: totalHours || 0, overtimeHours: overtimeHours || 0, totalPay: totalPay || 0, presentCount: activeEmployees.length };
    }, [state]);

    return (
        <>
            <h2>סקירה כללית</h2>
            <div className="dashboard-grid" style={{gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px'}}>
                <div className="card kpi-card"><h3>סה"כ שעות היום</h3><p className="kpi-value">{summary.totalHours.toFixed(2)}</p></div>
                <div className="card kpi-card"><h3>שעות נוספות</h3><p className="kpi-value">{summary.overtimeHours.toFixed(2)}</p></div>
                <div className="card kpi-card"><h3>עובדים נוכחים</h3><p className="kpi-value">{summary.presentCount}</p></div>
                <div className="card kpi-card"><h3>שכר מוערך להיום</h3><p className="kpi-value">₪{summary.totalPay.toFixed(2)}</p></div>
            </div>
            <div className="dashboard-grid"><RealTimePresenceCard /></div>
        </>
    );
}

function RealTimePresenceCard() {
    const { state, dispatch } = useContext(AppContext);
    const toaster = useToaster();
    const handleStatusChange = (employee, newStatus) => {
        if (employee.status === newStatus) return;
        const now = new Date().toISOString();
        if (newStatus === 'present') {
            dispatch({ type: 'ADD_ATTENDANCE', payload: { id: Date.now(), employeeId: employee.id, clockIn: now, clockOut: null } });
            toaster(`${employee.name} נכנס/ה למשמרת`);
        } else if (newStatus === 'absent') {
            dispatch({ type: 'UPDATE_LAST_ATTENDANCE', payload: { employeeId: employee.id, data: { clockOut: now } } });
            toaster(`${employee.name} יצא/ה מהמשמרת`);
        } else { toaster(`${employee.name} יצא/ה להפסקה`); }
        dispatch({ type: 'UPDATE_EMPLOYEE_STATUS', payload: { id: employee.id, status: newStatus } });
    };
    return (
        <div className="card">
            <h3>נוכחות בזמן אמת</h3>
            {state.employees.filter(e => e.role === 'employee').map(emp => (
                <div key={emp.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border-color)' }}>
                    <div><div style={{fontWeight: 500}}>{emp.name}</div><div style={{fontSize: '14px', color: 'var(--font-light)'}}>{emp.department}</div></div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={() => handleStatusChange(emp, 'present')} disabled={emp.status !== 'absent'} className="secondary">כניסה</button>
                        <button onClick={() => handleStatusChange(emp, 'on_break')} disabled={emp.status !== 'present'} className="secondary">הפסקה</button>
                        <button onClick={() => handleStatusChange(emp, 'absent')} disabled={emp.status === 'absent'} className="secondary">יציאה</button>
                    </div>
                </div>
            ))}
        </div>
    );
}

function EmployeeForm({ initialData, onSave, onCancel }) {
    const [formData, setFormData] = useState({ name: '', department: '', hourlyRate: '', role: 'employee' });
    useEffect(() => { setFormData(initialData || { name: '', department: '', hourlyRate: '', role: 'employee' }) }, [initialData]);
    const handleChange = e => setFormData({...formData, [e.target.name]: e.target.value});
    return (
        <form onSubmit={e=>{e.preventDefault(); onSave(formData)}}>
            <h3 style={{marginTop: 0, borderBottom: 'none'}}>{initialData ? 'עריכת פרטי עובד' : 'הוספת עובד חדש'}</h3>
            <p style={{marginTop: 0, marginBottom: '24px', color: 'var(--font-light)'}}>מלא את הפרטים הבאים כדי להוסיף או לעדכן עובד במערכת.</p>
            <FormInput label="שם מלא" name="name" value={formData.name} onChange={handleChange} required />
            <FormInput label="מחלקה" name="department" value={formData.department} onChange={handleChange} required />
            <FormInput label="תעריף שעתי (₪)" type="number" name="hourlyRate" value={formData.hourlyRate} onChange={handleChange} required />
            <div className="form-group"><label>תפקיד</label><select name="role" value={formData.role} onChange={handleChange}><option value="employee">עובד</option><option value="manager">מנהל</option></select></div>
            <div style={{display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px'}}><button type="button" className="secondary" onClick={onCancel}>ביטול</button><button type="submit">שמור</button></div>
        </form>
    );
}

function EmployeeModal({ show, onClose, employee, onSave }) {
    if (!show) return null;
    useEffect(() => { document.body.style.overflow = 'hidden'; return () => { document.body.style.overflow = 'unset'; }; }, []);
    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <button onClick={onClose} className="modal-close-btn">×</button>
                <EmployeeForm initialData={employee} onSave={onSave} onCancel={onClose} />
            </div>
        </div>
    );
}

function EmployeeList() {
    const { state, dispatch } = useContext(AppContext);
    const toaster = useToaster();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingEmployee, setEditingEmployee] = useState(null);
    const handleAddNew = () => { setEditingEmployee(null); setIsModalOpen(true); };
    const handleEdit = (employee) => { setEditingEmployee(employee); setIsModalOpen(true); };
    const handleDelete = (employee) => { if (window.confirm(`האם אתה בטוח שברצונך למחוק את ${employee.name}?`)) { dispatch({ type: 'DELETE_EMPLOYEE', payload: employee.id }); toaster(`${employee.name} נמחק בהצלחה.`); } };
    const handleSave = (employeeData) => { if (editingEmployee) { dispatch({ type: 'UPDATE_EMPLOYEE', payload: { ...employeeData, id: editingEmployee.id } }); toaster('פרטי העובד עודכנו!', 'success'); } else { dispatch({ type: 'ADD_EMPLOYEE', payload: employeeData }); toaster('עובד חדש נוסף בהצלחה!', 'success'); } setIsModalOpen(false); };
    return (
        <>
            <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><h2>ניהול עובדים</h2><button onClick={handleAddNew}>הוסף עובד חדש</button></div>
                <table><thead><tr><th>שם</th><th>מחלקה</th><th>תעריף</th><th>סטטוס</th><th>פעולות</th></tr></thead>
                <tbody>{state.employees.map(emp => (<tr key={emp.id}><td>{emp.name}</td><td>{emp.department}</td><td>₪{emp.hourlyRate}/שעה</td><td><div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><div className={`status-dot ${emp.status}`}></div><span>{emp.status}</span></div></td><td><button className="secondary" onClick={() => handleEdit(emp)}>ערוך</button><button className="secondary" onClick={() => handleDelete(emp)} style={{ marginRight: 10, borderColor: 'var(--danger-color)', color: 'var(--danger-color)' }}>מחק</button></td></tr>))}</tbody></table>
            </div>
            <EmployeeModal show={isModalOpen} onClose={() => setIsModalOpen(false)} employee={editingEmployee} onSave={handleSave} />
        </>
    );
}

function ReportsPage() {
    const { state } = useContext(AppContext);
    const [range, setRange] = useState({ start: '', end: '' });
    const reportData = useMemo(() => {
        if (!range.start || !range.end || !state.settings) return [];
        const startDate = new Date(range.start); const endDate = new Date(range.end); endDate.setHours(23, 59, 59, 999);
        return state.employees.map(emp => {
            const entries = state.attendance.filter(a => a.employeeId === emp.id && new Date(a.clockIn) >= startDate && new Date(a.clockIn) <= endDate);
            let totalHours=0, overtime=0, pay=0;
            entries.forEach(entry => {
                const hours = calculateHours(entry.clockIn, entry.clockOut);
                const validHours = Number(hours) || 0;
                const maxHours = Number(state.settings.standardWorkDayHours) || 9;
                const hourlyRate = Number(emp.hourlyRate) || 0;
                const overtimeRatePercent = Number(state.settings.overtimeRatePercent) || 150;
                totalHours += validHours;
                const regular = Math.min(validHours, maxHours);
                const ot = Math.max(0, validHours - maxHours);
                overtime += ot;
                pay += (regular * hourlyRate) + (ot * hourlyRate * (overtimeRatePercent / 100));
            });
            return { id: emp.id, name: emp.name, department: emp.department, totalHours, overtime, pay };
        });
    }, [range, state]);

    const summary = useMemo(() => reportData.reduce((acc, curr) => { acc.totalHours += curr.totalHours; acc.overtime += curr.overtime; acc.pay += curr.pay; return acc; }, { totalHours: 0, overtime: 0, pay: 0 }), [reportData]);
    const handleExportCSV = () => { if (reportData.length === 0) return; const headers = ["שם עובד", "מחלקה", "סה\"כ שעות", "שעות נוספות", "שכר משוער"]; const rows = reportData.map(r => [`"${r.name}"`, `"${r.department}"`, r.totalHours.toFixed(2), r.overtime.toFixed(2), r.pay.toFixed(2)]); let csvContent = "data:text/csv;charset=utf-8,\uFEFF" + headers.join(",") + "\n" + rows.map(e => e.join(",")).join("\n"); const encodedUri = encodeURI(csvContent); const link = document.createElement("a"); link.setAttribute("href", encodedUri); link.setAttribute("download", `report_${range.start}_to_${range.end}.csv`); document.body.appendChild(link); link.click(); document.body.removeChild(link); };
    const handlePrint = () => { window.print(); };

    return (<><style>{`@media print { body * { visibility: hidden; } #print-area, #print-area * { visibility: visible; } #print-area { position: absolute; left: 0; top: 0; width: 100%; } .no-print { display: none; } }`}</style><div className="card"><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} className="no-print"><h2>דוחות נוכחות</h2><div style={{ display: 'flex', gap: '10px' }}><button onClick={handleExportCSV} className="secondary" disabled={reportData.length === 0}>ייצא ל-CSV</button><button onClick={handlePrint} className="secondary" disabled={reportData.length === 0}>הדפס</button></div></div><div style={{ display: 'flex', gap: 20, marginBottom: 20 }} className="no-print"><input type="date" value={range.start} onChange={e => setRange({ ...range, start: e.target.value })} /><input type="date" value={range.end} onChange={e => setRange({ ...range, end: e.target.value })} /></div><div id="print-area">{reportData.length > 0 && (<><h3 style={{borderBottom:'none', textAlign:'center', fontSize: '20px'}}>סיכום לתקופה: {new Date(range.start).toLocaleDateString('he-IL')} - {new Date(range.end).toLocaleDateString('he-IL')}</h3><div className="dashboard-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px', marginBottom: '30px' }}><div className="card kpi-card" style={{padding: 15, border: 'none', background: 'var(--primary-light)'}}><h4>סה"כ שעות</h4><p className="kpi-value">{summary.totalHours.toFixed(2)}</p></div><div className="card kpi-card" style={{padding: 15, border: 'none', background: 'var(--primary-light)'}}><h4>שעות נוספות</h4><p className="kpi-value">{summary.overtime.toFixed(2)}</p></div><div className="card kpi-card" style={{padding: 15, border: 'none', background: 'var(--primary-light)'}}><h4>עלות שכר</h4><p className="kpi-value">₪{summary.pay.toFixed(2)}</p></div></div></>)}<table><thead><tr><th>שם עובד</th><th>מחלקה</th><th>סה"כ שעות</th><th>שעות נוספות</th><th>שכר משוער</th></tr></thead><tbody>{reportData.length > 0 ? (reportData.map(r => (<tr key={r.id}><td>{r.name}</td><td>{r.department}</td><td>{r.totalHours.toFixed(2)}</td><td>{r.overtime.toFixed(2)}</td><td>₪{r.pay.toFixed(2)}</td></tr>))) : (<tr><td colSpan="5" style={{ textAlign: 'center', padding: '20px' }}>יש לבחור טווח תאריכים כדי להציג את הדוח.</td></tr>)}</tbody></table></div></div></>);
}

function SettingsPage() { const { state, dispatch } = useContext(AppContext); const [settings, setSettings] = useState(state.settings); const toaster = useToaster(); useEffect(() => { setSettings(state.settings) }, [state.settings]); const handleChange = (e) => { const { name, value, type, checked } = e.target; setSettings(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value })); }; const handleSave = () => { dispatch({ type: 'UPDATE_SETTINGS', payload: settings }); toaster('ההגדרות נשמרו בהצלחה!', 'success'); }; return (<><div style={{display:'flex', justifyContent: 'space-between', alignItems: 'center'}}><h2 >הגדרות מערכת</h2><button onClick={handleSave}>שמור שינויים</button></div><div className="settings-grid"><div className="card"><h3>מדיניות נוכחות</h3><FormInput label="יום עבודה סטנדרטי (שעות)" type="number" name="standardWorkDayHours" value={settings.standardWorkDayHours} onChange={handleChange} /><ToggleSwitch label="התראה על איחור" name="alertOnLateArrival" checked={settings.alertOnLateArrival} onChange={handleChange} /></div><div className="card"><h3>מדיניות שכר</h3><FormInput label="תעריף שעות נוספות (%)" type="number" name="overtimeRatePercent" value={settings.overtimeRatePercent} onChange={handleChange} /></div><div className="card"><h3>אבטחה</h3><ToggleSwitch label="הגבל החתמה לפי IP" name="restrictByIp" checked={settings.restrictByIp} onChange={handleChange} />{settings.restrictByIp && (<FormTextarea label="כתובות IP מורשות (מופרד בפסיק)" name="allowedIps" value={settings.allowedIps} onChange={handleChange} />)}</div></div></>); }

function PayrollPage() { const { state } = useContext(AppContext); const [selectedEmployeeIds, setSelectedEmployeeIds] = useState([]); const [dateRange, setDateRange] = useState({ start: '', end: '' }); const [payrollResult, setPayrollResult] = useState(null); const handleEmployeeSelection = (e) => { const { value, checked } = e.target; const id = parseInt(value); if (checked) { setSelectedEmployeeIds(prev => [...prev, id]); } else { setSelectedEmployeeIds(prev => prev.filter(empId => empId !== id)); } }; const handleSelectAll = (e) => { if (e.target.checked) { setSelectedEmployeeIds(state.employees.filter(emp => emp.role === 'employee').map(emp => emp.id)); } else { setSelectedEmployeeIds([]); } }; const calculatePayroll = () => { if (selectedEmployeeIds.length === 0 || !dateRange.start || !dateRange.end) return null; const startDate = new Date(dateRange.start); const endDate = new Date(dateRange.end); endDate.setHours(23, 59, 59, 999); const details = state.employees.filter(emp => selectedEmployeeIds.includes(emp.id)).map(emp => { const entries = state.attendance.filter(a => a.employeeId === emp.id && new Date(a.clockIn) >= startDate && new Date(a.clockIn) <= endDate); let totalHours = 0, overtimeHours = 0, basePay = 0, overtimePay = 0; entries.forEach(entry => { const hours = calculateHours(entry.clockIn, entry.clockOut); const validHours = Number(hours) || 0; const maxHours = Number(state.settings.standardWorkDayHours) || 9; const hourlyRate = Number(emp.hourlyRate) || 0; const overtimeRatePercent = Number(state.settings.overtimeRatePercent) || 150; totalHours += validHours; const regular = Math.min(validHours, maxHours); const overtime = Math.max(0, validHours - maxHours); overtimeHours += overtime; basePay += regular * hourlyRate; overtimePay += overtime * hourlyRate * (overtimeRatePercent / 100); }); return { id: emp.id, name: emp.name, regularHours: totalHours - overtimeHours, overtimeHours, basePay, overtimePay, totalPay: basePay + overtimePay, }; }); const summary = details.reduce((acc, curr) => { acc.totalRegularHours += curr.regularHours; acc.totalOvertime += curr.overtimeHours; acc.totalBasePay += curr.basePay; acc.totalOvertimePay += curr.overtimePay; acc.totalPay += curr.totalPay; return acc; }, { totalRegularHours: 0, totalOvertime: 0, totalBasePay: 0, totalOvertimePay: 0, totalPay: 0 }); return { details, summary }; }; const handleGenerate = () => { setPayrollResult(calculatePayroll()); }; const handleExportCSV = () => { if (!payrollResult || payrollResult.details.length === 0) return; const headers = ["שם עובד", "שעות רגילות", "שעות נוספות", "שכר בסיס", "תוספת ש\"נ", "סה\"כ לתשלום"]; const rows = payrollResult.details.map(r => [`"${r.name}"`, r.regularHours.toFixed(2), r.overtimeHours.toFixed(2), r.basePay.toFixed(2), r.overtimePay.toFixed(2), r.totalPay.toFixed(2)]); let csvContent = "data:text/csv;charset=utf-8,\uFEFF" + headers.join(",") + "\n" + rows.map(e => e.join(",")).join("\n"); const encodedUri = encodeURI(csvContent); const link = document.createElement("a"); link.setAttribute("href", encodedUri); link.setAttribute("download", `payroll_${dateRange.start}_to_${dateRange.end}.csv`); document.body.appendChild(link); link.click(); document.body.removeChild(link); }; const isReady = selectedEmployeeIds.length > 0 && dateRange.start && dateRange.end; return ( <div className="card"><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><h2>הפקת דוח שכר</h2><button onClick={handleExportCSV} className="secondary" disabled={!payrollResult}>ייצא ל-CSV</button></div><div className="payroll-controls"><div className="control-section"><h3>1. בחר עובדים</h3><div className="employee-select-list"><div className="select-all-item"><input type="checkbox" id="select-all" onChange={handleSelectAll} checked={selectedEmployeeIds.length === state.employees.filter(e => e.role === 'employee').length && state.employees.filter(e => e.role === 'employee').length > 0} /><label htmlFor="select-all">בחר הכל</label></div>{state.employees.filter(emp => emp.role === 'employee').map(emp => (<div key={emp.id} className="employee-select-item"><input type="checkbox" id={`emp-${emp.id}`} value={emp.id} checked={selectedEmployeeIds.includes(emp.id)} onChange={handleEmployeeSelection} /><label htmlFor={`emp-${emp.id}`}>{emp.name}</label></div>))}</div></div><div className="control-section"><h3>2. בחר תקופה</h3><FormInput label="מתאריך" type="date" value={dateRange.start} onChange={e => setDateRange(prev => ({...prev, start: e.target.value}))} /><FormInput label="עד תאריך" type="date" value={dateRange.end} onChange={e => setDateRange(prev => ({...prev, end: e.target.value}))} /></div></div><div style={{textAlign: 'center', marginTop: '24px'}}><button onClick={handleGenerate} disabled={!isReady}>הפק דוח שכר</button></div>{payrollResult && (<div style={{marginTop: '30px', borderTop: '1px solid var(--border-color)', paddingTop: '24px'}}><h3 style={{textAlign: 'center', borderBottom: 'none'}}>דוח שכר לתקופה: {new Date(dateRange.start).toLocaleDateString('he-IL')} - {new Date(dateRange.end).toLocaleDateString('he-IL')}</h3><table className="payroll-table"><thead><tr><th>שם עובד</th><th>שעות רגילות</th><th>שעות נוספות</th><th>שכר בסיס</th><th>תוספת ש"נ</th><th>סה"כ לתשלום</th></tr></thead><tbody>{payrollResult.details.map(r => (<tr key={r.id}><td>{r.name}</td><td>{r.regularHours.toFixed(2)}</td><td>{r.overtimeHours.toFixed(2)}</td><td>₪{r.basePay.toFixed(2)}</td><td>₪{r.overtimePay.toFixed(2)}</td><td style={{fontWeight: 700, fontSize: '16px'}}>₪{r.totalPay.toFixed(2)}</td></tr>))}</tbody><tfoot><tr><td>סה"כ</td><td>{payrollResult.summary.totalRegularHours.toFixed(2)}</td><td>{payrollResult.summary.totalOvertime.toFixed(2)}</td><td>₪{payrollResult.summary.totalBasePay.toFixed(2)}</td><td>₪{payrollResult.summary.totalOvertimePay.toFixed(2)}</td><td>₪{payrollResult.summary.totalPay.toFixed(2)}</td></tr></tfoot></table></div>)}</div> );}
function Login({ onLogin }) { const { state } = useContext(AppContext); const [employeeId, setEmployeeId] = useState(''); return <div className="login-container"><form className="card" style={{ width: '350px', textAlign: 'center' }} onSubmit={(e) => { e.preventDefault(); onLogin(employeeId); }}><h2>התחברות למערכת</h2><select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} required style={{width: '100%', padding: '10px', marginBottom: '20px', borderRadius: '8px'}}><option value="">בחר/י שם...</option>{state.employees.map(emp => <option key={emp.id} value={emp.id}>{emp.name}</option>)}</select><button type="submit" style={{ width: '100%' }} disabled={!employeeId}>התחבר</button></form></div>; }

function App() {
  const [state, dispatch] = useReducer(dataReducer, initialData);
  const [currentUser, setCurrentUser] = useLocalStorage('currentUser', null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => { const d=localStorage.getItem('appData'); if(d) dispatch({type:'SET_INITIAL_DATA', payload: JSON.parse(d)}); setIsLoaded(true); }, []);
  useEffect(() => { if(isLoaded) localStorage.setItem('appData', JSON.stringify(state)); }, [state, isLoaded]);

  const handleLogin = (id) => { const user = state.employees.find(e => e.id === parseInt(id)); if (user) setCurrentUser(user); };
  const handleLogout = () => setCurrentUser(null);
  
  if (!isLoaded) return <div style={{display:'flex',height:'100vh',alignItems:'center',justifyContent:'center'}}>טוען מערכת...</div>;

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      <ToastProvider>
        <style>{GlobalCSS}</style>
        <BrowserRouter>
          {!currentUser ? ( <Login onLogin={handleLogin} /> ) : (
            <div className="app-layout">
              <aside className="sidebar">
                <div className="sidebar-header"><h1>Attend.ly</h1></div>
                <nav>
                    <NavLink to="/"><Icon path={ICONS.DASHBOARD}/> סקירה כללית</NavLink>
                    <NavLink to="/employees"><Icon path={ICONS.EMPLOYEES}/> ניהול עובדים</NavLink>
                    <NavLink to="/reports"><Icon path={ICONS.REPORTS}/> דוחות</NavLink>
                    <NavLink to="/payroll"><Icon path={ICONS.PAYROLL}/> חישוב שכר</NavLink>
                    <NavLink to="/settings"><Icon path={ICONS.SETTINGS}/> הגדרות</NavLink>
                </nav>
                <div className="sidebar-footer">
                  <span>שלום, {currentUser.name}</span>
                  <button onClick={handleLogout} className="secondary" style={{width:'100%'}}>התנתקות</button>
                </div>
              </aside>
              <main className="main-content">
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/employees" element={<EmployeeList />} />
                  <Route path="/reports" element={<ReportsPage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                  <Route path="/payroll" element={<PayrollPage />} />
                  <Route path="*" element={<Navigate to="/" />} />
                </Routes>
              </main>
            </div>
          )}
        </BrowserRouter>
      </ToastProvider>
    </AppContext.Provider>
  );
}

export default App;