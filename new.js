const CONFIG = {
  checkInterval: 2000, // שינוי קטן: 2 שניות במקום 1. מקטין עומס ומעט מגדיל יציבות.
  targetDomain: "bluran.lightning.force.com",
  // אזהרה קריטית: כתובת זו חייבת להיות HTTPS כדי לעבוד באופן אמין!
  apiEndpoint: "http://192.168.0.221:2019/crm/chrome_crm_read.php",
  domainParam: "bluran.local"
};

let intervalId = null; // נגדיר את המשתנה הגלובלי

// פונקציה שתפקידה לוודא שהלולאה רצה, ולהפעיל אותה אם היא נעצרה
function ensureMonitoringIsActive() {
  if (intervalId !== null) {
    // אם הלולאה כבר רצה, אין מה לעשות
    console.log("Monitoring is already active.");
    return;
  }
  console.log("Starting monitoring interval...");
  intervalId = setInterval(checkForCalls, CONFIG.checkInterval);
}

async function checkForCalls() {
  console.log(`Checking for calls... Time: ${new Date().toLocaleTimeString()}`);
  try {
    // 1. בדוק אם יש לשונית סיילספורס פתוחה
    const tabs = await chrome.tabs.query({ url: `*://${CONFIG.targetDomain}/*` });
    if (tabs.length === 0) {
      console.log("Salesforce tab not found. Skipping check.");
      return; // אם אין טאב, אל תמשיך
    }

    // 2. קבל את מספר השלוחה (שיניתי את המפתח לשם ברור יותר)
    const data = await chrome.storage.sync.get('extensionNumber');
    const extensionNumber = data.extensionNumber || '0'; // השתמש במפתח ברור

    // 3. קרא לשרת ה-PHP שלך
    const response = await fetch(
      `${CONFIG.apiEndpoint}?exten=${extensionNumber}&domain=${CONFIG.domainParam}`
    );

    // 4. שיפור קריטי: בדוק אם הבקשה הצליחה
    if (!response.ok) {
      // אם השרת החזיר שגיאה (כמו 404 או 500), זרוק שגיאה
      throw new Error(`Network response was not ok. Status: ${response.status}`);
    }

    const phoneNumber = await response.text();

    // 5. בדוק אם יש שיחה חדשה
    if (phoneNumber && phoneNumber.trim().toLowerCase() !== "no") {
      console.log("!!! Call DETECTED for number:", phoneNumber);
      const salesforceUrl = `https://${CONFIG.targetDomain}/lightning/cmp/c__callPopUpAuraCmp?c__phoneNum=${phoneNumber}`;

      // 6. שיפור חווית משתמש: עדכן לשונית קיימת במקום לפתוח חדשה
      const salesforceTab = tabs[0]; // קח את הטאב הראשון שנמצא
      await chrome.tabs.update(salesforceTab.id, { url: salesforceUrl, active: true });
      await chrome.windows.update(salesforceTab.windowId, { focused: true });

    } else {
      // אין שיחה חדשה, זה המצב הרגיל
      // console.log("No new calls found."); // אפשר להסיר את השורה הזו כדי לא להציף את הלוג
    }
  } catch (error) {
    console.error("<<<<< Call check failed. See error below: >>>>>");
    console.error(error);
    // במקרה של שגיאה, הלולאה תמשיך לנסות בבדיקה הבאה
  }
}

// --- מנגנוני הפעלה והתאוששות ---

// 1. התחל לנטר בפעם הראשונה שהתוסף מותקן
chrome.runtime.onInstalled.addListener(() => {
  console.log("Extension installed/updated. Starting initial monitoring.");
  ensureMonitoringIsActive();
});

// 2. התחל לנטר כשהדפדפן נדלק
chrome.runtime.onStartup.addListener(() => {
    console.log("Browser started. Ensuring monitoring is active.");
    ensureMonitoringIsActive();
});

// 3. טריק להתאוששות: נסה להפעיל את הניטור כל פעם שהמשתמש פותח לשונית חדשה
// זה יכול "להעיר" את התוסף אם הוא נרדם
chrome.tabs.onCreated.addListener(() => {
    console.log("A new tab was created. Ensuring monitoring is still active.");
    ensureMonitoringIsActive();
});