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

    // ── For student certificates ─────────────────────────────────────────────
    // SAVE RULE:
    //   • Same rollNo + same course (same resultId) → saved ONCE, never again
    //   • Same rollNo + different course            → saved separately (different resultId)
    //   • html2canvas always gives different binary, so hash-based dedup is
    //     replaced by a simple "already saved" flag: certificateDriveLatestHash
    // ─────────────────────────────────────────────────────────────────────────
    if (resultId && type === 'certificate') {

      // Check if this exact result was already saved to Drive
      const existing = await Result.findById(resultId)
        .select('certificateDriveLatestHash certificateDriveVersions certificateNo rollNo')
        .lean();

      if (existing && existing.certificateDriveLatestHash) {
        // Already saved once — skip silently, no duplicate file created
        console.log(`[pdfUploadController] Already saved once for resultId ${resultId}. Skipping.`);
        return res.json({
          message: 'Certificate already saved (skipped duplicate upload)',
          fileId: null,
          alreadySaved: true
        });
      }

      // First save for this result → upload to Drive
      const certNo    = certificateNo || existing?.certificateNo || resultId;
      const fileName  = `${rollNo || 'Student'}_${certNo}.pdf`;
      const folderId  = process.env.GOOGLE_DRIVE_CERTIFICATE_FOLDER_ID || process.env.GOOGLE_DRIVE_FOLDER_ID;

      console.log(`[pdfUploadController] First save for resultId ${resultId}. Uploading as: ${fileName}`);

      const driveResult = await createFileOnDrive({
        buffer:   req.file.buffer,
        mimeType: 'application/pdf',
        fileName,
        folderId
      });

      // Mark as saved — use a non-null hash value so the flag is set
      const savedHash = computeStableHash(req.file.buffer);

      await Result.findByIdAndUpdate(resultId, {
        $push: {
          certificateDriveVersions: {
            fileId:     driveResult.fileId,
            hash:       savedHash,
            fileName,
            uploadedAt: new Date()
          }
        },
        $set: { certificateDriveLatestHash: savedHash }
      });

      console.log(`[pdfUploadController] Saved to Drive. FileId: ${driveResult.fileId}, Result: ${resultId}`);

      return res.json({
        message:     'PDF uploaded to Google Drive successfully',
        fileId:      driveResult.fileId,
        webViewLink: driveResult.webViewLink,
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
