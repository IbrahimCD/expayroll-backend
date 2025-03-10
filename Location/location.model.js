const mongoose = require('mongoose');
const { Schema } = mongoose;

const LocationSchema = new Schema({
  code: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  organizationId: {
    type: Schema.Types.ObjectId,
    ref: 'Organization',
    required: true
  }
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual to count employees associated with this location.
// Make sure your Employee model is exported as "Employee" and each Employee has a field "baseLocationId".
LocationSchema.virtual('employeeCount', {
  ref: 'Employee',
  localField: '_id',
  foreignField: 'baseLocationId',
  count: true
});

module.exports = mongoose.model('Location', LocationSchema);
