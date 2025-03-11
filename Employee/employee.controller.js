// backend/Employee/employee.controller.js

const Employee = require('./employee.model');
const Location = require('../Location/location.model');

/**
 * Create a new employee.
 * The organizationId is taken from req.user.orgId.
 */
exports.createEmployee = async (req, res) => {
  try {
    // Merge organizationId from the token into the payload:
    const payload = { ...req.body, organizationId: req.user.orgId };

    // --- NEW: If payStructure provided, ensure otherConsiderations arrays exist. ---
    if (payload.payStructure) {
      // Process payStructure.dailyRates if provided (using your new nested structure)
      if (payload.payStructure.dailyRates) {
        const dr = payload.payStructure.dailyRates;

        // Process NI Daily Rates based on niDayMode
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
        }

        // Process Cash Daily Rates based on cashDayMode
        if (dr.cashDayMode === 'NONE') {
          dr.cashRates = {
            regularDays: 0,
            regularDayRate: 0,
            extraDayRate: 0,
            extraShiftRate: 0
          };
        }
      }

      // --- Make sure otherConsiderations is well-formed if hasOtherConsiderations is true ---
      if (payload.payStructure.hasOtherConsiderations) {
        if (!payload.payStructure.otherConsiderations) {
          payload.payStructure.otherConsiderations = {};
        }
        // Default arrays if not provided
        payload.payStructure.otherConsiderations.niAdditions =
          payload.payStructure.otherConsiderations.niAdditions || [];
        payload.payStructure.otherConsiderations.niDeductions =
          payload.payStructure.otherConsiderations.niDeductions || [];
        payload.payStructure.otherConsiderations.cashAdditions =
          payload.payStructure.otherConsiderations.cashAdditions || [];
        payload.payStructure.otherConsiderations.cashDeductions =
          payload.payStructure.otherConsiderations.cashDeductions || [];
      }
    }

    const employee = await Employee.create(payload);
    return res.status(201).json({
      message: 'Employee created successfully',
      employee
    });
  } catch (error) {
    console.error('Error creating employee:', error);
    return res.status(500).json({ message: 'Server error creating employee' });
  }
};

/**
 * Get employees with search, filtering, and pagination.
 */
exports.getEmployees = async (req, res) => {
  try {
    const { search = '', page = 1, limit = 200, status } = req.query;
    const query = { organizationId: req.user.orgId };

    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { preferredName: { $regex: search, $options: 'i' } }
      ];
    }
    if (status) {
      query.status = status;
    }

    const skip = (Number(page) - 1) * Number(limit);
    const employeesPromise = Employee.find(query).skip(skip).limit(Number(limit));
    const countPromise = Employee.countDocuments(query);

    const [employees, total] = await Promise.all([employeesPromise, countPromise]);
    const totalPages = Math.ceil(total / Number(limit));

    return res.status(200).json({ employees, totalPages });
  } catch (error) {
    console.error('Error fetching employees:', error);
    return res.status(500).json({ message: 'Server error fetching employees' });
  }
};

/**
 * Get a single employee by ID.
 */
exports.getEmployeeById = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const employee = await Employee.findOne({ _id: employeeId, organizationId: req.user.orgId });
    if (!employee) return res.status(404).json({ message: 'Employee not found' });
    return res.status(200).json({ employee });
  } catch (error) {
    console.error('Error fetching employee:', error);
    return res.status(500).json({ message: 'Server error fetching employee' });
  }
};

/**
 * Update an employee by ID.
 */
exports.updateEmployee = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const updates = req.body;
    
    // --- If payStructure present, do dailyRates logic + ensure otherConsiderations arrays. ---
    if (updates.payStructure) {
      if (updates.payStructure.dailyRates) {
        const dr = updates.payStructure.dailyRates;

        // NI Daily Rates
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
        }

        // Cash Daily Rates
        if (dr.cashDayMode === 'NONE') {
          dr.cashRates = {
            regularDays: 0,
            regularDayRate: 0,
            extraDayRate: 0,
            extraShiftRate: 0
          };
        }
      }

      // If hasOtherConsiderations, ensure arrays exist
      if (updates.payStructure.hasOtherConsiderations) {
        if (!updates.payStructure.otherConsiderations) {
          updates.payStructure.otherConsiderations = {};
        }
        updates.payStructure.otherConsiderations.niAdditions =
          updates.payStructure.otherConsiderations.niAdditions || [];
        updates.payStructure.otherConsiderations.niDeductions =
          updates.payStructure.otherConsiderations.niDeductions || [];
        updates.payStructure.otherConsiderations.cashAdditions =
          updates.payStructure.otherConsiderations.cashAdditions || [];
        updates.payStructure.otherConsiderations.cashDeductions =
          updates.payStructure.otherConsiderations.cashDeductions || [];
      }
    }

    const employee = await Employee.findOneAndUpdate(
      { _id: employeeId, organizationId: req.user.orgId },
      updates,
      { new: true }
    );
    if (!employee) return res.status(404).json({ message: 'Employee not found' });
    return res.status(200).json({
      message: 'Employee updated successfully',
      employee
    });
  } catch (error) {
    console.error('Error updating employee:', error);
    return res.status(500).json({ message: 'Server error updating employee' });
  }
};

