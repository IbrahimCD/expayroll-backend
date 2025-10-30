// backend/Purchase/purchase.controller.js
const Supplier = require('./supplier.model');
const Product = require('./product.model');
const Invoice = require('./invoice.model');
const Location = require('../Location/location.model');
const mongoose = require('mongoose');

// Helper function to validate location belongs to organization
async function validateLocation(orgId, locationId) {
  if (!mongoose.Types.ObjectId.isValid(locationId)) {
    return { valid: false, message: 'Invalid location ID format.' };
  }
  const location = await Location.findOne({ _id: locationId, organizationId: orgId });
  if (!location) {
    return { valid: false, message: 'Location not found or does not belong to your organization.' };
  }
  return { valid: true };
}

// ==================== SUPPLIERS ====================

/**
 * Create a new supplier
 */
exports.createSupplier = async (req, res) => {
  try {
    const orgId = req.user.orgId;
    const { name, locationId } = req.body;

    if (!name || !locationId) {
      return res.status(400).json({ message: 'Name and locationId are required.' });
    }

    // Validate location
    const validation = await validateLocation(orgId, locationId);
    if (!validation.valid) {
      return res.status(400).json({ message: validation.message });
    }

    const supplier = await Supplier.create({
      name: name.trim(),
      organizationId: orgId,
      locationId
    });

    return res.status(201).json({
      message: 'Supplier created successfully.',
      supplier
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Supplier with this name already exists for this location.' });
    }
    console.error('Error creating supplier:', error);
    return res.status(500).json({ message: 'Server error creating supplier.' });
  }
};

/**
 * Get all suppliers for a location
 */
exports.getSuppliers = async (req, res) => {
  try {
    const orgId = req.user.orgId;
    const { locationId } = req.params;

    if (!locationId) {
      return res.status(400).json({ message: 'locationId is required.' });
    }

    // Validate location
    const validation = await validateLocation(orgId, locationId);
    if (!validation.valid) {
      return res.status(400).json({ message: validation.message });
    }

    const suppliers = await Supplier.find({
      organizationId: orgId,
      locationId
    }).sort({ name: 1 });

    return res.status(200).json(suppliers);
  } catch (error) {
    console.error('Error fetching suppliers:', error);
    return res.status(500).json({ message: 'Server error fetching suppliers.' });
  }
};

/**
 * Update a supplier
 */
exports.updateSupplier = async (req, res) => {
  try {
    const orgId = req.user.orgId;
    const { id } = req.params;
    const { name, locationId } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid supplier ID format.' });
    }

    // If locationId is being changed, validate it
    if (locationId) {
      const validation = await validateLocation(orgId, locationId);
      if (!validation.valid) {
        return res.status(400).json({ message: validation.message });
      }
    }

    const supplier = await Supplier.findOne({ _id: id, organizationId: orgId });
    if (!supplier) {
      return res.status(404).json({ message: 'Supplier not found.' });
    }

    if (name) supplier.name = name.trim();
    if (locationId) supplier.locationId = locationId;

    await supplier.save();

    return res.status(200).json({
      message: 'Supplier updated successfully.',
      supplier
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Supplier with this name already exists for this location.' });
    }
    console.error('Error updating supplier:', error);
    return res.status(500).json({ message: 'Server error updating supplier.' });
  }
};

/**
 * Delete a supplier (and cascade delete its products)
 */
exports.deleteSupplier = async (req, res) => {
  try {
    const orgId = req.user.orgId;
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid supplier ID format.' });
    }

    const supplier = await Supplier.findOne({ _id: id, organizationId: orgId });
    if (!supplier) {
      return res.status(404).json({ message: 'Supplier not found.' });
    }

    // Delete all products associated with this supplier
    await Product.deleteMany({ supplierId: id, organizationId: orgId });

    // Delete the supplier
    await Supplier.findByIdAndDelete(id);

    return res.status(200).json({
      message: 'Supplier and associated products deleted successfully.'
    });
  } catch (error) {
    console.error('Error deleting supplier:', error);
    return res.status(500).json({ message: 'Server error deleting supplier.' });
  }
};

// ==================== PRODUCTS ====================

/**
 * Create a new product
 */
