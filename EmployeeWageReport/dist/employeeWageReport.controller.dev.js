"use strict";

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

// backend/Reports/employeeWageReport.controller.js
var ObjectId = require('mongoose').Types.ObjectId;

var PayRun = require('../payRun/payRun.model');

var Employee = require('../Employee/employee.model');

var Location = require('../Location/location.model');

exports.generateEmployeeWageReport = function _callee(req, res) {
  var _req$query, payRunId, _req$query$searchName, searchName, _req$query$baseLocati, baseLocations, _req$query$orderBy, orderBy, _req$query$orderDirec, orderDirection, _req$query$page, page, _req$query$limit, limit, orgId, pipeline, locArray, sortOrder, skip, reportRows;

  return regeneratorRuntime.async(function _callee$(_context) {
    while (1) {
      switch (_context.prev = _context.next) {
        case 0:
          _context.prev = 0;
          _req$query = req.query, payRunId = _req$query.payRunId, _req$query$searchName = _req$query.searchName, searchName = _req$query$searchName === void 0 ? '' : _req$query$searchName, _req$query$baseLocati = _req$query.baseLocations, baseLocations = _req$query$baseLocati === void 0 ? '' : _req$query$baseLocati, _req$query$orderBy = _req$query.orderBy, orderBy = _req$query$orderBy === void 0 ? 'firstName' : _req$query$orderBy, _req$query$orderDirec = _req$query.orderDirection, orderDirection = _req$query$orderDirec === void 0 ? 'asc' : _req$query$orderDirec, _req$query$page = _req$query.page, page = _req$query$page === void 0 ? 1 : _req$query$page, _req$query$limit = _req$query.limit, limit = _req$query$limit === void 0 ? 50 : _req$query$limit;
          orgId = req.user.orgId;

          if (payRunId) {
            _context.next = 5;
            break;
          }

          return _context.abrupt("return", res.status(400).json({
            message: 'Missing payRunId in query parameters.'
          }));

        case 5:
          // Build the aggregation pipeline
          pipeline = [// Match the correct pay run document for the organization.
          {
            $match: {
              _id: ObjectId(payRunId),
              organizationId: orgId
            }
          }, // Unwind the entries array to work on each entry separately.
          {
            $unwind: "$entries"
          }, // Lookup the Employee document for each entry.
          {
            $lookup: {
              from: "employees",
              // collection name in MongoDB
              localField: "entries.employeeId",
              foreignField: "_id",
              as: "employee"
            }
          }, {
            $unwind: {
              path: "$employee",
              preserveNullAndEmptyArrays: true
            }
          }, // Lookup the Location (if needed) from the employee's baseLocationId.
          {
            $lookup: {
              from: "locations",
              localField: "employee.baseLocationId",
              foreignField: "_id",
              as: "location"
            }
          }, {
            $unwind: {
              path: "$location",
              preserveNullAndEmptyArrays: true
            }
          }, // Project the fields needed for the report.
          {
            $project: {
              // Use employee data if available; otherwise, try splitting entry.employeeName.
              firstName: {
                $cond: [{
                  $ifNull: ["$employee.firstName", false]
                }, "$employee.firstName", {
                  $arrayElemAt: [{
                    $split: ["$entries.employeeName", " "]
                  }, 0]
                }]
              },
              lastName: {
                $cond: [{
                  $ifNull: ["$employee.lastName", false]
                }, "$employee.lastName", {
                  $trim: {
                    input: {
                      $reduce: {
                        input: {
                          $slice: [{
                            $split: ["$entries.employeeName", " "]
                          }, 1, {
                            $size: {
                              $split: ["$entries.employeeName", " "]
                            }
                          }]
                        },
                        initialValue: "",
                        "in": {
                          $concat: ["$$value", " ", "$$this"]
                        }
                      }
                    }
                  }
                }]
              },
              payrollId: "$entries.payrollId",
              // Use the entry's baseLocation if provided; else use the lookup location name.
              baseLocation: {
                $cond: [{
                  $ifNull: ["$entries.baseLocation", false]
                }, "$entries.baseLocation", "$location.name"]
              },
              niDayWage: "$entries.breakdown.E9_NIDaysWage",
              niHoursUsed: "$entries.breakdown.E13_NIHoursUsed",
              netNIWage: "$entries.breakdown.E21_netNIWage",
              netCashWage: "$entries.breakdown.E22_netCashWage",
              // Get rates from the employee document if available.
              niRegularDayRate: "$employee.payStructure.dailyRates.ni_regularDayRate",
              niHoursRate: "$employee.payStructure.hourlyRates.niRatePerHour"
            }
          }]; // Client‑side filters:
          // Filter by name (searchName matches firstName or lastName)

          if (searchName) {
            pipeline.push({
              $match: {
                $or: [{
                  firstName: {
                    $regex: searchName,
                    $options: 'i'
                  }
                }, {
                  lastName: {
                    $regex: searchName,
                    $options: 'i'
                  }
                }]
              }
            });
          } // Filter by baseLocations (if provided as comma‑separated values)


          if (baseLocations) {
            locArray = baseLocations.split(',').map(function (loc) {
              return loc.trim();
            }).filter(Boolean);

            if (locArray.length > 0) {
              pipeline.push({
                $match: {
                  baseLocation: {
                    $in: locArray
                  }
                }
              });
            }
          } // Sorting stage:


          sortOrder = orderDirection === 'asc' ? 1 : -1;
          pipeline.push({
            $sort: _defineProperty({}, orderBy, sortOrder)
          }); // Pagination: skip and limit.

          skip = (Number(page) - 1) * Number(limit);
          pipeline.push({
            $skip: skip
          });
          pipeline.push({
            $limit: Number(limit)
          }); // Run the aggregation pipeline on the PayRun collection.

          _context.next = 15;
          return regeneratorRuntime.awrap(PayRun.aggregate(pipeline));

        case 15:
          reportRows = _context.sent;
          return _context.abrupt("return", res.status(200).json({
            report: reportRows
          }));

        case 19:
          _context.prev = 19;
          _context.t0 = _context["catch"](0);
          console.error('Error generating employee wage report:', _context.t0);
          return _context.abrupt("return", res.status(500).json({
            message: 'Server error generating employee wage report.'
          }));

        case 23:
        case "end":
          return _context.stop();
      }
    }
  }, null, null, [[0, 19]]);
};