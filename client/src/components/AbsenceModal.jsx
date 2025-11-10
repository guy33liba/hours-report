import { useEffect, useState, useContext } from "react";
import Modal from "./Modal";
import { apiFetch } from "./utils";
import { AppContext } from "./AppContext";

function AbsenceModal({ show, onClose, employee }) {
  const { addToast, fetchData } = useContext(AppContext);

  const initial = {
    type: "vacation",
    startDate: "",
    endDate: "",
  };

  const [form, setForm] = useState(initial);

  useEffect(() => {
    if (show) {
      setForm(initial);
    }
  }, [show]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
    console.log(`AbsenceModal: field ${name} changed ->`, value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log("AbsenceModal: submitting", { employee, form });
    if (!employee || !employee.id) {
      addToast("לא נבחר עובד", "danger");
      return;
    }

    if (!form.startDate || !form.endDate) {
      addToast("יש למלא תאריך התחלה וסיום", "danger");
      return;
    }

    // Basic date validation
    if (new Date(form.endDate) < new Date(form.startDate)) {
      addToast("תאריך סיום לא יכול להיות לפני תאריך התחלה", "danger");
      return;
    }

    try {
      const resp = await apiFetch(`/absences`, {
        method: "POST",
        body: JSON.stringify({
          employeeId: employee.id,
          type: form.type,
          startDate: form.startDate,
          endDate: form.endDate,
        }),
      });
      console.log("AbsenceModal: server response ->", resp);
      addToast("היעדרות נוספה", "success");
      onClose();
      fetchData();
    } catch (err) {
      console.error("AbsenceModal: error adding absence", err);
      addToast(err.message || "שגיאה בהוספת היעדרות", "danger");
    }
  };

  return (
    <Modal
      show={show}
      onClose={onClose}
      title={`הוספת ${employee ? employee.name : "עובד"} - היעדרות`}
    >
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="type">סוג היעדרות</label>
          <select id="type" name="type" value={form.type} onChange={handleChange}>
            <option value="vacation">חופשה</option>
            <option value="sick">מחלה</option>
            <option value="other">אחר</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="startDate">תאריך התחלה</label>
          <input
            id="startDate"
            name="startDate"
            type="date"
            value={form.startDate}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="endDate">תאריך סיום</label>
          <input
            id="endDate"
            name="endDate"
            type="date"
            value={form.endDate}
            onChange={handleChange}
            required
          />
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

export default AbsenceModal;
