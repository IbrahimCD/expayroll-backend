"use strict";

var mongoose = require('mongoose');

var Schema = mongoose.Schema; // Updated Daily Rates Schema with new NI & Cash day modes and corresponding fields

var dailyRatesSchema = new Schema({
  // NI Daily Rates
  niDayMode: {
    type: String,
    "enum": ['NONE', 'ALL', 'FIXED'],
    "default": 'NONE'
  },
  ni_regularDays: {
    type: Number,
    "default": 0
  },
  ni_regularDayRate: {
    type: Number,
    "default": 0
  },
  ni_extraDayRate: {
    type: Number,
    "default": 0
  },
  ni_extraShiftRate: {
    type: Number,
    "default": 0
  },
  // Cash Daily Rates
  cashDayMode: {
    type: String,
    "enum": ['NONE', 'ALL'],
    "default": 'NONE'
  },
  cash_regularDays: {
    type: Number,
    "default": 0
  },
  cash_regularDayRate: {
    type: Number,
    "default": 0
  },
  cash_extraDayRate: {
    type: Number,
    "default": 0
  },
  cash_extraShiftRate: {
    type: Number,
    "default": 0
  }
}, {
  _id: false
}); // Hourly Rates Schema remains the same

var hourlyRatesSchema = new Schema({
  niHoursMode: {
    type: String,
    "default": 'NONE'
  },
  minNiHours: {
    type: Number,
    "default": 0
  },
  maxNiHours: {
    type: Number,
    "default": 0
  },
  percentageNiHours: {
    type: Number,
    "default": 0
  },
  niRatePerHour: {
    type: Number,
    "default": 0
  },
  fixedNiHours: {
    type: Number,
    "default": 0
  },
  cashHoursMode: {
    type: String,
    "default": 'NONE'
  },
  minCashHours: {
    type: Number,
    "default": 0
  },
  maxCashHours: {
    type: Number,
    "default": 0
  },
  percentageCashHours: {
    type: Number,
    "default": 0
  },
  cashRatePerHour: {
    type: Number,
    "default": 0
  }
}, {
  _id: false
}); // Other Considerations Schema remains the same

var otherConsiderationsSchema = new Schema({
  note: {
    type: String,
    "default": ''
  },
  niAdditions: [{
    name: String,
    amount: Number
  }],
  niDeductions: [{
    name: String,
    amount: Number
  }],
  cashAdditions: [{
    name: String,
    amount: Number
  }],
  cashDeductions: [{
    name: String,
    amount: Number
  }]
}, {
  _id: false
}); // Pay Structure Schema – dailyRates now uses the updated schema

var payStructureSchema = new Schema({
  payStructureName: {
    type: String,
    "default": ''
  },
  hasDailyRates: {
    type: Boolean,
    "default": false
  },
  dailyRates: dailyRatesSchema,
  hasHourlyRates: {
    type: Boolean,
    "default": false
  },
  hourlyRates: hourlyRatesSchema,
  hasOtherConsiderations: {
    type: Boolean,
    "default": false
  },
  otherConsiderations: otherConsiderationsSchema
}, {
  _id: false
}); // Employee Schema

var employeeSchema = new Schema({
  firstName: {
    type: String,
    required: true
  },
  lastName: {
    type: String,
    required: true
  },
  preferredName: {
    type: String
  },
  gender: {
    type: String,
    "default": 'Other'
  },
  dateOfBirth: {
    type: Date
  },
  mobileNo: {
    type: String
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  address: {
    type: String
  },
  payrollId: {
    type: String
  },
  status: {
    type: String,
    "default": 'Employed'
  },
  baseLocationId: {
    type: Schema.Types.ObjectId,
    ref: 'Location'
  },
  locationAccess: [{
    type: Schema.Types.ObjectId,
    ref: 'Location'
  }],
  organizationId: {
    type: Schema.Types.ObjectId,
    ref: 'Organization',
    required: true
  },
  payStructure: payStructureSchema
}, {
  timestamps: true
});
module.exports = mongoose.model('Employee', employeeSchema);