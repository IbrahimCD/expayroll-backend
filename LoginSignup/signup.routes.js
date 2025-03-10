// backend/LoginSignup/signup.routes.js
const express = require('express');
const router = express.Router();
const { adminSignup } = require('./signup.controller');

// POST /auth/signup
router.post('/signup', adminSignup);

module.exports = router;
