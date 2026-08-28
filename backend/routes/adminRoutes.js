const express = require('express');
const router = express.Router();
const multer = require('multer');
const { 
  uploadStudents, 
  assignBatch, 
  getDraftBatches, 
  getTeachers,
  getStudents,
  getApprovedBatches,
  getPendingResults,
  approveBatch, 
  disapproveBatch,
  getPendingBatchPreview,
  addTeacher,
  removeTeacher,
  changeTeacherPassword,
  deleteDraftBatch,
  deleteApprovedBatch,
  updateBatchResults,
  uploadStudentPhoto,
  uploadCertificateSignature,
  getActiveCertificateSignature,
  deactivateCertificateSignature
} = require('../controllers/adminController');
const { protect, admin } = require('../middleware/authMiddleware');

const storage = multer.memoryStorage();
const upload = multer({ storage });

router.use(protect);
router.use(admin);

router.post('/upload-students', upload.single('file'), uploadStudents);
router.post('/upload-photo/:studentId', upload.single('photo'), uploadStudentPhoto);
router.post('/assign-batch', assignBatch);
router.get('/draft-batches', getDraftBatches);
router.delete('/draft-batch/:batchId', deleteDraftBatch);
router.get('/teachers', getTeachers);
router.get('/all-students', getStudents);
router.get('/pending-results', getPendingResults);
router.get('/approved-batches', getApprovedBatches);
router.delete('/approved-batch/:batchId', deleteApprovedBatch);
router.get('/batch-preview/:batchId', getPendingBatchPreview);
router.put('/update-batch-results', updateBatchResults);
router.post('/approve-batch/:batchId', approveBatch);
router.post('/disapprove-batch/:batchId', disapproveBatch);

// Teacher management
router.post('/add-teacher', addTeacher);
router.delete('/teacher/:teacherId', removeTeacher);
router.put('/teacher-password/:teacherId', changeTeacherPassword);

// Signature management for certificates
router.post('/signature', upload.single('file'), uploadCertificateSignature);
router.get('/signature', getActiveCertificateSignature);
router.delete('/signature/:id', deactivateCertificateSignature);

module.exports = router;
