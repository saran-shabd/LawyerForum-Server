'use strict';

const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// create router
const router = express.Router();

// load keys
const { jwtAppSecret } = require('../../keys');

// load user model
const User = mongoose.model('user');

/**
 * @method POST
 * @description register users using email and password
 * @route /auth/email_password/register
 */
router.post('/register', (request, response) => {
  // extract name, email and password from request object
  const { name, email, password } = request.body;

  // check for empty fields
  let errorMessages = [];
  if (!name || name === '') errorMessages.push('name field is empty');
  if (!email || email === '') errorMessages.push('email field is empty');
  if (!password || password === '')
    errorMessages.push('password field is empty');

  if (0 < errorMessages.length)
    return response.status(400).json({ message: errorMessages });

  // check for email validation
  if (!validateEmail(email))
    return response.status(400).json({ message: 'invalid email' });

  // check if any user with same email already exists in database
  User.findOne({ email })
    .then(userSnap => {
      if (userSnap)
        // email already registered
        return response
          .status(400)
          .json({ message: 'user with same email already exists' });

      // create user object, to be stored in database
      let userInfo = {
        name,
        email,
        type: 'email/password',
        loginStatus: true,
        registrationDate: Date.now()
      };

      // encrypt user password
      bcrypt.genSalt(10, (error, salt) => {
        bcrypt.hash(password, salt, (error, hash) => {
          if (error) {
            console.log(error);
            return response.status(500).json({ message: error });
          }
          // add hash as password in user object
          userInfo.password = hash;

          /**
           * since, initially we don't have _id of the user as it is not stored
           * in the database yet. so initially we store 'temp' as accesstoken
           * of the user and as the user is stored in the database, its _id is
           * retrieved and an access token is generated which is later stored in
           * the database as well as returned to the frontend.
           */

          // initially, store temporary value for accessToken
          userInfo.accessToken = 'temp';

          // store the object in database
          new User(userInfo)
            .save()
            .then(() => {
              // search user in database and return details to frontend
              User.findOne(userInfo)
                .then(userSnap => {
                  if (userSnap) {
                    // extract details from user object
                    const { _id, name, email } = userSnap;

                    // generate jwt access token
                    const accessToken = jwt.sign(
                      { _id, ...userInfo },
                      jwtAppSecret
                    );

                    // store access token of user in database
                    User.findOneAndUpdate({ _id }, { accessToken })
                      .then(() => {
                        // send user details to frontend
                        response
                          .status(200)
                          .json({ _id, name, email, accessToken });
                      })
                      .catch(error => {
                        console.log(error);
                        response.status(500).json({ message: error });
                      });
                  } else {
                    // user not found in database
                    response
                      .status(500)
                      .json({ message: 'user not found in database' });
                  }
                })
                .catch(error => {
                  // could not query database
                  console.log(error);
                  response.status(500).json({ message: error });
                });
            })
            .catch(error => {
              // could not add user into database
              console.log(error);
              response.status(500).json({ message: error });
            });
        });
      });
    })
    .catch(error => {
      // could not query database
      console.log(error);
      response.status(500).json({ message: error });
    });
});

/**
 * @method POST
 * @description login users using email and password
 * @route /auth/email_password/login
 */
router.post('/login', (request, response) => {
  // extract email and password from request object
  const { email, password } = request.body;

  // check for empty fields
  let errorMessages = [];
  if (!email || email === '') errorMessages.push('email field is empty');
  if (!password || password === '')
    errorMessages.push('password field is empty');

  if (0 < errorMessages.length)
    return response.status(400).json({ message: errorMessages });

  // check for email validation
  if (!validateEmail(email))
    return response.status(400).json({ message: 'invalid email' });

  // check if email is already registered
  User.findOne({ email, type: 'email/password' })
    .then(userSnap => {
      if (userSnap) {
        // email is registered

        // check for password match
        bcrypt
          .compare(password, userSnap.password)
          .then(result => {
            if (!result) {
              // incorrect password
              return response
                .status(400)
                .json({ message: 'incorrect password' });
            }

            // password matched, user authenticated

            // update login status of the user
            User.findOneAndUpdate(
              { email, type: 'email/password' },
              { loginStatus: true }
            )
              .then(() => {
                // extract details to be sent to frontend from user object
                const { _id, name, email, accessToken } = userSnap;
                response.status(200).json({ _id, name, email, accessToken });
              })
              .catch(() => {
                console.log('could not update user login status');
                response
                  .status(500)
                  .json({ message: 'could not update user login status' });
              });
          })
          .catch(error => {
            // could not perform password match
            console.log(error);
            response.status(500).json({ message: error });
          });
      } else {
        // user not found in database
        response.status(400).json({ message: 'email not registered' });
      }
    })
    .catch(error => {
      // could not query database
      console.log(error);
      response.status(500).json({ message: error });
    });
});

/**
 * @method POST
 * @description signout email/password users
 * @route /auth/email_password/signout
 */
router.post('/signout', (request, response) => {
  // extract _id and accessToken from request object
  const { _id, accessToken } = request.body;

  // check for empty fields
  if (!_id || _id === '')
    return response.status(400).json({ message: '_id field is empty' });
  if (!accessToken || accessToken === '')
    return response.status(400).json({ message: 'accessToken field is empty' });

  // search for _id in database
  User.findOne({ _id })
    .then(userSnap => {
      if (userSnap) {
        // user with same _id found in database

        // verify accessToken

        if (jwt.verify(accessToken, jwtAppSecret)._id === _id) {
          // token verified

          // update loginStatus of the user
          User.findOneAndUpdate({ _id }, { loginStatus: false })
            .then(() => {
              response.status(200).json({ message: 'user signed out' });
            })
            .catch(error => {
              // could not query database
              console.log(error);
              response.status(500).json({ message: error });
            });
        } else {
          // invalid access token
          response.status(400).json({ message: 'invalid token' });
        }
      } else {
        // no user with same _id found in database
        response.status(400).json({ message: 'invalid _id' });
      }
    })
    .catch(error => {
      // could not query database
      console.log(error);
      response.status(500).json({ message: error });
    });
});

/* UTILITY METHODS */

function validateEmail(email) {
  var re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return re.test(String(email).toLowerCase());
}

module.exports = router;
