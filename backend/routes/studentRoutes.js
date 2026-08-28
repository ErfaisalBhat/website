const express = require('express');
const multer = require('multer');
const { verifyStudent, getStudentResults, generateCertificate, verifyCertificate } = require('../controllers/studentController');
const { protectStudent } = require('../middleware/authMiddleware');
const { uploadCertificatePdf } = require('../controllers/pdfUploadController');

const router = express.Router();
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Public route for student verification/login
router.post('/verify', verifyStudent);

// Public route for certificate verification by any user
router.get('/verify/:certificateNo', verifyCertificate);

// Protected routes - require student token
router.get('/results', protectStudent, getStudentResults);
router.get('/certificate/:resultId', protectStudent, generateCertificate);
router.post('/save-certificate-to-drive', protectStudent, upload.single('file'), uploadCertificatePdf);

module.exports = router;