'use strict';

const mongoose = require('mongoose');

// load database keys and passwords
const { dbUsername, dbPassword, dbName } = require('../keys');

// connect to remote database
mongoose
  .connect(
    `mongodb://${dbUsername}:${dbPassword}@ds131814.mlab.com:31814/${dbName}`,
    {
      useNewUrlParser: true
    }
  )
  .then(() => {
    console.log('connected to database');
  })
  .catch(error => {
    console.log(error);
  });

module.exports = mongoose;
