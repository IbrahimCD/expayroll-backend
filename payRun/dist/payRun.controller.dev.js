"use strict";

function _typeof(obj) { if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

// backend/payRun/payrun.controller.js
var PayRun = require('./payRun.model');

var Timesheet = require('../Timesheet/timesheet.model');

var NICTax = require('../NICTax/nictax.model');

var Employee = require('../Employee/employee.model');

var mongoose = require('mongoose');

function hasOverlappingPayRun(orgId, start, end) {
  var overlap;
  return regeneratorRuntime.async(function hasOverlappingPayRun$(_context) {
    while (1) {
      switch (_context.prev = _context.next) {
        case 0:
          _context.next = 2;
          return regeneratorRuntime.awrap(PayRun.findOne({
            organizationId: orgId,
            $or: [{
              startDate: {
                $lte: end
              },
              endDate: {
                $gte: start
              }
            }]
          }));

        case 2:
          overlap = _context.sent;
          return _context.abrupt("return", !!overlap);

        case 4:
        case "end":
          return _context.stop();
      }
    }
  });
}
/**
 * This function calculates the E1..E23 breakdown, plus timesheet allocations (F fields),
 * for a given employee across multiple timesheets & NIC records.
 */


function calculatePayWithAllFormulas(employee, timesheets, nicRecords) {
  // --- Step A: Basic info from employee ---
  var payStruct = employee.payStructure || {};
  var dailyRates = payStruct.dailyRates || {};
  var hourlyRates = payStruct.hourlyRates || {};
  var otherConsiderations = payStruct.otherConsiderations || {}; // --- Step B: Deconstruct pay structure fields ---

  var niDayMode = dailyRates.niDayMode || 'NONE';
  var ni_regularDays = dailyRates.ni_regularDays || 0;
  var ni_regularDayRate = dailyRates.ni_regularDayRate || 0;
  var ni_extraDayRate = dailyRates.ni_extraDayRate || 0;
  var ni_extraShiftRate = dailyRates.ni_extraShiftRate || 0;
  var cashDayMode = dailyRates.cashDayMode || 'NONE';
  var cash_regularDays = dailyRates.cash_regularDays || 0;
  var cash_regularDayRate = dailyRates.cash_regularDayRate || 0;
  var cash_extraDayRate = dailyRates.cash_extraDayRate || 0;
  var cash_extraShiftRate = dailyRates.cash_extraShiftRate || 0;
  var niHoursMode = hourlyRates.niHoursMode || 'NONE';
  var fixedNiHours = hourlyRates.fixedNiHours || 0;
  var minNiHours = hourlyRates.minNiHours || 0;
  var maxNiHours = hourlyRates.maxNiHours || 0;
  var percentageNiHours = hourlyRates.percentageNiHours || 0;
  var niRatePerHour = hourlyRates.niRatePerHour || 0;
  var cashHoursMode = hourlyRates.cashHoursMode || 'NONE';
  var minCashHours = hourlyRates.minCashHours || 0;
  var maxCashHours = hourlyRates.maxCashHours || 0;
  var percentageCashHours = hourlyRates.percentageCashHours || 0;
  var cashRatePerHour = hourlyRates.cashRatePerHour || 0;
  var niAdditions = otherConsiderations.niAdditions || [];
  var niDeductions = otherConsiderations.niDeductions || [];
  var cashAdditions = otherConsiderations.cashAdditions || [];
  var cashDeductions = otherConsiderations.cashDeductions || []; // --- Step C: Aggregate data from Timesheets ---

  var sumHoursWorked = 0;
  var sumDaysWorked = 0;
  var sumExtraShift = 0;
  var sumOtherAdditions = 0;
  var sumOtherDeductions = 0;
  var combinedNotes = [];
  timesheets.forEach(function (ts) {
    var entry = ts.entries.find(function (e) {
      return String(e.employeeId) === String(employee._id);
    });
    if (!entry) return; // Summation of hours/days/shift/etc.

    sumHoursWorked += entry.hoursWorked || 0;
    sumDaysWorked += entry.daysWorked || 0;
    sumExtraShift += entry.extraShiftWorked || 0;
    sumOtherAdditions += entry.otherCashAddition || 0;
    sumOtherDeductions += entry.otherCashDeduction || 0;

    if (entry.notes) {
      combinedNotes.push(entry.notes);
    }
  });
  var notesMerged = combinedNotes.join(', '); // --- Step D: Aggregate data from NIC & Tax ---

  var totalEerNIC = 0;
  var totalEesNIC = 0;
  var totalEesTax = 0;
  nicRecords.forEach(function (doc) {
    var nentry = doc.entries.find(function (e) {
      return String(e.employeeId) === String(employee._id);
    });

    if (nentry) {
      totalEerNIC += nentry.erNIC || 0;
      totalEesNIC += nentry.eesNIC || 0;
      totalEesTax += nentry.eesTax || 0;
    }
  }); // --- Step E: Compute E1..E23 ---

  var E1 = sumHoursWorked;
  var E2 = sumDaysWorked;
  var E3 = sumExtraShift;
  var E4 = sumOtherAdditions;
  var E5 = sumOtherDeductions;
  var E6 = notesMerged; // E7: If niDayMode === 'ALL', we use min(E2, ni_regularDays). Similarly for cash

  var E7 = 0;

  if (niDayMode === 'ALL') {
    E7 = Math.min(ni_regularDays, E2);
  }

  if (cashDayMode === 'ALL') {
    E7 = Math.max(E7, Math.min(cash_regularDays, E2));
  }

  var E8 = E2 - E7;
  if (E8 < 0) E8 = 0;
  var E9 = 0;

  if (niDayMode === 'FIXED') {
    E9 = ni_regularDays * ni_regularDayRate;
  } else if (niDayMode === 'ALL') {
    E9 = E7 * ni_regularDayRate;
  }

  var E10 = 0;

  if (cashDayMode === 'ALL') {
    E10 = E7 * cash_regularDayRate + E8 * cash_extraDayRate;
  }

  var E11 = E9 + E10;
  var E12 = E3 * ni_extraShiftRate + E3 * cash_extraShiftRate; // Hours used (E13, E14)

  var E13 = 0; // NI hours used

  if (niHoursMode === 'FIXED') {
    E13 = fixedNiHours;
  } else if (niHoursMode === 'ALL') {
    E13 = E1;
  } else if (niHoursMode === 'CUSTOM') {
    var customVal = E1 * (percentageNiHours / 100);
    if (customVal < minNiHours) customVal = minNiHours;
    if (maxNiHours > 0 && customVal > maxNiHours) customVal = maxNiHours;
    E13 = customVal;
  } // else if niHoursMode === 'NONE', E13 = 0 by default


  var E14 = 0; // Cash hours used

  if (cashHoursMode === 'REST') {
    E14 = E1 - E13;
    if (E14 < 0) E14 = 0;
  } else if (cashHoursMode === 'ALL') {
    E14 = E1;
  } else if (cashHoursMode === 'CUSTOM') {
    var cVal = E1 * (percentageCashHours / 100);
    if (cVal < minCashHours) cVal = minCashHours;
    if (maxCashHours > 0 && cVal > maxCashHours) cVal = maxCashHours;
    E14 = cVal;
  } // else if cashHoursMode === 'NONE', E14 = 0 by default


  var E15 = E13 * niRatePerHour; // NI hours wage

  var E16 = E14 * cashRatePerHour; // Cash hours wage

  var E17 = E15 + E16; // Gross hours wage

  var sumNiAdditions = niAdditions.reduce(function (acc, a) {
    return acc + (a.amount || 0);
  }, 0);
  var sumNiDeductions = niDeductions.reduce(function (acc, a) {
    return acc + (a.amount || 0);
  }, 0);
  var E18 = E9 + E15 + sumNiAdditions - sumNiDeductions;
  var sumCashAdditions = cashAdditions.reduce(function (acc, a) {
    return acc + (a.amount || 0);
  }, 0);
  var sumCashDeductions = cashDeductions.reduce(function (acc, a) {
    return acc + (a.amount || 0);
  }, 0);
  var E19 = E10 + E12 + E16 + sumCashAdditions - sumCashDeductions;
  var E20 = E18 + E19;
  var E21 = E18 - totalEesNIC - totalEesTax;
  var E22 = E19 + E4 - E5;
  var E23 = E21 + E22;
  if (E23 < 0) E23 = 0; // --- Step F: Build timesheetAllocations (F1..F11) ---

  var locationAllocations = [];
  var bigDenominator = E11 + E17 + E12; // totalCombinedDaysWage + totalCombinedHoursWage + totalCombinedExtraShiftWage

  timesheets.forEach(function (ts) {
    var entry = ts.entries.find(function (e) {
      return String(e.employeeId) === String(employee._id);
    });
    if (!entry) return;
    var tHrs = entry.hoursWorked || 0;
    var tDays = entry.daysWorked || 0;
    var tX = entry.extraShiftWorked || 0;
    var tAdd = entry.otherCashAddition || 0;
    var tDed = entry.otherCashDeduction || 0;
    var hrsRatio = E1 > 0 ? tHrs / E1 : 0;
    var daysRatio = E2 > 0 ? tDays / E2 : 0;
    var shiftRatio = E3 > 0 ? tX / E3 : 0;
    var allocatedHoursWage = E17 * hrsRatio;
    var allocatedDaysWage = E11 * daysRatio;
    var allocatedExtraShiftWage = E12 * shiftRatio;
    var numerator = allocatedHoursWage + allocatedDaysWage + allocatedExtraShiftWage;
    var wageRatio = bigDenominator > 0 ? numerator / bigDenominator : 0;
    var allocatedGrossNIWage = E18 * wageRatio;
    var allocatedGrossCashWage = E19 * wageRatio + (tAdd - tDed);
    var allocatedEerNIC = totalEerNIC * wageRatio;
    var allocatedWageCost = allocatedGrossNIWage + allocatedGrossCashWage + allocatedEerNIC; // Grab the timesheetName and locationName from the doc

    var timesheetName = ts.timesheetName || 'N/A';
    var locationName = ts.locationId && ts.locationId.name ? ts.locationId.name : 'N/A';
    locationAllocations.push({
      timesheetId: ts._id,
      timesheetName: timesheetName,
      // NEW: store the timesheet's name
      locationName: locationName,
      // NEW: store the location name
      F1_hoursRatio: hrsRatio,
      F2_daysRatio: daysRatio,
      F3_extraShiftRatio: shiftRatio,
      F4_allocHoursWage: allocatedHoursWage,
      F5_allocDaysWage: allocatedDaysWage,
      F6_allocExtraShiftWage: allocatedExtraShiftWage,
      F7_wageRatio: wageRatio,
      F8_allocGrossNIWage: allocatedGrossNIWage,
      F9_allocGrossCashWage: allocatedGrossCashWage,
      F10_allocEerNIC: allocatedEerNIC,
      F11_allocWageCost: allocatedWageCost
    });
  });
  return {
    netWage: E23,
    breakdown: {
      E1_totalHours: E1,
      E2_totalDays: E2,
      E3_totalExtraShiftWorked: E3,
      E4_otherWageAdditions: E4,
      E5_otherWageDeductions: E5,
      E6_notes: E6,
      E7_regularDaysUsed: E7,
      E8_extraDaysUsed: E8,
      E9_NIDaysWage: E9,
      E10_cashDaysWage: E10,
      E11_grossDaysWage: E11,
      E12_extraShiftWage: E12,
      E13_NIHoursUsed: E13,
      E14_cashHoursUsed: E14,
      E15_NIHoursWage: E15,
      E16_cashHoursWage: E16,
      E17_grossHoursWage: E17,
      E18_grossNIWage: E18,
      E19_grossCashWage: E19,
      E20_totalGrossWage: E20,
      E21_netNIWage: E21,
      E22_netCashWage: E22,
      E23_totalNetWage: E23,
      D1_eerNIC: totalEerNIC,
      D2_eesNIC: totalEesNIC,
      D3_eesTax: totalEesTax,
      // F array
      timesheetAllocations: locationAllocations
    }
  };
}
/**
 * CREATE Pay Run (with full E-F calculations)
 */


exports.createPayRun = function _callee(req, res) {
  var orgId, _req$body, payRunName, startDate, endDate, notes, start, end, overlap, timesheets, nicDocs, empSet, employees, entries, totalNetPay, _iteratorNormalCompletion, _didIteratorError, _iteratorError, _loop, _iterator, _step, _ret, payRun;

  return regeneratorRuntime.async(function _callee$(_context2) {
    while (1) {
      switch (_context2.prev = _context2.next) {
        case 0:
          _context2.prev = 0;
          orgId = req.user.orgId;
          _req$body = req.body, payRunName = _req$body.payRunName, startDate = _req$body.startDate, endDate = _req$body.endDate, notes = _req$body.notes;

          if (!(!payRunName || !startDate || !endDate)) {
            _context2.next = 5;
            break;
          }

          return _context2.abrupt("return", res.status(400).json({
            message: 'Missing required fields: payRunName, startDate, endDate.'
          }));

        case 5:
          start = new Date(startDate);
          end = new Date(endDate);

          if (!(start > end)) {
            _context2.next = 9;
            break;
          }

          return _context2.abrupt("return", res.status(400).json({
            message: 'Start date cannot be after end date.'
          }));

        case 9:
          _context2.next = 11;
          return regeneratorRuntime.awrap(hasOverlappingPayRun(orgId, start, end));

        case 11:
          overlap = _context2.sent;

          if (!overlap) {
            _context2.next = 14;
            break;
          }

          return _context2.abrupt("return", res.status(400).json({
            message: 'Overlapping pay run date range detected.'
          }));

        case 14:
          _context2.next = 16;
          return regeneratorRuntime.awrap(Timesheet.find({
            organizationId: orgId,
            $or: [{
              startDate: {
                $lte: end
              },
              endDate: {
                $gte: start
              }
            }],
            status: {
              $in: ['Draft', 'Approved', 'Pay Approved']
            }
          }).populate('locationId', 'name'));

        case 16:
          timesheets = _context2.sent;
          _context2.next = 19;
          return regeneratorRuntime.awrap(NICTax.find({
            organizationId: orgId,
            $or: [{
              startDate: {
                $lte: end
              },
              endDate: {
                $gte: start
              }
            }],
            status: {
              $in: ['Draft', 'Approved', 'Pay Approved']
            }
          }));

        case 19:
          nicDocs = _context2.sent;
          // Gather all employees from timesheets + NIC
          empSet = new Set();
          timesheets.forEach(function (ts) {
            ts.entries.forEach(function (e) {
              return empSet.add(String(e.employeeId));
            });
          });
          nicDocs.forEach(function (doc) {
            doc.entries.forEach(function (e) {
              return empSet.add(String(e.employeeId));
            });
          });
          _context2.next = 25;
          return regeneratorRuntime.awrap(Employee.find({
            _id: {
              $in: Array.from(empSet)
            }
          }));

        case 25:
          employees = _context2.sent;
          entries = [];
          totalNetPay = 0;
          _iteratorNormalCompletion = true;
          _didIteratorError = false;
          _iteratorError = undefined;
          _context2.prev = 31;

          _loop = function _loop() {
            var emp = _step.value;
            var relevantTimesheets = timesheets.filter(function (ts) {
              return ts.entries.some(function (ent) {
                return String(ent.employeeId) === String(emp._id);
              });
            });
            var relevantNIC = nicDocs.filter(function (doc) {
              return doc.entries.some(function (ent) {
                return String(ent.employeeId) === String(emp._id);
              });
            });

            if (!emp.payStructure) {
              return {
                v: res.status(400).json({
                  message: "Employee ".concat(emp._id, " has no pay structure. Cannot create payrun.")
                })
              };
            } // Calculate E-F breakdown


            var result = calculatePayWithAllFormulas(emp, relevantTimesheets, relevantNIC); // Build the "contributingTimesheets" array for reference

            var contributingTimesheets = relevantTimesheets.map(function (ts) {
              var entry = ts.entries.find(function (e) {
                return String(e.employeeId) === String(emp._id);
              });
              if (!entry) return null;
              return {
                timesheetName: ts.timesheetName || 'N/A',
                hoursWorked: entry.hoursWorked || 0,
                daysWorked: entry.daysWorked || 0,
                extraShiftWorked: entry.extraShiftWorked || 0,
                addition: entry.otherCashAddition || 0,
                deduction: entry.otherCashDeduction || 0,
                notes: entry.notes || ''
              };
            }).filter(Boolean);
            entries.push({
              employeeId: emp._id,
              employeeName: emp.preferredName || "".concat(emp.firstName, " ").concat(emp.lastName),
              payrollId: emp.payrollId,
              payStructure: emp.payStructure,
              rawTimesheetIds: relevantTimesheets.map(function (t) {
                return t._id;
              }),
              rawNICTaxIds: relevantNIC.map(function (n) {
                return n._id;
              }),
              netWage: result.netWage,
              breakdown: result.breakdown,
              needsUpdate: false,
              contributingTimesheets: contributingTimesheets
            });
            totalNetPay += result.netWage;
          };

          _iterator = employees[Symbol.iterator]();

        case 34:
          if (_iteratorNormalCompletion = (_step = _iterator.next()).done) {
            _context2.next = 41;
            break;
          }

          _ret = _loop();

          if (!(_typeof(_ret) === "object")) {
            _context2.next = 38;
            break;
          }

          return _context2.abrupt("return", _ret.v);

        case 38:
          _iteratorNormalCompletion = true;
          _context2.next = 34;
          break;

        case 41:
          _context2.next = 47;
          break;

        case 43:
          _context2.prev = 43;
          _context2.t0 = _context2["catch"](31);
          _didIteratorError = true;
          _iteratorError = _context2.t0;

        case 47:
          _context2.prev = 47;
          _context2.prev = 48;

          if (!_iteratorNormalCompletion && _iterator["return"] != null) {
            _iterator["return"]();
          }

        case 50:
          _context2.prev = 50;

          if (!_didIteratorError) {
            _context2.next = 53;
            break;
          }

          throw _iteratorError;

        case 53:
          return _context2.finish(50);

        case 54:
          return _context2.finish(47);

        case 55:
          _context2.next = 57;
          return regeneratorRuntime.awrap(PayRun.create({
            organizationId: orgId,
            payRunName: payRunName,
            startDate: start,
            endDate: end,
            notes: notes || '',
            status: 'Draft',
            needsRecalculation: false,
            totalNetPay: totalNetPay,
            entries: entries
          }));

        case 57:
          payRun = _context2.sent;
          return _context2.abrupt("return", res.status(201).json({
            message: 'Pay Run created successfully (Draft).',
            payRun: payRun
          }));

        case 61:
          _context2.prev = 61;
          _context2.t1 = _context2["catch"](0);
          console.error('Error creating pay run:', _context2.t1);
          return _context2.abrupt("return", res.status(500).json({
            message: 'Server error creating pay run.'
          }));

        case 65:
        case "end":
          return _context2.stop();
      }
    }
  }, null, null, [[0, 61], [31, 43, 47, 55], [48,, 50, 54]]);
};
/**
 * GET Pay Runs (with filtering and pagination)
 */


exports.getPayRuns = function _callee2(req, res) {
  var orgId, _req$query, _req$query$page, page, _req$query$limit, limit, search, status, startDate, endDate, query, s, e, total, docs;

  return regeneratorRuntime.async(function _callee2$(_context3) {
    while (1) {
      switch (_context3.prev = _context3.next) {
        case 0:
          _context3.prev = 0;
          orgId = req.user.orgId;
          _req$query = req.query, _req$query$page = _req$query.page, page = _req$query$page === void 0 ? 1 : _req$query$page, _req$query$limit = _req$query.limit, limit = _req$query$limit === void 0 ? 10 : _req$query$limit, search = _req$query.search, status = _req$query.status, startDate = _req$query.startDate, endDate = _req$query.endDate;
          page = parseInt(page);
          limit = parseInt(limit);
          query = {
            organizationId: orgId
          }; // Search filter

          if (search) {
            query.$or = [{
              payRunName: {
                $regex: search,
                $options: 'i'
              }
            }, {
              notes: {
                $regex: search,
                $options: 'i'
              }
            }];
          } // Status filter


          if (status) {
            query.status = status;
          } // Date range filter (overlapping date range)


          if (startDate && endDate) {
            s = new Date(startDate);
            e = new Date(endDate);
            query.$and = [{
              startDate: {
                $lte: e
              }
            }, {
              endDate: {
                $gte: s
              }
            }];
          } else if (startDate) {
            query.startDate = {
              $gte: new Date(startDate)
            };
          } else if (endDate) {
            query.endDate = {
              $lte: new Date(endDate)
            };
          }

          _context3.next = 11;
          return regeneratorRuntime.awrap(PayRun.countDocuments(query));

        case 11:
          total = _context3.sent;
          _context3.next = 14;
          return regeneratorRuntime.awrap(PayRun.find(query).sort({
            createdAt: -1
          }).skip((page - 1) * limit).limit(limit));

        case 14:
          docs = _context3.sent;
          return _context3.abrupt("return", res.status(200).json({
            data: docs,
            pagination: {
              total: total,
              page: page,
              pages: Math.ceil(total / limit),
              limit: limit
            }
          }));

        case 18:
          _context3.prev = 18;
          _context3.t0 = _context3["catch"](0);
          console.error('Error fetching pay runs:', _context3.t0);
          return _context3.abrupt("return", res.status(500).json({
            message: 'Server error fetching pay runs.'
          }));

        case 22:
        case "end":
          return _context3.stop();
      }
    }
  }, null, null, [[0, 18]]);
};
/**
 * GET single pay run
 */


exports.getPayRunById = function _callee3(req, res) {
  var payRunId, orgId, payrun;
  return regeneratorRuntime.async(function _callee3$(_context4) {
    while (1) {
      switch (_context4.prev = _context4.next) {
        case 0:
          _context4.prev = 0;
          payRunId = req.params.payRunId;
          orgId = req.user.orgId;
          _context4.next = 5;
          return regeneratorRuntime.awrap(PayRun.findOne({
            _id: payRunId,
            organizationId: orgId
          }));

        case 5:
          payrun = _context4.sent;

          if (payrun) {
            _context4.next = 8;
            break;
          }

          return _context4.abrupt("return", res.status(404).json({
            message: 'Pay Run not found.'
          }));

        case 8:
          return _context4.abrupt("return", res.status(200).json({
            payrun: payrun
          }));

        case 11:
          _context4.prev = 11;
          _context4.t0 = _context4["catch"](0);
          console.error('Error getting pay run by id:', _context4.t0);
          return _context4.abrupt("return", res.status(500).json({
            message: 'Server error getting pay run.'
          }));

        case 15:
        case "end":
          return _context4.stop();
      }
    }
  }, null, null, [[0, 11]]);
};
/**
 * RECALCULATE Pay Run (if still Draft and needs update).
 * Re-run the entire aggregator so that E/F computations get updated.
 */


exports.recalcPayRun = function _callee4(req, res) {
  var payRunId, orgId, payrun, _timesheets, _nicDocs, _totalNetPay, newEntries, _iteratorNormalCompletion2, _didIteratorError2, _iteratorError2, _loop2, _iterator2, _step2, _ret2;

  return regeneratorRuntime.async(function _callee4$(_context6) {
    while (1) {
      switch (_context6.prev = _context6.next) {
        case 0:
          _context6.prev = 0;
          payRunId = req.params.payRunId;
          orgId = req.user.orgId;
          _context6.next = 5;
          return regeneratorRuntime.awrap(PayRun.findOne({
            _id: payRunId,
            organizationId: orgId
          }));

        case 5:
          payrun = _context6.sent;

          if (payrun) {
            _context6.next = 8;
            break;
          }

          return _context6.abrupt("return", res.status(404).json({
            message: 'Pay Run not found.'
          }));

        case 8:
          if (!(payrun.status !== 'Draft')) {
            _context6.next = 10;
            break;
          }

          return _context6.abrupt("return", res.status(400).json({
            message: 'Only Draft pay runs can be recalculated.'
          }));

        case 10:
          _context6.next = 12;
          return regeneratorRuntime.awrap(Timesheet.find({
            organizationId: orgId,
            $or: [{
              startDate: {
                $lte: payrun.endDate
              },
              endDate: {
                $gte: payrun.startDate
              }
            }]
          }).populate('locationId', 'name'));

        case 12:
          _timesheets = _context6.sent;
          _context6.next = 15;
          return regeneratorRuntime.awrap(NICTax.find({
            organizationId: orgId,
            $or: [{
              startDate: {
                $lte: payrun.endDate
              },
              endDate: {
                $gte: payrun.startDate
              }
            }]
          }));

        case 15:
          _nicDocs = _context6.sent;
          _totalNetPay = 0;
          newEntries = [];
          _iteratorNormalCompletion2 = true;
          _didIteratorError2 = false;
          _iteratorError2 = undefined;
          _context6.prev = 21;

          _loop2 = function _loop2() {
            var entry, empId, emp, relevantTimesheets, relevantNIC, result, contributingTimesheets;
            return regeneratorRuntime.async(function _loop2$(_context5) {
              while (1) {
                switch (_context5.prev = _context5.next) {
                  case 0:
                    entry = _step2.value;
                    empId = entry.employeeId;
                    _context5.next = 4;
                    return regeneratorRuntime.awrap(Employee.findById(empId));

                  case 4:
                    emp = _context5.sent;

                    if (emp) {
                      _context5.next = 7;
                      break;
                    }

                    return _context5.abrupt("return", "continue");

                  case 7:
                    relevantTimesheets = _timesheets.filter(function (ts) {
                      return ts.entries.some(function (e) {
                        return String(e.employeeId) === String(empId);
                      });
                    });
                    relevantNIC = _nicDocs.filter(function (doc) {
                      return doc.entries.some(function (e) {
                        return String(e.employeeId) === String(empId);
                      });
                    });

                    if (emp.payStructure) {
                      _context5.next = 11;
                      break;
                    }

                    return _context5.abrupt("return", {
                      v: res.status(400).json({
                        message: "Employee ".concat(emp._id, " missing pay structure. Recalc halted.")
                      })
                    });

                  case 11:
                    // Recompute E-F breakdown
                    result = calculatePayWithAllFormulas(emp, relevantTimesheets, relevantNIC); // Build new "contributingTimesheets"

                    contributingTimesheets = relevantTimesheets.map(function (ts) {
                      var tsEntry = ts.entries.find(function (e) {
                        return String(e.employeeId) === String(empId);
                      });
                      if (!tsEntry) return null;
                      return {
                        timesheetName: ts.timesheetName || 'N/A',
                        hoursWorked: tsEntry.hoursWorked || 0,
                        daysWorked: tsEntry.daysWorked || 0,
                        extraShiftWorked: tsEntry.extraShiftWorked || 0,
                        addition: tsEntry.otherCashAddition || 0,
                        deduction: tsEntry.otherCashDeduction || 0,
                        notes: tsEntry.notes || ''
                      };
                    }).filter(Boolean);
                    newEntries.push({
                      employeeId: empId,
                      employeeName: emp.preferredName || "".concat(emp.firstName, " ").concat(emp.lastName),
                      payrollId: emp.payrollId,
                      payStructure: emp.payStructure,
                      rawTimesheetIds: relevantTimesheets.map(function (t) {
                        return t._id;
                      }),
                      rawNICTaxIds: relevantNIC.map(function (n) {
                        return n._id;
                      }),
                      netWage: result.netWage,
                      breakdown: result.breakdown,
                      needsUpdate: false,
                      contributingTimesheets: contributingTimesheets
                    });
                    _totalNetPay += result.netWage;

                  case 15:
                  case "end":
                    return _context5.stop();
                }
              }
            });
          };

          _iterator2 = payrun.entries[Symbol.iterator]();

        case 24:
          if (_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done) {
            _context6.next = 37;
            break;
          }

          _context6.next = 27;
          return regeneratorRuntime.awrap(_loop2());

        case 27:
          _ret2 = _context6.sent;
          _context6.t0 = _ret2;
          _context6.next = _context6.t0 === "continue" ? 31 : 32;
          break;

        case 31:
          return _context6.abrupt("continue", 34);

        case 32:
          if (!(_typeof(_ret2) === "object")) {
            _context6.next = 34;
            break;
          }

          return _context6.abrupt("return", _ret2.v);

        case 34:
          _iteratorNormalCompletion2 = true;
          _context6.next = 24;
          break;

        case 37:
          _context6.next = 43;
          break;

        case 39:
          _context6.prev = 39;
          _context6.t1 = _context6["catch"](21);
          _didIteratorError2 = true;
          _iteratorError2 = _context6.t1;

        case 43:
          _context6.prev = 43;
          _context6.prev = 44;

          if (!_iteratorNormalCompletion2 && _iterator2["return"] != null) {
            _iterator2["return"]();
          }

        case 46:
          _context6.prev = 46;

          if (!_didIteratorError2) {
            _context6.next = 49;
            break;
          }

          throw _iteratorError2;

        case 49:
          return _context6.finish(46);

        case 50:
          return _context6.finish(43);

        case 51:
          payrun.entries = newEntries;
          payrun.totalNetPay = _totalNetPay;
          payrun.needsRecalculation = false;
          _context6.next = 56;
          return regeneratorRuntime.awrap(payrun.save());

        case 56:
          return _context6.abrupt("return", res.status(200).json({
            message: 'Pay Run recalculated successfully.',
            payrun: payrun
          }));

        case 59:
          _context6.prev = 59;
          _context6.t2 = _context6["catch"](0);
          console.error('Error recalculating pay run:', _context6.t2);
          return _context6.abrupt("return", res.status(500).json({
            message: 'Server error recalculating pay run.'
          }));

        case 63:
        case "end":
          return _context6.stop();
      }
    }
  }, null, null, [[0, 59], [21, 39, 43, 51], [44,, 46, 50]]);
};
/**
 * APPROVE pay run (Draft -> Approved).
 */


exports.approvePayRun = function _callee5(req, res) {
  var payRunId, orgId, payrun, _iteratorNormalCompletion3, _didIteratorError3, _iteratorError3, _iterator3, _step3, ent, tsIds, nicIds;

  return regeneratorRuntime.async(function _callee5$(_context7) {
    while (1) {
      switch (_context7.prev = _context7.next) {
        case 0:
          _context7.prev = 0;
          payRunId = req.params.payRunId;
          orgId = req.user.orgId;
          _context7.next = 5;
          return regeneratorRuntime.awrap(PayRun.findOne({
            _id: payRunId,
            organizationId: orgId
          }));

        case 5:
          payrun = _context7.sent;

          if (payrun) {
            _context7.next = 8;
            break;
          }

          return _context7.abrupt("return", res.status(404).json({
            message: 'Pay Run not found.'
          }));

        case 8:
          if (!(payrun.status !== 'Draft')) {
            _context7.next = 10;
            break;
          }

          return _context7.abrupt("return", res.status(400).json({
            message: 'Only Draft pay runs can be approved.'
          }));

        case 10:
          _iteratorNormalCompletion3 = true;
          _didIteratorError3 = false;
          _iteratorError3 = undefined;
          _context7.prev = 13;
          _iterator3 = payrun.entries[Symbol.iterator]();

        case 15:
          if (_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done) {
            _context7.next = 28;
            break;
          }

          ent = _step3.value;
          tsIds = ent.rawTimesheetIds || [];
          nicIds = ent.rawNICTaxIds || [];

          if (!tsIds.length) {
            _context7.next = 22;
            break;
          }

          _context7.next = 22;
          return regeneratorRuntime.awrap(Timesheet.updateMany({
            _id: {
              $in: tsIds
            },
            organizationId: orgId,
            status: 'Approved'
          }, {
            status: 'Pay Approved'
          }));

        case 22:
          if (!nicIds.length) {
            _context7.next = 25;
            break;
          }

          _context7.next = 25;
          return regeneratorRuntime.awrap(NICTax.updateMany({
            _id: {
              $in: nicIds
            },
            organizationId: orgId,
            status: 'Approved'
          }, {
            status: 'Pay Approved'
          }));

        case 25:
          _iteratorNormalCompletion3 = true;
          _context7.next = 15;
          break;

        case 28:
          _context7.next = 34;
          break;

        case 30:
          _context7.prev = 30;
          _context7.t0 = _context7["catch"](13);
          _didIteratorError3 = true;
          _iteratorError3 = _context7.t0;

        case 34:
          _context7.prev = 34;
          _context7.prev = 35;

          if (!_iteratorNormalCompletion3 && _iterator3["return"] != null) {
            _iterator3["return"]();
          }

        case 37:
          _context7.prev = 37;

          if (!_didIteratorError3) {
            _context7.next = 40;
            break;
          }

          throw _iteratorError3;

        case 40:
          return _context7.finish(37);

        case 41:
          return _context7.finish(34);

        case 42:
          payrun.status = 'Approved';
          _context7.next = 45;
          return regeneratorRuntime.awrap(payrun.save());

        case 45:
          return _context7.abrupt("return", res.status(200).json({
            message: 'Pay Run approved successfully.',
            payrun: payrun
          }));

        case 48:
          _context7.prev = 48;
          _context7.t1 = _context7["catch"](0);
          console.error('Error approving pay run:', _context7.t1);
          return _context7.abrupt("return", res.status(500).json({
            message: 'Server error approving pay run.'
          }));

        case 52:
        case "end":
          return _context7.stop();
      }
    }
  }, null, null, [[0, 48], [13, 30, 34, 42], [35,, 37, 41]]);
};
/**
 * REVERT pay run to Draft (Approved -> Draft).
 */


exports.revertPayRun = function _callee6(req, res) {
  var payRunId, orgId, payrun, _iteratorNormalCompletion4, _didIteratorError4, _iteratorError4, _iterator4, _step4, ent, tsIds, nicIds;

  return regeneratorRuntime.async(function _callee6$(_context8) {
    while (1) {
      switch (_context8.prev = _context8.next) {
        case 0:
          _context8.prev = 0;
          payRunId = req.params.payRunId;
          orgId = req.user.orgId;
          _context8.next = 5;
          return regeneratorRuntime.awrap(PayRun.findOne({
            _id: payRunId,
            organizationId: orgId
          }));

        case 5:
          payrun = _context8.sent;

          if (payrun) {
            _context8.next = 8;
            break;
          }

          return _context8.abrupt("return", res.status(404).json({
            message: 'Pay Run not found.'
          }));

        case 8:
          if (!(payrun.status !== 'Approved')) {
            _context8.next = 10;
            break;
          }

          return _context8.abrupt("return", res.status(400).json({
            message: 'Only Approved pay runs can be reverted to Draft.'
          }));

        case 10:
          _iteratorNormalCompletion4 = true;
          _didIteratorError4 = false;
          _iteratorError4 = undefined;
          _context8.prev = 13;
          _iterator4 = payrun.entries[Symbol.iterator]();

        case 15:
          if (_iteratorNormalCompletion4 = (_step4 = _iterator4.next()).done) {
            _context8.next = 28;
            break;
          }

          ent = _step4.value;
          tsIds = ent.rawTimesheetIds || [];
          nicIds = ent.rawNICTaxIds || [];

          if (!tsIds.length) {
            _context8.next = 22;
            break;
          }

          _context8.next = 22;
          return regeneratorRuntime.awrap(Timesheet.updateMany({
            _id: {
              $in: tsIds
            },
            organizationId: orgId,
            status: 'Pay Approved'
          }, {
            status: 'Approved'
          }));

        case 22:
          if (!nicIds.length) {
            _context8.next = 25;
            break;
          }

          _context8.next = 25;
          return regeneratorRuntime.awrap(NICTax.updateMany({
            _id: {
              $in: nicIds
            },
            organizationId: orgId,
            status: 'Pay Approved'
          }, {
            status: 'Approved'
          }));

        case 25:
          _iteratorNormalCompletion4 = true;
          _context8.next = 15;
          break;

        case 28:
          _context8.next = 34;
          break;

        case 30:
          _context8.prev = 30;
          _context8.t0 = _context8["catch"](13);
          _didIteratorError4 = true;
          _iteratorError4 = _context8.t0;

        case 34:
          _context8.prev = 34;
          _context8.prev = 35;

          if (!_iteratorNormalCompletion4 && _iterator4["return"] != null) {
            _iterator4["return"]();
          }

        case 37:
          _context8.prev = 37;

          if (!_didIteratorError4) {
            _context8.next = 40;
            break;
          }

          throw _iteratorError4;

        case 40:
          return _context8.finish(37);

        case 41:
          return _context8.finish(34);

        case 42:
          payrun.status = 'Draft';
          _context8.next = 45;
          return regeneratorRuntime.awrap(payrun.save());

        case 45:
          return _context8.abrupt("return", res.status(200).json({
            message: 'Pay Run reverted to Draft successfully.',
            payrun: payrun
          }));

        case 48:
          _context8.prev = 48;
          _context8.t1 = _context8["catch"](0);
          console.error('Error reverting pay run:', _context8.t1);
          return _context8.abrupt("return", res.status(500).json({
            message: 'Server error reverting pay run.'
          }));

        case 52:
        case "end":
          return _context8.stop();
      }
    }
  }, null, null, [[0, 48], [13, 30, 34, 42], [35,, 37, 41]]);
};
/**
 * MARK pay run as Paid (Approved -> Paid).
 */


exports.markPayRunAsPaid = function _callee7(req, res) {
  var payRunId, orgId, payrun;
  return regeneratorRuntime.async(function _callee7$(_context9) {
    while (1) {
      switch (_context9.prev = _context9.next) {
        case 0:
          _context9.prev = 0;
          payRunId = req.params.payRunId;
          orgId = req.user.orgId;
          _context9.next = 5;
          return regeneratorRuntime.awrap(PayRun.findOne({
            _id: payRunId,
            organizationId: orgId
          }));

        case 5:
          payrun = _context9.sent;

          if (payrun) {
            _context9.next = 8;
            break;
          }

          return _context9.abrupt("return", res.status(404).json({
            message: 'Pay Run not found.'
          }));

        case 8:
          if (!(payrun.status !== 'Approved')) {
            _context9.next = 10;
            break;
          }

          return _context9.abrupt("return", res.status(400).json({
            message: 'Only an Approved pay run can be marked as Paid.'
          }));

        case 10:
          payrun.status = 'Paid';
          _context9.next = 13;
          return regeneratorRuntime.awrap(payrun.save());

        case 13:
          return _context9.abrupt("return", res.status(200).json({
            message: 'Pay Run marked as Paid successfully.',
            payrun: payrun
          }));

        case 16:
          _context9.prev = 16;
          _context9.t0 = _context9["catch"](0);
          console.error('Error marking pay run as paid:', _context9.t0);
          return _context9.abrupt("return", res.status(500).json({
            message: 'Server error marking pay run as paid.'
          }));

        case 20:
        case "end":
          return _context9.stop();
      }
    }
  }, null, null, [[0, 16]]);
};
/**
 * UPDATE pay run (for fields such as name, notes, or date range changes).
 */


exports.updatePayRun = function _callee8(req, res) {
  var payRunId, orgId, updates, payrun;
  return regeneratorRuntime.async(function _callee8$(_context10) {
    while (1) {
      switch (_context10.prev = _context10.next) {
        case 0:
          _context10.prev = 0;
          payRunId = req.params.payRunId;
          orgId = req.user.orgId;
          updates = req.body;
          _context10.next = 6;
          return regeneratorRuntime.awrap(PayRun.findOne({
            _id: payRunId,
            organizationId: orgId
          }));

        case 6:
          payrun = _context10.sent;

          if (payrun) {
            _context10.next = 9;
            break;
          }

          return _context10.abrupt("return", res.status(404).json({
            message: 'Pay Run not found.'
          }));

        case 9:
          if (updates.payRunName) {
            payrun.payRunName = updates.payRunName;
          }

          if (updates.notes) {
            payrun.notes = updates.notes;
          }

          if (updates.startDate) {
            payrun.startDate = new Date(updates.startDate);
          }

          if (updates.endDate) {
            payrun.endDate = new Date(updates.endDate);
          }

          _context10.next = 15;
          return regeneratorRuntime.awrap(payrun.save());

        case 15:
          return _context10.abrupt("return", res.status(200).json({
            message: 'Pay Run updated successfully.',
            payrun: payrun
          }));

        case 18:
          _context10.prev = 18;
          _context10.t0 = _context10["catch"](0);
          console.error('Error updating pay run:', _context10.t0);
          return _context10.abrupt("return", res.status(500).json({
            message: 'Server error updating pay run.'
          }));

        case 22:
        case "end":
          return _context10.stop();
      }
    }
  }, null, null, [[0, 18]]);
};
/**
 * DELETE pay run (only if Draft).
 */


exports.deletePayRun = function _callee9(req, res) {
  var payRunId, orgId, payrun;
  return regeneratorRuntime.async(function _callee9$(_context11) {
    while (1) {
      switch (_context11.prev = _context11.next) {
        case 0:
          _context11.prev = 0;
          payRunId = req.params.payRunId;
          orgId = req.user.orgId;
          _context11.next = 5;
          return regeneratorRuntime.awrap(PayRun.findOne({
            _id: payRunId,
            organizationId: orgId
          }));

        case 5:
          payrun = _context11.sent;

          if (payrun) {
            _context11.next = 8;
            break;
          }

          return _context11.abrupt("return", res.status(404).json({
            message: 'Pay Run not found or already removed.'
          }));

        case 8:
          if (!(payrun.status !== 'Draft')) {
            _context11.next = 10;
            break;
          }

          return _context11.abrupt("return", res.status(400).json({
            message: 'Cannot delete pay run that is not Draft.'
          }));

        case 10:
          _context11.next = 12;
          return regeneratorRuntime.awrap(PayRun.deleteOne({
            _id: payRunId,
            organizationId: orgId
          }));

        case 12:
          return _context11.abrupt("return", res.status(200).json({
            message: 'Pay Run deleted successfully.'
          }));

        case 15:
          _context11.prev = 15;
          _context11.t0 = _context11["catch"](0);
          console.error('Error deleting pay run:', _context11.t0);
          return _context11.abrupt("return", res.status(500).json({
            message: 'Server error deleting pay run.'
          }));

        case 19:
        case "end":
          return _context11.stop();
      }
    }
  }, null, null, [[0, 15]]);
}; // New function to export PayRun details as CSV


exports.exportPayRunCSV = function _callee10(req, res) {
  var payRunId, orgId, payRun, headers, csvRows, _iteratorNormalCompletion5, _didIteratorError5, _iteratorError5, _iterator5, _step5, entry, row, psName, bd, allocations, csvString;

  return regeneratorRuntime.async(function _callee10$(_context12) {
    while (1) {
      switch (_context12.prev = _context12.next) {
        case 0:
          _context12.prev = 0;
          payRunId = req.params.payRunId;
          orgId = req.user.orgId;

          if (payRunId) {
            _context12.next = 5;
            break;
          }

          return _context12.abrupt("return", res.status(400).json({
            message: 'Missing payRunId in parameters.'
          }));

        case 5:
          _context12.next = 7;
          return regeneratorRuntime.awrap(PayRun.findOne({
            _id: payRunId,
            organizationId: orgId
          }));

        case 7:
          payRun = _context12.sent;

          if (payRun) {
            _context12.next = 10;
            break;
          }

          return _context12.abrupt("return", res.status(404).json({
            message: 'Pay Run not found.'
          }));

        case 10:
          // Create header row – adjust the columns as needed.
          headers = ["PayRunName", "PayRunStartDate", "PayRunEndDate", "PayRunStatus", "EmployeeName", "PayrollID", "PayStructureName", "Breakdown_E1_totalHours", "Breakdown_E2_totalDays", "Breakdown_E9_NIDaysWage", "Breakdown_E10_cashDaysWage", "Breakdown_E11_grossDaysWage", "Breakdown_E12_extraShiftWage", "Breakdown_E13_NIHoursUsed", "Breakdown_E14_cashHoursUsed", "Breakdown_E15_NIHoursWage", "Breakdown_E16_cashHoursWage", "Breakdown_E17_grossHoursWage", "Breakdown_E18_grossNIWage", "Breakdown_E19_grossCashWage", "Breakdown_E20_totalGrossWage", "Breakdown_E21_netNIWage", "Breakdown_E22_netCashWage", "Breakdown_E23_totalNetWage", "Breakdown_D1_eerNIC", "Breakdown_D2_eesNIC", "Breakdown_D3_eesTax", "ContributingTimesheets", "TimesheetAllocations"]; // Prepare an array to hold CSV rows.

          csvRows = [];
          csvRows.push(headers.join(",")); // Loop over each pay run entry to flatten the data.

          _iteratorNormalCompletion5 = true;
          _didIteratorError5 = false;
          _iteratorError5 = undefined;
          _context12.prev = 16;

          for (_iterator5 = payRun.entries[Symbol.iterator](); !(_iteratorNormalCompletion5 = (_step5 = _iterator5.next()).done); _iteratorNormalCompletion5 = true) {
            entry = _step5.value;
            row = []; // Add pay run-level info.

            row.push("\"".concat(payRun.payRunName, "\""));
            row.push("\"".concat(new Date(payRun.startDate).toISOString().split('T')[0], "\""));
            row.push("\"".concat(new Date(payRun.endDate).toISOString().split('T')[0], "\""));
            row.push("\"".concat(payRun.status, "\"")); // Employee data from the entry.

            row.push("\"".concat(entry.employeeName, "\""));
            row.push("\"".concat(entry.payrollId, "\"")); // Use payStructure if available

            psName = "";

            if (entry.payStructure && entry.payStructure.payStructureName) {
              psName = entry.payStructure.payStructureName;
            }

            row.push("\"".concat(psName, "\"")); // Breakdown fields (if breakdown exists, otherwise default to 0)

            bd = entry.breakdown || {};
            row.push(bd.E1_totalHours || 0);
            row.push(bd.E2_totalDays || 0);
            row.push(bd.E9_NIDaysWage || 0);
            row.push(bd.E10_cashDaysWage || 0);
            row.push(bd.E11_grossDaysWage || 0);
            row.push(bd.E12_extraShiftWage || 0);
            row.push(bd.E13_NIHoursUsed || 0);
            row.push(bd.E14_cashHoursUsed || 0);
            row.push(bd.E15_NIHoursWage || 0);
            row.push(bd.E16_cashHoursWage || 0);
            row.push(bd.E17_grossHoursWage || 0);
            row.push(bd.E18_grossNIWage || 0);
            row.push(bd.E19_grossCashWage || 0);
            row.push(bd.E20_totalGrossWage || 0);
            row.push(bd.E21_netNIWage || 0);
            row.push(bd.E22_netCashWage || 0);
            row.push(bd.E23_totalNetWage || 0);
            row.push(bd.D1_eerNIC || 0);
            row.push(bd.D2_eesNIC || 0);
            row.push(bd.D3_eesTax || 0); // Contributing timesheets – convert the array to a JSON string.

            row.push("\"".concat(JSON.stringify(entry.contributingTimesheets || []), "\"")); // Timesheet allocations from breakdown (if any).

            allocations = bd.timesheetAllocations && bd.timesheetAllocations.length > 0 ? bd.timesheetAllocations : [];
            row.push("\"".concat(JSON.stringify(allocations), "\""));
            csvRows.push(row.join(","));
          }

          _context12.next = 24;
          break;

        case 20:
          _context12.prev = 20;
          _context12.t0 = _context12["catch"](16);
          _didIteratorError5 = true;
          _iteratorError5 = _context12.t0;

        case 24:
          _context12.prev = 24;
          _context12.prev = 25;

          if (!_iteratorNormalCompletion5 && _iterator5["return"] != null) {
            _iterator5["return"]();
          }

        case 27:
          _context12.prev = 27;

          if (!_didIteratorError5) {
            _context12.next = 30;
            break;
          }

          throw _iteratorError5;

        case 30:
          return _context12.finish(27);

        case 31:
          return _context12.finish(24);

        case 32:
          csvString = csvRows.join("\n"); // Set headers so the browser treats this response as a file download.

          res.header("Content-Type", "text/csv");
          res.attachment("PayRun_".concat(payRun.payRunName.replace(/ /g, "_"), ".csv"));
          return _context12.abrupt("return", res.send(csvString));

        case 38:
          _context12.prev = 38;
          _context12.t1 = _context12["catch"](0);
          console.error("Error exporting pay run CSV:", _context12.t1);
          return _context12.abrupt("return", res.status(500).json({
            message: "Server error exporting pay run CSV."
          }));

        case 42:
        case "end":
          return _context12.stop();
      }
    }
  }, null, null, [[0, 38], [16, 20, 24, 32], [25,, 27, 31]]);
}; // (Keep the rest of your controller functions unchanged)