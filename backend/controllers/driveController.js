const { google } = require('googleapis');
const fs = require('fs');
const multer = require('multer');
const credentials = require('../uploads/credentials.json'); // Move credentials to a config folder

const client_id = credentials.web.client_id;
const client_secret = credentials.web.client_secret;
const redirect_uris = credentials.web.redirect_uris;
const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

const SCOPES = [
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive.metadata.readonly',
];

// Generate Auth URL
const getAuthURL = (req, res) => {
  try {
    const authUrl = oAuth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
    });
    res.json({ authUrl });
  } catch (error) {
    console.error('Error generating auth URL:', error);
    res.status(500).json({ message: 'Error generating auth URL' });
  }
};

// Get Token
const getToken = (req, res) => {
  const { code } = req.body;
  if (!code) {
    return res.status(400).json({ message: 'Authorization code is required' });
  }
  oAuth2Client.getToken(code, (err, token) => {
    if (err) {
      console.error('Error retrieving token:', err);
      return res.status(500).json({ message: 'Error retrieving token' });
    }
    res.json(token);
  });
};

// Get User Info
const getUserInfo = (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ message: 'Token not found' });

  oAuth2Client.setCredentials(token);
  const oauth2 = google.oauth2({ version: 'v2', auth: oAuth2Client });

  oauth2.userinfo.get((err, response) => {
    if (err) return res.status(500).json({ message: 'Error fetching user info', error: err });
    res.json(response.data);
  });
};

// Read Drive Files
const readDrive = (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ message: 'Token not found' });

  oAuth2Client.setCredentials(token);
  const drive = google.drive({ version: 'v3', auth: oAuth2Client });

  drive.files.list({ pageSize: 10 }, (err, response) => {
    if (err) return res.status(500).json({ message: 'Error reading drive', error: err });
    res.json(response.data.files || []);
  });
};

// Create Folder
const createFolder = (req, res) => {
  const { token, folderName } = req.body;
  if (!token) return res.status(400).json({ message: 'Token not found' });

  oAuth2Client.setCredentials(token);
  const drive = google.drive({ version: 'v3', auth: oAuth2Client });

  const folderMetadata = { name: folderName, mimeType: 'application/vnd.google-apps.folder' };

  drive.files.create({ resource: folderMetadata, fields: 'id' }, (err, file) => {
    if (err) return res.status(500).json({ message: 'Error creating folder', error: err });
    res.json({ folderId: file.data.id });
  });
};

// Configure Multer for File Uploads
const storage = multer.diskStorage({
  destination: 'uploads/',
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname),
});
const upload = multer({ storage });

// Upload File to Google Drive
const fileUpload = (req, res) => {
  const token = JSON.parse(req.body.token);
  if (!token) return res.status(400).json({ message: 'Token not found' });

  oAuth2Client.setCredentials(token);

  const folderId = '189_daBaxcYjcgUV2gO0rdLF5D0Gt9m_Z'; // Example folder ID
  const fileMetadata = { name: req.file.originalname, parents: [folderId] };
  const media = { mimeType: req.file.mimetype, body: fs.createReadStream(req.file.path) };

  const drive = google.drive({ version: 'v3', auth: oAuth2Client });

  drive.files.create({ resource: fileMetadata, media, fields: 'id' }, (err, file) => {
    if (err) return res.status(500).json({ message: 'Error uploading file', error: err });
    fs.unlinkSync(req.file.path); // Remove file from server
    res.json({ fileId: file.data.id });
  });
};

// Delete File
const deleteFile = (req, res) => {
  const { token } = req.body;
  const { id: fileId } = req.params;
  if (!token) return res.status(400).json({ message: 'Token not found' });

  oAuth2Client.setCredentials(token);
  const drive = google.drive({ version: 'v3', auth: oAuth2Client });

  drive.files.delete({ fileId }, (err, response) => {
    if (err) return res.status(500).json({ message: 'Error deleting file', error: err });
    res.json(response.data);
  });
};

// Download File
const downloadFile = (req, res) => {
  const { token } = req.body;
  const { id: fileId } = req.params;
  if (!token) return res.status(400).json({ message: 'Token not found' });

  oAuth2Client.setCredentials(token);
  const drive = google.drive({ version: 'v3', auth: oAuth2Client });

  drive.files.get({ fileId, alt: 'media' }, { responseType: 'stream' }, (err, response) => {
    if (err) return res.status(500).json({ message: 'Error downloading file', error: err });
    response.data.pipe(res);
  });
};

module.exports = {
  getAuthURL,
  getToken,
  getUserInfo,
  readDrive,
  createFolder,
  fileUpload,
  deleteFile,
  downloadFile,
  upload,
};
