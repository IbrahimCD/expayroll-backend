// backend/userManagement/index.js
const express = require('express');
const router = express.Router();

const userManagementRoutes = require('./userManagement.routes');

router.use('/', userManagementRoutes);

module.exports = router;
