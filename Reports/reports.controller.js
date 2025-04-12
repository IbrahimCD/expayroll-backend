const PayRun = require('../payRun/payRun.model');
const Timesheet = require('../Timesheet/timesheet.model');
const Location = require('../Location/location.model');
const mongoose = require('mongoose');

/**
 * GET /reports/wage-cost-allocation
 * Query param: payRunId
 *
 * 1) Load the pay run by payRunId.
 * 2) For each timesheet referenced by the pay run's entries, gather location and date range data,
 *    plus the allocated data for each employee (including payStructureName).
 * 3) Aggregate contributing timesheet details (including payStructureName).
 * 4) Return a structured JSON that the frontend can easily display or export.
 */
exports.getWageCostAllocation = async (req, res) => {
  try {
    const { payRunId } = req.query;
    const orgId = req.user.orgId; // or however you store organization

    if (!payRunId) {
      return res.status(400).json({ message: 'Missing payRunId' });
    }

    // 1) Fetch the pay run
    const payRun = await PayRun.findOne({
      _id: payRunId,
      organizationId: orgId
    });

    if (!payRun) {
      return res.status(404).json({ message: 'Pay Run not found.' });
    }

    // We'll store timesheet allocations in a map: { timesheetId: { employees: [], totals: {...} } }
    const timesheetMap = {};

    // 2) Collect allocations for each timesheet from all pay run entries
    for (const entry of payRun.entries) {
      const employeeName = entry.employeeName || 'Unknown';
      // Use optional chaining to get payStructure.payStructureName
      const payStructureName = entry.payStructure?.payStructureName || 'N/A';
      const payrollId = entry.payrollId || 'N/A';

      if (!entry.breakdown || !entry.breakdown.timesheetAllocations) continue;

      for (const alloc of entry.breakdown.timesheetAllocations) {
        const tId = String(alloc.timesheetId);
        if (!timesheetMap[tId]) {
          timesheetMap[tId] = {
            employees: [],
            totalNiWage: 0,
            totalCashWage: 0,
            totalEerNIC: 0,
            totalWageCost: 0
          };
        }

        // Extract the allocated fields
        const niWage = alloc.F8_allocGrossNIWage || 0;
        const cashWage = alloc.F9_allocGrossCashWage || 0;
        const eerNIC = alloc.F10_allocEerNIC || 0;
        const wageCost = alloc.F11_allocWageCost || 0;

        // Push each employee’s record with payStructureName included
        timesheetMap[tId].employees.push({
          employeeName,
          payStructureName,
          payrollId,
          allocatedNiWage: niWage,
          allocatedCashWage: cashWage,
          allocatedEerNIC: eerNIC,
          allocatedWageCost: wageCost
        });

        // Sum up totals
        timesheetMap[tId].totalNiWage += niWage;
        timesheetMap[tId].totalCashWage += cashWage;
        timesheetMap[tId].totalEerNIC += eerNIC;
        timesheetMap[tId].totalWageCost += wageCost;
      }
    }

    // 3) Fetch actual Timesheet documents (location, date range, etc.)
    const timesheetIds = Object.keys(timesheetMap).filter(k => mongoose.isValidObjectId(k));
    const timesheets = await Timesheet.find({ _id: { $in: timesheetIds } });

    // Build the final array for wage cost allocations
    const results = [];
    for (const t of timesheets) {
      const tId = String(t._id);
      const data = timesheetMap[tId];
      if (!data) continue;

      let locationName = 'Unknown Location';
      if (t.locationId) {
        const loc = await Location.findById(t.locationId);
        if (loc && loc.name) {
          locationName = loc.name;
        }
      }

      results.push({
        timesheetId: tId,
        timesheetName: t.timesheetName || '',
        locationName,
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
    }

    // 4) Aggregate additional "contributingTimesheets" info (if any)
    const contributingTimesheets = [];
    for (const entry of payRun.entries) {
      if (entry.contributingTimesheets && entry.contributingTimesheets.length > 0) {
        // Use optional chaining to get payStructure.payStructureName for contributing records too
        const payStructureName = entry.payStructure?.payStructureName || 'N/A';
        for (const ct of entry.contributingTimesheets) {
          contributingTimesheets.push({
            employeeName: entry.employeeName || 'Unknown',
            payStructureName,
            payrollId: entry.payrollId || 'N/A',
            timesheetName: ct.timesheetName || '',
            hoursWorked: ct.hoursWorked || 0,
            daysWorked: ct.daysWorked || 0,
            extraShiftWorked: ct.extraShiftWorked || 0,
            addition: ct.addition || 0,
            deduction: ct.deduction || 0,
            notes: ct.notes || ''
          });
        }
      }
    }

    // 5) Return final structured JSON
    return res.status(200).json({
      payRunName: payRun.payRunName || '',
      wageCostAllocations: results,
      contributingTimesheets
    });

  } catch (err) {
    console.error('Error in getWageCostAllocation:', err);
    return res.status(500).json({
      message: 'Server error generating wage cost allocation report.'
    });
  }
};

/**
 * GET /reports/payruns
 * Returns a list of pay runs for the dropdown.
 */
exports.listPayRuns = async (req, res) => {
  try {
    const { orgId } = req.user;
    const payruns = await PayRun.find({ organizationId: orgId })
      .select('_id payRunName startDate endDate')
      .sort({ createdAt: -1 });
    return res.status(200).json({ payruns });
  } catch (err) {
    console.error('Error in listPayRuns:', err);
    return res.status(500).json({ message: 'Server error listing pay runs.' });
  }
};
