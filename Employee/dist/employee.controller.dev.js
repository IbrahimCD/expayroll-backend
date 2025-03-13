"use strict";

function _slicedToArray(arr, i) { return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _nonIterableRest(); }

function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance"); }

function _iterableToArrayLimit(arr, i) { if (!(Symbol.iterator in Object(arr) || Object.prototype.toString.call(arr) === "[object Arguments]")) { return; } var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"] != null) _i["return"](); } finally { if (_d) throw _e; } } return _arr; }

function _arrayWithHoles(arr) { if (Array.isArray(arr)) return arr; }

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(source, true).forEach(function (key) { _defineProperty(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(source).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

// backend/Employee/employee.controller.js
var Employee = require('./employee.model');

var Location = require('../Location/location.model');
/**
 * Create a new employee.
 * The organizationId is taken from req.user.orgId.
 */


exports.createEmployee = function _callee(req, res) {
  var payload, dr, employee;
  return regeneratorRuntime.async(function _callee$(_context) {
    while (1) {
      switch (_context.prev = _context.next) {
        case 0:
          _context.prev = 0;
          // Merge organizationId from the token into the payload:
          payload = _objectSpread({}, req.body, {
            organizationId: req.user.orgId
          }); // --- NEW: If payStructure provided, ensure otherConsiderations arrays exist. ---

          if (payload.payStructure) {
            // Process payStructure.dailyRates if provided (using your new nested structure)
            if (payload.payStructure.dailyRates) {
              dr = payload.payStructure.dailyRates; // Process NI Daily Rates based on niDayMode

              if (dr.niDayMode === 'NONE') {
                dr.niRates = {
                  regularDays: 0,
                  regularDayRate: 0,
                  extraDayRate: 0,
                  extraShiftRate: 0
                };
              } else if (dr.niDayMode === 'FIXED') {
                dr.niRates = dr.niRates || {};
                dr.niRates.extraDayRate = 0;
                dr.niRates.extraShiftRate = 0;
              } // Process Cash Daily Rates based on cashDayMode


              if (dr.cashDayMode === 'NONE') {
                dr.cashRates = {
                  regularDays: 0,
                  regularDayRate: 0,
                  extraDayRate: 0,
                  extraShiftRate: 0
                };
              }
            } // --- Make sure otherConsiderations is well-formed if hasOtherConsiderations is true ---


            if (payload.payStructure.hasOtherConsiderations) {
              if (!payload.payStructure.otherConsiderations) {
                payload.payStructure.otherConsiderations = {};
              } // Default arrays if not provided


              payload.payStructure.otherConsiderations.niAdditions = payload.payStructure.otherConsiderations.niAdditions || [];
              payload.payStructure.otherConsiderations.niDeductions = payload.payStructure.otherConsiderations.niDeductions || [];
              payload.payStructure.otherConsiderations.cashAdditions = payload.payStructure.otherConsiderations.cashAdditions || [];
              payload.payStructure.otherConsiderations.cashDeductions = payload.payStructure.otherConsiderations.cashDeductions || [];
            }
          }

          _context.next = 5;
          return regeneratorRuntime.awrap(Employee.create(payload));

        case 5:
          employee = _context.sent;
          return _context.abrupt("return", res.status(201).json({
            message: 'Employee created successfully',
            employee: employee
          }));

        case 9:
          _context.prev = 9;
          _context.t0 = _context["catch"](0);
          console.error('Error creating employee:', _context.t0);
          return _context.abrupt("return", res.status(500).json({
            message: 'Server error creating employee'
          }));

        case 13:
        case "end":
          return _context.stop();
      }
    }
  }, null, null, [[0, 9]]);
};
/**
 * Get employees with search, filtering, and pagination.
 */


exports.getEmployees = function _callee2(req, res) {
  var _req$query, _req$query$search, search, _req$query$page, page, _req$query$limit, limit, status, payStructure, query, skip, employeesPromise, countPromise, _ref, _ref2, employees, total, totalPages;

  return regeneratorRuntime.async(function _callee2$(_context2) {
    while (1) {
      switch (_context2.prev = _context2.next) {
        case 0:
          _context2.prev = 0;
          _req$query = req.query, _req$query$search = _req$query.search, search = _req$query$search === void 0 ? '' : _req$query$search, _req$query$page = _req$query.page, page = _req$query$page === void 0 ? 1 : _req$query$page, _req$query$limit = _req$query.limit, limit = _req$query$limit === void 0 ? 200 : _req$query$limit, status = _req$query.status, payStructure = _req$query.payStructure;
          query = {
            organizationId: req.user.orgId
          }; // If search is provided, apply to name fields

          if (search) {
            query.$or = [{
              firstName: {
                $regex: search,
                $options: 'i'
              }
            }, {
              lastName: {
                $regex: search,
                $options: 'i'
              }
            }, {
              preferredName: {
                $regex: search,
                $options: 'i'
              }
            }];
          } // If a payStructure filter is provided, add an AND condition on payStructure.payStructureName


          if (payStructure) {
            query["payStructure.payStructureName"] = {
              $regex: payStructure,
              $options: 'i'
            };
          }

          if (status) {
            query.status = status;
          }

          skip = (Number(page) - 1) * Number(limit);
          employeesPromise = Employee.find(query).skip(skip).limit(Number(limit));
          countPromise = Employee.countDocuments(query);
          _context2.next = 11;
          return regeneratorRuntime.awrap(Promise.all([employeesPromise, countPromise]));

        case 11:
          _ref = _context2.sent;
          _ref2 = _slicedToArray(_ref, 2);
          employees = _ref2[0];
          total = _ref2[1];
          totalPages = Math.ceil(total / Number(limit));
          return _context2.abrupt("return", res.status(200).json({
            employees: employees,
            totalPages: totalPages
          }));

        case 19:
          _context2.prev = 19;
          _context2.t0 = _context2["catch"](0);
          console.error('Error fetching employees:', _context2.t0);
          return _context2.abrupt("return", res.status(500).json({
            message: 'Server error fetching employees'
          }));

        case 23:
        case "end":
          return _context2.stop();
      }
    }
  }, null, null, [[0, 19]]);
};
/**
 * Get a single employee by ID.
 */


exports.getEmployeeById = function _callee3(req, res) {
  var employeeId, employee;
  return regeneratorRuntime.async(function _callee3$(_context3) {
    while (1) {
      switch (_context3.prev = _context3.next) {
        case 0:
          _context3.prev = 0;
          employeeId = req.params.employeeId;
          _context3.next = 4;
          return regeneratorRuntime.awrap(Employee.findOne({
            _id: employeeId,
            organizationId: req.user.orgId
          }));

        case 4:
          employee = _context3.sent;

          if (employee) {
            _context3.next = 7;
            break;
          }

          return _context3.abrupt("return", res.status(404).json({
            message: 'Employee not found'
          }));

        case 7:
          return _context3.abrupt("return", res.status(200).json({
            employee: employee
          }));

        case 10:
          _context3.prev = 10;
          _context3.t0 = _context3["catch"](0);
          console.error('Error fetching employee:', _context3.t0);
          return _context3.abrupt("return", res.status(500).json({
            message: 'Server error fetching employee'
          }));

        case 14:
        case "end":
          return _context3.stop();
      }
    }
  }, null, null, [[0, 10]]);
};
/**
 * Update an employee by ID.
 */


exports.updateEmployee = function _callee4(req, res) {
  var employeeId, updates, dr, employee;
  return regeneratorRuntime.async(function _callee4$(_context4) {
    while (1) {
      switch (_context4.prev = _context4.next) {
        case 0:
          _context4.prev = 0;
          employeeId = req.params.employeeId;
          updates = req.body; // --- If payStructure present, do dailyRates logic + ensure otherConsiderations arrays. ---

          if (updates.payStructure) {
            if (updates.payStructure.dailyRates) {
              dr = updates.payStructure.dailyRates; // NI Daily Rates

              if (dr.niDayMode === 'NONE') {
                dr.niRates = {
                  regularDays: 0,
                  regularDayRate: 0,
                  extraDayRate: 0,
                  extraShiftRate: 0
                };
              } else if (dr.niDayMode === 'FIXED') {
                dr.niRates = dr.niRates || {};
                dr.niRates.extraDayRate = 0;
                dr.niRates.extraShiftRate = 0;
              } // Cash Daily Rates


              if (dr.cashDayMode === 'NONE') {
                dr.cashRates = {
                  regularDays: 0,
                  regularDayRate: 0,
                  extraDayRate: 0,
                  extraShiftRate: 0
                };
              }
            } // If hasOtherConsiderations, ensure arrays exist


            if (updates.payStructure.hasOtherConsiderations) {
              if (!updates.payStructure.otherConsiderations) {
                updates.payStructure.otherConsiderations = {};
              }

              updates.payStructure.otherConsiderations.niAdditions = updates.payStructure.otherConsiderations.niAdditions || [];
              updates.payStructure.otherConsiderations.niDeductions = updates.payStructure.otherConsiderations.niDeductions || [];
              updates.payStructure.otherConsiderations.cashAdditions = updates.payStructure.otherConsiderations.cashAdditions || [];
              updates.payStructure.otherConsiderations.cashDeductions = updates.payStructure.otherConsiderations.cashDeductions || [];
            }
          }

          _context4.next = 6;
          return regeneratorRuntime.awrap(Employee.findOneAndUpdate({
            _id: employeeId,
            organizationId: req.user.orgId
          }, updates, {
            "new": true
          }));

        case 6:
          employee = _context4.sent;

          if (employee) {
            _context4.next = 9;
            break;
          }

          return _context4.abrupt("return", res.status(404).json({
            message: 'Employee not found'
          }));

        case 9:
          return _context4.abrupt("return", res.status(200).json({
            message: 'Employee updated successfully',
            employee: employee
          }));

        case 12:
          _context4.prev = 12;
          _context4.t0 = _context4["catch"](0);
          console.error('Error updating employee:', _context4.t0);
          return _context4.abrupt("return", res.status(500).json({
            message: 'Server error updating employee'
          }));

        case 16:
        case "end":
          return _context4.stop();
      }
    }
  }, null, null, [[0, 12]]);
};
/**
 * Delete an employee by ID.
 */


exports.deleteEmployee = function _callee5(req, res) {
  var employeeId, employee;
  return regeneratorRuntime.async(function _callee5$(_context5) {
    while (1) {
      switch (_context5.prev = _context5.next) {
        case 0:
          _context5.prev = 0;
          employeeId = req.params.employeeId;
          _context5.next = 4;
          return regeneratorRuntime.awrap(Employee.findOneAndDelete({
            _id: employeeId,
            organizationId: req.user.orgId
          }));

        case 4:
          employee = _context5.sent;

          if (employee) {
            _context5.next = 7;
            break;
          }

          return _context5.abrupt("return", res.status(404).json({
            message: 'Employee not found'
          }));

        case 7:
          return _context5.abrupt("return", res.status(200).json({
            message: 'Employee deleted successfully'
          }));

        case 10:
          _context5.prev = 10;
          _context5.t0 = _context5["catch"](0);
          console.error('Error deleting employee:', _context5.t0);
          return _context5.abrupt("return", res.status(500).json({
            message: 'Server error deleting employee'
          }));

        case 14:
        case "end":
          return _context5.stop();
      }
    }
  }, null, null, [[0, 10]]);
}; // ------------------------------------
// Batch Create / Batch Update
// ------------------------------------


var locationCache = {}; // { [locationCode]: ObjectId }

function getLocationIdByCode(orgId, code) {
  var trimmedCode, loc;
  return regeneratorRuntime.async(function getLocationIdByCode$(_context6) {
    while (1) {
      switch (_context6.prev = _context6.next) {
        case 0:
          trimmedCode = (code || '').trim();

          if (trimmedCode) {
            _context6.next = 3;
            break;
          }

          return _context6.abrupt("return", null);

        case 3:
          if (!locationCache[trimmedCode]) {
            _context6.next = 5;
            break;
          }

          return _context6.abrupt("return", locationCache[trimmedCode]);

        case 5:
          _context6.next = 7;
          return regeneratorRuntime.awrap(Location.findOne({
            organizationId: orgId,
            code: trimmedCode
          }));

        case 7:
          loc = _context6.sent;

          if (loc) {
            _context6.next = 10;
            break;
          }

          throw new Error("Location with code \"".concat(trimmedCode, "\" not found."));

        case 10:
          locationCache[trimmedCode] = loc._id;
          return _context6.abrupt("return", loc._id);

        case 12:
        case "end":
          return _context6.stop();
      }
    }
  });
} // Helper to parse "Name:amount;Name2:amount2" into array


function parsePairs(str) {
  if (!str) return [];
  return str.split(';').map(function (item) {
    if (item.includes(':')) {
      var _item$split = item.split(':'),
          _item$split2 = _slicedToArray(_item$split, 2),
          rawName = _item$split2[0],
          rawAmt = _item$split2[1];

      return {
        name: (rawName || '').trim(),
        amount: Number(rawAmt) || 0
      };
    } else {
      // No colon found: treat the whole item as the amount.
      return {
        name: '',
        // or you could set a default like 'Other'
        amount: Number(item) || 0
      };
    }
  });
}
/**
 * Batch create employees.
 * Expects req.body.employees to be an array of employee objects parsed from CSV.
 */


exports.batchCreateEmployees = function _callee6(req, res) {
  var orgId, employees, createdEmployees, _iteratorNormalCompletion, _didIteratorError, _iteratorError, _loop, _iterator, _step;

  return regeneratorRuntime.async(function _callee6$(_context8) {
    while (1) {
      switch (_context8.prev = _context8.next) {
        case 0:
          _context8.prev = 0;
          orgId = req.user.orgId;
          employees = req.body.employees;

          if (!(!employees || !Array.isArray(employees))) {
            _context8.next = 5;
            break;
          }

          return _context8.abrupt("return", res.status(400).json({
            message: 'Invalid employees data.'
          }));

        case 5:
          createdEmployees = [];
          _iteratorNormalCompletion = true;
          _didIteratorError = false;
          _iteratorError = undefined;
          _context8.prev = 9;

          _loop = function _loop() {
            var empData, locId, codes, accessIds, _iteratorNormalCompletion2, _didIteratorError2, _iteratorError2, _iterator2, _step2, code, _locId, newEmp;

            return regeneratorRuntime.async(function _loop$(_context7) {
              while (1) {
                switch (_context7.prev = _context7.next) {
                  case 0:
                    empData = _step.value;
                    empData.organizationId = orgId; // Convert baseLocationId from code to ObjectId

                    if (!empData.baseLocationId) {
                      _context7.next = 7;
                      break;
                    }

                    _context7.next = 5;
                    return regeneratorRuntime.awrap(getLocationIdByCode(orgId, empData.baseLocationId));

                  case 5:
                    locId = _context7.sent;
                    empData.baseLocationId = locId;

                  case 7:
                    if (!(empData.locationAccess && typeof empData.locationAccess === 'string')) {
                      _context7.next = 39;
                      break;
                    }

                    codes = empData.locationAccess.split(';').map(function (s) {
                      return s.trim();
                    }).filter(Boolean);
                    accessIds = [];
                    _iteratorNormalCompletion2 = true;
                    _didIteratorError2 = false;
                    _iteratorError2 = undefined;
                    _context7.prev = 13;
                    _iterator2 = codes[Symbol.iterator]();

                  case 15:
                    if (_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done) {
                      _context7.next = 24;
                      break;
                    }

                    code = _step2.value;
                    _context7.next = 19;
                    return regeneratorRuntime.awrap(getLocationIdByCode(orgId, code));

                  case 19:
                    _locId = _context7.sent;
                    accessIds.push(_locId);

                  case 21:
                    _iteratorNormalCompletion2 = true;
                    _context7.next = 15;
                    break;

                  case 24:
                    _context7.next = 30;
                    break;

                  case 26:
                    _context7.prev = 26;
                    _context7.t0 = _context7["catch"](13);
                    _didIteratorError2 = true;
                    _iteratorError2 = _context7.t0;

                  case 30:
                    _context7.prev = 30;
                    _context7.prev = 31;

                    if (!_iteratorNormalCompletion2 && _iterator2["return"] != null) {
                      _iterator2["return"]();
                    }

                  case 33:
                    _context7.prev = 33;

                    if (!_didIteratorError2) {
                      _context7.next = 36;
                      break;
                    }

                    throw _iteratorError2;

                  case 36:
                    return _context7.finish(33);

                  case 37:
                    return _context7.finish(30);

                  case 38:
                    empData.locationAccess = accessIds;

                  case 39:
                    // Convert string booleans
                    if (typeof empData.hasDailyRates === 'string') {
                      empData.hasDailyRates = empData.hasDailyRates.toLowerCase() === 'true';
                    }

                    if (typeof empData.hasHourlyRates === 'string') {
                      empData.hasHourlyRates = empData.hasHourlyRates.toLowerCase() === 'true';
                    }

                    if (typeof empData.hasOtherConsiderations === 'string') {
                      empData.hasOtherConsiderations = empData.hasOtherConsiderations.toLowerCase() === 'true';
                    } // Build payStructure


                    empData.payStructure = {
                      payStructureName: empData.payStructureName || '',
                      hasDailyRates: empData.hasDailyRates,
                      dailyRates: {
                        niDayMode: empData.niDayMode || 'NONE',
                        ni_regularDays: Number(empData.ni_regularDays) || 0,
                        ni_regularDayRate: Number(empData.ni_regularDayRate) || 0,
                        ni_extraDayRate: Number(empData.ni_extraDayRate) || 0,
                        ni_extraShiftRate: Number(empData.ni_extraShiftRate) || 0,
                        cashDayMode: empData.cashDayMode || 'NONE',
                        cash_regularDays: Number(empData.cash_regularDays) || 0,
                        cash_regularDayRate: Number(empData.cash_regularDayRate) || 0,
                        cash_extraDayRate: Number(empData.cash_extraDayRate) || 0,
                        cash_extraShiftRate: Number(empData.cash_extraShiftRate) || 0
                      },
                      hasHourlyRates: empData.hasHourlyRates,
                      hourlyRates: {
                        niHoursMode: empData.niHoursMode || 'NONE',
                        minNiHours: Number(empData.minNiHours) || 0,
                        maxNiHours: Number(empData.maxNiHours) || 0,
                        percentageNiHours: Number(empData.percentageNiHours) || 0,
                        niRatePerHour: Number(empData.niRatePerHour) || 0,
                        fixedNiHours: Number(empData.fixedNiHours) || 0,
                        cashHoursMode: empData.cashHoursMode || 'NONE',
                        minCashHours: Number(empData.minCashHours) || 0,
                        maxCashHours: Number(empData.maxCashHours) || 0,
                        percentageCashHours: Number(empData.percentageCashHours) || 0,
                        cashRatePerHour: Number(empData.cashRatePerHour) || 0
                      },
                      hasOtherConsiderations: empData.hasOtherConsiderations,
                      otherConsiderations: {
                        note: empData.note || '',
                        niAdditions: parsePairs(empData.niAdditions),
                        niDeductions: parsePairs(empData.niDeductions),
                        cashAdditions: parsePairs(empData.cashAdditions),
                        cashDeductions: parsePairs(empData.cashDeductions)
                      }
                    }; // Remove flat fields so they aren’t duplicated in the payload

                    ['payStructureName', 'niDayMode', 'ni_regularDays', 'ni_regularDayRate', 'ni_extraDayRate', 'ni_extraShiftRate', 'cashDayMode', 'cash_regularDays', 'cash_regularDayRate', 'cash_extraDayRate', 'cash_extraShiftRate', 'hasHourlyRates', 'niHoursMode', 'minNiHours', 'maxNiHours', 'percentageNiHours', 'niRatePerHour', 'fixedNiHours', 'cashHoursMode', 'minCashHours', 'maxCashHours', 'percentageCashHours', 'cashRatePerHour', 'hasOtherConsiderations', 'note', 'niAdditions', 'niDeductions', 'cashAdditions', 'cashDeductions'].forEach(function (field) {
                      return delete empData[field];
                    });
                    _context7.next = 46;
                    return regeneratorRuntime.awrap(Employee.create(empData));

                  case 46:
                    newEmp = _context7.sent;
                    createdEmployees.push(newEmp);

                  case 48:
                  case "end":
                    return _context7.stop();
                }
              }
            }, null, null, [[13, 26, 30, 38], [31,, 33, 37]]);
          };

          _iterator = employees[Symbol.iterator]();

        case 12:
          if (_iteratorNormalCompletion = (_step = _iterator.next()).done) {
            _context8.next = 18;
            break;
          }

          _context8.next = 15;
          return regeneratorRuntime.awrap(_loop());

        case 15:
          _iteratorNormalCompletion = true;
          _context8.next = 12;
          break;

        case 18:
          _context8.next = 24;
          break;

        case 20:
          _context8.prev = 20;
          _context8.t0 = _context8["catch"](9);
          _didIteratorError = true;
          _iteratorError = _context8.t0;

        case 24:
          _context8.prev = 24;
          _context8.prev = 25;

          if (!_iteratorNormalCompletion && _iterator["return"] != null) {
            _iterator["return"]();
          }

        case 27:
          _context8.prev = 27;

          if (!_didIteratorError) {
            _context8.next = 30;
            break;
          }

          throw _iteratorError;

        case 30:
          return _context8.finish(27);

        case 31:
          return _context8.finish(24);

        case 32:
          return _context8.abrupt("return", res.status(201).json({
            message: "Batch create successful. Created ".concat(createdEmployees.length, " employees."),
            employees: createdEmployees
          }));

        case 35:
          _context8.prev = 35;
          _context8.t1 = _context8["catch"](0);
          console.error('Error in batch creating employees:', _context8.t1);
          return _context8.abrupt("return", res.status(500).json({
            message: 'Error in batch creating employees',
            error: _context8.t1.message
          }));

        case 39:
        case "end":
          return _context8.stop();
      }
    }
  }, null, null, [[0, 35], [9, 20, 24, 32], [25,, 27, 31]]);
};
/**
 * Batch Update Employees.
 * Expects req.body.employees to be an array of employee objects.
 * Each object must include an "employeeId" field and the fields to update.
 */


exports.batchUpdateEmployees = function _callee7(req, res) {
  var _orgId, employees, updatedEmployees, _iteratorNormalCompletion3, _didIteratorError3, _iteratorError3, _loop2, _iterator3, _step3;

  return regeneratorRuntime.async(function _callee7$(_context10) {
    while (1) {
      switch (_context10.prev = _context10.next) {
        case 0:
          _context10.prev = 0;
          _orgId = req.user.orgId;
          employees = req.body.employees;

          if (!(!employees || !Array.isArray(employees))) {
            _context10.next = 5;
            break;
          }

          return _context10.abrupt("return", res.status(400).json({
            message: 'Invalid employees data.'
          }));

        case 5:
          updatedEmployees = [];
          _iteratorNormalCompletion3 = true;
          _didIteratorError3 = false;
          _iteratorError3 = undefined;
          _context10.prev = 9;

          _loop2 = function _loop2() {
            var updateData, locId, codes, accessIds, _iteratorNormalCompletion4, _didIteratorError4, _iteratorError4, _iterator4, _step4, code, _locId2, updatedEmp;

            return regeneratorRuntime.async(function _loop2$(_context9) {
              while (1) {
                switch (_context9.prev = _context9.next) {
                  case 0:
                    updateData = _step3.value;

                    if (updateData.employeeId) {
                      _context9.next = 3;
                      break;
                    }

                    throw new Error('EmployeeId is missing in one of the update rows.');

                  case 3:
                    if (!updateData.baseLocationId) {
                      _context9.next = 8;
                      break;
                    }

                    _context9.next = 6;
                    return regeneratorRuntime.awrap(getLocationIdByCode(_orgId, updateData.baseLocationId));

                  case 6:
                    locId = _context9.sent;
                    updateData.baseLocationId = locId;

                  case 8:
                    if (!(updateData.locationAccess && typeof updateData.locationAccess === 'string')) {
                      _context9.next = 40;
                      break;
                    }

                    codes = updateData.locationAccess.split(';').map(function (s) {
                      return s.trim();
                    }).filter(Boolean);
                    accessIds = [];
                    _iteratorNormalCompletion4 = true;
                    _didIteratorError4 = false;
                    _iteratorError4 = undefined;
                    _context9.prev = 14;
                    _iterator4 = codes[Symbol.iterator]();

                  case 16:
                    if (_iteratorNormalCompletion4 = (_step4 = _iterator4.next()).done) {
                      _context9.next = 25;
                      break;
                    }

                    code = _step4.value;
                    _context9.next = 20;
                    return regeneratorRuntime.awrap(getLocationIdByCode(_orgId, code));

                  case 20:
                    _locId2 = _context9.sent;
                    accessIds.push(_locId2);

                  case 22:
                    _iteratorNormalCompletion4 = true;
                    _context9.next = 16;
                    break;

                  case 25:
                    _context9.next = 31;
                    break;

                  case 27:
                    _context9.prev = 27;
                    _context9.t0 = _context9["catch"](14);
                    _didIteratorError4 = true;
                    _iteratorError4 = _context9.t0;

                  case 31:
                    _context9.prev = 31;
                    _context9.prev = 32;

                    if (!_iteratorNormalCompletion4 && _iterator4["return"] != null) {
                      _iterator4["return"]();
                    }

                  case 34:
                    _context9.prev = 34;

                    if (!_didIteratorError4) {
                      _context9.next = 37;
                      break;
                    }

                    throw _iteratorError4;

                  case 37:
                    return _context9.finish(34);

                  case 38:
                    return _context9.finish(31);

                  case 39:
                    updateData.locationAccess = accessIds;

                  case 40:
                    // Convert string booleans to actual booleans
                    if (typeof updateData.hasDailyRates === 'string') {
                      updateData.hasDailyRates = updateData.hasDailyRates.toLowerCase() === 'true';
                    }

                    if (typeof updateData.hasHourlyRates === 'string') {
                      updateData.hasHourlyRates = updateData.hasHourlyRates.toLowerCase() === 'true';
                    }

                    if (typeof updateData.hasOtherConsiderations === 'string') {
                      updateData.hasOtherConsiderations = updateData.hasOtherConsiderations.toLowerCase() === 'true';
                    } // If any pay structure related fields exist, nest them into payStructure


                    if (updateData.payStructureName || updateData.niDayMode || updateData.ni_regularDays || updateData.ni_regularDayRate || updateData.ni_extraDayRate || updateData.ni_extraShiftRate || updateData.cashDayMode || updateData.cash_regularDays || updateData.cash_regularDayRate || updateData.cash_extraDayRate || updateData.cash_extraShiftRate || updateData.hasHourlyRates || updateData.niHoursMode || updateData.minNiHours || updateData.maxNiHours || updateData.percentageNiHours || updateData.niRatePerHour || updateData.fixedNiHours || updateData.cashHoursMode || updateData.minCashHours || updateData.maxCashHours || updateData.percentageCashHours || updateData.cashRatePerHour || updateData.hasOtherConsiderations || updateData.note || updateData.niAdditions || updateData.niDeductions || updateData.cashAdditions || updateData.cashDeductions) {
                      updateData.payStructure = {
                        payStructureName: updateData.payStructureName || '',
                        hasDailyRates: updateData.hasDailyRates,
                        dailyRates: {
                          niDayMode: updateData.niDayMode || 'NONE',
                          ni_regularDays: Number(updateData.ni_regularDays) || 0,
                          ni_regularDayRate: Number(updateData.ni_regularDayRate) || 0,
                          ni_extraDayRate: Number(updateData.ni_extraDayRate) || 0,
                          ni_extraShiftRate: Number(updateData.ni_extraShiftRate) || 0,
                          cashDayMode: updateData.cashDayMode || 'NONE',
                          cash_regularDays: Number(updateData.cash_regularDays) || 0,
                          cash_regularDayRate: Number(updateData.cash_regularDayRate) || 0,
                          cash_extraDayRate: Number(updateData.cash_extraDayRate) || 0,
                          cash_extraShiftRate: Number(updateData.cash_extraShiftRate) || 0
                        },
                        hasHourlyRates: updateData.hasHourlyRates,
                        hourlyRates: {
                          niHoursMode: updateData.niHoursMode || 'NONE',
                          minNiHours: Number(updateData.minNiHours) || 0,
                          maxNiHours: Number(updateData.maxNiHours) || 0,
                          percentageNiHours: Number(updateData.percentageNiHours) || 0,
                          niRatePerHour: Number(updateData.niRatePerHour) || 0,
                          fixedNiHours: Number(updateData.fixedNiHours) || 0,
                          cashHoursMode: updateData.cashHoursMode || 'NONE',
                          minCashHours: Number(updateData.minCashHours) || 0,
                          maxCashHours: Number(updateData.maxCashHours) || 0,
                          percentageCashHours: Number(updateData.percentageCashHours) || 0,
                          cashRatePerHour: Number(updateData.cashRatePerHour) || 0
                        },
                        hasOtherConsiderations: updateData.hasOtherConsiderations,
                        otherConsiderations: {
                          note: updateData.note || '',
                          niAdditions: parsePairs(updateData.niAdditions),
                          niDeductions: parsePairs(updateData.niDeductions),
                          cashAdditions: parsePairs(updateData.cashAdditions),
                          cashDeductions: parsePairs(updateData.cashDeductions)
                        }
                      };
                    } // Remove flat fields so they won’t be duplicated in the payload


                    ['payStructureName', 'niDayMode', 'ni_regularDays', 'ni_regularDayRate', 'ni_extraDayRate', 'ni_extraShiftRate', 'cashDayMode', 'cash_regularDays', 'cash_regularDayRate', 'cash_extraDayRate', 'cash_extraShiftRate', 'hasHourlyRates', 'niHoursMode', 'minNiHours', 'maxNiHours', 'percentageNiHours', 'niRatePerHour', 'fixedNiHours', 'cashHoursMode', 'minCashHours', 'maxCashHours', 'percentageCashHours', 'cashRatePerHour', 'hasOtherConsiderations', 'note', 'niAdditions', 'niDeductions', 'cashAdditions', 'cashDeductions'].forEach(function (field) {
                      return delete updateData[field];
                    });
                    _context9.next = 47;
                    return regeneratorRuntime.awrap(Employee.findOneAndUpdate({
                      _id: updateData.employeeId,
                      organizationId: _orgId
                    }, {
                      $set: updateData
                    }, {
                      "new": true
                    }));

                  case 47:
                    updatedEmp = _context9.sent;

                    if (updatedEmp) {
                      updatedEmployees.push(updatedEmp);
                    }

                  case 49:
                  case "end":
                    return _context9.stop();
                }
              }
            }, null, null, [[14, 27, 31, 39], [32,, 34, 38]]);
          };

          _iterator3 = employees[Symbol.iterator]();

        case 12:
          if (_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done) {
            _context10.next = 18;
            break;
          }

          _context10.next = 15;
          return regeneratorRuntime.awrap(_loop2());

        case 15:
          _iteratorNormalCompletion3 = true;
          _context10.next = 12;
          break;

        case 18:
          _context10.next = 24;
          break;

        case 20:
          _context10.prev = 20;
          _context10.t0 = _context10["catch"](9);
          _didIteratorError3 = true;
          _iteratorError3 = _context10.t0;

        case 24:
          _context10.prev = 24;
          _context10.prev = 25;

          if (!_iteratorNormalCompletion3 && _iterator3["return"] != null) {
            _iterator3["return"]();
          }

        case 27:
          _context10.prev = 27;

          if (!_didIteratorError3) {
            _context10.next = 30;
            break;
          }

          throw _iteratorError3;

        case 30:
          return _context10.finish(27);

        case 31:
          return _context10.finish(24);

        case 32:
          return _context10.abrupt("return", res.status(200).json({
            message: "Batch update successful. Updated ".concat(updatedEmployees.length, " employees."),
            employees: updatedEmployees
          }));

        case 35:
          _context10.prev = 35;
          _context10.t1 = _context10["catch"](0);
          console.error('Error in batch updating employees:', _context10.t1);
          return _context10.abrupt("return", res.status(500).json({
            message: 'Error in batch updating employees',
            error: _context10.t1.message
          }));

        case 39:
        case "end":
          return _context10.stop();
      }
    }
  }, null, null, [[0, 35], [9, 20, 24, 32], [25,, 27, 31]]);
};