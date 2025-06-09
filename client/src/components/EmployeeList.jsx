import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import EmployeeForm from './EmployeeForm';

function EmployeeList({ employees, onDelete, onAdd, onUpdate }) {
  const [showForm, setShowForm] = useState(false);
  const [employeeToEdit, setEmployeeToEdit] = useState(null);

  const handleEdit = (employee) => {
    setEmployeeToEdit(employee);
    setShowForm(true);
  };

  const handleAddNew = () => {
    setEmployeeToEdit(null);
    setShowForm(true);
  };
  
  const handleFormSubmit = (employeeData) => {
    if (employeeToEdit) {
      onUpdate({ ...employeeToEdit, ...employeeData });
    } else {
      onAdd(employeeData);
    }
    setShowForm(false);
    setEmployeeToEdit(null);
  };

  return (
    <div className="card">
      <h2>ניהול עובדים</h2>
      <button onClick={handleAddNew} style={{marginBottom: '20px'}}>הוסף עובד חדש</button>

      {showForm && (
        <EmployeeForm 
          onSubmit={handleFormSubmit}
          initialData={employeeToEdit}
          onCancel={() => setShowForm(false)}
        />
      )}

      <table style={{width: '100%', textAlign: 'right'}}>
        <thead>
          <tr>
            <th>שם</th>
            <th>מחלקה</th>
            <th>פעולות</th>
          </tr>
        </thead>
        <tbody>
          {employees.map(emp => (
            <tr key={emp.id}>
              <td>
                  {/* קישור לפאנל האישי של העובד */}
                  <Link to={`/employee/${emp.id}`}>{emp.name}</Link>
              </td>
              <td>{emp.department}</td>
              <td>
                <button onClick={() => handleEdit(emp)} className="secondary" style={{marginLeft: '10px'}}>ערוך</button>
                <button onClick={() => window.confirm('האם אתה בטוח?') && onDelete(emp.id)} className="danger">מחק</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default EmployeeList;