const mongoose = require('mongoose');
const { Schema } = mongoose;

const nictaxSchema = new Schema(
  {
    organizationId: { 
      type: Schema.Types.ObjectId, 
      ref: 'Organization', 
      required: true, 
      index: true 
    },
    recordName: { type: String, required: true },
    startDate: { 
      type: Date, 
      required: true, 
      index: true 
    },
    endDate: { type: Date, required: true },
    description: { type: String, default: '' },
    baseLocationId: { 
      type: Schema.Types.ObjectId, 
      ref: 'Location', 
      required: true, 
      index: true 
    },
    // Array of employee entries with NIC/Tax details.
    entries: [
      {
        employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
        employeeName: { type: String, required: true },
        eesNIC: { type: Number, default: 0 },
        erNIC: { type: Number, default: 0 },
        eesTax: { type: Number, default: 0 },
        notes: { type: String, default: '' }
      }
    ],
    status: {
      type: String,
      enum: ['Draft', 'Approved'],
      default: 'Draft',
      index: true
    }
  },
  { timestamps: true }
);

/**
 * Pre-save hook to enforce record immutability when Approved.
 *
 * If a record was originally Approved, the only allowed change is reverting
 * its status to 'Draft'. Any other modification will be rejected.
 */

nictaxSchema.pre('save', async function (next) {
  if (this.isNew) return next();

  try {
    const original = await this.constructor.findById(this._id).lean();
    if (!original) return next();

    if (original.status === 'Approved') {
      // Filter out "updatedAt" from the modified paths
      const modifiedFields = this.modifiedPaths().filter((p) => p !== 'updatedAt');

      // Allow only changing status to Draft
      if (modifiedFields.length === 1 && modifiedFields[0] === 'status' && this.status === 'Draft') {
        return next();
      }
      // Otherwise, reject
      return next(new Error('Approved records cannot be edited. Please revert to Draft to make changes.'));
    }
    next();
  } catch (err) {
    next(err);
  }
});


// Index on createdAt for efficient sorting of records.
nictaxSchema.index({ createdAt: -1 });

module.exports = mongoose.model('NICTax', nictaxSchema);
