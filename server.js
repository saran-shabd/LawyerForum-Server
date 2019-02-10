'use strict';

const express = require('express');
const bodyParser = require('body-parser');

// create express application
const app = express();

// configure remote database
require('./database/configure');

// load database models
require('./database/models/User');

// body-parser middleware
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// load routes
const authRouter = require('./routes/auth');

// use routes
app.use('/auth', authRouter);

// listen for requests
const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`server is up and running at port ${port}`));
