require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./db');

const loginSignupRoutes = require('./LoginSignup');
const userManagementRoutes = require('./userManagement');
const employeeRoutes = require('./Employee');
const locationRoutes = require('./Location/location.routes');
const timesheetRoutes = require('./Timesheet/timesheet.routes');
const payRunRoutes = require('./payRun/payRun.routes');
const auditLogRoutes = require('./AuditLog/auditlog.routes');
const nictaxRoutes = require('./NICTax/nictax.routes');
const reportsRoutes = require('./Reports/reports.routes');
const employeeWageReportRoutes = require('./EmployeeWageReport/employeeWageReport.routes');
const remindersRoute = require('./Reminder/reminders');
const { scheduleDailyAutoReminders } = require('./cronJobs/autoReminders');

const app = express();
connectDB();

// If your frontend is at Vercel, add that domain here
// If you also test locally, you can add 'http://localhost:3000'
const corsOptions = {
  origin: [
    'https://expayroll-frontend.vercel.app', 
    'http://localhost:3000' 
  ],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true, // if you need cookies or auth headers
};

app.use(cors(corsOptions));
app.use(express.json());

// Routes
app.use('/auth', loginSignupRoutes);
app.use('/audit-logs', auditLogRoutes);
app.use('/users', userManagementRoutes);
app.use('/locations', locationRoutes);
app.use('/', employeeRoutes);
app.use('/timesheets', timesheetRoutes);
app.use('/payruns', payRunRoutes);
app.use('/nictax', nictaxRoutes);
app.use('/reports', reportsRoutes);
app.use('/employee-wage-report', employeeWageReportRoutes);
app.use('/reminders', remindersRoute);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  scheduleDailyAutoReminders();
  console.log(`Server listening on port ${PORT}`);
});