exports.createProduct = async (req, res) => {
  try {
    const orgId = req.user.orgId;
    const { name, supplierId, defaultUnitPrice, rebateAmount, locationId } = req.body;

    if (!name || !supplierId || !locationId) {
      return res.status(400).json({ message: 'Name, supplierId, and locationId are required.' });
    }

    // Validate location
    const validation = await validateLocation(orgId, locationId);
    if (!validation.valid) {
      return res.status(400).json({ message: validation.message });
    }

    // Validate supplier belongs to same org and location
    const supplier = await Supplier.findOne({
      _id: supplierId,
      organizationId: orgId,
      locationId
    });
    if (!supplier) {
      return res.status(400).json({ message: 'Supplier not found or does not belong to this location.' });
    }

    const product = await Product.create({
      name: name.trim(),
      supplierId,
      defaultUnitPrice: defaultUnitPrice || 0,
      rebateAmount: rebateAmount || 0,
      organizationId: orgId,
      locationId
    });

    return res.status(201).json({
      message: 'Product created successfully.',
      product
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Product with this name already exists for this supplier and location.' });
    }
    console.error('Error creating product:', error);
    return res.status(500).json({ message: 'Server error creating product.' });
  }
};

/**
 * Get all products for a location
 */
exports.getProducts = async (req, res) => {
  try {
    const orgId = req.user.orgId;
    const { locationId } = req.params;

    if (!locationId) {
      return res.status(400).json({ message: 'locationId is required.' });
    }

    // Validate location
    const validation = await validateLocation(orgId, locationId);
    if (!validation.valid) {
      return res.status(400).json({ message: validation.message });
    }

    const products = await Product.find({
      organizationId: orgId,
      locationId
    })
      .populate('supplierId', 'name')
      .sort({ name: 1 });

    return res.status(200).json(products);
  } catch (error) {
    console.error('Error fetching products:', error);
    return res.status(500).json({ message: 'Server error fetching products.' });
  }
};

/**
 * Get products by supplier
 */
exports.getProductsBySupplier = async (req, res) => {
  try {
    const orgId = req.user.orgId;
    const { supplierId, locationId } = req.params;

    if (!supplierId || !locationId) {
      return res.status(400).json({ message: 'supplierId and locationId are required.' });
    }

    // Validate location
    const validation = await validateLocation(orgId, locationId);
    if (!validation.valid) {
      return res.status(400).json({ message: validation.message });
    }

    // Validate supplier
    const supplier = await Supplier.findOne({
      _id: supplierId,
      organizationId: orgId,
      locationId
    });
    if (!supplier) {
      return res.status(404).json({ message: 'Supplier not found.' });
    }

    const products = await Product.find({
      supplierId,
      organizationId: orgId,
      locationId
    }).sort({ name: 1 });

    return res.status(200).json(products);
  } catch (error) {
    console.error('Error fetching products by supplier:', error);
    return res.status(500).json({ message: 'Server error fetching products.' });
  }
};

/**
 * Update a product
 */
exports.updateProduct = async (req, res) => {
  try {
    const orgId = req.user.orgId;
    const { id } = req.params;
    const { name, supplierId, defaultUnitPrice, rebateAmount, locationId } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid product ID format.' });
    }

    const product = await Product.findOne({ _id: id, organizationId: orgId });
    if (!product) {
      return res.status(404).json({ message: 'Product not found.' });
    }

    if (name) product.name = name.trim();
    if (supplierId !== undefined) {
      // Validate supplier belongs to same org and location
      const supplier = await Supplier.findOne({
        _id: supplierId,
        organizationId: orgId,
        locationId: locationId || product.locationId
      });
      if (!supplier) {
        return res.status(400).json({ message: 'Supplier not found or does not belong to this location.' });
      }
      product.supplierId = supplierId;
    }
    if (defaultUnitPrice !== undefined) product.defaultUnitPrice = defaultUnitPrice;
    if (rebateAmount !== undefined) product.rebateAmount = rebateAmount;
    if (locationId) {
      const validation = await validateLocation(orgId, locationId);
      if (!validation.valid) {
        return res.status(400).json({ message: validation.message });
      }
      product.locationId = locationId;
    }

    await product.save();

    return res.status(200).json({
      message: 'Product updated successfully.',
      product
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Product with this name already exists for this supplier and location.' });
    }
    console.error('Error updating product:', error);
    return res.status(500).json({ message: 'Server error updating product.' });
  }
};

/**
 * Delete a product
 */
exports.deleteProduct = async (req, res) => {
  try {
    const orgId = req.user.orgId;
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid product ID format.' });
    }

    const product = await Product.findOne({ _id: id, organizationId: orgId });
    if (!product) {
      return res.status(404).json({ message: 'Product not found.' });
    }

    await Product.findByIdAndDelete(id);

    return res.status(200).json({
      message: 'Product deleted successfully.'
    });
  } catch (error) {
    console.error('Error deleting product:', error);
    return res.status(500).json({ message: 'Server error deleting product.' });
  }
};

// ==================== INVOICES ====================

/**
 * Create a new invoice
 */
