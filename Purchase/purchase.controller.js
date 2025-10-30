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
 * Get all suppliers for a location (with pagination and search)
 */
exports.getSuppliers = async (req, res) => {
  try {
    const orgId = req.user.orgId;
    const { locationId } = req.params;
    let { page = 1, limit = 20, search, sortBy = 'name', sortOrder = 'asc' } = req.query;

    if (!locationId) {
      return res.status(400).json({ message: 'locationId is required.' });
    }

    // Validate location
    const validation = await validateLocation(orgId, locationId);
    if (!validation.valid) {
      return res.status(400).json({ message: validation.message });
    }

    // Parse pagination parameters
    page = parseInt(page);
    limit = parseInt(limit);

    // Build query
    const query = {
      organizationId: orgId,
      locationId
    };

    // Search filter
    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }

    // Sort configuration
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Count total matching documents
    const total = await Supplier.countDocuments(query);

    // Fetch suppliers with pagination
    const suppliers = await Supplier.find(query)
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit);

    return res.status(200).json({
      data: suppliers,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
        limit
      }
    });
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

    // Check if any products from this supplier are used in invoices
    const products = await Product.find({ supplierId: id, organizationId: orgId });
    const productIds = products.map(p => p._id);
    
    if (productIds.length > 0) {
      const invoicesWithProducts = await Invoice.countDocuments({
        organizationId: orgId,
        'items.productId': { $in: productIds }
      });

      if (invoicesWithProducts > 0) {
        return res.status(400).json({
          message: 'Cannot delete supplier. Some products from this supplier are used in existing invoices.'
        });
      }
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
 * Get all products for a location (with pagination, search, and filters)
 */
exports.getProducts = async (req, res) => {
  try {
    const orgId = req.user.orgId;
    const { locationId } = req.params;
    let { page = 1, limit = 20, search, supplier, minPrice, maxPrice, sortBy = 'name', sortOrder = 'asc' } = req.query;

    if (!locationId) {
      return res.status(400).json({ message: 'locationId is required.' });
    }

    // Validate location
    const validation = await validateLocation(orgId, locationId);
    if (!validation.valid) {
      return res.status(400).json({ message: validation.message });
    }

    // Parse pagination parameters
    page = parseInt(page);
    limit = parseInt(limit);

    // Build query
    const query = {
      organizationId: orgId,
      locationId
    };

    // Search filter by product name
    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }

    // Filter by supplier
    if (supplier) {
      query.supplierId = supplier;
    }

    // Price range filters
    if (minPrice || maxPrice) {
      query.defaultUnitPrice = {};
      if (minPrice) {
        query.defaultUnitPrice.$gte = parseFloat(minPrice);
      }
      if (maxPrice) {
        query.defaultUnitPrice.$lte = parseFloat(maxPrice);
      }
    }

    // Sort configuration
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Count total matching documents
    const total = await Product.countDocuments(query);

    // Fetch products with pagination
    const products = await Product.find(query)
      .populate('supplierId', 'name')
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit);

    return res.status(200).json({
      data: products,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
        limit
      }
    });
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

// ==================== BULK PRODUCT CREATION ====================

/**
 * Bulk create products with auto supplier creation
 */
