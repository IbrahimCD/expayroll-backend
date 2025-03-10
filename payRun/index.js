// backend/payRun/index.js
const express = require('express');
const router = express.Router();
const payRunRoutes = require('./payRun.routes');

// Mount all Pay Run routes under the current path
router.use('/', payRunRoutes);

module.exports = router;
