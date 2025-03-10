"use strict";

// backend/Timesheet/timesheet.model.js
var mongoose = require('mongoose');

var Schema = mongoose.Schema,
    model = mongoose.model;
var timesheetEntrySchema = new Schema({
  employeeId: {
    type: Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
  },
  employeeName: {
    type: String,
    required: true
  },
  payrollId: {
    type: String,
    required: true
  },
  baseLocation: {
    type: String,
    required: true
  },
  hoursWorked: {
    type: Number,
    "default": 0
  },
  daysWorked: {
    type: Number,
    "default": 0
  },
  extraShiftWorked: {
    type: Number,
    "default": 0
  },
  otherCashAddition: {
    type: Number,
    "default": 0
  },
  otherCashDeduction: {
    type: Number,
    "default": 0
  },
  notes: {
    type: String,
    "default": ''
  },
  hasDailyRates: {
    type: Boolean,
    "default": false
  },
  hasHourlyRates: {
    type: Boolean,
    "default": false
  }
}, {
  _id: false
});
var timesheetSchema = new Schema({
  timesheetName: {
    type: String,
    required: true
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  locationId: {
    type: Schema.Types.ObjectId,
    ref: 'Location',
    required: true
  },
  status: {
    type: String,
    "enum": ['Draft', 'Approved', 'Pay Approved'],
    "default": 'Draft'
  },
  entries: [timesheetEntrySchema],
  organizationId: {
    type: Schema.Types.ObjectId,
    ref: 'Organization',
    required: true
  }
}, {
  timestamps: true
});
module.exports = model('Timesheet', timesheetSchema);