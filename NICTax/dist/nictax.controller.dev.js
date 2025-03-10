"use strict";

var NICTax = require('./nictax.model');

var Employee = require('../Employee/employee.model');

var Location = require('../Location/location.model');
/**
 * Create a new NIC & Tax record in Draft.
 */


exports.createNICTax = function _callee2(req, res) {
  var orgId, _req$body, recordName, startDate, endDate, description, baseLocationId, entries, start, end, payload, finalEntries, doc;

  return regeneratorRuntime.async(function _callee2$(_context2) {
    while (1) {
      switch (_context2.prev = _context2.next) {
        case 0:
          _context2.prev = 0;
          orgId = req.user.orgId; // from JWT

          _req$body = req.body, recordName = _req$body.recordName, startDate = _req$body.startDate, endDate = _req$body.endDate, description = _req$body.description, baseLocationId = _req$body.baseLocationId, entries = _req$body.entries; // Validate required fields

          if (!(!recordName || !startDate || !endDate || !baseLocationId)) {
            _context2.next = 5;
            break;
          }

          return _context2.abrupt("return", res.status(400).json({
            message: 'Missing required fields (recordName, startDate, endDate, baseLocationId).'
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
          // Build the NIC/Tax document payload
          payload = {
            organizationId: orgId,
            recordName: recordName,
            startDate: start,
            endDate: end,
            description: description || '',
            baseLocationId: baseLocationId,
            status: 'Draft',
            entries: []
          }; // Process entries concurrently if provided

          if (!(Array.isArray(entries) && entries.length > 0)) {
            _context2.next = 15;
            break;
          }

          _context2.next = 13;
          return regeneratorRuntime.awrap(Promise.all(entries.map(function _callee(entry) {
            var emp;
            return regeneratorRuntime.async(function _callee$(_context) {
              while (1) {
                switch (_context.prev = _context.next) {
                  case 0:
                    _context.next = 2;
                    return regeneratorRuntime.awrap(Employee.findById(entry.employeeId));

                  case 2:
                    emp = _context.sent;

                    if (!(emp && emp.baseLocationId && emp.baseLocationId.toString() === baseLocationId.toString())) {
                      _context.next = 5;
                      break;
                    }

                    return _context.abrupt("return", {
                      employeeId: emp._id,
                      employeeName: "".concat(emp.firstName, " ").concat(emp.lastName),
                      eesNIC: entry.eesNIC || 0,
                      erNIC: entry.erNIC || 0,
                      eesTax: entry.eesTax || 0,
                      notes: entry.notes || ''
                    });

                  case 5:
                    return _context.abrupt("return", null);

                  case 6:
                  case "end":
                    return _context.stop();
                }
              }
            });
          })));

        case 13:
          finalEntries = _context2.sent;
          payload.entries = finalEntries.filter(function (entry) {
            return entry !== null;
          });

        case 15:
          _context2.next = 17;
          return regeneratorRuntime.awrap(NICTax.create(payload));

        case 17:
          doc = _context2.sent;
          return _context2.abrupt("return", res.status(201).json({
            message: 'NIC & Tax record created successfully (Draft)',
            nictax: doc
          }));

        case 21:
          _context2.prev = 21;
          _context2.t0 = _context2["catch"](0);
          console.error('Error creating NIC & Tax:', _context2.t0);
          return _context2.abrupt("return", res.status(500).json({
            message: 'Server error creating NIC & Tax'
          }));

        case 25:
        case "end":
          return _context2.stop();
      }
    }
  }, null, null, [[0, 21]]);
};
/**
 * Get all NIC & Tax records for this organization with pagination and filtering.
 * Supports:
 *   - Pagination: page, limit
 *   - Search by recordName: search
 *   - Filter by status: status
 *   - Date range filter: startDate, endDate (overlapping condition)
 */


exports.getNICTaxRecords = function _callee3(req, res) {
  var orgId, _req$query, _req$query$page, page, _req$query$limit, limit, search, status, startDate, endDate, query, s, e, total, docs;

  return regeneratorRuntime.async(function _callee3$(_context3) {
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
          }; // Search by recordName (case-insensitive)

          if (search) {
            query.recordName = {
              $regex: search,
              $options: 'i'
            };
          } // Filter by status if provided


          if (status) {
            query.status = status;
          } // Date range filter: find records whose range overlaps with the provided range


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
          } // Count total records for pagination metadata


          _context3.next = 11;
          return regeneratorRuntime.awrap(NICTax.countDocuments(query));

        case 11:
          total = _context3.sent;
          _context3.next = 14;
          return regeneratorRuntime.awrap(NICTax.find(query).populate('baseLocationId', 'name code').sort({
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
          console.error('Error fetching NIC & Tax records:', _context3.t0);
          return _context3.abrupt("return", res.status(500).json({
            message: 'Server error fetching NIC & Tax'
          }));

        case 22:
        case "end":
          return _context3.stop();
      }
    }
  }, null, null, [[0, 18]]);
};
/**
 * Get a single NIC & Tax record by ID.
 */


exports.getNICTaxById = function _callee4(req, res) {
  var nictaxId, orgId, doc;
  return regeneratorRuntime.async(function _callee4$(_context4) {
    while (1) {
      switch (_context4.prev = _context4.next) {
        case 0:
          _context4.prev = 0;
          nictaxId = req.params.nictaxId;
          orgId = req.user.orgId;
          _context4.next = 5;
          return regeneratorRuntime.awrap(NICTax.findOne({
            _id: nictaxId,
            organizationId: orgId
          }).populate('baseLocationId', 'name code').populate('entries.employeeId', 'firstName lastName baseLocationId'));

        case 5:
          doc = _context4.sent;

          if (doc) {
            _context4.next = 8;
            break;
          }

          return _context4.abrupt("return", res.status(404).json({
            message: 'NIC & Tax record not found'
          }));

        case 8:
          return _context4.abrupt("return", res.status(200).json({
            nictax: doc
          }));

        case 11:
          _context4.prev = 11;
          _context4.t0 = _context4["catch"](0);
          console.error('Error fetching NIC & Tax by ID:', _context4.t0);
          return _context4.abrupt("return", res.status(500).json({
            message: 'Server error fetching NIC & Tax by ID'
          }));

        case 15:
        case "end":
          return _context4.stop();
      }
    }
  }, null, null, [[0, 11]]);
};
/**
 * Update NIC & Tax record by ID.
 * For Approved records, only allowed update is reverting status to Draft.
 */


exports.updateNICTax = function _callee6(req, res) {
  var nictaxId, orgId, updates, doc, updateKeys, newStartDate, effectiveEndDate, newEndDate, effectiveStartDate, newEntries;
  return regeneratorRuntime.async(function _callee6$(_context6) {
    while (1) {
      switch (_context6.prev = _context6.next) {
        case 0:
          _context6.prev = 0;
          nictaxId = req.params.nictaxId;
          orgId = req.user.orgId;
          updates = req.body;
          _context6.next = 6;
          return regeneratorRuntime.awrap(NICTax.findOne({
            _id: nictaxId,
            organizationId: orgId
          }));

        case 6:
          doc = _context6.sent;

          if (doc) {
            _context6.next = 9;
            break;
          }

          return _context6.abrupt("return", res.status(404).json({
            message: 'NIC & Tax record not found'
          }));

        case 9:
          if (!(doc.status === 'Approved')) {
            _context6.next = 17;
            break;
          }

          updateKeys = Object.keys(updates);

          if (!(updateKeys.length !== 1 || updates.status !== 'Draft')) {
            _context6.next = 13;
            break;
          }

          return _context6.abrupt("return", res.status(400).json({
            message: 'Approved records cannot be edited. Only reverting to Draft is allowed.'
          }));

        case 13:
          doc.status = 'Draft';
          _context6.next = 16;
          return regeneratorRuntime.awrap(doc.save());

        case 16:
          return _context6.abrupt("return", res.status(200).json({
            message: 'Record status reverted to Draft successfully',
            nictax: doc
          }));

        case 17:
          // For Draft records, process updates.
          if (typeof updates.recordName === 'string') {
            doc.recordName = updates.recordName;
          }

          if (!updates.startDate) {
            _context6.next = 24;
            break;
          }

          newStartDate = new Date(updates.startDate);
          effectiveEndDate = updates.endDate ? new Date(updates.endDate) : doc.endDate;

          if (!(newStartDate > effectiveEndDate)) {
            _context6.next = 23;
            break;
          }

          return _context6.abrupt("return", res.status(400).json({
            message: 'Start date cannot be after end date.'
          }));

        case 23:
          doc.startDate = newStartDate;

        case 24:
          if (!updates.endDate) {
            _context6.next = 30;
            break;
          }

          newEndDate = new Date(updates.endDate);
          effectiveStartDate = updates.startDate ? new Date(updates.startDate) : doc.startDate;

          if (!(effectiveStartDate > newEndDate)) {
            _context6.next = 29;
            break;
          }

          return _context6.abrupt("return", res.status(400).json({
            message: 'End date cannot be before start date.'
          }));

        case 29:
          doc.endDate = newEndDate;

        case 30:
          if (typeof updates.description === 'string') {
            doc.description = updates.description;
          } // If baseLocationId changes, update and clear entries if new entries are not provided.


          if (updates.baseLocationId && updates.baseLocationId.toString() !== doc.baseLocationId.toString()) {
            doc.baseLocationId = updates.baseLocationId;

            if (!updates.entries) {
              doc.entries = [];
            }
          }

          if (updates.status) {
            doc.status = updates.status; // e.g., 'Draft' or 'Approved'
          } // If entries are provided, process them concurrently.


          if (!Array.isArray(updates.entries)) {
            _context6.next = 38;
            break;
          }

          _context6.next = 36;
          return regeneratorRuntime.awrap(Promise.all(updates.entries.map(function _callee5(entry) {
            var emp;
            return regeneratorRuntime.async(function _callee5$(_context5) {
              while (1) {
                switch (_context5.prev = _context5.next) {
                  case 0:
                    _context5.next = 2;
                    return regeneratorRuntime.awrap(Employee.findById(entry.employeeId));

                  case 2:
                    emp = _context5.sent;

                    if (!(emp && emp.baseLocationId && emp.baseLocationId.toString() === doc.baseLocationId.toString())) {
                      _context5.next = 5;
                      break;
                    }

                    return _context5.abrupt("return", {
                      employeeId: emp._id,
                      employeeName: "".concat(emp.firstName, " ").concat(emp.lastName),
                      eesNIC: entry.eesNIC || 0,
                      erNIC: entry.erNIC || 0,
                      eesTax: entry.eesTax || 0,
                      notes: entry.notes || ''
                    });

                  case 5:
                    return _context5.abrupt("return", null);

                  case 6:
                  case "end":
                    return _context5.stop();
                }
              }
            });
          })));

        case 36:
          newEntries = _context6.sent;
          doc.entries = newEntries.filter(function (entry) {
            return entry !== null;
          });

        case 38:
          _context6.next = 40;
          return regeneratorRuntime.awrap(doc.save());

        case 40:
          return _context6.abrupt("return", res.status(200).json({
            message: 'NIC & Tax record updated successfully',
            nictax: doc
          }));

        case 43:
          _context6.prev = 43;
          _context6.t0 = _context6["catch"](0);
          console.error('Error updating NIC & Tax record:', _context6.t0);
          return _context6.abrupt("return", res.status(500).json({
            message: 'Server error updating NIC & Tax'
          }));

        case 47:
        case "end":
          return _context6.stop();
      }
    }
  }, null, null, [[0, 43]]);
};
/**
 * Delete NIC & Tax record by ID.
 * Approved records cannot be deleted.
 */


exports.deleteNICTax = function _callee7(req, res) {
  var nictaxId, orgId, doc;
  return regeneratorRuntime.async(function _callee7$(_context7) {
    while (1) {
      switch (_context7.prev = _context7.next) {
        case 0:
          _context7.prev = 0;
          nictaxId = req.params.nictaxId;
          orgId = req.user.orgId;
          _context7.next = 5;
          return regeneratorRuntime.awrap(NICTax.findOne({
            _id: nictaxId,
            organizationId: orgId
          }));

        case 5:
          doc = _context7.sent;

          if (doc) {
            _context7.next = 8;
            break;
          }

          return _context7.abrupt("return", res.status(404).json({
            message: 'NIC & Tax record not found or already removed'
          }));

        case 8:
          if (!(doc.status === 'Approved')) {
            _context7.next = 10;
            break;
          }

          return _context7.abrupt("return", res.status(400).json({
            message: 'Approved records cannot be deleted.'
          }));

        case 10:
          _context7.next = 12;
          return regeneratorRuntime.awrap(NICTax.findOneAndDelete({
            _id: nictaxId,
            organizationId: orgId
          }));

        case 12:
          return _context7.abrupt("return", res.status(200).json({
            message: 'NIC & Tax record deleted successfully'
          }));

        case 15:
          _context7.prev = 15;
          _context7.t0 = _context7["catch"](0);
          console.error('Error deleting NIC & Tax record:', _context7.t0);
          return _context7.abrupt("return", res.status(500).json({
            message: 'Server error deleting NIC & Tax'
          }));

        case 19:
        case "end":
          return _context7.stop();
      }
    }
  }, null, null, [[0, 15]]);
};
/**
 * GET /nictax/template-employees?locationId=xxx
 * or          /nictax/template-employees?locationName=xxx
 *
 * Return employees (with default NIC/Tax fields) to help generate a CSV template.
 */


exports.getEmployeesForNICTaxTemplate = function _callee8(req, res) {
  var orgId, _req$query2, locationId, locationName, location, employees, data;

  return regeneratorRuntime.async(function _callee8$(_context8) {
    while (1) {
      switch (_context8.prev = _context8.next) {
        case 0:
          _context8.prev = 0;
          orgId = req.user.orgId;
          _req$query2 = req.query, locationId = _req$query2.locationId, locationName = _req$query2.locationName; // If the user wants employees for a specific location

          if (!(!locationId && !locationName)) {
            _context8.next = 5;
            break;
          }

          return _context8.abrupt("return", res.status(400).json({
            message: 'Please provide locationId or locationName in query params.'
          }));

        case 5:
          if (!(locationName && !locationId)) {
            _context8.next = 14;
            break;
          }

          _context8.next = 8;
          return regeneratorRuntime.awrap(Location.findOne({
            organizationId: orgId,
            name: new RegExp("^".concat(locationName, "$"), 'i')
          }));

        case 8:
          location = _context8.sent;

          if (location) {
            _context8.next = 11;
            break;
          }

          return _context8.abrupt("return", res.status(404).json({
            message: 'Location not found by name.'
          }));

        case 11:
          locationId = String(location._id);
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
            baseLocationId: locationId,
            status: 'Employed'
          }));

        case 20:
          employees = _context8.sent;
          // Return an array of "row objects" with default NIC/Tax values
          data = employees.map(function (emp) {
            return {
              employeeName: "".concat(emp.firstName, " ").concat(emp.lastName),
              employeeId: emp._id.toString(),
              eesNIC: '0',
              erNIC: '0',
              eesTax: '0',
              notes: '',
              locationId: locationId,
              // so we know which location
              locationName: location ? location.name : 'N/A' // any other default fields you need

            };
          });
          return _context8.abrupt("return", res.status(200).json({
            employees: data
          }));

        case 25:
          _context8.prev = 25;
          _context8.t0 = _context8["catch"](0);
          console.error('Error in getEmployeesForNICTaxTemplate:', _context8.t0);
          return _context8.abrupt("return", res.status(500).json({
            message: 'Server error generating NIC/Tax template.'
          }));

        case 29:
        case "end":
          return _context8.stop();
      }
    }
  }, null, null, [[0, 25]]);
}; // nictax.controller.js (add to the existing exports)


