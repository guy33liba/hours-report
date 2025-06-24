// src/main.jsx (או index.js) - עבור פרויקט Vite
import React from "react"; // ודא ש-React מיובא
import { createRoot } from "react-dom/client"; // שימוש ב-createRoot
import App from "./App.jsx"; // רכיב ה-App הראשי שלך
import { AppProvider } from "./components/AppContext.jsx"; // <--- ייבוא AppProvider מהקובץ AppContext.jsx

const root = createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <AppProvider>
      <App />
    </AppProvider>
  </React.StrictMode>
);
