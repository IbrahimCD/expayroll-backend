// backend/server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./db');

// Import the routes for authentication and user management
const loginSignupRoutes = require('./LoginSignup');
const userManagementRoutes = require('./userManagement');
const employeeRoutes = require('./Employee');         // Employee module
const locationRoutes = require('./Location/location.routes');
const timesheetRoutes = require('./Timesheet/timesheet.routes');
const payRunRoutes = require('./payRun/payRun.routes'); 
const auditLogRoutes = require('./AuditLog/auditlog.routes');
const nictaxRoutes = require('./NICTax/nictax.routes');
const reportsRoutes = require('./Reports/reports.routes');
const employeeWageReportRoutes = require('./EmployeeWageReport/employeeWageReport.routes');
const app = express();
connectDB();

app.use(cors());
app.use(express.json());

// Authentication & password reset flows
app.use('/auth', loginSignupRoutes);
app.use('/audit-logs', auditLogRoutes);
// User Management (Admin can create/read/update/delete users)
app.use('/users', userManagementRoutes);
// Mount the Location routes:
app.use('/locations', locationRoutes);
app.use('/', employeeRoutes); // Employee routes are mounted at root (e.g. /employees)
app.use('/timesheets', timesheetRoutes);
app.use('/payruns', payRunRoutes);

app.use('/nictax', nictaxRoutes);

app.use('/reports', reportsRoutes);
app.use('/employee-wage-report', employeeWageReportRoutes);


const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
