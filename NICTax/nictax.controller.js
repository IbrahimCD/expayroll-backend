const NICTax = require('./nictax.model');
const Employee = require('../Employee/employee.model');
const Location = require('../Location/location.model');

/**
 * Create a new NIC & Tax record in Draft.
 */
exports.createNICTax = async (req, res) => {
  try {
    const orgId = req.user.orgId; // from JWT
    const { recordName, startDate, endDate, description, baseLocationId, entries } = req.body;

    // Validate required fields
    if (!recordName || !startDate || !endDate || !baseLocationId) {
      return res.status(400).json({ message: 'Missing required fields (recordName, startDate, endDate, baseLocationId).' });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    if (start > end) {
      return res.status(400).json({ message: 'Start date cannot be after end date.' });
    }

    // Build the NIC/Tax document payload
    const payload = {
      organizationId: orgId,
      recordName,
      startDate: start,
      endDate: end,
      description: description || '',
      baseLocationId,
      status: 'Draft',
      entries: []
    };

    // Process entries concurrently if provided
    if (Array.isArray(entries) && entries.length > 0) {
      const finalEntries = await Promise.all(
        entries.map(async (entry) => {
          const emp = await Employee.findById(entry.employeeId);
          // Only include valid employees with matching base location
          if (emp && emp.baseLocationId && emp.baseLocationId.toString() === baseLocationId.toString()) {
            return {
              employeeId: emp._id,
              employeeName: `${emp.firstName} ${emp.lastName}`,
              eesNIC: entry.eesNIC || 0,
              erNIC: entry.erNIC || 0,
              eesTax: entry.eesTax || 0,
              notes: entry.notes || ''
            };
          }
          return null;
        })
      );
      payload.entries = finalEntries.filter((entry) => entry !== null);
    }

    const doc = await NICTax.create(payload);
    return res.status(201).json({
      message: 'NIC & Tax record created successfully (Draft)',
      nictax: doc
    });
  } catch (err) {
    console.error('Error creating NIC & Tax:', err);
    return res.status(500).json({ message: 'Server error creating NIC & Tax' });
  }
};

/**
 * Get all NIC & Tax records for this organization with pagination and filtering.
 * Supports:
 *   - Pagination: page, limit
 *   - Search by recordName: search
 *   - Filter by status: status
 *   - Date range filter: startDate, endDate (overlapping condition)
 */
exports.getNICTaxRecords = async (req, res) => {
  try {
    const orgId = req.user.orgId;
    let { page = 1, limit = 10, search, status, startDate, endDate } = req.query;
    page = parseInt(page);
    limit = parseInt(limit);

    const query = { organizationId: orgId };

    // Search by recordName (case-insensitive)
    if (search) {
      query.recordName = { $regex: search, $options: 'i' };
    }

    // Filter by status if provided
    if (status) {
      query.status = status;
    }

    // Date range filter: find records whose range overlaps with the provided range
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

    // Count total records for pagination metadata
    const total = await NICTax.countDocuments(query);

    // Fetch records and populate the baseLocationId field
    const docs = await NICTax.find(query)
      .populate('baseLocationId', 'name code')
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
    console.error('Error fetching NIC & Tax records:', err);
    return res.status(500).json({ message: 'Server error fetching NIC & Tax' });
  }
};

/**
 * Get a single NIC & Tax record by ID.
 */
exports.getNICTaxById = async (req, res) => {
  try {
    const { nictaxId } = req.params;
    const orgId = req.user.orgId;

    const doc = await NICTax.findOne({ _id: nictaxId, organizationId: orgId })
      .populate('baseLocationId', 'name code')
      .populate('entries.employeeId', 'firstName lastName baseLocationId');

    if (!doc) {
      return res.status(404).json({ message: 'NIC & Tax record not found' });
    }

    return res.status(200).json({ nictax: doc });
  } catch (err) {
    console.error('Error fetching NIC & Tax by ID:', err);
    return res.status(500).json({ message: 'Server error fetching NIC & Tax by ID' });
  }
};

/**
 * Update NIC & Tax record by ID.
 * For Approved records, only allowed update is reverting status to Draft.
 */
exports.updateNICTax = async (req, res) => {
  try {
    const { nictaxId } = req.params;
    const orgId = req.user.orgId;
    const updates = req.body;

    const doc = await NICTax.findOne({ _id: nictaxId, organizationId: orgId });
    if (!doc) {
      return res.status(404).json({ message: 'NIC & Tax record not found' });
    }

    // If record is Approved, allow only reverting to Draft.
    if (doc.status === 'Approved') {
      const updateKeys = Object.keys(updates);
      if (updateKeys.length !== 1 || updates.status !== 'Draft') {
        return res.status(400).json({
          message: 'Approved records cannot be edited. Only reverting to Draft is allowed.'
        });
      }
      doc.status = 'Draft';
      await doc.save();
      return res.status(200).json({
        message: 'Record status reverted to Draft successfully',
        nictax: doc
      });
    }

    // For Draft records, process updates.
    if (typeof updates.recordName === 'string') {
      doc.recordName = updates.recordName;
    }
    if (updates.startDate) {
      const newStartDate = new Date(updates.startDate);
      const effectiveEndDate = updates.endDate ? new Date(updates.endDate) : doc.endDate;
      if (newStartDate > effectiveEndDate) {
        return res.status(400).json({ message: 'Start date cannot be after end date.' });
      }
      doc.startDate = newStartDate;
    }
    if (updates.endDate) {
      const newEndDate = new Date(updates.endDate);
      const effectiveStartDate = updates.startDate ? new Date(updates.startDate) : doc.startDate;
      if (effectiveStartDate > newEndDate) {
        return res.status(400).json({ message: 'End date cannot be before start date.' });
      }
      doc.endDate = newEndDate;
    }
    if (typeof updates.description === 'string') {
      doc.description = updates.description;
    }
    // If baseLocationId changes, update and clear entries if new entries are not provided.
    if (updates.baseLocationId && updates.baseLocationId.toString() !== doc.baseLocationId.toString()) {
      doc.baseLocationId = updates.baseLocationId;
      if (!updates.entries) {
        doc.entries = [];
      }
    }
    if (updates.status) {
      doc.status = updates.status; // e.g., 'Draft' or 'Approved'
    }
    // If entries are provided, process them concurrently.
    if (Array.isArray(updates.entries)) {
      const newEntries = await Promise.all(
        updates.entries.map(async (entry) => {
          const emp = await Employee.findById(entry.employeeId);
          if (emp && emp.baseLocationId && emp.baseLocationId.toString() === doc.baseLocationId.toString()) {
            return {
              employeeId: emp._id,
              employeeName: `${emp.firstName} ${emp.lastName}`,
              eesNIC: entry.eesNIC || 0,
              erNIC: entry.erNIC || 0,
              eesTax: entry.eesTax || 0,
              notes: entry.notes || ''
            };
          }
          return null;
        })
      );
      doc.entries = newEntries.filter((entry) => entry !== null);
    }

    await doc.save();
    return res.status(200).json({
      message: 'NIC & Tax record updated successfully',
      nictax: doc
    });
  } catch (err) {
    console.error('Error updating NIC & Tax record:', err);
    return res.status(500).json({ message: 'Server error updating NIC & Tax' });
  }
};

/**
 * Delete NIC & Tax record by ID.
 * Approved records cannot be deleted.
 */
exports.deleteNICTax = async (req, res) => {
  try {
    const { nictaxId } = req.params;
    const orgId = req.user.orgId;

    const doc = await NICTax.findOne({ _id: nictaxId, organizationId: orgId });
    if (!doc) {
      return res.status(404).json({ message: 'NIC & Tax record not found or already removed' });
    }

    // Prevent deletion if record is Approved.
    if (doc.status === 'Approved') {
      return res.status(400).json({ message: 'Approved records cannot be deleted.' });
    }

    await NICTax.findOneAndDelete({ _id: nictaxId, organizationId: orgId });
    return res.status(200).json({ message: 'NIC & Tax record deleted successfully' });
  } catch (err) {
    console.error('Error deleting NIC & Tax record:', err);
    return res.status(500).json({ message: 'Server error deleting NIC & Tax' });
  }
};
/**
 * GET /nictax/template-employees?locationId=xxx
 * or          /nictax/template-employees?locationName=xxx
 *
 * Return employees (with default NIC/Tax fields) to help generate a CSV template.
 */
exports.getEmployeesForNICTaxTemplate = async (req, res) => {
  try {
    const { orgId } = req.user;
    let { locationId, locationName } = req.query;

    // If the user wants employees for a specific location
    if (!locationId && !locationName) {
      return res.status(400).json({
        message: 'Please provide locationId or locationName in query params.'
      });
    }

    let location;
    if (locationName && !locationId) {
      // find location by name
      location = await Location.findOne({
        organizationId: orgId,
        name: new RegExp(`^${locationName}$`, 'i')
      });
      if (!location) {
        return res.status(404).json({ message: 'Location not found by name.' });
      }
      locationId = String(location._id);
    } else if (locationId) {
      location = await Location.findById(locationId);
    }

    // Now find employees who have baseLocationId = locationId
    // or some other logic if you store locationAccess, etc.
    const employees = await Employee.find({
      organizationId: orgId,
      baseLocationId: locationId,
      status: 'Employed'
    });

    // Return an array of "row objects" with default NIC/Tax values
    const data = employees.map((emp) => ({
      employeeName: `${emp.firstName} ${emp.lastName}`,
      employeeId: emp._id.toString(),
      eesNIC: '0',
      erNIC: '0',
      eesTax: '0',
      notes: '',
      locationId,             // so we know which location
      locationName: location ? location.name : 'N/A'
      // any other default fields you need
    }));

    return res.status(200).json({ employees: data });
  } catch (err) {
    console.error('Error in getEmployeesForNICTaxTemplate:', err);
    return res.status(500).json({ message: 'Server error generating NIC/Tax template.' });
  }
};
// nictax.controller.js (add to the existing exports)
exports.batchCreateNICTax = async (req, res) => {
  try {
    const { orgId } = req.user;
    const {
      recordName,
      startDate,
      endDate,
      baseLocationId,
      entries // array of NIC/Tax row objects
    } = req.body;

    // Validate
    if (!recordName || !startDate || !endDate || !baseLocationId || !Array.isArray(entries)) {
      return res.status(400).json({
        message: 'Missing required fields: recordName, startDate, endDate, baseLocationId, entries[]'
      });
    }

    // Check date validity
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
      return res.status(400).json({
        message: 'Invalid startDate/endDate, or startDate > endDate.'
      });
    }

    // We'll store the final array of entries
    const newEntries = [];
    const warnings = [];

    for (let i = 0; i < entries.length; i++) {
      const row = entries[i];
      if (!row.employeeId) {
        // If CSV used payrollId instead, you'd do a lookup here
        warnings.push(`Row ${i + 1}: Missing employeeId. Skipped.`);
        continue;
      }

      // Lookup the actual employee to confirm they belong to the same baseLocation
      const emp = await Employee.findOne({
        _id: row.employeeId,
        organizationId: orgId,
        baseLocationId: baseLocationId
      });
      if (!emp) {
        warnings.push(`Row ${i + 1}: Employee not found or not matching baseLocation. Skipped.`);
        continue;
      }

      newEntries.push({
        employeeId: emp._id,
        employeeName: `${emp.firstName} ${emp.lastName}`,
        eesNIC: Number(row.eesNIC) || 0,
        erNIC: Number(row.erNIC) || 0,
        eesTax: Number(row.eesTax) || 0,
        notes: row.notes || ''
      });
    }

    if (newEntries.length === 0) {
      return res.status(400).json({
        message: 'No valid entries found in request.',
        warnings
      });
    }

    // Create one NIC & Tax record
    const payload = {
      organizationId: orgId,
      recordName,
      startDate: start,
      endDate: end,
      baseLocationId,
      entries: newEntries,
      status: 'Draft'
    };

    const doc = await NICTax.create(payload);

    return res.status(201).json({
      message: 'Batch NIC/Tax record created successfully!',
      nictax: doc,
      warnings
    });
  } catch (err) {
    console.error('Error in batchCreateNICTax:', err);
    return res.status(500).json({ message: 'Server error in batchCreateNICTax.' });
  }
};