import { useContext, useEffect, useMemo, useState } from "react";
import Modal from "./Modal";
import "../styles.css";
function EmployeeFormModal({ show, onClose, onSave, employee }) {
  const [formData, setFormData] = useState({
    name: "",
    department: "תמיכה",
    hourlyRate: "",
    role: "employee",
    // --- הוסף כאן שדה סיסמה, יהיה ריק כברירת מחדל ---
    password: "",
  });

  useEffect(() => {
    setFormData(
      employee
        ? { ...employee, password: "" } // בעת עריכה, אל תציג את הסיסמה הקיימת, הותיר אותה ריקה
        : {
            name: "",
            department: "תמיכה",
            hourlyRate: "",
            role: "employee",
            password: "", // וודא שריק עבור חדש
          }
    );
  }, [employee]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <Modal
      show={show}
      onClose={onClose}
      title={employee ? "עריכת פרטי עובד" : "הוספת עובד חדש"}
    >
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
          <select
            id="role"
            name="role"
            value={formData.role}
            onChange={handleChange}
          >
            <option value="employee">עובד</option>
            <option value="manager">מנהל</option>
          </select>
        </div>


        <div className="form-actions">
          <button type="button" className="secondary" onClick={onClose}>
            ביטול
          </button>
          <button type="submit">שמור</button>
        </div>
      </form>
    </Modal>
  );
}
export default EmployeeFormModal;
