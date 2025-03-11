// backend/Reports/employeeWageReport.controller.js
const { ObjectId } = require('mongoose').Types;
const PayRun = require('../payRun/payRun.model');
const Employee = require('../Employee/employee.model');
const Location = require('../Location/location.model');

exports.generateEmployeeWageReport = async (req, res) => {
  try {
    const {
      payRunId,
      searchName = '',
      baseLocations = '', // comma-separated list e.g. "LR,DAR"
      orderBy = 'firstName',
      orderDirection = 'asc',
      page = 1,
      limit = 50
    } = req.query;
    const { orgId } = req.user;
    if (!payRunId) {
      return res.status(400).json({ message: 'Missing payRunId in query parameters.' });
    }

    // Build the aggregation pipeline
    const pipeline = [
      // Match the correct pay run document for the organization.
      { $match: { _id: ObjectId(payRunId), organizationId: orgId } },
      // Unwind the entries array to work on each entry separately.
      { $unwind: "$entries" },
      // Lookup the Employee document for each entry.
      {
        $lookup: {
          from: "employees", // collection name in MongoDB
          localField: "entries.employeeId",
          foreignField: "_id",
          as: "employee"
        }
      },
      { $unwind: { path: "$employee", preserveNullAndEmptyArrays: true } },
      // Lookup the Location (if needed) from the employee's baseLocationId.
      {
        $lookup: {
          from: "locations",
          localField: "employee.baseLocationId",
          foreignField: "_id",
          as: "location"
        }
      },
      { $unwind: { path: "$location", preserveNullAndEmptyArrays: true } },
      // Project the fields needed for the report.
      {
        $project: {
          // Use employee data if available; otherwise, try splitting entry.employeeName.
          firstName: {
            $cond: [
              { $ifNull: [ "$employee.firstName", false ] },
              "$employee.firstName",
              { $arrayElemAt: [ { $split: [ "$entries.employeeName", " " ] }, 0 ] }
            ]
          },
          lastName: {
            $cond: [
              { $ifNull: [ "$employee.lastName", false ] },
              "$employee.lastName",
              {
                $trim: {
                  input: {
                    $reduce: {
                      input: { $slice: [ { $split: [ "$entries.employeeName", " " ] }, 1, { $size: { $split: [ "$entries.employeeName", " " ] } } ] },
                      initialValue: "",
                      in: { $concat: [ "$$value", " ", "$$this" ] }
                    }
                  }
                }
              }
            ]
          },
          payrollId: "$entries.payrollId",
          // Use the entry's baseLocation if provided; else use the lookup location name.
          baseLocation: {
            $cond: [
              { $ifNull: [ "$entries.baseLocation", false ] },
              "$entries.baseLocation",
              "$location.name"
            ]
          },
          niDayWage: "$entries.breakdown.E9_NIDaysWage",
          niHoursUsed: "$entries.breakdown.E13_NIHoursUsed",
          netNIWage: "$entries.breakdown.E21_netNIWage",
          netCashWage: "$entries.breakdown.E22_netCashWage",
          // Get rates from the employee document if available.
          niRegularDayRate: "$employee.payStructure.dailyRates.ni_regularDayRate",
          niHoursRate: "$employee.payStructure.hourlyRates.niRatePerHour"
        }
      }
    ];

    // Client‑side filters:

    // Filter by name (searchName matches firstName or lastName)
    if (searchName) {
      pipeline.push({
        $match: {
          $or: [
            { firstName: { $regex: searchName, $options: 'i' } },
            { lastName: { $regex: searchName, $options: 'i' } }
          ]
        }
      });
    }

    // Filter by baseLocations (if provided as comma‑separated values)
    if (baseLocations) {
      const locArray = baseLocations.split(',').map((loc) => loc.trim()).filter(Boolean);
      if (locArray.length > 0) {
        pipeline.push({
          $match: { baseLocation: { $in: locArray } }
        });
      }
    }

    // Sorting stage:
    const sortOrder = orderDirection === 'asc' ? 1 : -1;
    pipeline.push({ $sort: { [orderBy]: sortOrder } });

    // Pagination: skip and limit.
    const skip = (Number(page) - 1) * Number(limit);
    pipeline.push({ $skip: skip });
    pipeline.push({ $limit: Number(limit) });

    // Run the aggregation pipeline on the PayRun collection.
    const reportRows = await PayRun.aggregate(pipeline);
    return res.status(200).json({ report: reportRows });
  } catch (error) {
    console.error('Error generating employee wage report:', error);
    return res.status(500).json({ message: 'Server error generating employee wage report.' });
  }
};