/**
 * Delete an employee by ID.
 */
exports.deleteEmployee = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const employee = await Employee.findOneAndDelete({ _id: employeeId, organizationId: req.user.orgId });
    if (!employee) return res.status(404).json({ message: 'Employee not found' });
    return res.status(200).json({ message: 'Employee deleted successfully' });
  } catch (error) {
    console.error('Error deleting employee:', error);
    return res.status(500).json({ message: 'Server error deleting employee' });
  }
};

// ------------------------------------
// Batch Create / Batch Update
// ------------------------------------

const locationCache = {}; // { [locationCode]: ObjectId }

async function getLocationIdByCode(orgId, code) {
  const trimmedCode = (code || '').trim();
  if (!trimmedCode) return null;
  if (locationCache[trimmedCode]) {
    return locationCache[trimmedCode];
  }
  const loc = await Location.findOne({ organizationId: orgId, code: trimmedCode });
  if (!loc) {
    throw new Error(`Location with code "${trimmedCode}" not found.`);
  }
  locationCache[trimmedCode] = loc._id;
  return loc._id;
}

// Helper to parse "Name:amount;Name2:amount2" into array
function parsePairs(str) {
  if (!str) return [];
  return str.split(';').map((item) => {
    if (item.includes(':')) {
      const [rawName, rawAmt] = item.split(':');
      return {
        name: (rawName || '').trim(),
        amount: Number(rawAmt) || 0
      };
    } else {
      // No colon found: treat the whole item as the amount.
      return {
        name: '', // or you could set a default like 'Other'
        amount: Number(item) || 0
      };
    }
  });
}


/**
 * Batch create employees.
 * Expects req.body.employees to be an array of employee objects parsed from CSV.
 */
exports.batchCreateEmployees = async (req, res) => {
  try {
    const orgId = req.user.orgId;
    const { employees } = req.body;
    if (!employees || !Array.isArray(employees)) {
      return res.status(400).json({ message: 'Invalid employees data.' });
    }

    const createdEmployees = [];
    for (const empData of employees) {
      empData.organizationId = orgId;

      // Convert baseLocationId from code to ObjectId
      if (empData.baseLocationId) {
        const locId = await getLocationIdByCode(orgId, empData.baseLocationId);
        empData.baseLocationId = locId;
      }
      // Convert locationAccess from codes to ObjectIds
      if (empData.locationAccess && typeof empData.locationAccess === 'string') {
        const codes = empData.locationAccess.split(';').map(s => s.trim()).filter(Boolean);
        const accessIds = [];
        for (const code of codes) {
          const locId = await getLocationIdByCode(orgId, code);
          accessIds.push(locId);
        }
        empData.locationAccess = accessIds;
      }

      // Convert string booleans
      if (typeof empData.hasDailyRates === 'string') {
        empData.hasDailyRates = empData.hasDailyRates.toLowerCase() === 'true';
      }
      if (typeof empData.hasHourlyRates === 'string') {
        empData.hasHourlyRates = empData.hasHourlyRates.toLowerCase() === 'true';
      }
      if (typeof empData.hasOtherConsiderations === 'string') {
        empData.hasOtherConsiderations = empData.hasOtherConsiderations.toLowerCase() === 'true';
      }

      // Build payStructure
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
          cash_extraShiftRate: Number(empData.cash_extraShiftRate) || 0,
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
          cashRatePerHour: Number(empData.cashRatePerHour) || 0,
        },
        hasOtherConsiderations: empData.hasOtherConsiderations,
        otherConsiderations: {
          note: empData.note || '',
          niAdditions: parsePairs(empData.niAdditions),
          niDeductions: parsePairs(empData.niDeductions),
          cashAdditions: parsePairs(empData.cashAdditions),
          cashDeductions: parsePairs(empData.cashDeductions)
        }
      };

      // Remove flat fields so they aren’t duplicated in the payload
      [
        'payStructureName','niDayMode','ni_regularDays','ni_regularDayRate',
        'ni_extraDayRate','ni_extraShiftRate','cashDayMode','cash_regularDays',
        'cash_regularDayRate','cash_extraDayRate','cash_extraShiftRate',
        'hasHourlyRates','niHoursMode','minNiHours','maxNiHours',
        'percentageNiHours','niRatePerHour','fixedNiHours','cashHoursMode',
        'minCashHours','maxCashHours','percentageCashHours','cashRatePerHour',
        'hasOtherConsiderations','note','niAdditions','niDeductions','cashAdditions','cashDeductions'
      ].forEach(field => delete empData[field]);

      const newEmp = await Employee.create(empData);
      createdEmployees.push(newEmp);
    }

    return res.status(201).json({
      message: `Batch create successful. Created ${createdEmployees.length} employees.`,
      employees: createdEmployees
    });
  } catch (error) {
    console.error('Error in batch creating employees:', error);
    return res.status(500).json({
      message: 'Error in batch creating employees',
      error: error.message
    });
  }
};


