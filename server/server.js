const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());

// --- 1. MongoDB Connection ---
const mongoURI =
 "mongodb+srv://guy33liba:guyliba33@jobhours.dytubrn.mongodb.net/jobHoursDB?retryWrites=true&w=majority&appName=jobHours";
mongoose
 .connect(mongoURI)
 .then(() => console.log("Successfully connected to MongoDB!"))
 .catch((error) => console.error("Error connecting to MongoDB:", error));

// --- 2. Mongoose Schemas & Models ---

const employeeSchema = new mongoose.Schema(
 {
  name: { type: String, required: true, trim: true },
  department: { type: String, required: true, trim: true },
  role: { type: String, required: true, enum: ["employee", "manager"], default: "employee" },
  hourlyRate: { type: Number, required: true, min: 0 },
  status: {
   type: String,
   required: true,
   enum: ["present", "sick", "vacation", "absent"],
   default: "absent",
  },
 },
 { timestamps: true }
);

const Employee = mongoose.model("Employee", employeeSchema);

const attendanceSchema = new mongoose.Schema(
 {
  employee: { type: mongoose.Schema.Types.ObjectId, ref: "Employee", required: true },
  clockIn: { type: Date, required: true },
  clockOut: { type: Date, default: null },
 },
 { timestamps: true }
);

const Attendance = mongoose.model("Attendance", attendanceSchema);

// --- 3. API Endpoints ---

// == Employee Endpoints ==
app.get("/api/employees", async (req, res) => {
 try {
  const employees = await Employee.find();
  res.json(employees);
 } catch (error) {
  res.status(500).json({ message: "Failed to fetch employees", error: error.message });
 }
});

app.post("/api/employees", async (req, res) => {
 try {
  const newEmployee = new Employee(req.body);
  const savedEmployee = await newEmployee.save();
  console.log("Added new employee:", savedEmployee);
  res.status(201).json(savedEmployee);
 } catch (error) {
  res.status(400).json({ message: "Failed to create employee", error: error.message });
 }
});

app.put("/api/employees/:id", async (req, res) => {
 try {
  const { id } = req.params;
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

app.delete("/api/employees/:id", async (req, res) => {
 try {
  const { id } = req.params;
  const deletedEmployee = await Employee.findByIdAndDelete(id);
  if (!deletedEmployee) {
   return res.status(404).json({ message: "Employee not found" });
  }
  console.log("Deleted employee with id:", id);
  res.status(204).send();
 } catch (error) {
  res.status(500).json({ message: "Failed to delete employee", error: error.message });
 }
});

// == Attendance Endpoints ==
app.post("/api/attendance/clock-in", async (req, res) => {
 const { employeeId } = req.body;
 if (!employeeId) {
  return res.status(400).json({ message: "Employee ID is required" });
 }
 try {
  const openShift = await Attendance.findOne({ employee: employeeId, clockOut: null });
  if (openShift) {
   return res.status(409).json({ message: "Employee is already clocked in." });
  }
  const newAttendance = new Attendance({ employee: employeeId, clockIn: new Date() });
  await newAttendance.save();
  const updatedEmployee = await Employee.findByIdAndUpdate(
   employeeId,
   { status: "present" },
   { new: true }
  );
  res.status(201).json(updatedEmployee);
 } catch (error) {
  res.status(500).json({ message: "Server error during clock-in", error: error.message });
 }
});

app.post("/api/attendance/clock-out", async (req, res) => {
 const { employeeId } = req.body;
 if (!employeeId) {
  return res.status(400).json({ message: "Employee ID is required" });
 }
 try {
  const attendanceToClose = await Attendance.findOneAndUpdate(
   { employee: employeeId, clockOut: null },
   { clockOut: new Date() },
   { new: true, sort: { clockIn: -1 } }
  );
  if (!attendanceToClose) {
   return res.status(404).json({ message: "No open shift found to clock out." });
  }
  const updatedEmployee = await Employee.findByIdAndUpdate(
   employeeId,
   { status: "absent" },
   { new: true }
  );
  res.json(updatedEmployee);
 } catch (error) {
  res.status(500).json({ message: "Server error during clock-out", error: error.message });
 }
});

app.get("/api/attendance/today/open", async (req, res) => {
 try {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const openShifts = await Attendance.find({
   clockIn: { $gte: today },
   clockOut: null,
  });
  res.json(openShifts);
 } catch (error) {
  console.error("Error fetching open shifts:", error);
  res.status(500).json({ message: "Failed to fetch open shifts", error: error.message });
 }
});

// --- 4. Start Server ---
app.listen(PORT, () => {
 console.log(`Server is running on http://localhost:${PORT}`);
});
