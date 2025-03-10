const PayRun = require('../payRun/payRun.model');
const Employee = require('../Employee/employee.model');
const Location = require('../Location/location.model');

exports.generateEmployeeWageReport = async (req, res) => {
  try {
    const { payRunId } = req.query;
    const { orgId } = req.user;
    if (!payRunId) {
      return res.status(400).json({ message: 'Missing payRunId in query parameters.' });
    }
    // Fetch the selected Pay Run
    const payRun = await PayRun.findOne({ _id: payRunId, organizationId: orgId });
    if (!payRun) {
      return res.status(404).json({ message: 'Pay Run not found.' });
    }
    const reportRows = [];
    // Loop through each pay run entry
    for (const entry of payRun.entries) {
      // Fetch the employee document
      const employee = await Employee.findById(entry.employeeId);
      let firstName = '', lastName = '';
      if (employee) {
        firstName = employee.firstName || '';
        lastName = employee.lastName || '';
      } else if (entry.employeeName) {
        const parts = entry.employeeName.split(' ');
        firstName = parts[0];
        lastName = parts.slice(1).join(' ');
      }
      const payrollId = entry.payrollId || '';

      // Determine baseLocation:
      // If the pay run entry already has a baseLocation value, use it.
      // Otherwise, if the employee exists and has a baseLocationId, look it up in the Location collection.
      let baseLocation = entry.baseLocation || '';
      if (!baseLocation && employee && employee.baseLocationId) {
        const loc = await Location.findById(employee.baseLocationId);
        baseLocation = loc ? loc.name : '';
      }

      // Extract computed fields from the pay run entry's breakdown.
      const breakdown = entry.breakdown || {};
      const niDayWage = breakdown.E9_NIDaysWage || 0;
      const niHoursUsed = breakdown.E13_NIHoursUsed || 0;
      const netNIWage = breakdown.E21_netNIWage || 0;
      const netCashWage = breakdown.E22_netCashWage || 0;

      // Get NI Regular Day Rate and NI Hours Rate from employee pay structure.
      let niRegularDayRate = 0;
      let niHoursRate = 0;
      if (employee && employee.payStructure) {
        if (employee.payStructure.dailyRates) {
          niRegularDayRate = employee.payStructure.dailyRates.ni_regularDayRate || 0;
        }
        if (employee.payStructure.hourlyRates) {
          niHoursRate = employee.payStructure.hourlyRates.niRatePerHour || 0;
        }
      }

      reportRows.push({
        firstName,
        lastName,
        payrollId,
        baseLocation,
        niDayWage,
        niRegularDayRate,
        niHoursUsed,
        niHoursRate,
        netNIWage,
        netCashWage
      });
    }

    return res.status(200).json({ report: reportRows });
  } catch (error) {
    console.error('Error generating employee wage report:', error);
    return res.status(500).json({ message: 'Server error generating employee wage report.' });
  }
};
