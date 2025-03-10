// backend/LoginSignup/profile.routes.js
const express = require('express');
const router = express.Router();
const {  getProfile,updateProfile } = require('./profile.controller');
const { protect } = require('./auth.middleware');

// PUT /auth/profile - update profile of the logged-in user
router.put('/profile', protect, updateProfile);
router.get('/profile', protect, getProfile);

module.exports = router;
