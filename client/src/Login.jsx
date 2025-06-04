import { useState } from "react";

function Login({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch("http://localhost:4000/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.message);
        return;
      }

      alert("התחברת בהצלחה!");
      onLogin(data.userId); // שמירת userId
    } catch (err) {
      alert("שגיאה בשרת");
    }
  };

  return (
    <form onSubmit={handleLogin} style={{ direction: "rtl", padding: "2rem" }}>
      <h2>התחברות</h2>
      <input
        type="text"
        placeholder="שם משתמש"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
      />
      <br />
      <input
        type="password"
        placeholder="סיסמה"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <br />
      <button type="submit">התחבר</button>
    </form>
  );
}

export default Login;
