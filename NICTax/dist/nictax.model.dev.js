"use strict";

var mongoose = require('mongoose');

var Schema = mongoose.Schema;
var nictaxSchema = new Schema({
  organizationId: {
    type: Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true
  },
  recordName: {
    type: String,
    required: true
  },
  startDate: {
    type: Date,
    required: true,
    index: true
  },
  endDate: {
    type: Date,
    required: true
  },
  description: {
    type: String,
    "default": ''
  },
  baseLocationId: {
    type: Schema.Types.ObjectId,
    ref: 'Location',
    required: true,
    index: true
  },
  // Array of employee entries with NIC/Tax details.
  entries: [{
    employeeId: {
      type: Schema.Types.ObjectId,
      ref: 'Employee',
      required: true
    },
    employeeName: {
      type: String,
      required: true
    },
    eesNIC: {
      type: Number,
      "default": 0
    },
    erNIC: {
      type: Number,
      "default": 0
    },
    eesTax: {
      type: Number,
      "default": 0
    },
    notes: {
      type: String,
      "default": ''
    }
  }],
  status: {
    type: String,
    "enum": ['Draft', 'Approved'],
    "default": 'Draft',
    index: true
  }
}, {
  timestamps: true
});
/**
 * Pre-save hook to enforce record immutability when Approved.
 *
 * If a record was originally Approved, the only allowed change is reverting
 * its status to 'Draft'. Any other modification will be rejected.
 */

nictaxSchema.pre('save', function _callee(next) {
  var original, modifiedFields;
  return regeneratorRuntime.async(function _callee$(_context) {
    while (1) {
      switch (_context.prev = _context.next) {
        case 0:
          if (!this.isNew) {
            _context.next = 2;
            break;
          }

          return _context.abrupt("return", next());

        case 2:
          _context.prev = 2;
          _context.next = 5;
          return regeneratorRuntime.awrap(this.constructor.findById(this._id).lean());

        case 5:
          original = _context.sent;

          if (original) {
            _context.next = 8;
            break;
          }

          return _context.abrupt("return", next());

        case 8:
          if (!(original.status === 'Approved')) {
            _context.next = 13;
            break;
          }

          // Filter out "updatedAt" from the modified paths
          modifiedFields = this.modifiedPaths().filter(function (p) {
            return p !== 'updatedAt';
          }); // Allow only changing status to Draft

          if (!(modifiedFields.length === 1 && modifiedFields[0] === 'status' && this.status === 'Draft')) {
            _context.next = 12;
            break;
          }

          return _context.abrupt("return", next());

        case 12:
          return _context.abrupt("return", next(new Error('Approved records cannot be edited. Please revert to Draft to make changes.')));

        case 13:
          next();
          _context.next = 19;
          break;

        case 16:
          _context.prev = 16;
          _context.t0 = _context["catch"](2);
          next(_context.t0);

        case 19:
        case "end":
          return _context.stop();
      }
    }
  }, null, this, [[2, 16]]);
}); // Index on createdAt for efficient sorting of records.

nictaxSchema.index({
  createdAt: -1
});
module.exports = mongoose.model('NICTax', nictaxSchema);