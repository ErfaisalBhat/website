const { uploadFileToDrive, createFileOnDrive } = require('../utils/googleDriveUploader');
const Result = require('../models/Result');
const crypto = require('crypto');

/**
 * Strips volatile PDF metadata (CreationDate, ModDate, random ID) so that
 * the hash is stable across multiple downloads of the same visual content.
 */
function computeStableHash(buffer) {
  const cleanBuffer = buffer.toString('binary')
    .replace(/\/CreationDate \(D:.*?\)/g, '')
    .replace(/\/ModDate \(D:.*?\)/g, '')
    .replace(/\/ID \[\\<.*?\\>\s*\\<.*?\\>\\]/g, '');
  return crypto.createHash('md5').update(cleanBuffer, 'binary').digest('hex');
}

const uploadCertificatePdf = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No PDF file uploaded' });
    }

    const { rollNo, type, resultId, certificateNo } = req.body;
    console.log(`[pdfUploadController] Received upload request. Type: ${type}, RollNo: ${rollNo}, ResultId: ${resultId}, CertNo: ${certificateNo}`);

    // ── Compute content hash ────────────────────────────────────────────────
    const currentHash = computeStableHash(req.file.buffer);

    // ── For student certificates: version-aware upload ───────────────────────
    if (resultId && type === 'certificate') {
      const existing = await Result.findById(resultId)
        .select('certificateDriveVersions certificateDriveLatestHash certificateNo rollNo')
        .lean();

      // If the latest version has the same content hash → skip (no duplicate upload)
      if (existing && existing.certificateDriveLatestHash === currentHash) {
        const latestVersion = existing.certificateDriveVersions?.[existing.certificateDriveVersions.length - 1];
        console.log(`[pdfUploadController] Certificate content unchanged (hash match). Skipping upload.`);
        return res.json({
          message: 'Certificate unchanged (skipped duplicate upload)',
          fileId: latestVersion?.fileId || null,
          alreadySaved: true
        });
      }

      // ── Build a unique, descriptive filename ──────────────────────────────
      // Format: {RollNo}_{CertificateNo}_v{version}.pdf
      // e.g.   12345_2526001_v1.pdf, 12345_2526001_v2.pdf
      const certNo = certificateNo || existing?.certificateNo || resultId;
      const versionNum = (existing?.certificateDriveVersions?.length || 0) + 1;
      const fileName = `${rollNo || 'Student'}_${certNo}_v${versionNum}.pdf`;

      // ── Determine target Drive folder ─────────────────────────────────────
      let folderId = process.env.GOOGLE_DRIVE_CERTIFICATE_FOLDER_ID || process.env.GOOGLE_DRIVE_FOLDER_ID;
      console.log(`[pdfUploadController] Using Certificate Folder ID: ${folderId}`);

      // ── Upload as a NEW file (never overwrite) ────────────────────────────
      const driveResult = await createFileOnDrive({
        buffer: req.file.buffer,
        mimeType: 'application/pdf',
        fileName,
        folderId
      });

      // ── Append new version to the array and update latest hash ────────────
      await Result.findByIdAndUpdate(resultId, {
        $push: {
          certificateDriveVersions: {
            fileId: driveResult.fileId,
            hash: currentHash,
            fileName,
            uploadedAt: new Date()
          }
        },
        $set: { certificateDriveLatestHash: currentHash }
      });

      console.log(`[pdfUploadController] Saved new version (v${versionNum}) with fileId: ${driveResult.fileId} for result ${resultId}`);

      return res.json({
        message: 'PDF uploaded to Google Drive successfully',
        fileId: driveResult.fileId,
        webViewLink: driveResult.webViewLink,
        version: versionNum
      });
    }

    // ── Non-certificate uploads (diploma etc.) — use original overwrite behaviour ──
    const fileName = `${rollNo || 'Student'}.pdf`;

    let folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
    if (type === 'diploma' && process.env.GOOGLE_DRIVE_DIPLOMA_FOLDER_ID) {
      folderId = process.env.GOOGLE_DRIVE_DIPLOMA_FOLDER_ID;
    }

    const driveResult = await uploadFileToDrive({
      buffer: req.file.buffer,
      mimeType: 'application/pdf',
      fileName,
      folderId
    });

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
