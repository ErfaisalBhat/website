const { uploadFileToDrive } = require('../utils/googleDriveUploader');
const Result = require('../models/Result');

const uploadCertificatePdf = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No PDF file uploaded' });
    }

    const { rollNo, type, resultId } = req.body;
    console.log(`[pdfUploadController] Received upload request. Type: ${type}, RollNo: ${rollNo}, ResultId: ${resultId}`);

    // ── Check if this certificate was already saved to Drive ──────────────────
    // Strip volatile PDF metadata (CreationDate) so the hash is stable across multiple downloads
    // of the exact same certificate content.
    const crypto = require('crypto');
    // Strip volatile PDF metadata (CreationDate, ModDate, and random Document ID) 
    // so the hash is stable across multiple downloads of the exact same visual content.
    const cleanBuffer = req.file.buffer.toString('binary')
      .replace(/\/CreationDate \(D:.*?\)/g, '')
      .replace(/\/ModDate \(D:.*?\)/g, '')
      .replace(/\/ID \[\<.*?\>\s*\<.*?\>\]/g, '');
    const currentHash = crypto.createHash('md5').update(cleanBuffer, 'binary').digest('hex');

    if (resultId && type === 'certificate') {
      const existing = await Result.findById(resultId).select('certificateDriveFileId certificateDriveHash').lean();
      if (existing && existing.certificateDriveFileId && existing.certificateDriveHash === currentHash) {
        console.log(`[pdfUploadController] Certificate content unchanged (hash match). Skipping upload.`);
        return res.json({
          message: 'Certificate unchanged (skipped duplicate upload)',
          fileId: existing.certificateDriveFileId,
          alreadySaved: true
        });
      }
    }
    // ─────────────────────────────────────────────────────────────────────────

    const fileName = `${rollNo || 'Student'}.pdf`;

    let folderId = process.env.GOOGLE_DRIVE_FOLDER_ID; // Fallback
    console.log(`[pdfUploadController] Default Fallback Folder ID: ${folderId}`);

    if (type === 'diploma' && process.env.GOOGLE_DRIVE_DIPLOMA_FOLDER_ID) {
      folderId = process.env.GOOGLE_DRIVE_DIPLOMA_FOLDER_ID;
      console.log(`[pdfUploadController] Using Diploma Folder ID: ${folderId}`);
    } else if (type === 'certificate' && process.env.GOOGLE_DRIVE_CERTIFICATE_FOLDER_ID) {
      folderId = process.env.GOOGLE_DRIVE_CERTIFICATE_FOLDER_ID;
      console.log(`[pdfUploadController] Using Certificate Folder ID: ${folderId}`);
    } else {
      console.log(`[pdfUploadController] No specific folder ID found for type '${type}'. Using fallback.`);
    }

    const driveResult = await uploadFileToDrive({
      buffer: req.file.buffer,
      mimeType: 'application/pdf',
      fileName,
      folderId
    });

    // ── Record Drive file ID and content hash so we don't upload identical copies again
    if (resultId && type === 'certificate') {
      await Result.findByIdAndUpdate(resultId, { 
        certificateDriveFileId: driveResult.fileId,
        certificateDriveHash: currentHash
      });
      console.log(`[pdfUploadController] Saved certificateDriveFileId: ${driveResult.fileId} on result ${resultId}`);
    }
    // ─────────────────────────────────────────────────────────────────────────

    res.json({
      message: 'PDF uploaded to Google Drive successfully',
      fileId: driveResult.fileId,
      webViewLink: driveResult.webViewLink
    });
  } catch (error) {
    console.error('PDF Drive Upload Error:', error);
    res.status(500).json({ message: 'Failed to upload PDF to Drive', error: error.message });
  }
};

module.exports = { uploadCertificatePdf };
