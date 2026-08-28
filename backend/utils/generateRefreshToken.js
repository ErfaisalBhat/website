/**
 * ONE-TIME SCRIPT: Run this once to get your Google OAuth2 refresh token.
 * 
 * Usage:
 *   cd backend
 *   node utils/generateRefreshToken.js
 * 
 * Then copy the refresh_token printed to console and paste it into .env as:
 *   GOOGLE_REFRESH_TOKEN=your_token_here
 */

const { google } = require('googleapis');
const http = require('http');
const url = require('url');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const credentials = require('../uploads/credentials.json');
const { client_id, client_secret, redirect_uris } = credentials.web;

const oAuth2Client = new google.auth.OAuth2(
  client_id,
  client_secret,
  'http://localhost:5000/auth/callback'
);

const SCOPES = ['https://www.googleapis.com/auth/drive'];

const authUrl = oAuth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: SCOPES,
  prompt: 'consent', // Force consent screen to always return refresh_token
});

console.log('\n=========================================');
console.log('Open this URL in your browser to log in:');
console.log('=========================================');
console.log(authUrl);
console.log('\nWaiting for you to log in...\n');

// Start a temporary local server to catch the redirect
const server = http.createServer(async (req, res) => {
  const qs = new url.URL(req.url, 'http://localhost:5000').searchParams;
  const code = qs.get('code');

  if (!code) {
    res.end('No code found. Please try again.');
    return;
  }

  res.end('<h2>✅ Success! You can close this tab and go back to your terminal.</h2>');

  try {
    const { tokens } = await oAuth2Client.getToken(code);
    console.log('\n=========================================');
    console.log('✅ SUCCESS! Copy these values to your .env:');
    console.log('=========================================');
    console.log(`GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}`);
    console.log('\nFull token object (for reference):');
    console.log(JSON.stringify(tokens, null, 2));
  } catch (err) {
    console.error('Error getting token:', err.message);
  }

  server.close();
  process.exit(0);
});

server.listen(5000, () => {
  console.log('Temporary auth server listening on http://localhost:5000');
});
