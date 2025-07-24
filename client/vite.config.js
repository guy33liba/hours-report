import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa"; // <-- 1. ייבא את התוסף

// https://vitejs.dev/config/
export default defineConfig({
<<<<<<< HEAD
  plugins: [react()],//hello
})
=======
  plugins: [
    react(),
    // --- 2. הוסף את התוסף לרשימת התוספים עם ההגדרות שלו ---
    VitePWA({
      registerType: "autoUpdate", // יעדכן את האפליקציה אוטומטית כשיש גרסה חדשה
      injectRegister: "auto",

      // הגדרות המניפסט (במקום קובץ manifest.json נפרד)
      manifest: {
        name: "מערכת ניהול נוכחות",
        short_name: "נוכחות",
        description: "אפליקציה לניהול שעות עבודה ועובדים",
        theme_color: "#007bff",
        background_color: "#ffffff",
        display: "standalone",
        start_url: "/",
        icons: [
          {
            src: "pwa.png", // שם הקובץ לאייקון 192
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "pwa512.png", // שם הקובץ לאייקון 512
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "pwa512.png", // אייקון שיוכל לשמש גם כ-maskable
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
      },

      // הגדרות ה-Service Worker
      workbox: {
        // כללים לשמירת קבצים במטמון (caching)
        globPatterns: ["**/*.{js,css,html,ico,png,svg}"],
      },
    }),
  ],
});
>>>>>>> last
