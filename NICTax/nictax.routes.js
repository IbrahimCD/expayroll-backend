// backend/NICTax/nictax.routes.js
const express = require('express');
const router = express.Router();
const nictaxController = require('./nictax.controller');
const { protect } = require('../LoginSignup/auth.middleware');
const { roleCheck } = require('../userManagement/roleCheck.middleware');

// 1) Template generation
router.get('/template-employees', protect, roleCheck(['Admin', 'Manager']), nictaxController.getEmployeesForNICTaxTemplate);

// For example, only Admin or Manager can create. Adjust roles as needed
router.post('/', protect, roleCheck(['Admin', 'Manager']), nictaxController.createNICTax);
router.get('/', protect, roleCheck(['Admin', 'Manager', 'Area Manager']), nictaxController.getNICTaxRecords);
router.get('/:nictaxId', protect, roleCheck(['Admin', 'Manager', 'Area Manager']), nictaxController.getNICTaxById);
router.put('/:nictaxId', protect, roleCheck(['Admin', 'Manager']), nictaxController.updateNICTax);
router.delete('/:nictaxId', protect, roleCheck(['Admin']), nictaxController.deleteNICTax);
// 2) Batch create
router.post('/batch', protect, roleCheck(['Admin', 'Manager']), nictaxController.batchCreateNICTax);
module.exports = router;
