// backend/Timesheet/timesheet.controller.js
const Timesheet = require('./timesheet.model');
const Employee = require('../Employee/employee.model');

// AFTER:
const PayRun = require('../payRun/payRun.model');
const Location = require('../Location/location.model');
const mongoose = require('mongoose');
const dayjs = require('dayjs');
const customParseFormat = require('dayjs/plugin/customParseFormat');
dayjs.extend(customParseFormat);
const Papa = require('papaparse');

/**
 * Create a new timesheet.
 */
exports.createTimesheet = async (req, res) => {
  try {
    const { timesheetName, startDate, endDate, locationId, entries } = req.body;
    const { orgId } = req.user; // Organization ID from token

    if (!timesheetName || !startDate || !endDate || !locationId) {
      return res.status(400).json({ message: 'Missing required fields.' });
    }

    // Auto-fill each entry if needed
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      if (!entry.employeeId) {
        return res.status(400).json({ message: `Missing employeeId in entry ${i + 1}.` });
      }
      if (!entry.employeeName) {
        const employee = await Employee.findById(entry.employeeId);
        if (!employee) {
          return res
            .status(400)
            .json({ message: `Employee with ID ${entry.employeeId} not found.` });
        }
        entry.employeeName = `${employee.firstName} ${employee.lastName}`;
        entry.payrollId = employee.payrollId;
        entry.baseLocation = employee.baseLocationId
          ? employee.baseLocationId.toString()
          : '';
      }
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    const timesheet = await Timesheet.create({
      timesheetName,
      startDate: start,
      endDate: end,
      locationId,
      entries,
      organizationId: orgId,
      status: 'Draft'
    });

    return res.status(201).json({
      message: 'Timesheet created successfully',
      timesheet
    });
  } catch (error) {
    console.error('Error creating timesheet:', error);
    return res.status(500).json({ message: 'Server error creating timesheet' });
  }
};

/**
 * Get all timesheets.
 */
exports.getTimesheets = async (req, res) => {
  try {
    const { orgId } = req.user;
    const timesheets = await Timesheet.find({ organizationId: orgId })
      .sort({ createdAt: -1 }); // Sort by creation date, newest first
    return res.status(200).json({ timesheets });
  } catch (error) {
    console.error('Error fetching timesheets:', error);
    return res.status(500).json({ message: 'Server error fetching timesheets' });
  }
};

/**
 * Get a single timesheet by ID.
 */
exports.getTimesheetById = async (req, res) => {
  try {
    const { orgId } = req.user;
    const { timesheetId } = req.params;
    const timesheet = await Timesheet.findOne({
      _id: timesheetId,
      organizationId: orgId
    });
    if (!timesheet) {
      return res.status(404).json({ message: 'Timesheet not found' });
    }
    return res.status(200).json({ timesheet });
  } catch (error) {
    console.error('Error fetching timesheet:', error);
    return res.status(500).json({ message: 'Server error fetching timesheet' });
  }
};

/**
 * Update a timesheet.
 */
