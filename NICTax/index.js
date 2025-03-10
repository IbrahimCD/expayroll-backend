const express = require('express');
const router = express.Router();
const nictaxRoutes = require('./nictax.routes');

router.use('/nictax', nictaxRoutes);

module.exports = router;