exports.createInvoice = async (req, res) => {
  try {
    const orgId = req.user.orgId;
    const { date, supplierId, locationId, items } = req.body;

    if (!date || !supplierId || !locationId || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Date, supplierId, locationId, and items are required.' });
    }

    // Validate location
    const validation = await validateLocation(orgId, locationId);
    if (!validation.valid) {
      return res.status(400).json({ message: validation.message });
    }

    // Validate supplier belongs to same org and location
    const supplier = await Supplier.findOne({
      _id: supplierId,
      organizationId: orgId,
      locationId
    });
    if (!supplier) {
      return res.status(400).json({ message: 'Supplier not found or does not belong to this location.' });
    }

    // Calculate total
    const total = items.reduce((sum, item) => sum + (item.amount || 0), 0);

    const invoice = await Invoice.create({
      date: new Date(date),
      supplierId,
      locationId,
      items,
      total,
      organizationId: orgId
    });

    // Populate supplier name for response
    await invoice.populate('supplierId', 'name');

    return res.status(201).json({
      message: 'Invoice created successfully.',
      invoice
    });
  } catch (error) {
    console.error('Error creating invoice:', error);
    return res.status(500).json({ message: 'Server error creating invoice.' });
  }
};

/**
 * Get all invoices for a location
 */
exports.getInvoices = async (req, res) => {
  try {
    const orgId = req.user.orgId;
    const { locationId } = req.params;

    if (!locationId) {
      return res.status(400).json({ message: 'locationId is required.' });
    }

    // Validate location
    const validation = await validateLocation(orgId, locationId);
    if (!validation.valid) {
      return res.status(400).json({ message: validation.message });
    }

    const invoices = await Invoice.find({
      organizationId: orgId,
      locationId
    })
      .populate('supplierId', 'name')
      .sort({ createdAt: -1 });

    return res.status(200).json(invoices);
  } catch (error) {
    console.error('Error fetching invoices:', error);
    return res.status(500).json({ message: 'Server error fetching invoices.' });
  }
};

/**
 * Get a single invoice by ID
 */
exports.getInvoiceById = async (req, res) => {
  try {
    const orgId = req.user.orgId;
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid invoice ID format.' });
    }

    const invoice = await Invoice.findOne({
      _id: id,
      organizationId: orgId
    }).populate('supplierId', 'name');

    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found.' });
    }

    return res.status(200).json(invoice);
  } catch (error) {
    console.error('Error fetching invoice:', error);
    return res.status(500).json({ message: 'Server error fetching invoice.' });
  }
};

/**
 * Delete an invoice
 */
exports.deleteInvoice = async (req, res) => {
  try {
    const orgId = req.user.orgId;
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid invoice ID format.' });
    }

    const invoice = await Invoice.findOne({ _id: id, organizationId: orgId });
    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found.' });
    }

    await Invoice.findByIdAndDelete(id);

    return res.status(200).json({
      message: 'Invoice deleted successfully.'
    });
  } catch (error) {
    console.error('Error deleting invoice:', error);
    return res.status(500).json({ message: 'Server error deleting invoice.' });
  }
};

/**
 * Generate CSV for an invoice
 */
exports.generateInvoiceCSV = async (req, res) => {
  try {
    const orgId = req.user.orgId;
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid invoice ID format.' });
    }

    const invoice = await Invoice.findOne({
      _id: id,
      organizationId: orgId
    }).populate('supplierId', 'name');

    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found.' });
    }

    // Format date as YYYY-MM-DD
    const dateStr = new Date(invoice.date).toISOString().split('T')[0];
    const supplierName = invoice.supplierId?.name || 'Unknown';
    
    // Helper function to escape CSV fields
    const escapeCSV = (value) => {
      const str = String(value);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    // Build CSV rows
    const rows = [
      ['Date', dateStr],
      ['Supplier', supplierName],
      [], // Empty row
      ['Product Name', 'Qty', 'Unit Price', 'Amount', 'Default Unit Price', 'Price Variance'],
      ...invoice.items.map(item => [
        item.name,
        item.qty,
        item.unitPrice.toFixed(2),
        item.amount.toFixed(2),
        item.defaultPrice.toFixed(2),
        item.variance.toFixed(2)
      ]),
      [], // Empty row
      ['', '', 'Total', invoice.total.toFixed(2)]
    ];

    // Convert to CSV string
    const csv = rows.map(row => row.map(escapeCSV).join(',')).join('\n');

    // Set headers for CSV download
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${dateStr} - ${supplierName.replace(/[\\/:*?"<>|#\[\]]+/g, '-').slice(0, 50)}.csv"`);
    
    return res.send(csv);
  } catch (error) {
    console.error('Error generating CSV:', error);
    return res.status(500).json({ message: 'Server error generating CSV.' });
  }
};

