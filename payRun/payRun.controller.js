// backend/payRun/payrun.controller.js
const PayRun = require('./payRun.model');
const Timesheet = require('../Timesheet/timesheet.model');
const NICTax = require('../NICTax/nictax.model');
const Employee = require('../Employee/employee.model');
const mongoose = require('mongoose');

async function hasOverlappingPayRun(orgId, start, end) {
  // Overlap means an existing pay run has:
  // existing.startDate <= newEnd AND existing.endDate >= newStart
  const overlap = await PayRun.findOne({
    organizationId: orgId,
    $or: [{ startDate: { $lte: end }, endDate: { $gte: start } }]
  });
  return !!overlap;
}

/**
 * This function calculates the E1..E23 breakdown, plus timesheet allocations (F fields),
 * for a given employee across multiple timesheets & NIC records.
 */
function calculatePayWithAllFormulas(employee, timesheets, nicRecords) {
  // --- Step A: Basic info from employee ---
  const payStruct = employee.payStructure || {};
  const dailyRates = payStruct.dailyRates || {};
  const hourlyRates = payStruct.hourlyRates || {};
  const otherConsiderations = payStruct.otherConsiderations || {};

  // --- Step B: Deconstruct pay structure fields ---
  const niDayMode = dailyRates.niDayMode || 'NONE';
  const ni_regularDays = dailyRates.ni_regularDays || 0;
  const ni_regularDayRate = dailyRates.ni_regularDayRate || 0;
  const ni_extraDayRate = dailyRates.ni_extraDayRate || 0;
  const ni_extraShiftRate = dailyRates.ni_extraShiftRate || 0;

  const cashDayMode = dailyRates.cashDayMode || 'NONE';
  const cash_regularDays = dailyRates.cash_regularDays || 0;
  const cash_regularDayRate = dailyRates.cash_regularDayRate || 0;
  const cash_extraDayRate = dailyRates.cash_extraDayRate || 0;
  const cash_extraShiftRate = dailyRates.cash_extraShiftRate || 0;

  const niHoursMode = hourlyRates.niHoursMode || 'NONE';
  const fixedNiHours = hourlyRates.fixedNiHours || 0;
  const minNiHours = hourlyRates.minNiHours || 0;
  const maxNiHours = hourlyRates.maxNiHours || 0;
  const percentageNiHours = hourlyRates.percentageNiHours || 0;
  const niRatePerHour = hourlyRates.niRatePerHour || 0;

  const cashHoursMode = hourlyRates.cashHoursMode || 'NONE';
  const minCashHours = hourlyRates.minCashHours || 0;
  const maxCashHours = hourlyRates.maxCashHours || 0;
  const percentageCashHours = hourlyRates.percentageCashHours || 0;
  const cashRatePerHour = hourlyRates.cashRatePerHour || 0;

  const niAdditions = otherConsiderations.niAdditions || [];
  const niDeductions = otherConsiderations.niDeductions || [];
  const cashAdditions = otherConsiderations.cashAdditions || [];
  const cashDeductions = otherConsiderations.cashDeductions || [];

  // --- Step C: Aggregate data from Timesheets ---
  let sumHoursWorked = 0;
  let sumDaysWorked = 0;
  let sumExtraShift = 0;
  let sumOtherAdditions = 0;
  let sumOtherDeductions = 0;
  let combinedNotes = [];

  timesheets.forEach(ts => {
    const entry = ts.entries.find(e => String(e.employeeId) === String(employee._id));
    if (!entry) return;

    // Summation of hours/days/shift/etc.
    sumHoursWorked += entry.hoursWorked || 0;
    sumDaysWorked += entry.daysWorked || 0;
    sumExtraShift += entry.extraShiftWorked || 0;
    sumOtherAdditions += entry.otherCashAddition || 0;
    sumOtherDeductions += entry.otherCashDeduction || 0;

    if (entry.notes) {
      combinedNotes.push(entry.notes);
    }
  });

  const notesMerged = combinedNotes.join(', ');

  // --- Step D: Aggregate data from NIC & Tax ---
  let totalEerNIC = 0;
  let totalEesNIC = 0;
  let totalEesTax = 0;

  nicRecords.forEach(doc => {
    const nentry = doc.entries.find(e => String(e.employeeId) === String(employee._id));
    if (nentry) {
      totalEerNIC += nentry.erNIC || 0;
      totalEesNIC += nentry.eesNIC || 0;
      totalEesTax += nentry.eesTax || 0;
    }
  });

  // --- Step E: Compute E1..E23 ---
  const E1 = sumHoursWorked;
  const E2 = sumDaysWorked;
  const E3 = sumExtraShift;
  const E4 = sumOtherAdditions;
  const E5 = sumOtherDeductions;
  const E6 = notesMerged;

  // E7: If niDayMode === 'ALL', we use min(E2, ni_regularDays). Similarly for cash
  let E7 = 0;
  if (niDayMode === 'ALL') {
    E7 = Math.min(ni_regularDays, E2);
  }
  if (cashDayMode === 'ALL') {
    E7 = Math.max(E7, Math.min(cash_regularDays, E2));
  }

  let E8 = E2 - E7;
  if (E8 < 0) E8 = 0;

  let E9 = 0;
  if (niDayMode === 'FIXED') {
    E9 = ni_regularDays * ni_regularDayRate;
  } else if (niDayMode === 'ALL') {
    E9 = E7 * ni_regularDayRate;
  }

  let E10 = 0;
  if (cashDayMode === 'ALL') {
    E10 = (E7 * cash_regularDayRate) + (E8 * cash_extraDayRate);
  }

  let E11 = E9 + E10;
  let E12 = (E3 * ni_extraShiftRate) + (E3 * cash_extraShiftRate);

  // Hours used (E13, E14)
  let E13 = 0; // NI hours used
  if (niHoursMode === 'FIXED') {
    E13 = fixedNiHours;
  } else if (niHoursMode === 'ALL') {
    E13 = E1;
  } else if (niHoursMode === 'CUSTOM') {
    let customVal = E1 * (percentageNiHours / 100);
    if (customVal < minNiHours) customVal = minNiHours;
    if (maxNiHours > 0 && customVal > maxNiHours) customVal = maxNiHours;
    E13 = customVal;
  }
  // else if niHoursMode === 'NONE', E13 = 0 by default

  let E14 = 0; // Cash hours used
  if (cashHoursMode === 'REST') {
    E14 = E1 - E13;
    if (E14 < 0) E14 = 0;
  } else if (cashHoursMode === 'ALL') {
    E14 = E1;
  } else if (cashHoursMode === 'CUSTOM') {
    let cVal = E1 * (percentageCashHours / 100);
    if (cVal < minCashHours) cVal = minCashHours;
    if (maxCashHours > 0 && cVal > maxCashHours) cVal = maxCashHours;
    E14 = cVal;
  }
  // else if cashHoursMode === 'NONE', E14 = 0 by default

  let E15 = E13 * niRatePerHour;  // NI hours wage
  let E16 = E14 * cashRatePerHour; // Cash hours wage
  let E17 = E15 + E16;            // Gross hours wage

  const sumNiAdditions = niAdditions.reduce((acc, a) => acc + (a.amount || 0), 0);
  const sumNiDeductions = niDeductions.reduce((acc, a) => acc + (a.amount || 0), 0);
  let E18 = (E9 + E15) + sumNiAdditions - sumNiDeductions;

  const sumCashAdditions = cashAdditions.reduce((acc, a) => acc + (a.amount || 0), 0);
  const sumCashDeductions = cashDeductions.reduce((acc, a) => acc + (a.amount || 0), 0);
  let E19 = (E10 + E12 + E16) + sumCashAdditions - sumCashDeductions;

  let E20 = E18 + E19;
  let E21 = E18 - totalEesNIC - totalEesTax;
  let E22 = E19 + E4 - E5;
  let E23 = E21 + E22;
  if (E23 < 0) E23 = 0;

  // --- Step F: Build timesheetAllocations (F1..F11) ---
  const locationAllocations = [];
  const bigDenominator = E11 + E17 + E12; // totalCombinedDaysWage + totalCombinedHoursWage + totalCombinedExtraShiftWage

  timesheets.forEach(ts => {
    const entry = ts.entries.find(e => String(e.employeeId) === String(employee._id));
    if (!entry) return;

    const tHrs = entry.hoursWorked || 0;
    const tDays = entry.daysWorked || 0;
    const tX = entry.extraShiftWorked || 0;
    const tAdd = entry.otherCashAddition || 0;
    const tDed = entry.otherCashDeduction || 0;

    const hrsRatio = E1 > 0 ? (tHrs / E1) : 0;
    const daysRatio = E2 > 0 ? (tDays / E2) : 0;
    const shiftRatio = E3 > 0 ? (tX / E3) : 0;

    const allocatedHoursWage = E17 * hrsRatio;
    const allocatedDaysWage = E11 * daysRatio;
    const allocatedExtraShiftWage = E12 * shiftRatio;

    const numerator = allocatedHoursWage + allocatedDaysWage + allocatedExtraShiftWage;
    const wageRatio = bigDenominator > 0 ? (numerator / bigDenominator) : 0;

    const allocatedGrossNIWage = E18 * wageRatio;
    const allocatedGrossCashWage = (E19 * wageRatio) + (tAdd - tDed);
    const allocatedEerNIC = totalEerNIC * wageRatio;
    const allocatedWageCost = allocatedGrossNIWage + allocatedGrossCashWage + allocatedEerNIC;

    // Grab the timesheetName and locationName from the doc
    const timesheetName = ts.timesheetName || 'N/A';
    const locationName = ts.locationId && ts.locationId.name ? ts.locationId.name : 'N/A';

    locationAllocations.push({
      timesheetId: ts._id,
      timesheetName,     // NEW: store the timesheet's name
      locationName,      // NEW: store the location name
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
exports.createPayRun = async (req, res) => {
  try {
    const orgId = req.user.orgId;
    const { payRunName, startDate, endDate, notes } = req.body;

    if (!payRunName || !startDate || !endDate) {
      return res.status(400).json({ message: 'Missing required fields: payRunName, startDate, endDate.' });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    if (start > end) {
      return res.status(400).json({ message: 'Start date cannot be after end date.' });
    }

    // Check overlap
    const overlap = await hasOverlappingPayRun(orgId, start, end);
    if (overlap) {
      return res.status(400).json({ message: 'Overlapping pay run date range detected.' });
    }

    // Fetch Timesheets in range (populate locationId)
    const timesheets = await Timesheet.find({
      organizationId: orgId,
      $or: [{ startDate: { $lte: end }, endDate: { $gte: start } }],
      status: { $in: ['Draft', 'Approved', 'Pay Approved'] }
    })
    .populate('locationId', 'name');

    // Fetch NIC & Tax in range
    const nicDocs = await NICTax.find({
      organizationId: orgId,
      $or: [{ startDate: { $lte: end }, endDate: { $gte: start } }],
      status: { $in: ['Draft', 'Approved', 'Pay Approved'] }
    });

    // Gather all employees from timesheets + NIC
    const empSet = new Set();
    timesheets.forEach(ts => {
      ts.entries.forEach(e => empSet.add(String(e.employeeId)));
    });
    nicDocs.forEach(doc => {
      doc.entries.forEach(e => empSet.add(String(e.employeeId)));
    });

    const employees = await Employee.find({ _id: { $in: Array.from(empSet) } });

    let entries = [];
    let totalNetPay = 0;

    for (let emp of employees) {
      const relevantTimesheets = timesheets.filter(ts =>
        ts.entries.some(ent => String(ent.employeeId) === String(emp._id))
      );
      const relevantNIC = nicDocs.filter(doc =>
        doc.entries.some(ent => String(ent.employeeId) === String(emp._id))
      );

      if (!emp.payStructure) {
        return res.status(400).json({
          message: `Employee ${emp._id} has no pay structure. Cannot create payrun.`
        });
      }

      // Calculate E-F breakdown
      const result = calculatePayWithAllFormulas(emp, relevantTimesheets, relevantNIC);

      // Build the "contributingTimesheets" array for reference
      const contributingTimesheets = relevantTimesheets.map(ts => {
        const entry = ts.entries.find(e => String(e.employeeId) === String(emp._id));
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
        employeeName: emp.preferredName || `${emp.firstName} ${emp.lastName}`,
        payrollId: emp.payrollId,
        payStructure: emp.payStructure,
        rawTimesheetIds: relevantTimesheets.map(t => t._id),
        rawNICTaxIds: relevantNIC.map(n => n._id),
        netWage: result.netWage,
        breakdown: result.breakdown,
        needsUpdate: false,
        contributingTimesheets
      });

      totalNetPay += result.netWage;
    }

    // Create the payRun doc
    const payRun = await PayRun.create({
      organizationId: orgId,
      payRunName,
      startDate: start,
      endDate: end,
      notes: notes || '',
      status: 'Draft',
      needsRecalculation: false,
      totalNetPay,
      entries
    });

    return res.status(201).json({
      message: 'Pay Run created successfully (Draft).',
      payRun
    });
  } catch (err) {
    console.error('Error creating pay run:', err);
    return res.status(500).json({ message: 'Server error creating pay run.' });
  }
};

/**
 * GET Pay Runs (with filtering and pagination)
 */
exports.getPayRuns = async (req, res) => {
  try {
    const orgId = req.user.orgId;
    let { page = 1, limit = 10, search, status, startDate, endDate } = req.query;
    page = parseInt(page);
    limit = parseInt(limit);

    const query = { organizationId: orgId };

    // Search filter
    if (search) {
      query.$or = [
        { payRunName: { $regex: search, $options: 'i' } },
        { notes: { $regex: search, $options: 'i' } }
      ];
    }

    // Status filter
    if (status) {
      query.status = status;
    }

    // Date range filter (overlapping date range)
    if (startDate && endDate) {
      const s = new Date(startDate);
      const e = new Date(endDate);
      query.$and = [
        { startDate: { $lte: e } },
        { endDate: { $gte: s } }
      ];
    } else if (startDate) {
      query.startDate = { $gte: new Date(startDate) };
    } else if (endDate) {
      query.endDate = { $lte: new Date(endDate) };
    }

    const total = await PayRun.countDocuments(query);
    const docs = await PayRun.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    return res.status(200).json({
      data: docs,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
        limit
      }
    });
  } catch (err) {
    console.error('Error fetching pay runs:', err);
    return res.status(500).json({ message: 'Server error fetching pay runs.' });
  }
};

/**
 * GET single pay run
 */
exports.getPayRunById = async (req, res) => {
  try {
    const { payRunId } = req.params;
    const orgId = req.user.orgId;

    const payrun = await PayRun.findOne({ _id: payRunId, organizationId: orgId });
    if (!payrun) {
      return res.status(404).json({ message: 'Pay Run not found.' });
    }

    return res.status(200).json({ payrun });
  } catch (err) {
    console.error('Error getting pay run by id:', err);
    return res.status(500).json({ message: 'Server error getting pay run.' });
  }
};

/**
 * RECALCULATE Pay Run (if still Draft and needs update).
 * Re-run the entire aggregator so that E/F computations get updated.
 */
exports.recalcPayRun = async (req, res) => {
  try {
    const { payRunId } = req.params;
    const orgId = req.user.orgId;

    const payrun = await PayRun.findOne({ _id: payRunId, organizationId: orgId });
    if (!payrun) {
      return res.status(404).json({ message: 'Pay Run not found.' });
    }
    if (payrun.status !== 'Draft') {
      return res.status(400).json({ message: 'Only Draft pay runs can be recalculated.' });
    }

    // Fetch timesheets & NIC for the pay run's date range
    const timesheets = await Timesheet.find({
      organizationId: orgId,
      $or: [{ startDate: { $lte: payrun.endDate }, endDate: { $gte: payrun.startDate } }]
    }).populate('locationId', 'name');

    const nicDocs = await NICTax.find({
      organizationId: orgId,
      $or: [{ startDate: { $lte: payrun.endDate }, endDate: { $gte: payrun.startDate } }]
    });

    let totalNetPay = 0;
    let newEntries = [];

    for (let entry of payrun.entries) {
      const empId = entry.employeeId;
      const emp = await Employee.findById(empId);
      if (!emp) continue;

      const relevantTimesheets = timesheets.filter(ts =>
        ts.entries.some(e => String(e.employeeId) === String(empId))
      );
      const relevantNIC = nicDocs.filter(doc =>
        doc.entries.some(e => String(e.employeeId) === String(empId))
      );

      if (!emp.payStructure) {
        return res.status(400).json({
          message: `Employee ${emp._id} missing pay structure. Recalc halted.`
        });
      }

      // Recompute E-F breakdown
      const result = calculatePayWithAllFormulas(emp, relevantTimesheets, relevantNIC);

      // Build new "contributingTimesheets"
      const contributingTimesheets = relevantTimesheets.map(ts => {
        const tsEntry = ts.entries.find(e => String(e.employeeId) === String(empId));
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
        employeeName: emp.preferredName || `${emp.firstName} ${emp.lastName}`,
        payrollId: emp.payrollId,
        payStructure: emp.payStructure,
        rawTimesheetIds: relevantTimesheets.map(t => t._id),
        rawNICTaxIds: relevantNIC.map(n => n._id),
        netWage: result.netWage,
        breakdown: result.breakdown,
        needsUpdate: false,
        contributingTimesheets
      });
      totalNetPay += result.netWage;
    }

    payrun.entries = newEntries;
    payrun.totalNetPay = totalNetPay;
    payrun.needsRecalculation = false;
    await payrun.save();

    return res.status(200).json({
      message: 'Pay Run recalculated successfully.',
      payrun
    });
  } catch (err) {
    console.error('Error recalculating pay run:', err);
    return res.status(500).json({ message: 'Server error recalculating pay run.' });
  }
};

/**
 * APPROVE pay run (Draft -> Approved).
 */
exports.approvePayRun = async (req, res) => {
  try {
    const { payRunId } = req.params;
    const orgId = req.user.orgId;

    const payrun = await PayRun.findOne({ _id: payRunId, organizationId: orgId });
    if (!payrun) {
      return res.status(404).json({ message: 'Pay Run not found.' });
    }

    if (payrun.status !== 'Draft') {
      return res.status(400).json({ message: 'Only Draft pay runs can be approved.' });
    }

    for (let ent of payrun.entries) {
      const tsIds = ent.rawTimesheetIds || [];
      const nicIds = ent.rawNICTaxIds || [];

      if (tsIds.length) {
        await Timesheet.updateMany(
          { _id: { $in: tsIds }, organizationId: orgId, status: 'Approved' },
          { status: 'Pay Approved' }
        );
      }
      if (nicIds.length) {
        await NICTax.updateMany(
          { _id: { $in: nicIds }, organizationId: orgId, status: 'Approved' },
          { status: 'Pay Approved' }
        );
      }
    }

    payrun.status = 'Approved';
    await payrun.save();

    return res.status(200).json({
      message: 'Pay Run approved successfully.',
      payrun
    });
  } catch (err) {
    console.error('Error approving pay run:', err);
    return res.status(500).json({ message: 'Server error approving pay run.' });
  }
};

/**
 * REVERT pay run to Draft (Approved -> Draft).
 */
exports.revertPayRun = async (req, res) => {
  try {
    const { payRunId } = req.params;
    const orgId = req.user.orgId;

    const payrun = await PayRun.findOne({ _id: payRunId, organizationId: orgId });
    if (!payrun) {
      return res.status(404).json({ message: 'Pay Run not found.' });
    }

    if (payrun.status !== 'Approved') {
      return res.status(400).json({ message: 'Only Approved pay runs can be reverted to Draft.' });
    }

    for (let ent of payrun.entries) {
      const tsIds = ent.rawTimesheetIds || [];
      const nicIds = ent.rawNICTaxIds || [];

      if (tsIds.length) {
        await Timesheet.updateMany(
          { _id: { $in: tsIds }, organizationId: orgId, status: 'Pay Approved' },
          { status: 'Approved' }
        );
      }
      if (nicIds.length) {
        await NICTax.updateMany(
          { _id: { $in: nicIds }, organizationId: orgId, status: 'Pay Approved' },
          { status: 'Approved' }
        );
      }
    }

    payrun.status = 'Draft';
    await payrun.save();

    return res.status(200).json({
      message: 'Pay Run reverted to Draft successfully.',
      payrun
    });
  } catch (err) {
    console.error('Error reverting pay run:', err);
    return res.status(500).json({ message: 'Server error reverting pay run.' });
  }
};

/**
 * MARK pay run as Paid (Approved -> Paid).
 */
exports.markPayRunAsPaid = async (req, res) => {
  try {
    const { payRunId } = req.params;
    const orgId = req.user.orgId;

    const payrun = await PayRun.findOne({ _id: payRunId, organizationId: orgId });
    if (!payrun) {
      return res.status(404).json({ message: 'Pay Run not found.' });
    }

    if (payrun.status !== 'Approved') {
      return res.status(400).json({ message: 'Only an Approved pay run can be marked as Paid.' });
    }

    payrun.status = 'Paid';
    await payrun.save();

    return res.status(200).json({
      message: 'Pay Run marked as Paid successfully.',
      payrun
    });
  } catch (err) {
    console.error('Error marking pay run as paid:', err);
    return res.status(500).json({ message: 'Server error marking pay run as paid.' });
  }
};

/**
 * UPDATE pay run (for fields such as name, notes, or date range changes).
 */
exports.updatePayRun = async (req, res) => {
  try {
    const { payRunId } = req.params;
    const orgId = req.user.orgId;
    const updates = req.body;

    const payrun = await PayRun.findOne({ _id: payRunId, organizationId: orgId });
    if (!payrun) {
      return res.status(404).json({ message: 'Pay Run not found.' });
    }

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

    await payrun.save();
    return res.status(200).json({
      message: 'Pay Run updated successfully.',
      payrun
    });
  } catch (err) {
    console.error('Error updating pay run:', err);
    return res.status(500).json({ message: 'Server error updating pay run.' });
  }
};

/**
 * DELETE pay run (only if Draft).
 */
exports.deletePayRun = async (req, res) => {
  try {
    const { payRunId } = req.params;
    const orgId = req.user.orgId;

    const payrun = await PayRun.findOne({ _id: payRunId, organizationId: orgId });
    if (!payrun) {
      return res.status(404).json({ message: 'Pay Run not found or already removed.' });
    }

    if (payrun.status !== 'Draft') {
      return res.status(400).json({ message: 'Cannot delete pay run that is not Draft.' });
    }

    await PayRun.deleteOne({ _id: payRunId, organizationId: orgId });

    return res.status(200).json({ message: 'Pay Run deleted successfully.' });
  } catch (err) {
    console.error('Error deleting pay run:', err);
    return res.status(500).json({ message: 'Server error deleting pay run.' });
  }
};
// New function to export PayRun details as CSV
exports.exportPayRunCSV = async (req, res) => {
  try {
    const { payRunId } = req.params;
    const { orgId } = req.user;
    if (!payRunId) {
      return res.status(400).json({ message: 'Missing payRunId in parameters.' });
    }
    // Fetch the pay run with matching organization
    const payRun = await PayRun.findOne({ _id: payRunId, organizationId: orgId });
    if (!payRun) {
      return res.status(404).json({ message: 'Pay Run not found.' });
    }
    
    // Create header row – adjust the columns as needed.
    const headers = [
      "PayRunName",
      "PayRunStartDate",
      "PayRunEndDate",
      "PayRunStatus",
      "EmployeeName",
      "PayrollID",
      "PayStructureName",
      "Breakdown_E1_totalHours",
      "Breakdown_E2_totalDays",
      "Breakdown_E9_NIDaysWage",
      "Breakdown_E10_cashDaysWage",
      "Breakdown_E11_grossDaysWage",
      "Breakdown_E12_extraShiftWage",
      "Breakdown_E13_NIHoursUsed",
      "Breakdown_E14_cashHoursUsed",
      "Breakdown_E15_NIHoursWage",
      "Breakdown_E16_cashHoursWage",
      "Breakdown_E17_grossHoursWage",
      "Breakdown_E18_grossNIWage",
      "Breakdown_E19_grossCashWage",
      "Breakdown_E20_totalGrossWage",
      "Breakdown_E21_netNIWage",
      "Breakdown_E22_netCashWage",
      "Breakdown_E23_totalNetWage",
      "Breakdown_D1_eerNIC",
      "Breakdown_D2_eesNIC",
      "Breakdown_D3_eesTax",
      "ContributingTimesheets",
      "TimesheetAllocations"
    ];
    
    // Prepare an array to hold CSV rows.
    const csvRows = [];
    csvRows.push(headers.join(","));
    
    // Loop over each pay run entry to flatten the data.
    for (const entry of payRun.entries) {
      const row = [];
      
      // Add pay run-level info.
      row.push(`"${payRun.payRunName}"`);
      row.push(`"${new Date(payRun.startDate).toISOString().split('T')[0]}"`);
      row.push(`"${new Date(payRun.endDate).toISOString().split('T')[0]}"`);
      row.push(`"${payRun.status}"`);
      
      // Employee data from the entry.
      row.push(`"${entry.employeeName}"`);
      row.push(`"${entry.payrollId}"`);
      // Use payStructure if available
      let psName = "";
      if (entry.payStructure && entry.payStructure.payStructureName) {
        psName = entry.payStructure.payStructureName;
      }
      row.push(`"${psName}"`);
      
      // Breakdown fields (if breakdown exists, otherwise default to 0)
      const bd = entry.breakdown || {};
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
      row.push(bd.D3_eesTax || 0);
      
      // Contributing timesheets – convert the array to a JSON string.
      row.push(`"${JSON.stringify(entry.contributingTimesheets || [])}"`);
      
      // Timesheet allocations from breakdown (if any).
      const allocations = (bd.timesheetAllocations && bd.timesheetAllocations.length > 0)
        ? bd.timesheetAllocations
        : [];
      row.push(`"${JSON.stringify(allocations)}"`);
      
      csvRows.push(row.join(","));
    }
    
    const csvString = csvRows.join("\n");
    
    // Set headers so the browser treats this response as a file download.
    res.header("Content-Type", "text/csv");
    res.attachment(`PayRun_${payRun.payRunName.replace(/ /g, "_")}.csv`);
    return res.send(csvString);
  } catch (error) {
    console.error("Error exporting pay run CSV:", error);
    return res.status(500).json({ message: "Server error exporting pay run CSV." });
  }
};

// (Keep the rest of your controller functions unchanged)