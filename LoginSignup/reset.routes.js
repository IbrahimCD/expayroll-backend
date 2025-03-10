// backend/LoginSignup/reset.routes.js
const express = require('express');
const router = express.Router();
const { resetPassword } = require('./reset.controller');

// POST /auth/reset-password
router.post('/reset-password', resetPassword);

module.exports = router;
