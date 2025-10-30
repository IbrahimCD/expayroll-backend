// backend/Purchase/purchase.routes.js
const express = require('express');
const router = express.Router();
const { protect } = require('../LoginSignup/auth.middleware');
const purchaseController = require('./purchase.controller');

// Suppliers routes
router.post('/suppliers', protect, purchaseController.createSupplier);
router.get('/suppliers/:locationId', protect, purchaseController.getSuppliers);
router.put('/suppliers/:id', protect, purchaseController.updateSupplier);
router.delete('/suppliers/:id', protect, purchaseController.deleteSupplier);

// Products routes
router.post('/products', protect, purchaseController.createProduct);
router.get('/products/:locationId', protect, purchaseController.getProducts);
router.get('/products/supplier/:supplierId/:locationId', protect, purchaseController.getProductsBySupplier);
router.put('/products/:id', protect, purchaseController.updateProduct);
router.delete('/products/:id', protect, purchaseController.deleteProduct);
router.post('/products/bulk-create', protect, purchaseController.bulkCreateProducts);

// Invoices routes
router.post('/invoices', protect, purchaseController.createInvoice);
router.get('/invoices/:locationId', protect, purchaseController.getInvoices);
router.get('/invoices/:id/details', protect, purchaseController.getInvoiceById);
router.delete('/invoices/:id', protect, purchaseController.deleteInvoice);
router.get('/invoices/:id/csv', protect, purchaseController.generateInvoiceCSV);
router.get('/invoices/:id/pdf', protect, purchaseController.generateInvoicePDF);

module.exports = router;

