"use strict";

var express = require('express');

var router = express.Router();

var nictaxRoutes = require('./nictax.routes');

router.use('/nictax', nictaxRoutes);
module.exports = router;