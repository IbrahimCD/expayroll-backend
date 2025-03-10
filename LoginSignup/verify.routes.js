// backend/LoginSignup/verify.routes.js
const express = require('express');
const router = express.Router();
const { verifyAccount } = require('./verify.controller');

// POST /auth/verify
router.post('/verify', verifyAccount);

module.exports = router;
