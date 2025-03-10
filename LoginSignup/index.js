// backend/LoginSignup/index.js
const express = require('express');
const router = express.Router();

const signupRoutes = require('./signup.routes');
const verifyRoutes = require('./verify.routes');
const loginRoutes = require('./login.routes');
const forgotRoutes = require('./forgot.routes');
const resetRoutes = require('./reset.routes');
const profileRoutes = require('./profile.routes');

// Combine them
router.use(signupRoutes);
router.use(verifyRoutes);
router.use(loginRoutes);
router.use(forgotRoutes);
router.use(resetRoutes);
router.use(profileRoutes);

module.exports = router;
