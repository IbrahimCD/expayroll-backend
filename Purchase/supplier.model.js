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
    },
    locationId: {
      type: Schema.Types.ObjectId,
      ref: 'Location',
      required: true
    }
  },
  {
    timestamps: true
  }
);

// Compound index to ensure unique supplier names per location
supplierSchema.index({ name: 1, locationId: 1, organizationId: 1 }, { unique: true });

module.exports = model('Supplier', supplierSchema);

