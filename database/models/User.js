'use strict';

const mongoose = require('mongoose'),
  { Schema } = require('mongoose');

const UserModel = new Schema({
  user_id: {
    // only for facebook users
    type: Number,
    default: null
  },
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    default: null
  },
  password: {
    type: String,
    required: true,
    default: null
  },
  type: {
    type: String,
    required: true
  },
  accessToken: {
    type: String,
    required: true
  },
  loginStatus: {
    type: Boolean,
    required: true,
    default: true
  },
  registrationDate: {
    type: Date,
    required: true,
    default: Date.now()
  }
});

mongoose.model('user', UserModel);
