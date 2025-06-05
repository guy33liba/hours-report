import React, { useState, useEffect, useRef } from "react";
import { initializeApp } from "firebase/app";
import {
  getAuth,
  signInAnonymously,
  signInWithCustomToken,
  onAuthStateChanged,
} from "firebase/auth";
import {
  getFirestore,
  doc,
  getDoc,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  collection,
  query,
  where,
  getDocs,
  Timestamp,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAgd4rdl5qyjxaS90cBslWbQoNMXAJDpgQ",
  authDomain: "attendance-9419a.firebaseapp.com",
  projectId: "attendance-9419a",
  storageBucket: "attendance-9419a.firebasestorage.app",
  messagingSenderId: "720123425038",
  appId: "1:720123425038:web:30cb1c0ec453a85dd8675f",
  measurementId: "G-NGFC0H8H2H",
};

const appId = firebaseConfig.projectId || "my-attendance-app";
const initialAuthToken = null; // No custom token for local setup

let app, db, auth;
if (firebaseConfig.apiKey && firebaseConfig.projectId) {
  // Check if config is provided
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  auth = getAuth(app);
} else {
  console.error(
    "Firebase configuration is missing or incomplete. Please update firebaseConfig in src/App.js."
  );
}

const Modal = ({ message, onConfirm, onCancel, showCancel = false }) => {
  if (!message) return null; // Don't render if no message

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <p className="modal-message">{message}</p>
        <div className="modal-actions">
          <button
            onClick={onConfirm}
            className="modal-button modal-button-primary"
          >
            OK
          </button>
          {showCancel && (
            <button
              onClick={onCancel}
              className="modal-button modal-button-secondary"
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const App = () => {
  const [userId, setUserId] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [clockedInSession, setClockedInSession] = useState(null); // Stores the current session if clocked in
  const [dailyLogs, setDailyLogs] = useState([]);
  const [reportData, setReportData] = useState(null); // Changed to null initially
  const [reportStartDate, setReportStartDate] = useState("");
  const [reportEndDate, setReportEndDate] = useState("");
  const [activeTab, setActiveTab] = useState("attendance"); // 'attendance', 'reports'

  const [modalMessage, setModalMessage] = useState("");
  const [modalCallback, setModalCallback] = useState(null);
  const [showModalCancel, setShowModalCancel] = useState(false);

  const showCustomModal = (
    message,
    onConfirm,
    showCancel = false,
    onCancel = null
  ) => {
    setModalMessage(message);
    setModalCallback(() => onConfirm); // Use a function wrapper to store callback
    setShowModalCancel(showCancel);
    if (showCancel && onCancel) {
      setModalCallback(() => () => {
        // If canceled, run onCancel, then clear modal
        onCancel();
        setModalMessage("");
        setModalCallback(null);
        setShowModalCancel(false);
      });
    } else {
      // If no cancel action, ensure confirm clears modal as well
      setModalCallback(() => {
        onConfirm();
        setModalMessage("");
        setModalCallback(null);
        setShowModalCancel(false);
      });
    }
  };

  const handleModalConfirm = () => {
    if (modalCallback) {
      modalCallback();
    }

    setModalMessage("");
    setModalCallback(null);
    setShowModalCancel(false);
  };

  // 1. Firebase Authentication
  useEffect(() => {
    if (!auth) {
      console.error(
        "Firebase Auth is not initialized. Please check your firebaseConfig."
      );
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUserId(user.uid);
      } else {
        // Sign in anonymously if no custom token, otherwise use custom token
        try {
          if (initialAuthToken) {
            await signInWithCustomToken(auth, initialAuthToken);
          } else {
            await signInAnonymously(auth);
          }
          setUserId(auth.currentUser?.uid);
        } catch (error) {
          console.error("Error during Firebase authentication:", error);
          showCustomModal(`Authentication failed: ${error.message}`, () => {});
        }
      }
      setIsAuthReady(true); // Auth state is ready
    });

    return () => unsubscribe(); // Cleanup subscription
  }, []); // Empty dependency array means this runs once on mount

  useEffect(() => {
    if (!isAuthReady || !userId || !db) return;

    const today = new Date();
    const todayString = today.toISOString().split("T")[0]; // Format:YYYY-MM-DD

    const userAttendanceCollectionRef = collection(
      db,
      `artifacts/${appId}/users/${userId}/attendanceSessions`
    );
    // Query for today's sessions
    const q = query(
      userAttendanceCollectionRef,
      where("date", "==", todayString)
    );

    // Listen for real-time updates for daily logs
    const unsubscribeDailyLogs = onSnapshot(
      q,
      (snapshot) => {
        const sessions = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        // Sort by newest first (clockInTime)
        setDailyLogs(
          sessions.sort(
            (a, b) => b.clockInTime.toMillis() - a.clockInTime.toMillis()
          )
        );

        // Check for an active clocked-in session (where clockOutTime is null)
        const activeSession = sessions.find((session) => !session.clockOutTime);
        setClockedInSession(activeSession || null);
      },
      (error) => {
        console.error("Error fetching daily logs:", error);
        showCustomModal(
          `Failed to fetch daily logs: ${error.message}`,
          () => {}
        );
      }
    );

    return () => unsubscribeDailyLogs();
  }, [isAuthReady, userId, db]); // Re-run if auth state or userId changes

  // Helper to format duration from milliseconds
  const formatDuration = (ms) => {
    if (ms === null || ms === undefined) return "N/A";
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    const remainingSeconds = seconds % 60;
    return `${hours}h ${remainingMinutes}m ${remainingSeconds}s`;
  };

  // Helper to format Firestore Timestamp to a readable local string
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return "N/A";
    const date = timestamp.toDate();
    return date.toLocaleString(); // Use local string for readability (e.g., "6/5/2025, 11:30:00 AM")
  };

  // Clock In function
  const handleClockIn = async () => {
    if (!userId || !db) {
      showCustomModal(
        "Application not ready. Please wait for authentication.",
        () => {}
      );
      return;
    }
    if (clockedInSession) {
      showCustomModal("You are already clocked in!", () => {});
      return;
    }

    try {
      const today = new Date();
      const todayString = today.toISOString().split("T")[0]; // Format:YYYY-MM-DD

      const newSession = {
        userId: userId,
        clockInTime: Timestamp.now(), // Current Firestore Timestamp
        clockOutTime: null, // Null initially, will be updated on clock out
        durationMs: null, // Null initially
        date: todayString, // Date string for easier querying by day
      };

      // Add a new document to the attendanceSessions collection
      const docRef = await addDoc(
        collection(db, `artifacts/${appId}/users/${userId}/attendanceSessions`),
        newSession
      );
      console.log("Clocked in successfully with ID:", docRef.id);
      showCustomModal("You have successfully clocked in!", () => {});
    } catch (error) {
      console.error("Error clocking in:", error);
      showCustomModal(`Failed to clock in: ${error.message}`, () => {});
    }
  };

  // Clock Out function
  const handleClockOut = async () => {
    if (!userId || !db) {
      showCustomModal(
        "Application not ready. Please wait for authentication.",
        () => {}
      );
      return;
    }
    if (!clockedInSession) {
      showCustomModal("You are not currently clocked in.", () => {});
      return;
    }

    try {
      // Get the document reference for the active session
      const sessionDocRef = doc(
        db,
        `artifacts/${appId}/users/${userId}/attendanceSessions`,
        clockedInSession.id
      );
      const clockOutTime = Timestamp.now(); // Current Firestore Timestamp
      // Calculate duration in milliseconds
      const durationMs =
        clockOutTime.toMillis() - clockedInSession.clockInTime.toMillis();

      // Update the existing session document with clock-out time and duration
      await updateDoc(sessionDocRef, {
        clockOutTime: clockOutTime,
        durationMs: durationMs,
      });
      console.log(
        "Clocked out successfully for session ID:",
        clockedInSession.id
      );
      showCustomModal("You have successfully clocked out!", () => {});
      setClockedInSession(null); // Clear active session state in UI
    } catch (error) {
      console.error("Error clocking out:", error);
      showCustomModal(`Failed to clock out: ${error.message}`, () => {});
    }
  };

  // Generate Report function
  const generateReport = async () => {
    if (!userId || !db) {
      showCustomModal(
        "Application not ready. Please wait for authentication.",
        () => {}
      );
      return;
    }
    if (!reportStartDate || !reportEndDate) {
      showCustomModal(
        "Please select both start and end dates for the report.",
        () => {}
      );
      return;
    }

    const startDate = new Date(reportStartDate);
    const endDate = new Date(reportEndDate);
    // Adjust endDate to include the entire last day selected
    endDate.setDate(endDate.getDate() + 1);

    if (startDate > endDate) {
      showCustomModal("Start date cannot be after the end date.", () => {});
      return;
    }

    try {
      const userAttendanceCollectionRef = collection(
        db,
        `artifacts/${appId}/users/${userId}/attendanceSessions`
      );
      // Query for sessions within the selected date range based on clockInTime
      const q = query(
        userAttendanceCollectionRef,
        where("clockInTime", ">=", Timestamp.fromDate(startDate)),
        where("clockInTime", "<", Timestamp.fromDate(endDate)) // Use '<' to exclude the start of the next day
      );

      const querySnapshot = await getDocs(q);
      const reportSessions = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      // Calculate total presence duration for the report
      let totalDurationMs = 0;
      reportSessions.forEach((session) => {
        if (session.durationMs) {
          // Only sum completed sessions
          totalDurationMs += session.durationMs;
        }
      });

      setReportData({
        sessions: reportSessions,
        totalDuration: totalDurationMs,
      });
      console.log("Report generated successfully!");
    } catch (error) {
      console.error("Error generating report:", error);
      showCustomModal(`Failed to generate report: ${error.message}`, () => {});
    }
  };

  // Display loading message if authentication is not ready
  if (!isAuthReady) {
    return (
      <div className="app-container" style={{ justifyContent: "center" }}>
        <div className="text-lg text-gray-700">Loading authentication...</div>
      </div>
    );
  }

  // Main application UI
  return (
    <div className="app-container">
      {/* Modal component for messages/confirmations */}
      <Modal
        message={modalMessage}
        onConfirm={handleModalConfirm}
        showCancel={showModalCancel}
        onCancel={handleModalConfirm} // If no specific cancel action, just confirm behavior
      />

      <header className="header-container">
        <h1 className="header-title">Employee Time Watch</h1>
        {userId && (
          <p className="user-id-text">
            User ID: <span className="user-id-mono">{userId}</span>
          </p>
        )}
      </header>

      {/* Tabs for Navigation */}
      <nav className="nav-tabs">
        <button
          onClick={() => setActiveTab("attendance")}
          className={`nav-tab-button ${
            activeTab === "attendance" ? "active" : ""
          }`}
        >
          Attendance
        </button>
        <button
          onClick={() => setActiveTab("reports")}
          className={`nav-tab-button ${
            activeTab === "reports" ? "active" : ""
          }`}
        >
          Reports
        </button>
      </nav>

      {/* Attendance Tab Content */}
      {activeTab === "attendance" && (
        <main className="main-content">
          <section style={{ marginBottom: "32px", textAlign: "center" }}>
            <h2 className="section-title">Clock In / Clock Out</h2>
            <div className="clock-buttons-container">
              <button
                onClick={handleClockIn}
                disabled={clockedInSession !== null}
                className="clock-button clock-button-in"
              >
                Clock In
              </button>
              <button
                onClick={handleClockOut}
                disabled={clockedInSession === null}
                className="clock-button clock-button-out"
              >
                Clock Out
              </button>
            </div>
            {clockedInSession && (
              <p className="clocked-in-message">
                You are currently clocked in since:{" "}
                <span className="clocked-in-time">
                  {formatTimestamp(clockedInSession.clockInTime)}
                </span>
              </p>
            )}
          </section>

          <section>
            <h2 className="section-title">Today's Attendance Log</h2>
            {dailyLogs.length === 0 ? (
              <p className="no-records-message">
                No attendance records for today.
              </p>
            ) : (
              <div className="table-container">
                <table className="data-table">
                  <thead className="table-header">
                    <tr>
                      <th>Clock In</th>
                      <th>Clock Out</th>
                      <th>Duration</th>
                    </tr>
                  </thead>
                  <tbody className="table-body">
                    {dailyLogs.map((log) => (
                      <tr key={log.id}>
                        <td>{formatTimestamp(log.clockInTime)}</td>
                        <td>
                          {log.clockOutTime ? (
                            formatTimestamp(log.clockOutTime)
                          ) : (
                            <span className="table-active-status">Active</span>
                          )}
                        </td>
                        <td>{formatDuration(log.durationMs)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </main>
      )}

      {/* Reports Tab Content */}
      {activeTab === "reports" && (
        <main className="main-content">
          <section style={{ marginBottom: "32px" }}>
            <h2 className="section-title">Generate Report</h2>
            <div className="report-date-inputs">
              <div className="form-group">
                <label htmlFor="startDate" className="form-label">
                  Start Date:
                </label>
                <input
                  type="date"
                  id="startDate"
                  value={reportStartDate}
                  onChange={(e) => setReportStartDate(e.target.value)}
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label htmlFor="endDate" className="form-label">
                  End Date:
                </label>
                <input
                  type="date"
                  id="endDate"
                  value={reportEndDate}
                  onChange={(e) => setReportEndDate(e.target.value)}
                  className="form-input"
                />
              </div>
              <button
                onClick={generateReport}
                className="generate-report-button"
              >
                Generate Report
              </button>
            </div>
          </section>

          <section>
            <h2 className="section-title">Report Data</h2>
            {reportData &&
            reportData.sessions &&
            reportData.sessions.length > 0 ? (
              <div>
                <p className="report-summary">
                  Total Presence:{" "}
                  <span className="report-total-duration">
                    {formatDuration(reportData.totalDuration)}
                  </span>
                </p>
                <div className="table-container">
                  <table className="data-table">
                    <thead className="table-header">
                      <tr>
                        <th>Date</th>
                        <th>Clock In</th>
                        <th>Clock Out</th>
                        <th>Duration</th>
                      </tr>
                    </thead>
                    <tbody className="table-body">
                      {reportData.sessions
                        .sort(
                          (a, b) =>
                            b.clockInTime.toMillis() - a.clockInTime.toMillis()
                        ) // Sort by newest first
                        .map((session) => (
                          <tr key={session.id}>
                            <td>{session.date}</td>
                            <td>{formatTimestamp(session.clockInTime)}</td>
                            <td>
                              {session.clockOutTime ? (
                                formatTimestamp(session.clockOutTime)
                              ) : (
                                <span className="table-active-status">
                                  Still Clocked In
                                </span>
                              )}
                            </td>
                            <td>{formatDuration(session.durationMs)}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <p className="no-records-message">
                No report data generated yet. Select dates and click "Generate
                Report".
              </p>
            )}
          </section>
        </main>
      )}
    </div>
  );
};

export default App;
