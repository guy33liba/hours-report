import { useContext, useMemo, useState } from "react";
import EmployeeFormModal from "./EmployeeFormModal";
import ResetPasswordModal from "./ResetPasswordModal";
import { apiFetch } from "./utils";
import { AppContext } from "./AppContext";
import "../styles.css";
AppContext;
function EmployeeListPage() {
  const { employees, addToast, fetchData } = useContext(AppContext);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
<<<<<<< HEAD
  const [isResetPasswordModalOpen, setIsResetPasswordModalOpen] =
    useState(false);
=======
  const [isResetPasswordModalOpen, setIsResetPasswordModalOpen] = useState(false);
>>>>>>> last
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  const sortedEmployees = useMemo(() => {
    // Crucial: Default employees to an empty array if it's null or undefined.
    const employeesArray = employees || [];

    const roleOrder = {
      manager: 1,
      support: 2,
      // Add other roles and their order here as needed (e.g., 'worker': 3)
    };

    return [...employeesArray].sort((a, b) => {
      const orderA = roleOrder[a.role] || 99; // Assign a high value for undefined roles
      const orderB = roleOrder[b.role] || 99;

      if (orderA !== orderB) {
        return orderA - orderB; // Sort by role priority
      }
      return a.name.localeCompare(b.name); // Then sort alphabetically by name
    });
  }, [employees]); // Recalculate only when 'employees' changes

  const handleOpenEditModal = (employee = null) => {
    setSelectedEmployee(employee);
    setIsEditModalOpen(true);
  };

  const handleOpenResetPasswordModal = (employee) => {
    setSelectedEmployee(employee);
    setIsResetPasswordModalOpen(true);
  };

  const handleSaveEmployee = async (employeeData) => {
    try {
      if (selectedEmployee) {
        // Existing employee: PUT request
        await apiFetch(`/employees/${selectedEmployee.id}`, {
          method: "PUT",
          body: JSON.stringify(employeeData),
        });
        addToast("פרטי העובד עודכנו", "success");
      } else {
        // New employee: POST request
        await apiFetch("/employees", {
          method: "POST",
          body: JSON.stringify(employeeData),
        });
        addToast("עובד חדש נוסף", "success");
      }
      setIsEditModalOpen(false);
      fetchData(); // Re-fetch data to update the list
    } catch (error) {
      addToast(error.message, "danger");
    }
  };

  const handleDeleteEmployee = async (employeeId) => {
    if (window.confirm("למחוק עובד זה?")) {
      try {
        await apiFetch(`/employees/${employeeId}`, { method: "DELETE" });
        addToast("העובד נמחק", "danger");
        fetchData(); // Re-fetch data to update the list
      } catch (error) {
        addToast(error.message, "danger");
      }
    }
  };

  return (
    <>
      <div className="page-header">
        <h2>ניהול עובדים</h2>
        <button onClick={() => handleOpenEditModal()}>הוסף עובד חדש</button>
      </div>
      <div className="card">
<<<<<<< HEAD
        <div className="table-container">
=======
        <div className="employeeList-table-container">
>>>>>>> last
          <table>
            <thead>
              <tr>
                <th>שם</th>
                <th>מחלקה</th>
                <th>שכר שעתי</th>
                <th>תפקיד</th>
                <th>פעולות</th>
              </tr>
            </thead>
            <tbody>
              {/* Conditionally render table rows */}
              {sortedEmployees.length > 0 ? (
                sortedEmployees.map((emp) => (
                  <tr key={emp.id}>
<<<<<<< HEAD
=======
                    {console.log(`emp ${emp.hourly_rate}`)}
>>>>>>> last
                    <td>{emp.name}</td>
                    <td>{emp.department}</td>
                    <td>{emp.hourly_rate} ₪</td>
                    <td>
                      {/* Display role in Hebrew */}
<<<<<<< HEAD
                      {emp.role === "manager"
                        ? "מנהל"
                        : emp.role === "support"
                        ? "תמיכה"
                        : "עובד"}
=======
                      {emp.role === "manager" ? "מנהל" : emp.role === "support" ? "תמיכה" : "עובד"}
>>>>>>> last
                    </td>
                    <td className="actions-cell">
                      <button
                        onClick={() => handleOpenEditModal(emp)}
                        className="secondary"
<<<<<<< HEAD
=======
                        style={{ fontSize: "16px" }}
>>>>>>> last
                      >
                        ערוך
                      </button>
                      <button
<<<<<<< HEAD
=======
                        style={{ fontSize: "16px" }}
>>>>>>> last
                        onClick={() => handleOpenResetPasswordModal(emp)}
                        className="secondary warning"
                      >
                        אפס סיסמה
                      </button>
                      <button
<<<<<<< HEAD
=======
                        style={{ fontSize: "16px" }}
>>>>>>> last
                        onClick={() => handleDeleteEmployee(emp.id)}
                        className="danger secondary"
                      >
                        מחק
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" style={{ textAlign: "center" }}>
                    אין עובדים להצגה.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      <EmployeeFormModal
        show={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSave={handleSaveEmployee}
        employee={selectedEmployee}
      />
      <ResetPasswordModal
        show={isResetPasswordModalOpen}
        onClose={() => setIsResetPasswordModalOpen(false)}
        employee={selectedEmployee}
      />
    </>
  );
}
export default EmployeeListPage;