exports.batchCreateNICTax = function _callee9(req, res) {
  var orgId, _req$body2, recordName, startDate, endDate, baseLocationId, entries, start, end, newEntries, warnings, i, row, emp, payload, doc;

  return regeneratorRuntime.async(function _callee9$(_context9) {
    while (1) {
      switch (_context9.prev = _context9.next) {
        case 0:
          _context9.prev = 0;
          orgId = req.user.orgId;
          _req$body2 = req.body, recordName = _req$body2.recordName, startDate = _req$body2.startDate, endDate = _req$body2.endDate, baseLocationId = _req$body2.baseLocationId, entries = _req$body2.entries; // Validate

          if (!(!recordName || !startDate || !endDate || !baseLocationId || !Array.isArray(entries))) {
            _context9.next = 5;
            break;
          }

          return _context9.abrupt("return", res.status(400).json({
            message: 'Missing required fields: recordName, startDate, endDate, baseLocationId, entries[]'
          }));

        case 5:
          // Check date validity
          start = new Date(startDate);
          end = new Date(endDate);

          if (!(isNaN(start.getTime()) || isNaN(end.getTime()) || start > end)) {
            _context9.next = 9;
            break;
          }

          return _context9.abrupt("return", res.status(400).json({
            message: 'Invalid startDate/endDate, or startDate > endDate.'
          }));

        case 9:
          // We'll store the final array of entries
          newEntries = [];
          warnings = [];
          i = 0;

        case 12:
          if (!(i < entries.length)) {
            _context9.next = 27;
            break;
          }

          row = entries[i];

          if (row.employeeId) {
            _context9.next = 17;
            break;
          }

          // If CSV used payrollId instead, you'd do a lookup here
          warnings.push("Row ".concat(i + 1, ": Missing employeeId. Skipped."));
          return _context9.abrupt("continue", 24);

        case 17:
          _context9.next = 19;
          return regeneratorRuntime.awrap(Employee.findOne({
            _id: row.employeeId,
            organizationId: orgId,
            baseLocationId: baseLocationId
          }));

        case 19:
          emp = _context9.sent;

          if (emp) {
            _context9.next = 23;
            break;
          }

          warnings.push("Row ".concat(i + 1, ": Employee not found or not matching baseLocation. Skipped."));
          return _context9.abrupt("continue", 24);

        case 23:
          newEntries.push({
            employeeId: emp._id,
            employeeName: "".concat(emp.firstName, " ").concat(emp.lastName),
            eesNIC: Number(row.eesNIC) || 0,
            erNIC: Number(row.erNIC) || 0,
            eesTax: Number(row.eesTax) || 0,
            notes: row.notes || ''
          });

        case 24:
          i++;
          _context9.next = 12;
          break;

        case 27:
          if (!(newEntries.length === 0)) {
            _context9.next = 29;
            break;
          }

          return _context9.abrupt("return", res.status(400).json({
            message: 'No valid entries found in request.',
            warnings: warnings
          }));

        case 29:
          // Create one NIC & Tax record
          payload = {
            organizationId: orgId,
            recordName: recordName,
            startDate: start,
            endDate: end,
            baseLocationId: baseLocationId,
            entries: newEntries,
            status: 'Draft'
          };
          _context9.next = 32;
          return regeneratorRuntime.awrap(NICTax.create(payload));

        case 32:
          doc = _context9.sent;
          return _context9.abrupt("return", res.status(201).json({
            message: 'Batch NIC/Tax record created successfully!',
            nictax: doc,
            warnings: warnings
          }));

        case 36:
          _context9.prev = 36;
          _context9.t0 = _context9["catch"](0);
          console.error('Error in batchCreateNICTax:', _context9.t0);
          return _context9.abrupt("return", res.status(500).json({
            message: 'Server error in batchCreateNICTax.'
          }));

        case 40:
        case "end":
          return _context9.stop();
      }
    }
  }, null, null, [[0, 36]]);
};