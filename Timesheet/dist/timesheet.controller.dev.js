"use strict";

function _slicedToArray(arr, i) { return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _nonIterableRest(); }

function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance"); }

function _iterableToArrayLimit(arr, i) { if (!(Symbol.iterator in Object(arr) || Object.prototype.toString.call(arr) === "[object Arguments]")) { return; } var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"] != null) _i["return"](); } finally { if (_d) throw _e; } } return _arr; }

function _arrayWithHoles(arr) { if (Array.isArray(arr)) return arr; }

function _typeof(obj) { if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

// backend/Timesheet/timesheet.controller.js
var Timesheet = require('./timesheet.model');

var Employee = require('../Employee/employee.model'); // AFTER:


var PayRun = require('../payRun/payRun.model');

var Location = require('../Location/location.model');

var mongoose = require('mongoose');

var dayjs = require('dayjs');

var customParseFormat = require('dayjs/plugin/customParseFormat');

dayjs.extend(customParseFormat);

var Papa = require('papaparse');
/**
 * Create a new timesheet.
 */


exports.createTimesheet = function _callee(req, res) {
  var _req$body, timesheetName, startDate, endDate, locationId, entries, orgId, i, entry, employee, start, end, timesheet;

  return regeneratorRuntime.async(function _callee$(_context) {
    while (1) {
      switch (_context.prev = _context.next) {
        case 0:
          _context.prev = 0;
          _req$body = req.body, timesheetName = _req$body.timesheetName, startDate = _req$body.startDate, endDate = _req$body.endDate, locationId = _req$body.locationId, entries = _req$body.entries;
          orgId = req.user.orgId; // Organization ID from token

          if (!(!timesheetName || !startDate || !endDate || !locationId)) {
            _context.next = 5;
            break;
          }

          return _context.abrupt("return", res.status(400).json({
            message: 'Missing required fields.'
          }));

        case 5:
          i = 0;

        case 6:
          if (!(i < entries.length)) {
            _context.next = 22;
            break;
          }

          entry = entries[i];

          if (entry.employeeId) {
            _context.next = 10;
            break;
          }

          return _context.abrupt("return", res.status(400).json({
            message: "Missing employeeId in entry ".concat(i + 1, ".")
          }));

        case 10:
          if (entry.employeeName) {
            _context.next = 19;
            break;
          }

          _context.next = 13;
          return regeneratorRuntime.awrap(Employee.findById(entry.employeeId));

        case 13:
          employee = _context.sent;

          if (employee) {
            _context.next = 16;
            break;
          }

          return _context.abrupt("return", res.status(400).json({
            message: "Employee with ID ".concat(entry.employeeId, " not found.")
          }));

        case 16:
          entry.employeeName = "".concat(employee.firstName, " ").concat(employee.lastName);
          entry.payrollId = employee.payrollId;
          entry.baseLocation = employee.baseLocationId ? employee.baseLocationId.toString() : '';

        case 19:
          i++;
          _context.next = 6;
          break;

        case 22:
          start = new Date(startDate);
          end = new Date(endDate);
          _context.next = 26;
          return regeneratorRuntime.awrap(Timesheet.create({
            timesheetName: timesheetName,
            startDate: start,
            endDate: end,
            locationId: locationId,
            entries: entries,
            organizationId: orgId,
            status: 'Draft'
          }));

        case 26:
          timesheet = _context.sent;
          return _context.abrupt("return", res.status(201).json({
            message: 'Timesheet created successfully',
            timesheet: timesheet
          }));

        case 30:
          _context.prev = 30;
          _context.t0 = _context["catch"](0);
          console.error('Error creating timesheet:', _context.t0);
          return _context.abrupt("return", res.status(500).json({
            message: 'Server error creating timesheet'
          }));

        case 34:
        case "end":
          return _context.stop();
      }
    }
  }, null, null, [[0, 30]]);
};
/**
 * Get all timesheets.
 */


exports.getTimesheets = function _callee2(req, res) {
  var orgId, timesheets;
  return regeneratorRuntime.async(function _callee2$(_context2) {
    while (1) {
      switch (_context2.prev = _context2.next) {
        case 0:
          _context2.prev = 0;
          orgId = req.user.orgId;
          _context2.next = 4;
          return regeneratorRuntime.awrap(Timesheet.find({
            organizationId: orgId
          }));

        case 4:
          timesheets = _context2.sent;
          return _context2.abrupt("return", res.status(200).json({
            timesheets: timesheets
          }));

        case 8:
          _context2.prev = 8;
          _context2.t0 = _context2["catch"](0);
          console.error('Error fetching timesheets:', _context2.t0);
          return _context2.abrupt("return", res.status(500).json({
            message: 'Server error fetching timesheets'
          }));

        case 12:
        case "end":
          return _context2.stop();
      }
    }
  }, null, null, [[0, 8]]);
};
/**
 * Get a single timesheet by ID.
 */


exports.getTimesheetById = function _callee3(req, res) {
  var orgId, timesheetId, timesheet;
  return regeneratorRuntime.async(function _callee3$(_context3) {
    while (1) {
      switch (_context3.prev = _context3.next) {
        case 0:
          _context3.prev = 0;
          orgId = req.user.orgId;
          timesheetId = req.params.timesheetId;
          _context3.next = 5;
          return regeneratorRuntime.awrap(Timesheet.findOne({
            _id: timesheetId,
            organizationId: orgId
          }));

        case 5:
          timesheet = _context3.sent;

          if (timesheet) {
            _context3.next = 8;
            break;
          }

          return _context3.abrupt("return", res.status(404).json({
            message: 'Timesheet not found'
          }));

        case 8:
          return _context3.abrupt("return", res.status(200).json({
            timesheet: timesheet
          }));

        case 11:
          _context3.prev = 11;
          _context3.t0 = _context3["catch"](0);
          console.error('Error fetching timesheet:', _context3.t0);
          return _context3.abrupt("return", res.status(500).json({
            message: 'Server error fetching timesheet'
          }));

        case 15:
        case "end":
          return _context3.stop();
      }
    }
  }, null, null, [[0, 11]]);
};
/**
 * Update a timesheet.
 */


exports.updateTimesheet = function _callee5(req, res) {
  var _ret;

  return regeneratorRuntime.async(function _callee5$(_context5) {
    while (1) {
      switch (_context5.prev = _context5.next) {
        case 0:
          _context5.prev = 0;
          _context5.next = 3;
          return regeneratorRuntime.awrap(function _callee4() {
            var timesheetId, orgId, updates, existing, approvedPayRun, draftPayRuns, _iteratorNormalCompletion, _didIteratorError, _iteratorError, _iterator, _step, payRun, updatedFlag, updatedTimesheet;

            return regeneratorRuntime.async(function _callee4$(_context4) {
              while (1) {
                switch (_context4.prev = _context4.next) {
                  case 0:
                    timesheetId = req.params.timesheetId;
                    orgId = req.user.orgId;
                    updates = req.body;

                    if (updates.startDate) {
                      updates.startDate = new Date(updates.startDate);
                    }

                    if (updates.endDate) {
                      updates.endDate = new Date(updates.endDate);
                    }

                    _context4.next = 7;
                    return regeneratorRuntime.awrap(Timesheet.findOne({
                      _id: timesheetId,
                      organizationId: orgId
                    }));

                  case 7:
                    existing = _context4.sent;

                    if (existing) {
                      _context4.next = 10;
                      break;
                    }

                    return _context4.abrupt("return", {
                      v: res.status(404).json({
                        message: 'Timesheet not found'
                      })
                    });

                  case 10:
                    _context4.next = 12;
                    return regeneratorRuntime.awrap(PayRun.findOne({
                      organizationId: orgId,
                      status: 'Approved',
                      'entries.rawTimesheetIds': timesheetId
                    }));

                  case 12:
                    approvedPayRun = _context4.sent;

                    if (!(approvedPayRun && !['Admin', 'Area Manager'].includes(req.user.role))) {
                      _context4.next = 15;
                      break;
                    }

                    return _context4.abrupt("return", {
                      v: res.status(403).json({
                        message: 'This timesheet is part of an Approved Pay Run. Only Admin or Area Manager can edit.'
                      })
                    });

                  case 15:
                    _context4.next = 17;
                    return regeneratorRuntime.awrap(PayRun.find({
                      organizationId: orgId,
                      status: 'Draft',
                      'entries.rawTimesheetIds': timesheetId
                    }));

                  case 17:
                    draftPayRuns = _context4.sent;
                    _iteratorNormalCompletion = true;
                    _didIteratorError = false;
                    _iteratorError = undefined;
                    _context4.prev = 21;
                    _iterator = draftPayRuns[Symbol.iterator]();

                  case 23:
                    if (_iteratorNormalCompletion = (_step = _iterator.next()).done) {
                      _context4.next = 33;
                      break;
                    }

                    payRun = _step.value;
                    updatedFlag = false;
                    payRun.entries.forEach(function (entry) {
                      var rawIds = entry.rawTimesheetIds.map(function (id) {
                        return String(id);
                      });

                      if (rawIds.includes(String(timesheetId))) {
                        entry.needsUpdate = true;
                        updatedFlag = true;
                      }
                    });

                    if (!updatedFlag) {
                      _context4.next = 30;
                      break;
                    }

                    _context4.next = 30;
                    return regeneratorRuntime.awrap(payRun.save());

                  case 30:
                    _iteratorNormalCompletion = true;
                    _context4.next = 23;
                    break;

                  case 33:
                    _context4.next = 39;
                    break;

                  case 35:
                    _context4.prev = 35;
                    _context4.t0 = _context4["catch"](21);
                    _didIteratorError = true;
                    _iteratorError = _context4.t0;

                  case 39:
                    _context4.prev = 39;
                    _context4.prev = 40;

                    if (!_iteratorNormalCompletion && _iterator["return"] != null) {
                      _iterator["return"]();
                    }

                  case 42:
                    _context4.prev = 42;

                    if (!_didIteratorError) {
                      _context4.next = 45;
                      break;
                    }

                    throw _iteratorError;

                  case 45:
                    return _context4.finish(42);

                  case 46:
                    return _context4.finish(39);

                  case 47:
                    _context4.next = 49;
                    return regeneratorRuntime.awrap(Timesheet.findOneAndUpdate({
                      _id: timesheetId,
                      organizationId: orgId
                    }, updates, {
                      "new": true
                    }));

                  case 49:
                    updatedTimesheet = _context4.sent;

                    if (updatedTimesheet) {
                      _context4.next = 52;
                      break;
                    }

                    return _context4.abrupt("return", {
                      v: res.status(404).json({
                        message: 'Timesheet not found after update attempt'
                      })
                    });

                  case 52:
                    return _context4.abrupt("return", {
                      v: res.status(200).json({
                        message: 'Timesheet updated successfully',
                        timesheet: updatedTimesheet
                      })
                    });

                  case 53:
                  case "end":
                    return _context4.stop();
                }
              }
            }, null, null, [[21, 35, 39, 47], [40,, 42, 46]]);
          }());

        case 3:
          _ret = _context5.sent;

          if (!(_typeof(_ret) === "object")) {
            _context5.next = 6;
            break;
          }

          return _context5.abrupt("return", _ret.v);

        case 6:
          _context5.next = 12;
          break;

        case 8:
          _context5.prev = 8;
          _context5.t0 = _context5["catch"](0);
          console.error('Error updating timesheet:', _context5.t0);
          return _context5.abrupt("return", res.status(500).json({
            message: 'Server error updating timesheet'
          }));

        case 12:
        case "end":
          return _context5.stop();
      }
    }
  }, null, null, [[0, 8]]);
};
/**
 * Delete a timesheet.
 */


exports.deleteTimesheet = function _callee6(req, res) {
  var timesheetId, orgId, timesheet;
  return regeneratorRuntime.async(function _callee6$(_context6) {
    while (1) {
      switch (_context6.prev = _context6.next) {
        case 0:
          _context6.prev = 0;
          timesheetId = req.params.timesheetId;
          orgId = req.user.orgId;
          _context6.next = 5;
          return regeneratorRuntime.awrap(Timesheet.findOneAndDelete({
            _id: timesheetId,
            organizationId: orgId
          }));

        case 5:
          timesheet = _context6.sent;

          if (timesheet) {
            _context6.next = 8;
            break;
          }

          return _context6.abrupt("return", res.status(404).json({
            message: 'Timesheet not found'
          }));

        case 8:
          return _context6.abrupt("return", res.status(200).json({
            message: 'Timesheet deleted successfully'
          }));

        case 11:
          _context6.prev = 11;
          _context6.t0 = _context6["catch"](0);
          console.error('Error deleting timesheet:', _context6.t0);
          return _context6.abrupt("return", res.status(500).json({
            message: 'Server error deleting timesheet'
          }));

        case 15:
        case "end":
          return _context6.stop();
      }
    }
  }, null, null, [[0, 11]]);
};
/**
 * Approve a timesheet.
 */


exports.approveTimesheet = function _callee7(req, res) {
  var timesheetId, timesheet;
  return regeneratorRuntime.async(function _callee7$(_context7) {
    while (1) {
      switch (_context7.prev = _context7.next) {
        case 0:
          _context7.prev = 0;
          timesheetId = req.params.timesheetId;
          _context7.next = 4;
          return regeneratorRuntime.awrap(Timesheet.findById(timesheetId));

        case 4:
          timesheet = _context7.sent;

          if (timesheet) {
            _context7.next = 7;
            break;
          }

          return _context7.abrupt("return", res.status(404).json({
            message: 'Timesheet not found'
          }));

        case 7:
          if (!(timesheet.status !== 'Draft')) {
            _context7.next = 9;
            break;
          }

          return _context7.abrupt("return", res.status(400).json({
            message: 'Only timesheets in Draft status can be approved.'
          }));

        case 9:
          timesheet.status = 'Approved';
          _context7.next = 12;
          return regeneratorRuntime.awrap(timesheet.save());

        case 12:
          return _context7.abrupt("return", res.status(200).json({
            message: 'Timesheet approved successfully',
            timesheet: timesheet
          }));

        case 15:
          _context7.prev = 15;
          _context7.t0 = _context7["catch"](0);
          console.error('Error approving timesheet:', _context7.t0);
          return _context7.abrupt("return", res.status(500).json({
            message: 'Server error approving timesheet'
          }));

        case 19:
        case "end":
          return _context7.stop();
      }
    }
  }, null, null, [[0, 15]]);
};
/**
 * GET /timesheets/template-employees?locationName=xxx or &locationId=xxx
 * Return employees (with default timesheet template values) for a given location.
 */


exports.getEmployeesForLocation = function _callee8(req, res) {
  var _req$query, locationId, locationName, orgId, location, employees, result;

  return regeneratorRuntime.async(function _callee8$(_context8) {
    while (1) {
      switch (_context8.prev = _context8.next) {
        case 0:
          _context8.prev = 0;
          _req$query = req.query, locationId = _req$query.locationId, locationName = _req$query.locationName;
          orgId = req.user.orgId;

          if (!(!locationId && !locationName)) {
            _context8.next = 5;
            break;
          }

          return _context8.abrupt("return", res.status(400).json({
            message: 'Missing locationId or locationName in query params.'
          }));

        case 5:
          if (!(!locationId && locationName)) {
            _context8.next = 14;
            break;
          }

          _context8.next = 8;
          return regeneratorRuntime.awrap(Location.findOne({
            name: new RegExp("^".concat(locationName, "$"), 'i')
          }));

        case 8:
          location = _context8.sent;

          if (location) {
            _context8.next = 11;
            break;
          }

          return _context8.abrupt("return", res.status(404).json({
            message: 'Location not found with the provided name.'
          }));

        case 11:
          locationId = location._id.toString();
          _context8.next = 18;
          break;

        case 14:
          if (!locationId) {
            _context8.next = 18;
            break;
          }

          _context8.next = 17;
          return regeneratorRuntime.awrap(Location.findById(locationId));

        case 17:
          location = _context8.sent;

        case 18:
          _context8.next = 20;
          return regeneratorRuntime.awrap(Employee.find({
            organizationId: orgId,
            $or: [{
              baseLocationId: locationId
            }, {
              locationAccess: locationId
            }]
          }));

        case 20:
          employees = _context8.sent;
          // Build default timesheet row values based on each employee's pay structure.
          // If payStructure.hasDailyRates -> hoursWorked = "N/A", daysWorked = "0", extraShift = "0"
          // If payStructure.hasHourlyRates -> hoursWorked = "0", daysWorked = "N/A", extraShift = "N/A"
          result = employees.map(function (emp) {
            var defaultHoursWorked = 'N/A';
            var defaultDaysWorked = 'N/A';
            var defaultExtraShift = 'N/A';

            if (emp.payStructure) {
              if (emp.payStructure.hasDailyRates) {
                defaultHoursWorked = 'N/A';
                defaultDaysWorked = '0';
                defaultExtraShift = '0';
              } else if (emp.payStructure.hasHourlyRates) {
                defaultHoursWorked = '0';
                defaultDaysWorked = 'N/A';
                defaultExtraShift = 'N/A';
              }
            }

            return {
              employeeName: emp.preferredName || "".concat(emp.firstName, " ").concat(emp.lastName),
              payrollId: emp.payrollId,
              baseLocation: emp.baseLocationId ? emp.baseLocationId.toString() : '',
              hoursWorked: defaultHoursWorked,
              daysWorked: defaultDaysWorked,
              extraShift: defaultExtraShift,
              addition: '0',
              deduction: '0',
              notes: '',
              workLocation: locationId,
              // store the ObjectId as string
              locationName: location ? location.name : 'Unknown'
            };
          });
          return _context8.abrupt("return", res.status(200).json({
            employees: result
          }));

        case 25:
          _context8.prev = 25;
          _context8.t0 = _context8["catch"](0);
          console.error('Error in getEmployeesForLocation:', _context8.t0);
          return _context8.abrupt("return", res.status(500).json({
            message: 'Server error fetching employees.'
          }));

        case 29:
        case "end":
          return _context8.stop();
      }
    }
  }, null, null, [[0, 25]]);
};
/**
 * Batch create a single timesheet with multiple employee entries.
 * Expects a JSON body:
 * {
 *   timesheetName: string,
 *   startDate: string ("DD/MM/YYYY"),
 *   endDate: string ("DD/MM/YYYY"),
 *   workLocation: string,  // location ID or code
 *   entries: [
 *     {
 *       payrollId: string,
 *       hoursWorked: string|number,
 *       daysWorked: string|number,
 *       extraShift: string|number,
 *       addition: string|number,
 *       deduction: string|number,
 *       notes: string
 *       // optionally employeeName, baseLocation, etc.
 *     }, ...
 *   ]
 * }
 */


exports.batchCreateTimesheets = function _callee9(req, res) {
  var orgId, _req$body2, timesheetName, startDate, endDate, workLocation, entries, parsedStart, parsedEnd, parseOrNull, assembledEntries, warnings, _iteratorNormalCompletion2, _didIteratorError2, _iteratorError2, _iterator2, _step2, _step2$value, index, row, emp, newTimesheet;

  return regeneratorRuntime.async(function _callee9$(_context9) {
    while (1) {
      switch (_context9.prev = _context9.next) {
        case 0:
          _context9.prev = 0;
          orgId = req.user.orgId;
          _req$body2 = req.body, timesheetName = _req$body2.timesheetName, startDate = _req$body2.startDate, endDate = _req$body2.endDate, workLocation = _req$body2.workLocation, entries = _req$body2.entries; // Validate required fields

          if (!(!timesheetName || !startDate || !endDate || !workLocation || !Array.isArray(entries))) {
            _context9.next = 5;
            break;
          }

          return _context9.abrupt("return", res.status(400).json({
            message: 'Missing fields: timesheetName, startDate, endDate, workLocation, or entries array.'
          }));

        case 5:
          // Parse dates (DD/MM/YYYY -> Date object)
          parsedStart = dayjs(startDate, 'DD/MM/YYYY').toDate();
          parsedEnd = dayjs(endDate, 'DD/MM/YYYY').toDate();

          if (!(isNaN(parsedStart.getTime()) || isNaN(parsedEnd.getTime()))) {
            _context9.next = 9;
            break;
          }

          return _context9.abrupt("return", res.status(400).json({
            message: 'Invalid startDate or endDate. Use DD/MM/YYYY format.'
          }));

        case 9:
          // Helper: convert "N/A" to null or parse numeric
          parseOrNull = function parseOrNull(val) {
            return val === 'N/A' || val === '' || val == null ? null : Number(val);
          };

          assembledEntries = [];
          warnings = [];
          _iteratorNormalCompletion2 = true;
          _didIteratorError2 = false;
          _iteratorError2 = undefined;
          _context9.prev = 15;
          _iterator2 = entries.entries()[Symbol.iterator]();

        case 17:
          if (_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done) {
            _context9.next = 32;
            break;
          }

          _step2$value = _slicedToArray(_step2.value, 2), index = _step2$value[0], row = _step2$value[1];

          if (row.payrollId) {
            _context9.next = 22;
            break;
          }

          warnings.push("Row ".concat(index + 1, ": Missing payrollId. Entry skipped."));
          return _context9.abrupt("continue", 29);

        case 22:
          _context9.next = 24;
          return regeneratorRuntime.awrap(Employee.findOne({
            payrollId: row.payrollId,
            organizationId: orgId
          }));

        case 24:
          emp = _context9.sent;

          if (emp) {
            _context9.next = 28;
            break;
          }

          warnings.push("Row ".concat(index + 1, ": Employee with payrollId \"").concat(row.payrollId, "\" not found. Skipped."));
          return _context9.abrupt("continue", 29);

        case 28:
          // Build entry
          assembledEntries.push({
            employeeId: emp._id,
            employeeName: emp.preferredName || "".concat(emp.firstName, " ").concat(emp.lastName),
            payrollId: emp.payrollId,
            baseLocation: emp.baseLocationId ? String(emp.baseLocationId) : '',
            hoursWorked: parseOrNull(row.hoursWorked),
            daysWorked: parseOrNull(row.daysWorked),
            extraShiftWorked: parseOrNull(row.extraShift),
            otherCashAddition: parseOrNull(row.addition),
            otherCashDeduction: parseOrNull(row.deduction),
            notes: row.notes && row.notes !== 'N/A' ? row.notes : ''
          });

        case 29:
          _iteratorNormalCompletion2 = true;
          _context9.next = 17;
          break;

        case 32:
          _context9.next = 38;
          break;

        case 34:
          _context9.prev = 34;
          _context9.t0 = _context9["catch"](15);
          _didIteratorError2 = true;
          _iteratorError2 = _context9.t0;

        case 38:
          _context9.prev = 38;
          _context9.prev = 39;

          if (!_iteratorNormalCompletion2 && _iterator2["return"] != null) {
            _iterator2["return"]();
          }

        case 41:
          _context9.prev = 41;

          if (!_didIteratorError2) {
            _context9.next = 44;
            break;
          }

          throw _iteratorError2;

        case 44:
          return _context9.finish(41);

        case 45:
          return _context9.finish(38);

        case 46:
          if (!(assembledEntries.length === 0)) {
            _context9.next = 48;
            break;
          }

          return _context9.abrupt("return", res.status(400).json({
            message: 'No valid entries found in request. Check warnings.',
            warnings: warnings
          }));

        case 48:
          _context9.next = 50;
          return regeneratorRuntime.awrap(Timesheet.create({
            organizationId: orgId,
            timesheetName: timesheetName,
            startDate: parsedStart,
            endDate: parsedEnd,
            locationId: workLocation,
            // or find location by code if needed
            entries: assembledEntries,
            status: 'Draft'
          }));

        case 50:
          newTimesheet = _context9.sent;
          return _context9.abrupt("return", res.status(201).json({
            message: 'Batch timesheet created successfully!',
            timesheet: newTimesheet,
            warnings: warnings
          }));

        case 54:
          _context9.prev = 54;
          _context9.t1 = _context9["catch"](0);
          console.error('Error in batchCreateTimesheets:', _context9.t1);
          return _context9.abrupt("return", res.status(500).json({
            message: 'Server error creating batch timesheets.'
          }));

        case 58:
        case "end":
          return _context9.stop();
      }
    }
  }, null, null, [[0, 54], [15, 34, 38, 46], [39,, 41, 45]]);
}; // Export all


module.exports = {
  createTimesheet: exports.createTimesheet,
  getTimesheets: exports.getTimesheets,
  getTimesheetById: exports.getTimesheetById,
  updateTimesheet: exports.updateTimesheet,
  deleteTimesheet: exports.deleteTimesheet,
  approveTimesheet: exports.approveTimesheet,
  getEmployeesForLocation: exports.getEmployeesForLocation,
  batchCreateTimesheets: exports.batchCreateTimesheets
};