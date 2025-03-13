"use strict";

function _toConsumableArray(arr) { return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _nonIterableSpread(); }

function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance"); }

function _iterableToArray(iter) { if (Symbol.iterator in Object(iter) || Object.prototype.toString.call(iter) === "[object Arguments]") return Array.from(iter); }

function _arrayWithoutHoles(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = new Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } }

var PayRun = require('../payRun/payRun.model');

var Employee = require('../Employee/employee.model');

var Location = require('../Location/location.model');

exports.generateEmployeeWageReport = function _callee(req, res) {
  var payRunId, orgId, payRun, employeeIds, employees, employeeMap, baseLocationIds, uniqueLocationIds, locations, locationMap, reportRows;
  return regeneratorRuntime.async(function _callee$(_context) {
    while (1) {
      switch (_context.prev = _context.next) {
        case 0:
          _context.prev = 0;
          payRunId = req.query.payRunId;
          orgId = req.user.orgId;

          if (payRunId) {
            _context.next = 5;
            break;
          }

          return _context.abrupt("return", res.status(400).json({
            message: 'Missing payRunId in query parameters.'
          }));

        case 5:
          _context.next = 7;
          return regeneratorRuntime.awrap(PayRun.findOne({
            _id: payRunId,
            organizationId: orgId
          }).lean());

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
          // Get all employeeIds from the pay run entries
          employeeIds = payRun.entries.map(function (entry) {
            return entry.employeeId;
          }).filter(function (id) {
            return !!id;
          }); // Batch fetch employees for these IDs

          _context.next = 13;
          return regeneratorRuntime.awrap(Employee.find({
            _id: {
              $in: employeeIds
            }
          }).lean());

        case 13:
          employees = _context.sent;
          employeeMap = {};
          employees.forEach(function (emp) {
            employeeMap[emp._id.toString()] = emp;
          }); // Collect unique baseLocationIds from the fetched employees

          baseLocationIds = employees.filter(function (emp) {
            return emp.baseLocationId;
          }).map(function (emp) {
            return emp.baseLocationId.toString();
          });
          uniqueLocationIds = _toConsumableArray(new Set(baseLocationIds)); // Batch fetch locations for these IDs

          _context.next = 20;
          return regeneratorRuntime.awrap(Location.find({
            _id: {
              $in: uniqueLocationIds
            }
          }).lean());

        case 20:
          locations = _context.sent;
          locationMap = {};
          locations.forEach(function (loc) {
            locationMap[loc._id.toString()] = loc;
          }); // Build the report rows using map (synchronously)

          reportRows = payRun.entries.map(function (entry) {
            // Lookup employee using the pre-fetched map
            var employee = employeeMap[entry.employeeId] || null;
            var firstName = '',
                lastName = '';

            if (employee) {
              firstName = employee.firstName || '';
              lastName = employee.lastName || '';
            } else if (entry.employeeName) {
              var parts = entry.employeeName.split(' ');
              firstName = parts[0];
              lastName = parts.slice(1).join(' ');
            }

            var payrollId = entry.payrollId || ''; // Determine baseLocation: if entry already has it, use it; otherwise lookup employee's baseLocationId

            var baseLocation = entry.baseLocation || '';

            if (!baseLocation && employee && employee.baseLocationId) {
              var loc = locationMap[employee.baseLocationId.toString()];
              baseLocation = loc ? loc.name || '' : '';
            } // Extract computed fields from the pay run entry's breakdown.


            var breakdown = entry.breakdown || {};
            var niDayWage = breakdown.E9_NIDaysWage || 0;
            var niHoursUsed = breakdown.E13_NIHoursUsed || 0;
            var netNIWage = breakdown.E21_netNIWage || 0;
            var netCashWage = breakdown.E22_netCashWage || 0; // Get NI Regular Day Rate and NI Hours Rate from employee pay structure.

            var niRegularDayRate = 0;
            var niHoursRate = 0;

            if (employee && employee.payStructure) {
              if (employee.payStructure.dailyRates) {
                niRegularDayRate = employee.payStructure.dailyRates.ni_regularDayRate || 0;
              }

              if (employee.payStructure.hourlyRates) {
                niHoursRate = employee.payStructure.hourlyRates.niRatePerHour || 0;
              }
            }

            return {
              firstName: firstName,
              lastName: lastName,
              payrollId: payrollId,
              baseLocation: baseLocation,
              niDayWage: niDayWage,
              niRegularDayRate: niRegularDayRate,
              niHoursUsed: niHoursUsed,
              niHoursRate: niHoursRate,
              netNIWage: netNIWage,
              netCashWage: netCashWage
            };
          });
          return _context.abrupt("return", res.status(200).json({
            report: reportRows
          }));

        case 27:
          _context.prev = 27;
          _context.t0 = _context["catch"](0);
          console.error('Error generating employee wage report:', _context.t0);
          return _context.abrupt("return", res.status(500).json({
            message: 'Server error generating employee wage report.'
          }));

        case 31:
        case "end":
          return _context.stop();
      }
    }
  }, null, null, [[0, 27]]);
};