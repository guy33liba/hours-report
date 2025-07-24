import { useContext, useEffect, useMemo, useState } from "react";
import Modal from "./Modal";
import "../styles.css";
function EmployeeFormModal({ show, onClose, onSave, employee }) {
  const initialState = {
    name: "",
    department: "תמיכה",
    hourlyRate: "",
    role: "employee",
    password: "",
  };
  const [formData, setFormData] = useState(initialState);

  useEffect(() => {
    // אם נכנסים למצב עריכה, מלא את הטופס בפרטי העובד
    // אחרת, ודא שהטופס מאופס (למקרה שנשאר מידע קודם)
    if (employee) {
      setFormData({ ...employee, password: "" }); // אל תציג סיסמה קיימת
    } else {
      setFormData(initialState);
    }
  }, [employee]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
    setFormData(initialState);
  };
  const handleCancel = () => {
    onClose();
    setFormData(initialState);
  };
  return (
    <Modal show={show} onClose={onClose} title={employee ? "עריכת פרטי עובד" : "הוספת עובד חדש"}>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="name">שם מלא</label>
          <input
            id="name"
            name="name"
            type="text"
            value={formData.name}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="department">מחלקה</label>
          <select
            id="department"
            name="department"
            value={formData.department}
            onChange={handleChange}
          >
            <option value="תמיכה">תמיכה</option>
            <option value="הנהלה">הנהלה</option>
          </select>
        </div>
        <div className="form-group">
          <label htmlFor="hourlyRate">תעריף שעתי (₪)</label>
          <input
            id="hourlyRate"
            name="hourlyRate"
            type="number"
            value={formData.hourlyRate}
            onChange={handleChange}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="role">תפקיד</label>
          <select id="role" name="role" value={formData.role} onChange={handleChange}>
            <option value="employee">עובד</option>
            <option value="manager">מנהל</option>
          </select>
        </div>

        <div className="form-actions">
          <button type="button" className="secondary" onClick={handleCancel}>
            ביטול
          </button>
          <button type="submit">שמור</button>
        </div>
      </form>
    </Modal>
  );
}
export default EmployeeFormModal;
