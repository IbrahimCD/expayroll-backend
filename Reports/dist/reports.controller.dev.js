"use strict";

// backend/Reports/reports.controller.js
var PayRun = require('../payRun/payRun.model');

var Timesheet = require('../Timesheet/timesheet.model');

var Location = require('../Location/location.model');

var mongoose = require('mongoose');
/**
 * GET /reports/wage-cost-allocation
 * Query param: payRunId
 * 
 * 1) Load the pay run by payRunId.
 * 2) For each timesheet referenced by the pay run's entries, gather:
 *    - Timesheet location, date range
 *    - The allocated data for each employee
 * 3) Return a structured JSON that the frontend can easily display.
 */


exports.getWageCostAllocation = function _callee(req, res) {
  var payRunId, orgId, payRun, timesheetMap, _iteratorNormalCompletion, _didIteratorError, _iteratorError, _iterator, _step, entry, employeeName, payrollId, _iteratorNormalCompletion3, _didIteratorError3, _iteratorError3, _iterator3, _step3, alloc, tId, niWage, cashWage, eerNIC, wageCost, timesheetIds, timesheets, results, _iteratorNormalCompletion2, _didIteratorError2, _iteratorError2, _iterator2, _step2, t, _tId, data, locationName, loc;

  return regeneratorRuntime.async(function _callee$(_context) {
    while (1) {
      switch (_context.prev = _context.next) {
        case 0:
          _context.prev = 0;
          payRunId = req.query.payRunId;
          orgId = req.user.orgId; // or however you store organization

          if (payRunId) {
            _context.next = 5;
            break;
          }

          return _context.abrupt("return", res.status(400).json({
            message: 'Missing payRunId'
          }));

        case 5:
          _context.next = 7;
          return regeneratorRuntime.awrap(PayRun.findOne({
            _id: payRunId,
            organizationId: orgId
          }));

        case 7:
          payRun = _context.sent;

          if (payRun) {
            _context.next = 10;
            break;
          }

          return _context.abrupt("return", res.status(404).json({
            message: 'Pay Run not found.'
          }));

        case 10:
          // We'll store timesheet allocations in a map: { timesheetId: { data... } }
          // payRun.entries might look like: 
          // [
          //   {
          //     employeeId,
          //     employeeName,
          //     breakdown: { ... },
          //     timesheetAllocations: [
          //       {
          //         timesheetId, 
          //         F8_allocGrossNIWage,
          //         F9_allocGrossCashWage,
          //         F10_allocEerNIC,
          //         F11_allocWageCost
          //       }, ...
          //     ]
          //   },
          //   ...
          // ]
          //
          // We'll group by timesheetId so we can sum them up.
          timesheetMap = {}; // { [timesheetId]: { employees: [], totals: {} } }
          // For each pay run entry (one entry per employee):

          _iteratorNormalCompletion = true;
          _didIteratorError = false;
          _iteratorError = undefined;
          _context.prev = 14;
          _iterator = payRun.entries[Symbol.iterator]();

        case 16:
          if (_iteratorNormalCompletion = (_step = _iterator.next()).done) {
            _context.next = 44;
            break;
          }

          entry = _step.value;
          employeeName = entry.employeeName || 'Unknown';
          payrollId = entry.payrollId || 'N/A';

          if (!(!entry.breakdown || !entry.breakdown.timesheetAllocations)) {
            _context.next = 22;
            break;
          }

          return _context.abrupt("continue", 41);

        case 22:
          _iteratorNormalCompletion3 = true;
          _didIteratorError3 = false;
          _iteratorError3 = undefined;
          _context.prev = 25;

          for (_iterator3 = entry.breakdown.timesheetAllocations[Symbol.iterator](); !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
            alloc = _step3.value;
            tId = String(alloc.timesheetId);

            if (!timesheetMap[tId]) {
              timesheetMap[tId] = {
                employees: [],
                totalNiWage: 0,
                totalCashWage: 0,
                totalEerNIC: 0,
                totalWageCost: 0
              };
            } // Extract the allocated fields


            niWage = alloc.F8_allocGrossNIWage || 0;
            cashWage = alloc.F9_allocGrossCashWage || 0;
            eerNIC = alloc.F10_allocEerNIC || 0;
            wageCost = alloc.F11_allocWageCost || 0;
            timesheetMap[tId].employees.push({
              employeeName: employeeName,
              payrollId: payrollId,
              allocatedNiWage: niWage,
              allocatedCashWage: cashWage,
              allocatedEerNIC: eerNIC,
              allocatedWageCost: wageCost
            });
            timesheetMap[tId].totalNiWage += niWage;
            timesheetMap[tId].totalCashWage += cashWage;
            timesheetMap[tId].totalEerNIC += eerNIC;
            timesheetMap[tId].totalWageCost += wageCost;
          }

          _context.next = 33;
          break;

        case 29:
          _context.prev = 29;
          _context.t0 = _context["catch"](25);
          _didIteratorError3 = true;
          _iteratorError3 = _context.t0;

        case 33:
          _context.prev = 33;
          _context.prev = 34;

          if (!_iteratorNormalCompletion3 && _iterator3["return"] != null) {
            _iterator3["return"]();
          }

        case 36:
          _context.prev = 36;

          if (!_didIteratorError3) {
            _context.next = 39;
            break;
          }

          throw _iteratorError3;

        case 39:
          return _context.finish(36);

        case 40:
          return _context.finish(33);

        case 41:
          _iteratorNormalCompletion = true;
          _context.next = 16;
          break;

        case 44:
          _context.next = 50;
          break;

        case 46:
          _context.prev = 46;
          _context.t1 = _context["catch"](14);
          _didIteratorError = true;
          _iteratorError = _context.t1;

        case 50:
          _context.prev = 50;
          _context.prev = 51;

          if (!_iteratorNormalCompletion && _iterator["return"] != null) {
            _iterator["return"]();
          }

        case 53:
          _context.prev = 53;

          if (!_didIteratorError) {
            _context.next = 56;
            break;
          }

          throw _iteratorError;

        case 56:
          return _context.finish(53);

        case 57:
          return _context.finish(50);

        case 58:
          // 2) Now we need to load each timesheet to get location + date range
          // Convert the timesheetMap keys to objectIds if needed:
          timesheetIds = Object.keys(timesheetMap).filter(function (k) {
            return mongoose.isValidObjectId(k);
          });
          _context.next = 61;
          return regeneratorRuntime.awrap(Timesheet.find({
            _id: {
              $in: timesheetIds
            }
          }));

        case 61:
          timesheets = _context.sent;
          // We build a final array of timesheet-based data
          results = [];
          _iteratorNormalCompletion2 = true;
          _didIteratorError2 = false;
          _iteratorError2 = undefined;
          _context.prev = 66;
          _iterator2 = timesheets[Symbol.iterator]();

        case 68:
          if (_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done) {
            _context.next = 84;
            break;
          }

          t = _step2.value;
          _tId = String(t._id);
          data = timesheetMap[_tId];

          if (data) {
            _context.next = 74;
            break;
          }

          return _context.abrupt("continue", 81);

        case 74:
          // If you want the location name:
          locationName = '';

          if (!t.locationId) {
            _context.next = 80;
            break;
          }

          _context.next = 78;
          return regeneratorRuntime.awrap(Location.findById(t.locationId));

        case 78:
          loc = _context.sent;
          locationName = loc ? loc.name : 'Unknown Location';

        case 80:
          results.push({
            timesheetId: _tId,
            timesheetName: t.timesheetName || '',
            locationName: locationName,
            startDate: t.startDate,
            endDate: t.endDate,
            employees: data.employees,
            totals: {
              allocatedNiWage: data.totalNiWage,
              allocatedCashWage: data.totalCashWage,
              allocatedEerNIC: data.totalEerNIC,
              allocatedWageCost: data.totalWageCost
            }
          });

        case 81:
          _iteratorNormalCompletion2 = true;
          _context.next = 68;
          break;

        case 84:
          _context.next = 90;
          break;

        case 86:
          _context.prev = 86;
          _context.t2 = _context["catch"](66);
          _didIteratorError2 = true;
          _iteratorError2 = _context.t2;

        case 90:
          _context.prev = 90;
          _context.prev = 91;

          if (!_iteratorNormalCompletion2 && _iterator2["return"] != null) {
            _iterator2["return"]();
          }

        case 93:
          _context.prev = 93;

          if (!_didIteratorError2) {
            _context.next = 96;
            break;
          }

          throw _iteratorError2;

        case 96:
          return _context.finish(93);

        case 97:
          return _context.finish(90);

        case 98:
          return _context.abrupt("return", res.status(200).json({
            payRunName: payRun.payRunName || '',
            wageCostAllocations: results
          }));

        case 101:
          _context.prev = 101;
          _context.t3 = _context["catch"](0);
          console.error('Error in getWageCostAllocation:', _context.t3);
          return _context.abrupt("return", res.status(500).json({
            message: 'Server error generating wage cost allocation report.'
          }));

        case 105:
        case "end":
          return _context.stop();
      }
    }
  }, null, null, [[0, 101], [14, 46, 50, 58], [25, 29, 33, 41], [34,, 36, 40], [51,, 53, 57], [66, 86, 90, 98], [91,, 93, 97]]);
};
/**
 * GET /reports/payruns
 * Return a list of all pay runs for the dropdown.
 */


exports.listPayRuns = function _callee2(req, res) {
  var orgId, payruns;
  return regeneratorRuntime.async(function _callee2$(_context2) {
    while (1) {
      switch (_context2.prev = _context2.next) {
        case 0:
          _context2.prev = 0;
          orgId = req.user.orgId;
          _context2.next = 4;
          return regeneratorRuntime.awrap(PayRun.find({
            organizationId: orgId
          }).select('_id payRunName startDate endDate').sort({
            createdAt: -1
          }));

        case 4:
          payruns = _context2.sent;
          return _context2.abrupt("return", res.status(200).json({
            payruns: payruns
          }));

        case 8:
          _context2.prev = 8;
          _context2.t0 = _context2["catch"](0);
          console.error('Error in listPayRuns:', _context2.t0);
          return _context2.abrupt("return", res.status(500).json({
            message: 'Server error listing pay runs.'
          }));

        case 12:
        case "end":
          return _context2.stop();
      }
    }
  }, null, null, [[0, 8]]);
};