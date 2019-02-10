'use strict';

const axios = require('axios');

// database configuration keys and passwords
const dbUsername = 'admin';
const dbPassword = 'pass123';
const dbName = 'test-db';

// facebook-sdk app keys
const facebookAppID = 2110899535664683;
const facebookAppSecret = '4ff7e794c6c7b75ae3794db1345da63e';
let facebookAppAccessToken = initializeFacebookAppAccessToken();

// secret of json-web-token access tokens
const jwtAppSecret = 'X9QUAdwn5CFhKIkzpYJm';

/* UTILITY METHODS */

async function initializeFacebookAppAccessToken() {
  const appAccessToken = await axios.get(
    'https://graph.facebook.com/oauth/access_token' +
      `?client_id=${facebookAppID}` +
      `&client_secret=${facebookAppSecret}` +
      '&grant_type=client_credentials'
  );
  console.log('facebook app access token fetched successfully');
  return appAccessToken.data.access_token;
}

module.exports = {
  dbUsername,
  dbPassword,
  dbName,
  facebookAppID,
  facebookAppSecret,
  facebookAppAccessToken,
  jwtAppSecret
};
