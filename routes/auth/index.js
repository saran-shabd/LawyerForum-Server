'use strict';

const express = require('express');

// create router
const router = express.Router();

// load routes
const emailPasswordRoute = require('./email_password');
const facebookRoute = require('./facebook');

// use routes
router.use('/email_password', emailPasswordRoute);
router.use('/facebook', facebookRoute);

module.exports = router;
