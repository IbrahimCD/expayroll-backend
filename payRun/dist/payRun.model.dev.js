"use strict";

// backend/payRun/payrun.model.js
var mongoose = require('mongoose');

var Schema = mongoose.Schema;
/**
 * Sub-schema for storing F1..F11 breakdown for each timesheet
 * in the location/allocation step (Part F).
 */

var timesheetAllocationSchema = new Schema({
  timesheetId: {
    type: Schema.Types.ObjectId,
    ref: 'Timesheet'
  },
  timesheetName: {
    type: String,
    "default": ''
  },
  // NEW field
  locationName: {
    type: String,
    "default": ''
  },
  F1_hoursRatio: {
    type: Number,
    "default": 0
  },
  // ratio of timesheet hours / total hours
  F2_daysRatio: {
    type: Number,
    "default": 0
  },
  // ratio of timesheet days / total days
  F3_extraShiftRatio: {
    type: Number,
    "default": 0
  },
  // ratio of timesheet extraShift / total extraShift
  F4_allocHoursWage: {
    type: Number,
    "default": 0
  },
  // E17 * F1
  F5_allocDaysWage: {
    type: Number,
    "default": 0
  },
  // E11 * F2
  F6_allocExtraShiftWage: {
    type: Number,
    "default": 0
  },
  // E12 * F3
  F7_wageRatio: {
    type: Number,
    "default": 0
  },
  // (F4+F5+F6)/(E17+E11+E12)
  F8_allocGrossNIWage: {
    type: Number,
    "default": 0
  },
  // E18 * F7
  F9_allocGrossCashWage: {
    type: Number,
    "default": 0
  },
  // E19 * F7 + (C6 - C7 for that timesheet)
  F10_allocEerNIC: {
    type: Number,
    "default": 0
  },
  // D1 * F7
  F11_allocWageCost: {
    type: Number,
    "default": 0
  } // F8 + F9 + F10

}, {
  _id: false
});
/**
 * Sub-schema for storing the full E1..E23 and D1..D3 breakdown
 * plus an array of F allocations (the timesheetAllocations).
 */

var breakdownSchema = new Schema({
  // E1..E23
  E1_totalHours: {
    type: Number,
    "default": 0
  },
  // sum of hours
  E2_totalDays: {
    type: Number,
    "default": 0
  },
  E3_totalExtraShiftWorked: {
    type: Number,
    "default": 0
  },
  E4_otherWageAdditions: {
    type: Number,
    "default": 0
  },
  E5_otherWageDeductions: {
    type: Number,
    "default": 0
  },
  E6_notes: {
    type: String,
    "default": ''
  },
  E7_regularDaysUsed: {
    type: Number,
    "default": 0
  },
  E8_extraDaysUsed: {
    type: Number,
    "default": 0
  },
  E9_NIDaysWage: {
    type: Number,
    "default": 0
  },
  E10_cashDaysWage: {
    type: Number,
    "default": 0
  },
  E11_grossDaysWage: {
    type: Number,
    "default": 0
  },
  E12_extraShiftWage: {
    type: Number,
    "default": 0
  },
  E13_NIHoursUsed: {
    type: Number,
    "default": 0
  },
  E14_cashHoursUsed: {
    type: Number,
    "default": 0
  },
  E15_NIHoursWage: {
    type: Number,
    "default": 0
  },
  E16_cashHoursWage: {
    type: Number,
    "default": 0
  },
  E17_grossHoursWage: {
    type: Number,
    "default": 0
  },
  E18_grossNIWage: {
    type: Number,
    "default": 0
  },
  E19_grossCashWage: {
    type: Number,
    "default": 0
  },
  E20_totalGrossWage: {
    type: Number,
    "default": 0
  },
  E21_netNIWage: {
    type: Number,
    "default": 0
  },
  E22_netCashWage: {
    type: Number,
    "default": 0
  },
  E23_totalNetWage: {
    type: Number,
    "default": 0
  },
  // D1..D3 (NIC & Tax)
  D1_eerNIC: {
    type: Number,
    "default": 0
  },
  D2_eesNIC: {
    type: Number,
    "default": 0
  },
  D3_eesTax: {
    type: Number,
    "default": 0
  },
  // F: array of timesheet allocations
  timesheetAllocations: [timesheetAllocationSchema]
}, {
  _id: false
}); // payrun.model.js

var payRunEntrySchema = new Schema({
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
    "default": ''
  },
  // new line:
  payStructure: {
    type: Schema.Types.Mixed
  },
  rawTimesheetIds: [{
    type: Schema.Types.ObjectId,
    ref: 'Timesheet'
  }],
  rawNICTaxIds: [{
    type: Schema.Types.ObjectId,
    ref: 'NICTax'
  }],
  needsUpdate: {
    type: Boolean,
    "default": false
  },
  netWage: {
    type: Number,
    "default": 0
  },
  breakdown: breakdownSchema,
  // NEW: Array of contributing timesheet details
  contributingTimesheets: [{
    timesheetName: {
      type: String
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
    addition: {
      type: Number,
      "default": 0
    },
    deduction: {
      type: Number,
      "default": 0
    },
    notes: {
      type: String,
      "default": ''
    }
  }]
}, {
  _id: false
});
var payRunSchema = new Schema({
  organizationId: {
    type: Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true
  },
  payRunName: {
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
  notes: {
    type: String,
    "default": ''
  },
  // Draft -> Approved -> Paid
  status: {
    type: String,
    "enum": ['Draft', 'Approved', 'Paid'],
    "default": 'Draft'
  },
  // If timesheet/NIC changes in draft
  needsRecalculation: {
    type: Boolean,
    "default": false
  },
  // Summaries
  totalNetPay: {
    type: Number,
    "default": 0
  },
  // Array of employee-based entries
  entries: [payRunEntrySchema]
}, {
  timestamps: true
});
/**
 * Optional: pre-save hooks to restrict certain transitions
 * (e.g., once Paid, can't revert).
 */

payRunSchema.pre('save', function _callee(next) {
  var original;
  return regeneratorRuntime.async(function _callee$(_context) {
    while (1) {
      switch (_context.prev = _context.next) {
        case 0:
          if (this.isNew) {
            _context.next = 7;
            break;
          }

          _context.next = 3;
          return regeneratorRuntime.awrap(this.constructor.findById(this._id).lean());

        case 3:
          original = _context.sent;

          if (!original) {
            _context.next = 7;
            break;
          }

          if (!(original.status === 'Paid' && this.status !== 'Paid')) {
            _context.next = 7;
            break;
          }

          return _context.abrupt("return", next(new Error('Cannot revert from Paid.')));

        case 7:
          next();

        case 8:
        case "end":
          return _context.stop();
      }
    }
  }, null, this);
}); // Check if 'PayRun' model already exists; if yes, re-use it.

module.exports = mongoose.models.PayRun || mongoose.model('PayRun', payRunSchema);