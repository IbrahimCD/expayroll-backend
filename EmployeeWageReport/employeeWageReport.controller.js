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
    
    // Fetch the selected Pay Run as a lean (plain JS) object
    const payRun = await PayRun.findOne({ _id: payRunId, organizationId: orgId }).lean();
    if (!payRun) {
      return res.status(404).json({ message: 'Pay Run not found.' });
    }
    
    // Collect all employee IDs from the pay run entries
    const employeeIds = payRun.entries.map(entry => entry.employeeId).filter(Boolean);
    
    // Batch fetch employees with only the required fields
    const employees = await Employee.find({ _id: { $in: employeeIds } })
      .select('firstName lastName payrollId baseLocationId payStructure')
      .lean();
    
    // Build a lookup map for employees
    const employeeMap = new Map(employees.map(emp => [emp._id.toString(), emp]));
    
    // Collect unique baseLocationIds from these employees
    const uniqueLocationIds = [
      ...new Set(
        employees
          .filter(emp => emp.baseLocationId)
          .map(emp => emp.baseLocationId.toString())
      )
    ];
    
    // Batch fetch locations with only the needed field
    const locations = await Location.find({ _id: { $in: uniqueLocationIds } })
      .select('name')
      .lean();
    
    // Build a lookup map for locations
    const locationMap = new Map(locations.map(loc => [loc._id.toString(), loc]));
    
    // Build the report rows by mapping over the pay run entries
    const reportRows = payRun.entries.map(entry => {
      const employee = employeeMap.get(entry.employeeId) || null;
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
      
      // Determine baseLocation: if the entry doesn't have it, lookup from the employee data
      let baseLocation = entry.baseLocation || '';
      if (!baseLocation && employee && employee.baseLocationId) {
        const loc = locationMap.get(employee.baseLocationId.toString());
        baseLocation = loc ? loc.name : '';
      }
      
      // Extract computed fields from the breakdown
      const breakdown = entry.breakdown || {};
      const niDayWage = breakdown.E9_NIDaysWage || 0;
      const niHoursUsed = breakdown.E13_NIHoursUsed || 0;
      const netNIWage = breakdown.E21_netNIWage || 0;
      const netCashWage = breakdown.E22_netCashWage || 0;
      
      // Get NI Regular Day Rate and NI Hours Rate from employee's pay structure
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
      
      return {
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
      };
    });
    
    return res.status(200).json({ report: reportRows });
  } catch (error) {
    console.error('Error generating employee wage report:', error);
    return res.status(500).json({ message: 'Server error generating employee wage report.' });
  }
};
