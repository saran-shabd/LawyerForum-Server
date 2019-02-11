'use strict';

const express = require('express');
const mongoose = require('mongoose');
const axios = require('axios');

// create router
const router = express.Router();

// load facebook app access token
const { facebookAppAccessToken } = require('../../keys');

// load user model
const User = mongoose.model('user');

/**
 * @method POST
 * @description login users using their facebook account
 * @route /auth/facebook/login
 */
router.post('/login', (request, response) => {
  // extract accessToken from request object
  const { accessToken } = request.body;

  // check for empty field
  if (!accessToken || accessToken === '')
    return response.status(400).json({ message: 'accessToken field is empty' });

  // check for access token validation
  axios
    .get(
      'https://graph.facebook.com/debug_token?' +
        `input_token=${accessToken}` +
        `&access_token=${facebookAppAccessToken}`
    )
    .then(result => {
      // access token verified

      // extract user's facebook user_id from the result
      const { user_id } = result.data.data;

      // get user information from facebook
      axios
        .get(
          `https://graph.facebook.com/v3.2/${user_id}?` +
            `fields=name,email&access_token=${accessToken}`
        )
        .then(userInfo => {
          // extract fields from response object
          const { id, name, email } = userInfo.data;

          // check if the email is already registered in database
          User.findOne({ email })
            .then(userSnap => {
              if (userSnap) {
                // user with same email already exists

                /**
                 * since, this user has already logged in via facebook, it
                 * cannot be reverted. therefore, data of previous user has
                 * to be changed to avoid any ambiguity.
                 * already registered user's account type will be changed to
                 * 'facebook', password will be set to 'null',  its access
                 * token will be updated and _id will be set as that of user_id
                 * in facebook
                 */

                User.findOneAndUpdate(
                  { email },
                  {
                    user_id: id,
                    type: 'facebook',
                    password: null,
                    accessToken,
                    loginStatus: true
                  }
                )
                  .then(() => {
                    // return details of logged in user to frontend
                    response.status(200).json({
                      _id: userSnap._id,
                      user_id: id,
                      name,
                      email,
                      accessToken
                    });
                  })
                  .catch(error => {
                    // could not update data in database
                    console.log(error);
                    response
                      .status(500)
                      .json({ message: 'could not update data in database' });
                  });
              } else {
                // no user found with same email address

                // create new user
                const newUser = {
                  user_id: id,
                  name,
                  email,
                  accessToken,
                  loginStatus: true,
                  password: 'temp', // since, password field is required
                  type: 'facebook',
                  registrationDate: Date.now()
                };

                // store new user in database
                new User(newUser)
                  .save()
                  .then(() => {
                    // search the user into database

                    User.findOne({ user_id: id })
                      .then(userSnap => {
                        if (userSnap) {
                          // extract _id from the user obejct
                          const { _id } = userSnap;

                          // resetting password field to null
                          User.findOneAndUpdate({ _id }, { password: null });

                          // return user details to frontend
                          response.status(200).json({
                            _id,
                            user_id: id,
                            email,
                            name,
                            accessToken
                          });
                        } else {
                          // user not found in database after storage
                          console.log(
                            'user not found in database after storage'
                          );
                          response.status(500).json({
                            message: 'user not found in database after storage'
                          });
                        }
                      })
                      .catch(error => {
                        // could not query database
                        console.log(error);
                        response
                          .status(500)
                          .json({ message: 'could not query database' });
                      });
                  })
                  .catch(error => {
                    // could not save user into database
                    console.log(error);
                    response
                      .status(500)
                      .json({ message: 'could not save user into database' });
                  });
              }
            })
            .catch(error => {
              // could not query database
              console.log(error);
              response
                .status(500)
                .json({ message: 'could not query database' });
            });
        })
        .catch(error => {
          // could not get user information from facebook
          console.log(error);
          response
            .status(400)
            .json({ message: 'could not get user information from facebook' });
        });
    })
    .catch(error => {
      // invalid access token
      console.log(error);
      response.status(400).json({ message: 'invalid access token' });
    });
});

/**
 * @method POST
 * @description signout facebook users
 * @route /auth/facebook/signout
 */
router.post('/signout', (request, response) => {
  // extract _id, user_id and access token from request object
  const { _id, user_id, accessToken } = request.body;

  // check for empty fields
  let errorMessages = [];
  if (!_id || _id === '') errorMessages.push('_id field is empty');
  if (!user_id || user_id === '') errorMessages.push('user_id field is empty');
  if (!accessToken || accessToken === '')
    errorMessages.push('accessToken field is empty');

  if (0 < errorMessages.length)
    return response.status(400).json({ message: errorMessages });

  // search for _id in database
  User.findOne({ _id }).then(userSnap => {
    if (userSnap) {
      // user found in database

      // compare user_id
      if (userSnap.user_id !== user_id)
        return response.status(400).json({ message: 'invalid user_id' });

      // compare accessToken
      if (userSnap.accessToken !== accessToken)
        return response.status(400).json({ message: 'invalid access token' });

      //  changes loginStatus of the user to false and set accessToken to null
      User.findOneAndUpdate({ _id }, { loginStatus: false, accessToken: null })
        .then(() => {
          response
            .status(200)
            .json({ message: 'user signed out successfully' });
        })
        .catch(error => {
          // could not update data in database
          console.log(error);
          response
            .status(500)
            .json({ message: 'could not update data in database' });
        });
    } else {
      // user not found in database
      response.status(400).json({ message: 'invalid _id' });
    }
  });
});

module.exports = router;
