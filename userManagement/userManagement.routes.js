// backend/userManagement/userManagement.routes.js
const express = require('express');
const router = express.Router();

const { protect } = require('../LoginSignup/auth.middleware');
const { roleCheck } = require('./roleCheck.middleware');

const {
  createUser,
  getUsers,
  updateUser,
  deleteUser
} = require('./userManagement.controller');

// CREATE user: Admin only
router.post(
  '/',
  protect,
  roleCheck(['Admin']),
  createUser
);

// READ all users: Admin or Manager
router.get(
  '/',
  protect,
  roleCheck(['Admin', 'Manager']),
  getUsers
);

// UPDATE user: Admin only
router.put(
  '/:userId',
  protect,
  roleCheck(['Admin']),
  updateUser
);

// DELETE user: Admin only
router.delete(
  '/:userId',
  protect,
  roleCheck(['Admin']),
  deleteUser
);

module.exports = router;
