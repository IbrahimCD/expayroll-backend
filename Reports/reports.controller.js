// backend/Reports/reports.controller.js
const PayRun = require('../payRun/payRun.model');
const Timesheet = require('../Timesheet/timesheet.model');
const Location = require('../Location/location.model');
const mongoose = require('mongoose');

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

    const timesheetMap = {}; // { [timesheetId]: { employees: [], totals: {} } }

    // For each pay run entry (one entry per employee):
    for (const entry of payRun.entries) {
      const employeeName = entry.employeeName || 'Unknown';
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

        timesheetMap[tId].employees.push({
          employeeName,
          payrollId,
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
    }

    // 2) Now we need to load each timesheet to get location + date range
    // Convert the timesheetMap keys to objectIds if needed:
    const timesheetIds = Object.keys(timesheetMap).filter(k => mongoose.isValidObjectId(k));
    const timesheets = await Timesheet.find({ _id: { $in: timesheetIds } });

    // We build a final array of timesheet-based data
    const results = [];
    for (const t of timesheets) {
      const tId = String(t._id);
      const data = timesheetMap[tId];
      if (!data) continue;

      // If you want the location name:
      let locationName = '';
      if (t.locationId) {
        const loc = await Location.findById(t.locationId);
        locationName = loc ? loc.name : 'Unknown Location';
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

    // 3) Return a structured object
    return res.status(200).json({
      payRunName: payRun.payRunName || '',
      wageCostAllocations: results
    });
  } catch (err) {
    console.error('Error in getWageCostAllocation:', err);
    return res.status(500).json({ message: 'Server error generating wage cost allocation report.' });
  }
};

/**
 * GET /reports/payruns
 * Return a list of all pay runs for the dropdown.
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
