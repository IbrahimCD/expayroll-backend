// backend/Purchase/product.model.js
const mongoose = require('mongoose');
const { Schema, model } = mongoose;

const productSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    category: {
      type: String,
      trim: true,
      default: ''
    },
    supplierId: {
      type: Schema.Types.ObjectId,
      ref: 'Supplier',
      required: true
    },
    defaultUnitPrice: {
      type: Number,
      required: true,
      min: 0,
      default: 0
    },
    rebateAmount: {
      type: Number,
      required: true,
      min: 0,
      default: 0
    },
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true
    }
    // locationId removed - products are now organization-wide
  },
  {
    timestamps: true
  }
);

// Compound index to ensure unique product names per supplier within an organization (not per location)
productSchema.index({ name: 1, supplierId: 1, organizationId: 1 }, { unique: true });

module.exports = model('Product', productSchema);
