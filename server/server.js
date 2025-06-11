const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose"); // <-- ייבוא Mongoose

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());

// --- 1. חיבור ל-MongoDB ---
const mongoURI =
 "mongodb+srv://guy33liba:guyliba33@jobhours.dytubrn.mongodb.net/jobHoursDB?retryWrites=true&w=majority&appName=jobHours";
// הוספתי שם למסד הנתונים 'jobHoursDB'. זוהי פרקטיקה טובה.
// Atlas ייצור אותו עבורך אם הוא לא קיים.

mongoose
 .connect(mongoURI)
 .then(() => console.log("Successfully connected to MongoDB!"))
 .catch((error) => console.error("Error connecting to MongoDB:", error));

// --- 2. הגדרת Mongoose Schema ו-Model (במקום קובץ נפרד) ---
// הגדרת המבנה של מסמך 'employee' ב-MongoDB
const employeeSchema = new mongoose.Schema(
 {
  name: {
   type: String,
   required: true,
   trim: true,
  },
  department: {
   type: String,
   required: true,
   trim: true,
  },
  role: {
   type: String,
   required: true,
   enum: ["employee", "manager"],
   default: "employee",
  },
  hourlyRate: {
   type: Number,
   required: true,
   min: 0,
  },
  status: {
   type: String,
   required: true,
   enum: ["present", "sick", "vacation", "absent"],
   default: "absent",
  },
 },
 {
  timestamps: true, // מוסיף אוטומטית שדות `createdAt` ו-`updatedAt`
 }
);

// יצירת המודל מהסכמה. Mongoose ייצור אוטומטית אוסף (collection)
// בשם 'employees' (רבים ובאותיות קטנות) מהמודל 'Employee'.
const Employee = mongoose.model("Employee", employeeSchema);

// --- 3. API Endpoints המשתמשים ב-Mongoose ---

// GET: קבלת כל העובדים ממסד הנתונים
app.get("/api/employees", async (req, res) => {
 try {
  const employees = await Employee.find();
  res.json(employees);
 } catch (error) {
  res.status(500).json({ message: "Failed to fetch employees", error: error.message });
 }
});

// POST: הוספת עובד חדש למסד הנתונים
app.post("/api/employees", async (req, res) => {
 try {
  // יצירת מופע חדש של Employee עם הנתונים מגוף הבקשה
  const newEmployee = new Employee(req.body);
  // שמירת המופע במסד הנתונים
  const savedEmployee = await newEmployee.save();
  console.log("Added new employee:", savedEmployee);
  res.status(201).json(savedEmployee);
 } catch (error) {
  // תופס שגיאות ולידציה מהסכמה שלנו (למשל, שם חסר)
  res.status(400).json({ message: "Failed to create employee", error: error.message });
 }
});

// PUT: עדכון עובד קיים במסד הנתונים
app.put("/api/employees/:id", async (req, res) => {
 try {
  const { id } = req.params;
  // מציאת העובד לפי ה-ID הייחודי של MongoDB ועדכונו.
  // { new: true } מבטיח שהמסמך המעודכן יוחזר.
  const updatedEmployee = await Employee.findByIdAndUpdate(id, req.body, {
   new: true,
   runValidators: true,
  });

  if (!updatedEmployee) {
   return res.status(404).json({ message: "Employee not found" });
  }
  console.log("Updated employee:", updatedEmployee);
  res.json(updatedEmployee);
 } catch (error) {
  res.status(400).json({ message: "Failed to update employee", error: error.message });
 }
});

// DELETE: מחיקת עובד ממסד הנתונים
app.delete("/api/employees/:id", async (req, res) => {
 try {
  const { id } = req.params;
  // מציאת העובד לפי ה-ID הייחודי של MongoDB ומחיקתו.
  const deletedEmployee = await Employee.findByIdAndDelete(id);

  if (!deletedEmployee) {
   return res.status(404).json({ message: "Employee not found" });
  }

  console.log("Deleted employee with id:", id);
  res.status(204).send(); // הצלחה, אין תוכן להחזיר
 } catch (error) {
  res.status(500).json({ message: "Failed to delete employee", error: error.message });
 }
});

// הפעלת השרת
app.listen(PORT, () => {
 console.log(`Server is running on http://localhost:${PORT}`);
});
