import { useContext, useEffect, useMemo, useState } from "react";
import Modal from "./Modal";
import AppContent from "./AppContent";
import { AppContext } from "./AppContext";
import "../styles.css";
function ResetPasswordModal({ show, onClose, employee }) {
  const { addToast, fetchData } = useContext(AppContext);
  const [newPassword, setNewPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!show) {
      setNewPassword("");
      setIsLoading(false);
    }
  }, [show]);

  if (!show || !employee) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      addToast("הסיסמה חייבת להכיל לפחות 6 תווים", "danger");
      return;
    }
    setIsLoading(true);
    try {
      await apiFetch("/employees/reset-password", {
        method: "POST",
        body: JSON.stringify({ userId: employee.id, newPassword }),
      });

      addToast(`הסיסמה של ${employee.name} אופסה בהצלחה!`, "success");
      fetchData(); // מרענן את המידע מהשרת
      onClose();
    } catch (error) {
      addToast(error.message || "שגיאה באיפוס הסיסמה", "danger");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      show={show}
      onClose={onClose}
      title={`איפוס סיסמה עבור ${employee.name}`}
    >
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="newPassword">סיסמה חדשה</label>
          <input
            id="newPassword"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            minLength={6}
            autoFocus
          />
        </div>
        <div className="form-actions">
          <button
            type="button"
            className="secondary"
            onClick={onClose}
            disabled={isLoading}
          >
            ביטול
          </button>
          <button type="submit" disabled={isLoading}>
            {isLoading ? "מאפס..." : "אפס סיסמה"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
export default ResetPasswordModal;
