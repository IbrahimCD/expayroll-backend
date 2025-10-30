// backend/Purchase/invoice.model.js
const mongoose = require('mongoose');
const { Schema, model } = mongoose;

const invoiceItemSchema = new Schema(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: 'Product'
    },
    name: {
      type: String,
      required: true
    },
    qty: {
      type: Number,
      required: true,
      min: 0
    },
    unitPrice: {
      type: Number,
      required: true,
      min: 0
    },
    amount: {
      type: Number,
      required: true,
      min: 0
    },
    defaultPrice: {
      type: Number,
      required: true,
      min: 0
    },
    variance: {
      type: Number,
      default: 0
    }
  },
  { _id: false }
);

const invoiceSchema = new Schema(
  {
    date: {
      type: Date,
      required: true
    },
    supplierId: {
      type: Schema.Types.ObjectId,
      ref: 'Supplier',
      required: true
    },
    locationId: {
      type: Schema.Types.ObjectId,
      ref: 'Location',
      required: true
    },
    items: [invoiceItemSchema],
    total: {
      type: Number,
      required: true,
      min: 0
    },
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true
    }
  },
  {
    timestamps: true
  }
);

module.exports = model('Invoice', invoiceSchema);

