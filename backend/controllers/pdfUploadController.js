const { uploadFileToDrive, createFileOnDrive } = require('../utils/googleDriveUploader');
const Result = require('../models/Result');
const crypto = require('crypto');

/**
 * Computes a stable content hash by stripping volatile PDF metadata
 * (CreationDate, ModDate, random ID) so re-downloads of identical
 * visual content produce the same hash.
 *
 * Optimised: metadata lives in the last ~2 KB of a PDF, so we only
 * convert that tail to a string for regex stripping, while the bulk
 * of the buffer is hashed directly.
 */
function computeStableHash(buffer) {
  // PDF metadata is near the end. Strip it from the tail only.
  const TAIL_SIZE = Math.min(4096, buffer.length);
  const headEnd = buffer.length - TAIL_SIZE;

  const tail = buffer.slice(headEnd).toString('binary')
    .replace(/\/CreationDate \(D:.*?\)/g, '')
    .replace(/\/ModDate \(D:.*?\)/g, '')
    .replace(/\/ID \[\\<.*?\\>\s*\\<.*?\\>\\]/g, '');

  const hash = crypto.createHash('md5');
  if (headEnd > 0) hash.update(buffer.slice(0, headEnd));
  hash.update(tail, 'binary');
  return hash.digest('hex');
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
      // Fast path: only fetch hash for the skip-check (1 DB query)
      const existing = await Result.findById(resultId)
        .select('certificateDriveLatestHash certificateNo rollNo')
        .lean();

      // If we have already uploaded this certificate once, skip uploading again.
      // (html2canvas produces slightly different binaries every time, so hashing fails)
      if (existing && existing.certificateDriveLatestHash) {
        console.log(`[pdfUploadController] Certificate already saved to Drive. Skipping duplicate upload.`);
        return res.json({
          message: 'Certificate already saved (skipped duplicate upload)',
          fileId: null,
          alreadySaved: true
        });
      }

      // Hash differs (or first upload) → we need the version count for the filename.
      // Use aggregate to get count + last entry without pulling the whole array.
      let versionCount = 0;
      if (existing) {
        const agg = await Result.aggregate([
          { $match: { _id: existing._id } },
          { $project: {
            count: { $size: { $ifNull: ['$certificateDriveVersions', []] } }
          }}
        ]);
        if (agg.length) { versionCount = agg[0].count; }
      }

      // ── Build a unique, descriptive filename ──────────────────────────────
      // Format: {RollNo}_{CertificateNo}_v{version}.pdf
      // e.g.   12345_2526001_v1.pdf, 12345_2526001_v2.pdf
      const certNo = certificateNo || existing?.certificateNo || resultId;
      const versionNum = versionCount + 1;
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
