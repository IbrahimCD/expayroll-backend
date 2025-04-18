// backend/Location/location.controller.js

const Location = require('./location.model');
const Employee = require('../Employee/employee.model');
const mongoose = require('mongoose');

/**
 * Create a new location.
 */
exports.createLocation = async (req, res) => {
  try {
    const { code, name } = req.body;
    const { orgId } = req.user; // from auth middleware

    if (!code || !name) {
      return res.status(400).json({ message: 'Code and name are required.' });
    }

    // Check for duplicates within the same org
    const existingLoc = await Location.findOne({ code, organizationId: orgId });
    if (existingLoc) {
      return res
        .status(400)
        .json({ message: 'Location code already exists in this organization.' });
    }

    const newLocation = await Location.create({
      code,
      name,
      organizationId: orgId
    });

    return res
      .status(201)
      .json({ message: 'Location created successfully.', location: newLocation });
  } catch (error) {
    console.error('Create location error:', error);
    return res.status(500).json({ message: 'Server error.' });
  }
};

/**
 * Get all locations for the user's organization, including employee counts.
 */
exports.getLocations = async (req, res) => {
  try {
    const orgId = req.user.orgId || req.user.organizationId;
    if (!orgId) {
      return res.status(400).json({ message: 'Organization ID missing in token' });
    }

    // Using aggregation pipeline to get counts
    const locations = await Location.aggregate([
      {
        $match: {
          organizationId: new mongoose.Types.ObjectId(orgId)
        }
      },
      {
        $lookup: {
          from: 'employees',
          localField: '_id',
          foreignField: 'baseLocationId',
          as: 'employees'
        }
      },
      {
        $addFields: {
          employeeCount: { $size: '$employees' },
          employedCount: {
            $size: {
              $filter: {
                input: '$employees',
                as: 'emp',
                cond: { $eq: ['$$emp.status', 'Employed'] }
              }
            }
          },
          leftCount: {
            $size: {
              $filter: {
                input: '$employees',
                as: 'emp',
                cond: { $eq: ['$$emp.status', 'Left'] }
              }
            }
          },
          onLeaveCount: {
            $size: {
              $filter: {
                input: '$employees',
                as: 'emp',
                cond: { $eq: ['$$emp.status', 'On Leave'] }
              }
            }
          }
        }
      },
      {
        $project: {
          employees: 0
        }
      }
    ]);

    return res.status(200).json(locations);
  } catch (error) {
    console.error('Get locations error:', error);
    return res.status(500).json({ message: 'Server error.' });
  }
};

/**
 * Get a single location by ID.
 */
exports.getLocation = async (req, res) => {
  try {
    const orgId = req.user.orgId || req.user.organizationId;
    let { id } = req.params;

      // 1) Reject anything that isn’t a valid 24‑char ObjectId
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ message: 'Invalid location ID format.' });
      }

    const location = await Location.findOne({ _id: id, organizationId: orgId });
    if (!location) {
      return res.status(404).json({ message: 'Location not found.' });
    }

    return res.status(200).json(location);
  } catch (error) {
    console.error('Get location error:', error);
    return res.status(500).json({ message: 'Server error.' });
  }
};

/**
 * Update a location.
 */
exports.updateLocation = async (req, res) => {
  try {
    const { id } = req.params;
    const orgId = req.user.orgId || req.user.organizationId;
    const { code, name } = req.body;

    const location = await Location.findOne({ _id: id, organizationId: orgId });
    if (!location) {
      return res.status(404).json({ message: 'Location not found.' });
    }

    if (code) location.code = code;
    if (name) location.name = name;

    await location.save();
    return res
      .status(200)
      .json({ message: 'Location updated successfully.', location });
  } catch (error) {
    console.error('Update location error:', error);
    return res.status(500).json({ message: 'Server error.' });
  }
};

/**
 * Delete a location if no employees are assigned to it.
 */
exports.deleteLocation = async (req, res) => {
  try {
    const { id } = req.params;
    const orgId = req.user.orgId || req.user.organizationId;

    // 1) Check if employees reference this location
    const employeeCount = await Employee.countDocuments({
      baseLocationId: id,
      organizationId: orgId
    });

    if (employeeCount > 0) {
      return res.status(400).json({
        message: 'Cannot delete. Employees are assigned to this location.'
      });
    }

    // 2) If no employees, delete
    const location = await Location.findOneAndDelete({
      _id: id,
      organizationId: orgId
    });
    if (!location) {
      return res.status(404).json({ message: 'Location not found.' });
    }

    return res.status(200).json({ message: 'Location deleted successfully.' });
  } catch (error) {
    console.error('Delete location error:', error);
    return res.status(500).json({ message: 'Server error.' });
  }
};

/**
 * Get all employees assigned to a specific location.
 */
exports.getEmployeesForLocation = async (req, res) => {
  try {
    const orgId = req.user.orgId || req.user.organizationId;
    const { id } = req.params;
    const employees = await Employee.find({
      baseLocationId: id,
      organizationId: orgId
    });
    return res.status(200).json(employees);
  } catch (error) {
    console.error('Get employees for location error:', error);
    return res.status(500).json({ message: 'Server error.' });
  }
};
