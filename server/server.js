const express = require("express");
const cors = require("cors");
const attendanceRouter = require("./routes/attendance.js");
const employeesRouter = require("./routes/employees.js");

const app = express();

app.use(cors());
app.use(express.json());


app.use("/employees", employeesRouter);
app.use("/attendance", attendanceRouter);

app.listen(4000, () => {
  console.log("Server listening on port 4000");
});
