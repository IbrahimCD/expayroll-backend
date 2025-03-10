// backend/Location/location.routes.js
const express = require('express');
const router = express.Router();
const { protect } = require('../LoginSignup/auth.middleware');
const {
  createLocation,
  getLocations,
  getLocation,
  updateLocation,
  deleteLocation,
  getEmployeesForLocation  // newly added endpoint
} = require('./location.controller');

router.post('/', protect, createLocation);
router.get('/', protect, getLocations);
router.get('/:id', protect, getLocation);
router.put('/:id', protect, updateLocation);
router.delete('/:id', protect, deleteLocation);

// New endpoint: get employees for a specific location
router.get('/:id/employees', protect, getEmployeesForLocation);

module.exports = router;
