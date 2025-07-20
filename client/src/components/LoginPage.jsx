import { useState } from "react";
import { apiFetch } from "./utils";
function LoginPage({ onLogin }) {
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    const trimmedName = name.trim();
    const trimmedPassword = password.trim();
    try {
      // קריאה ל-API של השרת כדי לבצע לוגין
      const data = await apiFetch("/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmedName, password: trimmedPassword }),
      });
      localStorage.setItem("token", data.token);
      // השרת יחזיר טוקן ופרטי משתמש אם ההתחברות הצליחה
      if (data.token && data.user) {
        onLogin(data.user, data.token); // קריאה לפונקציה הראשית עם המידע החדש
      } else {
        alert("תגובה לא תקינה");
        setError("תגובה לא תקינה מהשרת");
      }
    } catch (err) {
      // הודעת השגיאה תגיע מהשרת (למשל, "שם משתמש או סיסמה שגויים")
      setError(err.message || "אירעה שגיאה בהתחברות");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-page-wrapper">
      <div className="login-container">
        <h1>התחברות</h1>
        <p className="subtitle">מערכת ניהול נוכחות עובדים</p>
        <form onSubmit={handleSubmit}>
          {error && <div className="login-error-message">{error}</div>}
          <div className="form-group">
            <label htmlFor="username">שם משתמש</label>
            <input
              id="username"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value.trimEnd())}
              required
              autoFocus
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">סיסמה</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value.trimEnd())}
              required
            />
          </div>
          <button type="submit" className="button-full-width" disabled={isLoading}>
            {isLoading ? "מתחבר..." : "התחבר"}
          </button>
        </form>
      </div>
    </div>
  );
}
export default LoginPage;
