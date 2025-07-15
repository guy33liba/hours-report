import { AppContext } from "./AppContext";
import DigitalClock from "./DigitalClock";
import "../styles.css";
import { useContext, useEffect, useState } from "react";
import { apiFetch } from "./utils";
function SettingsPage() {
  const { settings, setSettings, addToast } = useContext(AppContext);
  const [localSettings, setLocalSettings] = useState({
    standardWorkDayHours: 8.5,
    overtimeRatePercent: 125,
    ...settings,
  });
  //////////////////////////////

  useEffect(() => {
    setLocalSettings((prev) => ({ ...prev, settings }));
  }, [settings]);

  ///////////////////

  const handleSave = async (e) => {
    e.preventDefault();

    try {
      await apiFetch("/settings", {
        method: "PUT",
        body: JSON.stringify(localSettings),
      });

      setSettings(localSettings);
      addToast("ההגדרות נשמרו בהצלחה!", "success");
    } catch (error) {
      addToast(error.message || "שגיאה בשמירת הגדרות", "danger");
    }
  };

  ///////////////////

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const val =
      type === "checkbox"
        ? checked
        : type === "number"
        ? parseFloat(value) || 0
        : value;
    setLocalSettings((prev) => ({ ...prev, [name]: val }));
  };

  ///////////////////

  return (
    <>
      <div className="page-header">
        <h2>הגדרות מערכת</h2>
        <DigitalClock />
      </div>
      <div className="card">
        <form onSubmit={handleSave}>
          <h3>מדיניות נוכחות ושכר</h3>
          <div className="form-group">
            <label htmlFor="standardWorkDayHours">
              יום עבודה סטנדרטי (בשעות)
            </label>
            <p className="form-group-description">
              מספר השעות שמעבר לו כל שעת עבודה תיחשב כשעה נוספת.
            </p>
            <input
              id="standardWorkDayHours"
              name="standardWorkDayHours"
              type="number"
              step="0.1"
              value={localSettings.standardWorkDayHours}
              onChange={handleChange}
            />
          </div>
          <div className="form-group">
            <label htmlFor="overtimeRatePercent">
              אחוז תשלום שעות נוספות (%)
            </label>
            <p className="form-group-description">
              התעריף לתשלום עבור כל שעה נוספת. לדוגמה: 150.
            </p>
            <input
              id="overtimeRatePercent"
              name="overtimeRatePercent"
              type="number"
              step="1"
              value={localSettings.overtimeRatePercent}
              onChange={handleChange}
            />
          </div>
          <div className="form-actions">
            <button type="submit">שמור הגדרות</button>
          </div>
        </form>
      </div>
    </>
  );
}
export default SettingsPage;
