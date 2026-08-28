const { google } = require('googleapis');
const { Readable } = require('stream');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// -----------------------------------------------------------------------
// Google Drive OAuth2 uploader (Refresh Token approach)
// -----------------------------------------------------------------------
// Setup (one-time):
//   1. Place your OAuth2 credentials JSON at: backend/uploads/credentials.json
//   2. Run:  node backend/utils/generateRefreshToken.js
//   3. Copy the printed refresh_token into backend/.env as GOOGLE_REFRESH_TOKEN
//   4. Set GOOGLE_DRIVE_FOLDER_ID in backend/.env to your Drive folder ID
// -----------------------------------------------------------------------

const CREDENTIALS_PATH = path.join(__dirname, '../uploads/credentials.json');

function getDriveClient() {
  if (!fs.existsSync(CREDENTIALS_PATH)) {
    throw new Error(
      'OAuth2 credentials not found at uploads/credentials.json. ' +
      'Please download your OAuth2 Web App credentials from Google Cloud Console.'
    );
  }

  const credentials = require(CREDENTIALS_PATH);
  const { client_id, client_secret } = credentials.web;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

  if (!refreshToken) {
    throw new Error(
      'GOOGLE_REFRESH_TOKEN is not set in .env. ' +
      'Run: node backend/utils/generateRefreshToken.js  to get your token.'
    );
  }

  const oAuth2Client = new google.auth.OAuth2(client_id, client_secret);
  oAuth2Client.setCredentials({ refresh_token: refreshToken });

  return google.drive({ version: 'v3', auth: oAuth2Client });
}

/**
 * Upload a file buffer to Google Drive.
 * @param {Object} options
 * @param {Buffer}  options.buffer    - File data
 * @param {string}  options.mimeType  - e.g. 'image/jpeg'
 * @param {string}  options.fileName  - Name to give the file on Drive
 * @param {string}  [options.folderId] - Drive folder ID (falls back to env var)
 * @returns {Promise<{fileId, webViewLink, directUrl}>}
 */
async function uploadFileToDrive({ buffer, mimeType, fileName, folderId }) {
  const drive = getDriveClient();

  const targetFolderId = folderId || process.env.GOOGLE_DRIVE_FOLDER_ID;
  if (!targetFolderId) {
    throw new Error(
      'GOOGLE_DRIVE_FOLDER_ID is not set in .env and no folderId was passed.'
    );
  }

  const readableStream = new Readable();
  readableStream.push(buffer);
  readableStream.push(null);

  const response = await drive.files.create({
    requestBody: { name: fileName, parents: [targetFolderId] },
    media: { mimeType, body: readableStream },
    fields: 'id, webViewLink, webContentLink',
  });

  const fileId = response.data.id;

  // Make the file publicly readable so image URLs work in <img> tags
  await drive.permissions.create({
    fileId,
    requestBody: { role: 'reader', type: 'anyone' },
  });

  // Thumbnail URL — works reliably as <img src="..."> in browsers (no CORS issues)
  const directUrl = `https://drive.google.com/thumbnail?id=${fileId}&sz=w400-h500`;

  return { fileId, webViewLink: response.data.webViewLink, directUrl };
}

/**
 * Delete a file from Google Drive by its file ID.
 * Silently ignores "not found" errors.
 * @param {string} fileId
 */
async function deleteFileFromDrive(fileId) {
  if (!fileId) return;
  try {
    const drive = getDriveClient();
    await drive.files.delete({ fileId });
  } catch (err) {
    if (err?.response?.status !== 404) {
      console.error('Google Drive delete error:', err.message);
    }
  }
}

module.exports = { uploadFileToDrive, deleteFileFromDrive };