exports.updateTimesheet = async (req, res) => {
  try {
    const { timesheetId } = req.params;
    const { orgId } = req.user;
    const updates = req.body;

    if (updates.startDate) {
      updates.startDate = new Date(updates.startDate);
    }
    if (updates.endDate) {
      updates.endDate = new Date(updates.endDate);
    }

    const existing = await Timesheet.findOne({
      _id: timesheetId,
      organizationId: orgId
    });
    if (!existing) {
      return res.status(404).json({ message: 'Timesheet not found' });
    }

    // Check if this timesheet is part of an Approved pay run
    const approvedPayRun = await PayRun.findOne({
      organizationId: orgId,
      status: 'Approved',
      'entries.rawTimesheetIds': timesheetId
    });

    if (approvedPayRun && !['Admin', 'Area Manager'].includes(req.user.role)) {
      return res.status(403).json({
        message:
          'This timesheet is part of an Approved Pay Run. Only Admin or Area Manager can edit.'
      });
    }

    // Mark timesheet as needing update in any Draft pay run that references it
    const draftPayRuns = await PayRun.find({
      organizationId: orgId,
      status: 'Draft',
      'entries.rawTimesheetIds': timesheetId
    });

    for (const payRun of draftPayRuns) {
      let updatedFlag = false;
      payRun.entries.forEach((entry) => {
        const rawIds = entry.rawTimesheetIds.map((id) => String(id));
        if (rawIds.includes(String(timesheetId))) {
          entry.needsUpdate = true;
          updatedFlag = true;
        }
      });
      if (updatedFlag) {
        await payRun.save();
      }
    }

    const updatedTimesheet = await Timesheet.findOneAndUpdate(
      { _id: timesheetId, organizationId: orgId },
      updates,
      { new: true }
    );

    if (!updatedTimesheet) {
      return res
        .status(404)
        .json({ message: 'Timesheet not found after update attempt' });
    }

    return res.status(200).json({
      message: 'Timesheet updated successfully',
      timesheet: updatedTimesheet
    });
  } catch (error) {
    console.error('Error updating timesheet:', error);
    return res.status(500).json({ message: 'Server error updating timesheet' });
  }
};

/**
 * Delete a timesheet.
 */
exports.deleteTimesheet = async (req, res) => {
  try {
    const { timesheetId } = req.params;
    const { orgId } = req.user;
    const timesheet = await Timesheet.findOneAndDelete({
      _id: timesheetId,
      organizationId: orgId
    });
    if (!timesheet) {
      return res.status(404).json({ message: 'Timesheet not found' });
    }
    return res.status(200).json({ message: 'Timesheet deleted successfully' });
  } catch (error) {
    console.error('Error deleting timesheet:', error);
    return res.status(500).json({ message: 'Server error deleting timesheet' });
  }
};

/**
 * Approve a timesheet.
 */
exports.approveTimesheet = async (req, res) => {
  try {
    const { timesheetId } = req.params;
    const timesheet = await Timesheet.findById(timesheetId);
    if (!timesheet) {
      return res.status(404).json({ message: 'Timesheet not found' });
    }
    if (timesheet.status !== 'Draft') {
      return res
        .status(400)
        .json({ message: 'Only timesheets in Draft status can be approved.' });
    }
    timesheet.status = 'Approved';
    await timesheet.save();
    return res
      .status(200)
      .json({ message: 'Timesheet approved successfully', timesheet });
  } catch (error) {
    console.error('Error approving timesheet:', error);
    return res
      .status(500)
      .json({ message: 'Server error approving timesheet' });
  }
};

/**
 * GET /timesheets/template-employees?locationName=xxx or &locationId=xxx
 * Return employees (with default timesheet template values) for a given location.
 */