/**
 * Batch Update Employees.
 * Expects req.body.employees to be an array of employee objects
 * Each object must include an "employeeId" field and the fields to update.
 */
exports.batchUpdateEmployees = async (req, res) => {
  try {
    const orgId = req.user.orgId;
    const { employees } = req.body;
    if (!employees || !Array.isArray(employees)) {
      return res.status(400).json({ message: 'Invalid employees data.' });
    }
    const updatedEmployees = [];

    for (const updateData of employees) {
      if (!updateData.employeeId) {
        throw new Error('EmployeeId is missing in one of the update rows.');
      }

      // Convert baseLocationId if provided (assumed to be a code)
      if (updateData.baseLocationId) {
        const locId = await getLocationIdByCode(orgId, updateData.baseLocationId);
        updateData.baseLocationId = locId;
      }

      // Convert locationAccess (if provided as semicolon separated codes)
      if (updateData.locationAccess && typeof updateData.locationAccess === 'string') {
        const codes = updateData.locationAccess.split(';').map(s => s.trim()).filter(Boolean);
        const accessIds = [];
        for (const code of codes) {
          const locId = await getLocationIdByCode(orgId, code);
          accessIds.push(locId);
        }
        updateData.locationAccess = accessIds;
      }

      // Convert string booleans
      if (typeof updateData.hasDailyRates === 'string') {
        updateData.hasDailyRates = updateData.hasDailyRates.toLowerCase() === 'true';
      }
      if (typeof updateData.hasHourlyRates === 'string') {
        updateData.hasHourlyRates = updateData.hasHourlyRates.toLowerCase() === 'true';
      }
      if (typeof updateData.hasOtherConsiderations === 'string') {
        updateData.hasOtherConsiderations = updateData.hasOtherConsiderations.toLowerCase() === 'true';
      }

      // If pay structure fields exist, nest them
      if (
        updateData.payStructureName ||
        updateData.niDayMode ||
        updateData.ni_regularDays ||
        updateData.ni_regularDayRate ||
        updateData.ni_extraDayRate ||
        updateData.ni_extraShiftRate ||
        updateData.cashDayMode ||
        updateData.cash_regularDays ||
        updateData.cash_regularDayRate ||
        updateData.cash_extraDayRate ||
        updateData.cash_extraShiftRate ||
        updateData.hasHourlyRates ||
        updateData.niHoursMode ||
        updateData.minNiHours ||
        updateData.maxNiHours ||
        updateData.percentageNiHours ||
        updateData.niRatePerHour ||
        updateData.fixedNiHours ||
        updateData.cashHoursMode ||
        updateData.minCashHours ||
        updateData.maxCashHours ||
        updateData.percentageCashHours ||
        updateData.cashRatePerHour ||
        updateData.hasOtherConsiderations ||
        updateData.note ||
        updateData.niAdditions ||
        updateData.niDeductions ||
        updateData.cashAdditions ||
        updateData.cashDeductions
      ) {
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
            cash_extraShiftRate: Number(updateData.cash_extraShiftRate) || 0,
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
            cashRatePerHour: Number(updateData.cashRatePerHour) || 0,
          },
          hasOtherConsiderations: updateData.hasOtherConsiderations,
          otherConsiderations: {
            note: updateData.note || '',
            niAdditions: parsePairs(updateData.niAdditions),
            niDeductions: parsePairs(updateData.niDeductions),
            cashAdditions: parsePairs(updateData.cashAdditions),
            cashDeductions: parsePairs(updateData.cashDeductions),
          }
        };
      }

      // Remove flat fields so they won’t be duplicated
      [
        'payStructureName','niDayMode','ni_regularDays','ni_regularDayRate',
        'ni_extraDayRate','ni_extraShiftRate','cashDayMode','cash_regularDays',
        'cash_regularDayRate','cash_extraDayRate','cash_extraShiftRate',
        'hasHourlyRates','niHoursMode','minNiHours','maxNiHours',
        'percentageNiHours','niRatePerHour','fixedNiHours','cashHoursMode',
        'minCashHours','maxCashHours','percentageCashHours','cashRatePerHour',
        'hasOtherConsiderations','note','niAdditions','niDeductions','cashAdditions','cashDeductions'
      ].forEach(field => delete updateData[field]);

      // Update employee
      const updatedEmp = await Employee.findOneAndUpdate(
        { _id: updateData.employeeId, organizationId: orgId },
        { $set: updateData },
        { new: true }
      );
      if (updatedEmp) {
        updatedEmployees.push(updatedEmp);
      }
    }

    return res.status(200).json({
      message: `Batch update successful. Updated ${updatedEmployees.length} employees.`,
      employees: updatedEmployees
    });
  } catch (error) {
    console.error('Error in batch updating employees:', error);
    return res.status(500).json({
      message: 'Error in batch updating employees',
      error: error.message
    });
  }
};
