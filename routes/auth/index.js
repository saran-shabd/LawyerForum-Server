'use strict';

const express = require('express');

// create router
const router = express.Router();

// load routes
const emailPasswordRoute = require('./email_password');

// use routes
router.use('/email_password', emailPasswordRoute);

module.exports = router;
