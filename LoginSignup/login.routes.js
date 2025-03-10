// backend/LoginSignup/login.routes.js
const express = require('express');
const router = express.Router();
const { login } = require('./login.controller');

// POST /auth/login
router.post('/login', login);

module.exports = router;
