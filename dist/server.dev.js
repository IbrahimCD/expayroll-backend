"use strict";

require('dotenv').config();

var express = require('express');

var cors = require('cors');

var connectDB = require('./db');

var loginSignupRoutes = require('./LoginSignup');

var userManagementRoutes = require('./userManagement');

var employeeRoutes = require('./Employee');

var locationRoutes = require('./Location/location.routes');

var timesheetRoutes = require('./Timesheet/timesheet.routes');

var payRunRoutes = require('./payRun/payRun.routes');

var auditLogRoutes = require('./AuditLog/auditlog.routes');

var nictaxRoutes = require('./NICTax/nictax.routes');

var reportsRoutes = require('./Reports/reports.routes');

var employeeWageReportRoutes = require('./EmployeeWageReport/employeeWageReport.routes');

var remindersRoute = require('./Reminder/reminders');

var app = express();
connectDB(); // If your frontend is at Vercel, add that domain here
// If you also test locally, you can add 'http://localhost:3000'

var corsOptions = {
  origin: ['https://expayroll-frontend.vercel.app' // 'http://localhost:3000'  <-- uncomment if needed
  ],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true // if you need cookies or auth headers

};
app.use(cors(corsOptions));
app.use(express.json()); // Routes

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
var PORT = process.env.PORT || 4000;
app.listen(PORT, function () {
  console.log("Server listening on port ".concat(PORT));
});