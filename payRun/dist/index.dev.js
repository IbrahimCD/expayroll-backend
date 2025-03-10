"use strict";

// backend/payRun/index.js
var express = require('express');

var router = express.Router();

var payRunRoutes = require('./payRun.routes'); // Mount all Pay Run routes under the current path


router.use('/', payRunRoutes);
module.exports = router;