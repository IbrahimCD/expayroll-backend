"use strict";

var PayRun = require('../payRun/payRun.model');

var Employee = require('../Employee/employee.model');

var Location = require('../Location/location.model');

exports.generateEmployeeWageReport = function _callee(req, res) {
  var payRunId, orgId, payRun, reportRows, _iteratorNormalCompletion, _didIteratorError, _iteratorError, _iterator, _step, entry, employee, firstName, lastName, parts, payrollId, baseLocation, loc, breakdown, niDayWage, niHoursUsed, netNIWage, netCashWage, niRegularDayRate, niHoursRate;

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
          reportRows = []; // Loop through each pay run entry

          _iteratorNormalCompletion = true;
          _didIteratorError = false;
          _iteratorError = undefined;
          _context.prev = 14;
          _iterator = payRun.entries[Symbol.iterator]();

        case 16:
          if (_iteratorNormalCompletion = (_step = _iterator.next()).done) {
            _context.next = 42;
            break;
          }

          entry = _step.value;
          _context.next = 20;
          return regeneratorRuntime.awrap(Employee.findById(entry.employeeId));

        case 20:
          employee = _context.sent;
          firstName = '', lastName = '';

          if (employee) {
            firstName = employee.firstName || '';
            lastName = employee.lastName || '';
          } else if (entry.employeeName) {
            parts = entry.employeeName.split(' ');
            firstName = parts[0];
            lastName = parts.slice(1).join(' ');
          }

          payrollId = entry.payrollId || ''; // Determine baseLocation:
          // If the pay run entry already has a baseLocation value, use it.
          // Otherwise, if the employee exists and has a baseLocationId, look it up in the Location collection.

          baseLocation = entry.baseLocation || '';

          if (!(!baseLocation && employee && employee.baseLocationId)) {
            _context.next = 30;
            break;
          }

          _context.next = 28;
          return regeneratorRuntime.awrap(Location.findById(employee.baseLocationId));

        case 28:
          loc = _context.sent;
          baseLocation = loc ? loc.name : '';

        case 30:
          // Extract computed fields from the pay run entry's breakdown.
          breakdown = entry.breakdown || {};
          niDayWage = breakdown.E9_NIDaysWage || 0;
          niHoursUsed = breakdown.E13_NIHoursUsed || 0;
          netNIWage = breakdown.E21_netNIWage || 0;
          netCashWage = breakdown.E22_netCashWage || 0; // Get NI Regular Day Rate and NI Hours Rate from employee pay structure.

          niRegularDayRate = 0;
          niHoursRate = 0;

          if (employee && employee.payStructure) {
            if (employee.payStructure.dailyRates) {
              niRegularDayRate = employee.payStructure.dailyRates.ni_regularDayRate || 0;
            }

            if (employee.payStructure.hourlyRates) {
              niHoursRate = employee.payStructure.hourlyRates.niRatePerHour || 0;
            }
          }

          reportRows.push({
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
          });

        case 39:
          _iteratorNormalCompletion = true;
          _context.next = 16;
          break;

        case 42:
          _context.next = 48;
          break;

        case 44:
          _context.prev = 44;
          _context.t0 = _context["catch"](14);
          _didIteratorError = true;
          _iteratorError = _context.t0;

        case 48:
          _context.prev = 48;
          _context.prev = 49;

          if (!_iteratorNormalCompletion && _iterator["return"] != null) {
            _iterator["return"]();
          }

        case 51:
          _context.prev = 51;

          if (!_didIteratorError) {
            _context.next = 54;
            break;
          }

          throw _iteratorError;

        case 54:
          return _context.finish(51);

        case 55:
          return _context.finish(48);

        case 56:
          return _context.abrupt("return", res.status(200).json({
            report: reportRows
          }));

        case 59:
          _context.prev = 59;
          _context.t1 = _context["catch"](0);
          console.error('Error generating employee wage report:', _context.t1);
          return _context.abrupt("return", res.status(500).json({
            message: 'Server error generating employee wage report.'
          }));

        case 63:
        case "end":
          return _context.stop();
      }
    }
  }, null, null, [[0, 59], [14, 44, 48, 56], [49,, 51, 55]]);
};