exports.getEmployeesForLocation = async (req, res) => {
  try {
    let { locationId, locationName } = req.query;
    const { orgId } = req.user;

    if (!locationId && !locationName) {
      return res
        .status(400)
        .json({
          message: 'Missing locationId or locationName in query params.'
        });
    }

    let location;
    if (!locationId && locationName) {
      // Find location by name (case-insensitive exact match)
      location = await Location.findOne({
        name: new RegExp(`^${locationName}$`, 'i')
      });
      if (!location) {
        return res
          .status(404)
          .json({ message: 'Location not found with the provided name.' });
      }
      locationId = location._id.toString();
    } else if (locationId) {
      location = await Location.findById(locationId);
    }

    const employees = await Employee.find({
      organizationId: orgId,
      $or: [{ baseLocationId: locationId }, { locationAccess: locationId }]
    });

    // Build default timesheet row values based on each employee's pay structure.
    // If payStructure.hasDailyRates -> hoursWorked = "N/A", daysWorked = "0", extraShift = "0"
    // If payStructure.hasHourlyRates -> hoursWorked = "0", daysWorked = "N/A", extraShift = "N/A"
    const result = employees.map((emp) => {
      let defaultHoursWorked = 'N/A';
      let defaultDaysWorked = 'N/A';
      let defaultExtraShift = 'N/A';
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
        employeeName: emp.preferredName || `${emp.firstName} ${emp.lastName}`,
        payrollId: emp.payrollId,
        baseLocation: emp.baseLocationId
          ? emp.baseLocationId.toString()
          : '',
        hoursWorked: defaultHoursWorked,
        daysWorked: defaultDaysWorked,
        extraShift: defaultExtraShift,
        addition: '0',
        deduction: '0',
        notes: '',
        workLocation: locationId, // store the ObjectId as string
        locationName: location ? location.name : 'Unknown'
      };
    });

    return res.status(200).json({ employees: result });
  } catch (err) {
    console.error('Error in getEmployeesForLocation:', err);
    return res
      .status(500)
      .json({ message: 'Server error fetching employees.' });
  }
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
exports.batchCreateTimesheets = async (req, res) => {
  try {
    const { orgId } = req.user;
    const { timesheetName, startDate, endDate, workLocation, entries } = req.body;

    // Validate required fields
    if (
      !timesheetName ||
      !startDate ||
      !endDate ||
      !workLocation ||
      !Array.isArray(entries)
    ) {
      return res.status(400).json({
        message:
          'Missing fields: timesheetName, startDate, endDate, workLocation, or entries array.'
      });
    }

    // Parse dates (DD/MM/YYYY -> Date object)
    const parsedStart = dayjs(startDate, 'DD/MM/YYYY').toDate();
    const parsedEnd = dayjs(endDate, 'DD/MM/YYYY').toDate();
    if (isNaN(parsedStart.getTime()) || isNaN(parsedEnd.getTime())) {
      return res.status(400).json({
        message: 'Invalid startDate or endDate. Use DD/MM/YYYY format.'
      });
    }

    // Helper: convert "N/A" to null or parse numeric
    const parseOrNull = (val) =>
      val === 'N/A' || val === '' || val == null ? null : Number(val);

    const assembledEntries = [];
    const warnings = [];

    for (const [index, row] of entries.entries()) {
      if (!row.payrollId) {
        warnings.push(
          `Row ${index + 1}: Missing payrollId. Entry skipped.`
        );
        continue;
      }

      // Look up employee by payrollId + orgId
      const emp = await Employee.findOne({
        payrollId: row.payrollId,
        organizationId: orgId
      });

      if (!emp) {
        warnings.push(
          `Row ${index + 1}: Employee with payrollId "${row.payrollId}" not found. Skipped.`
        );
        continue;
      }

      // Build entry
      assembledEntries.push({
        employeeId: emp._id,
        employeeName: emp.preferredName || `${emp.firstName} ${emp.lastName}`,
        payrollId: emp.payrollId,
        baseLocation: emp.baseLocationId ? String(emp.baseLocationId) : '',
        hoursWorked: parseOrNull(row.hoursWorked),
        daysWorked: parseOrNull(row.daysWorked),
        extraShiftWorked: parseOrNull(row.extraShift),
        otherCashAddition: parseOrNull(row.addition),
        otherCashDeduction: parseOrNull(row.deduction),
        notes: row.notes && row.notes !== 'N/A' ? row.notes : ''
      });
    }

    if (assembledEntries.length === 0) {
      return res.status(400).json({
        message: 'No valid entries found in request. Check warnings.',
        warnings
      });
    }

    // Create a single timesheet with all employee entries
    const newTimesheet = await Timesheet.create({
      organizationId: orgId,
      timesheetName,
      startDate: parsedStart,
      endDate: parsedEnd,
      locationId: workLocation, // or find location by code if needed
      entries: assembledEntries,
      status: 'Draft'
    });

    return res.status(201).json({
      message: 'Batch timesheet created successfully!',
      timesheet: newTimesheet,
      warnings
    });
  } catch (error) {
    console.error('Error in batchCreateTimesheets:', error);
    return res
      .status(500)
      .json({ message: 'Server error creating batch timesheets.' });
  }
};

// Export all
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
