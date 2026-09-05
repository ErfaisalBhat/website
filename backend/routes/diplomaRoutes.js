const express = require('express');
const router = express.Router();
const multer = require('multer');
const { protect, admin } = require('../middleware/authMiddleware');
const {
  uploadDiplomas,
  listDiplomas,
  verifyDiploma,
  studentDownload,
  bulkDownload,
  downloadDiplomaPDF,
  deleteDiploma,
  uploadSignature,
  getActiveSignature,
  deactivateSignature
} = require('../controllers/diplomaController');

const { uploadCertificatePdf } = require('../controllers/pdfUploadController');

const storage = multer.memoryStorage();
const upload = multer({ storage });

// Public endpoints
router.get('/verify/:certificateNo', verifyDiploma);
router.post('/student-download', studentDownload);
router.get('/student-download-pdf/:id', downloadDiplomaPDF);
router.post('/save-certificate-to-drive', upload.single('file'), uploadCertificatePdf);
router.get('/active-signature', getActiveSignature);

// Admin-only endpoints
router.post('/upload', protect, admin, upload.single('file'), uploadDiplomas);
router.get('/list', protect, admin, listDiplomas);
router.get('/bulk-download', protect, admin, bulkDownload);
router.get('/download/:id', protect, admin, downloadDiplomaPDF);
router.delete('/:id', protect, admin, deleteDiploma);

// Signature management endpoints
router.post('/signature', protect, admin, upload.single('file'), uploadSignature);
router.get('/signature', protect, admin, getActiveSignature);
router.delete('/signature/:id', protect, admin, deactivateSignature);
router.post('/signature/:id/deactivate', protect, admin, deactivateSignature);

module.exports = router;
