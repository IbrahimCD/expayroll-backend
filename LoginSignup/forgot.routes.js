// backend/LoginSignup/forgot.routes.js
const express = require('express');
const router = express.Router();
const { forgotPassword } = require('./forgot.controller');

// POST /auth/forgot-password
router.post('/forgot-password', forgotPassword);

module.exports = router;
