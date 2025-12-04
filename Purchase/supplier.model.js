// backend/Purchase/supplier.model.js
const mongoose = require('mongoose');
const { Schema, model } = mongoose;

const supplierSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true
    }
    // locationId removed - suppliers are now organization-wide
  },
  {
    timestamps: true
  }
);

// Compound index to ensure unique supplier names per organization (not per location)
supplierSchema.index({ name: 1, organizationId: 1 }, { unique: true });

module.exports = model('Supplier', supplierSchema);
