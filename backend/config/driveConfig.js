const { google } = require('googleapis');
const path = require('path');
const credentials = require('../uploads/credentials.json');

const client_id = credentials.web.client_id;
const client_secret = credentials.web.client_secret;
const redirect_uri = credentials.web.redirect_uris[0];
const folder_id = '189_daBaxcYjcgUV2gO0rdLF5D0Gt9m_Z';

const oAuth2Client = new google.auth.OAuth2(
  client_id,
  client_secret,
  redirect_uri
);

const SCOPES = [
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive.metadata.readonly',
];

module.exports = {
  oAuth2Client,
  SCOPES,
  folder_id
}; 