exports.bulkCreateProducts = async (req, res) => {
  try {
    const orgId = req.user.orgId;
    const { locationId, products } = req.body;

    if (!locationId) {
      return res.status(400).json({ message: 'locationId is required.' });
    }

    if (!products || !Array.isArray(products) || products.length === 0) {
      return res.status(400).json({ message: 'Products array is required and must not be empty.' });
    }

    // Validate location
    const validation = await validateLocation(orgId, locationId);
    if (!validation.valid) {
      return res.status(400).json({ message: validation.message });
    }

    const successfulProducts = [];
    const failedProducts = [];

    // Process each product
    for (let i = 0; i < products.length; i++) {
      const product = products[i];
      
      try {
        // Validate required fields
        if (!product.supplier || !product.supplier.trim()) {
          failedProducts.push({
            row: i + 1,
            supplier: product.supplier || '',
            name: product.name || '',
            defaultUnitPrice: product.defaultUnitPrice || 0,
            rebateAmount: product.rebateAmount || 0,
            error: 'Supplier name is required.'
          });
          continue;
        }

        if (!product.name || !product.name.trim()) {
          failedProducts.push({
            row: i + 1,
            supplier: product.supplier,
            name: product.name || '',
            defaultUnitPrice: product.defaultUnitPrice || 0,
            rebateAmount: product.rebateAmount || 0,
            error: 'Product name is required.'
          });
          continue;
        }

        // Validate numeric values
        const defaultUnitPrice = parseFloat(product.defaultUnitPrice);
        const rebateAmount = parseFloat(product.rebateAmount);

        if (isNaN(defaultUnitPrice) || defaultUnitPrice < 0) {
          failedProducts.push({
            row: i + 1,
            supplier: product.supplier,
            name: product.name,
            defaultUnitPrice: product.defaultUnitPrice,
            rebateAmount: product.rebateAmount,
            error: 'Invalid default unit price. Must be a number >= 0.'
          });
          continue;
        }

        if (isNaN(rebateAmount) || rebateAmount < 0) {
          failedProducts.push({
            row: i + 1,
            supplier: product.supplier,
            name: product.name,
            defaultUnitPrice: product.defaultUnitPrice,
            rebateAmount: product.rebateAmount,
            error: 'Invalid rebate amount. Must be a number >= 0.'
          });
          continue;
        }

        // Find or create supplier (case-insensitive)
        const supplierName = product.supplier.trim();
        let supplier = await Supplier.findOne({
          name: { $regex: new RegExp(`^${supplierName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
          organizationId: orgId,
          locationId
        });

        if (!supplier) {
          // Create supplier
          supplier = await Supplier.create({
            name: supplierName,
            organizationId: orgId,
            locationId
          });
        }

        // Create product
        const newProduct = await Product.create({
          name: product.name.trim(),
          supplierId: supplier._id,
          defaultUnitPrice,
          rebateAmount,
          organizationId: orgId,
          locationId
        });

        successfulProducts.push({
          supplier: supplier.name,
          name: newProduct.name,
          defaultUnitPrice: newProduct.defaultUnitPrice,
          rebateAmount: newProduct.rebateAmount
        });

      } catch (error) {
        // Handle duplicate products or other errors
        let errorMessage = 'Unknown error occurred.';
        
        if (error.code === 11000) {
          errorMessage = 'Product with this name already exists for this supplier and location.';
        } else if (error.message) {
          errorMessage = error.message;
        }

        failedProducts.push({
          row: i + 1,
          supplier: product.supplier || '',
          name: product.name || '',
          defaultUnitPrice: product.defaultUnitPrice || 0,
          rebateAmount: product.rebateAmount || 0,
          error: errorMessage
        });
      }
    }

    return res.status(200).json({
      success: true,
      created: successfulProducts.length,
      failed: failedProducts.length,
      successfulProducts,
      failedProducts
    });

  } catch (error) {
    console.error('Error in bulk creating products:', error);
    return res.status(500).json({ message: 'Server error in bulk creating products.' });
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
 * Get all invoices for a location (with pagination, search, and filters)
 */
exports.getInvoices = async (req, res) => {
  try {
    const orgId = req.user.orgId;
    const { locationId } = req.params;
    let { page = 1, limit = 20, search, supplier, startDate, endDate, minTotal, maxTotal, sortBy = 'date', sortOrder = 'desc' } = req.query;

    if (!locationId) {
      return res.status(400).json({ message: 'locationId is required.' });
    }

    // Validate location
    const validation = await validateLocation(orgId, locationId);
    if (!validation.valid) {
      return res.status(400).json({ message: validation.message });
    }

    // Parse pagination parameters
    page = parseInt(page);
    limit = parseInt(limit);

    // Build query
    const query = {
      organizationId: orgId,
      locationId
    };

    // Filter by supplier
    if (supplier) {
      query.supplierId = supplier;
    }

    // Date range filters
    if (startDate || endDate) {
      query.date = {};
      if (startDate) {
        query.date.$gte = new Date(startDate);
      }
      if (endDate) {
        query.date.$lte = new Date(endDate);
      }
    }

    // Total amount range filters
    if (minTotal || maxTotal) {
      query.total = {};
      if (minTotal) {
        query.total.$gte = parseFloat(minTotal);
      }
      if (maxTotal) {
        query.total.$lte = parseFloat(maxTotal);
      }
    }

    // If searching by supplier name, we need to find matching suppliers first
    if (search) {
      const matchingSuppliers = await Supplier.find({
        name: { $regex: search, $options: 'i' },
        organizationId: orgId,
        locationId: locationId
      }).select('_id');
      const supplierIds = matchingSuppliers.map(s => s._id);
      if (supplierIds.length === 0) {
        // No matching suppliers, return empty result
        return res.status(200).json({
          data: [],
          pagination: {
            total: 0,
            page,
            pages: 0,
            limit
          }
        });
      }
      query.supplierId = { $in: supplierIds };
    }

    // Count total matching documents
    const total = await Invoice.countDocuments(query);

    // Fetch invoices with pagination
    let invoices = await Invoice.find(query)
      .populate('supplierId', 'name')
      .populate('locationId', 'name code')
      .skip((page - 1) * limit)
      .limit(limit);

    // Sort configuration (determine which field to sort by)
    if (sortBy === 'date') {
      invoices = invoices.sort((a, b) => {
        const comparison = new Date(a.date) - new Date(b.date);
        return sortOrder === 'desc' ? -comparison : comparison;
      });
    } else if (sortBy === 'total') {
      invoices = invoices.sort((a, b) => {
        const comparison = a.total - b.total;
        return sortOrder === 'desc' ? -comparison : comparison;
      });
    } else if (sortBy === 'createdAt') {
      invoices = invoices.sort((a, b) => {
        const comparison = new Date(a.createdAt) - new Date(b.createdAt);
        return sortOrder === 'desc' ? -comparison : comparison;
      });
    }

    return res.status(200).json({
      data: invoices,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
        limit
      }
    });
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
    })
      .populate('supplierId', 'name')
      .populate('locationId', 'name code');

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

