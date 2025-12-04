// backend/Purchase/purchase.routes.js
const express = require('express');
const router = express.Router();
const { protect } = require('../LoginSignup/auth.middleware');
const purchaseController = require('./purchase.controller');

// Suppliers routes (organization-wide - no locationId required)
router.post('/suppliers', protect, purchaseController.createSupplier);
router.get('/suppliers', protect, purchaseController.getSuppliers);
router.put('/suppliers/:id', protect, purchaseController.updateSupplier);
router.delete('/suppliers/:id', protect, purchaseController.deleteSupplier);

// Products routes (organization-wide - no locationId required)
router.post('/products', protect, purchaseController.createProduct);
router.get('/products', protect, purchaseController.getProducts);
router.get('/products/supplier/:supplierId', protect, purchaseController.getProductsBySupplier);
router.put('/products/:id', protect, purchaseController.updateProduct);
router.delete('/products/:id', protect, purchaseController.deleteProduct);
router.post('/products/bulk-create', protect, purchaseController.bulkCreateProducts);
router.post('/products/bulk-update', protect, purchaseController.bulkUpdateProducts);

// Categories route (organization-wide)
router.get('/categories', protect, purchaseController.getCategories);

// Invoices routes (location-specific)
router.post('/invoices', protect, purchaseController.createInvoice);
router.get('/invoices/:locationId', protect, purchaseController.getInvoices);
router.get('/invoices/:id/details', protect, purchaseController.getInvoiceById);
router.delete('/invoices/:id', protect, purchaseController.deleteInvoice);
router.get('/invoices/:id/csv', protect, purchaseController.generateInvoiceCSV);
router.get('/invoices/:id/pdf', protect, purchaseController.generateInvoicePDF);

module.exports = router;
