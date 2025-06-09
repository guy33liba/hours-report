import React, { useState, useEffect } from "react";

function EmployeeForm({ onSubmit, initialData, onCancel }) {
  const [formData, setFormData] = useState({
    name: "",
    department: "",
    role: "employee",
  });

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    }
  }, [initialData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="card"
      style={{ backgroundColor: "#f9f9f9" }}
    >
      <h3>{initialData ? "עריכת עובד" : "הוספת עובד חדש"}</h3>
      <input
        type="text"
        name="name"
        placeholder="שם מלא"
        value={formData.name}
        onChange={handleChange}
        required
      />
      <input
        type="text"
        name="department"
        placeholder="מחלקה"
        value={formData.department}
        onChange={handleChange}
        required
      />
      <select name="role" value={formData.role} onChange={handleChange}>
        <option value="employee">עובד</option>
        <option value="manager">מנהל</option>
      </select>
      <div style={{ marginTop: "20px" }}>
        <button type="submit">
          {initialData ? "שמור שינויים" : "הוסף עובד"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="secondary"
          style={{ marginLeft: "10px" }}
        >
          ביטול
        </button>
      </div>
    </form>
  );
}

export default EmployeeForm;
