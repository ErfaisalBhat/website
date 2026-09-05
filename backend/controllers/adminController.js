const User = require('../models/User');
const Result = require('../models/Result');
const FileUpload = require('../models/FileUpload');
const { processCSV, processExcel } = require('../utils/fileParser');
const mongoose = require('mongoose');
const { uploadFileToDrive, deleteFileFromDrive } = require('../utils/googleDriveUploader');

// Admin uploads student data -> Creates "draft" results
const uploadStudents = async (req, res) => {
  try {
    if (!req.file) return res.status(201).json({ message: 'No file uploaded' });
    const { subject } = req.body;
    if (!subject) return res.status(201).json({ message: 'Subject is required' });

    console.log(`Starting upload for subject: ${subject}, file: ${req.file.originalname}`);

    const batchId = `BATCH-${Date.now()}`;
    const batchName = `${subject} - ${new Date().toISOString().split('T')[0]}`;
    const distinctBatchIds = await Result.distinct('batchId');
    const batchSeq = distinctBatchIds.length + 1;

    let parsedResults = [];
    try {
      if (req.file.mimetype === 'text/csv' || req.file.originalname.toLowerCase().endsWith('.csv')) {
        parsedResults = await processCSV(req.file.buffer);
      } else {
        parsedResults = await processExcel(req.file.buffer);
      }
    } catch (parseErr) {
      console.error('Parsing Error:', parseErr);
      return res.status(201).json({ message: 'Error parsing file. Ensure it is a valid CSV or Excel file.', error: parseErr.message });
    }

    if (!parsedResults.length) {
      return res.status(201).json({ message: 'No valid student data found. Please check your file format.' });
    }

    // Store raw file
    await FileUpload.create({
      batchId,
      fileName: req.file.originalname,
      fileContent: req.file.buffer,
      fileType: req.file.mimetype,
      uploadedBy: req.user._id
    });

    const resultsToInsert = [];
    
    // Process students — always create fresh User records per batch so photos never carry over
    for (const data of parsedResults) {
      // Generate a batch-scoped unique email so each upload is completely independent
      const batchEmail = `${data.email.split('@')[0]}_${batchId}@student.com`;
      const password = data.dateOfBirth ? data.dateOfBirth.replace(/-/g, '') : 'student123';

      let student;
      try {
        student = await User.create({
          name: data.candidateNameEnglish || data.email.split('@')[0],
          email: batchEmail,
          password,
          role: 'student',
          dateOfBirth: data.dateOfBirth,
          rollNo: data.rollNo || data.email.split('@')[0]
          // profileImageId intentionally NOT set — fresh upload = no photo
        });
      } catch (createErr) {
        throw createErr;
      }

      resultsToInsert.push({
        ...data,
        student: student._id,
        subject,
        batchId,
        batchName,
        batchSeq,
        uploadedBy: req.user._id,
        status: 'draft'
      });
    }

    const savedResults = await Result.insertMany(resultsToInsert);

    res.status(201).json({ 
      batchId, 
      batchName, 
      count: savedResults.length,
      message: `Successfully uploaded ${savedResults.length} students and created draft batch.`
    });
  } catch (error) {
    console.error('Upload Error:', error);
    res.status(500).json({ message: 'Error uploading students', error: error.message });
  }
};

const assignBatch = async (req, res) => {
  try {
    const { batchId, teacherId } = req.body;
    await Result.updateMany({ batchId }, { uploadedBy: teacherId });
    res.json({ message: 'Batch assigned to teacher successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error assigning batch', error: error.message });
  }
};

const getDraftBatches = async (req, res) => {
  try {
    const batches = await Result.aggregate([
      { $match: { status: 'draft' } },
      {
        $group: {
          _id: '$batchId',
          batchName: { $first: '$batchName' },
          subject: { $first: '$subject' },
          uploadedBy: { $first: '$uploadedBy' },
          createdAt: { $first: '$createdAt' },
          batchSeq: { $first: '$batchSeq' },
          submittedAt: { $first: '$submittedAt' },
          approvedAt: { $first: '$approvedAt' },
          studentCount: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'uploadedBy',
          foreignField: '_id',
          as: 'uploader'
        }
      },
      { $unwind: '$uploader' },
      { $sort: { createdAt: -1 } }
    ]);
    res.json(batches);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching draft batches', error: error.message });
  }
};

const getPendingResults = async (req, res) => {
  try {
    const batches = await Result.aggregate([
      { $match: { status: 'pending' } },
      {
        $group: {
          _id: '$batchId',
          batchName: { $first: '$batchName' },
          subject: { $first: '$subject' },
          uploadedBy: { $first: '$uploadedBy' },
          createdAt: { $first: '$createdAt' },
          batchSeq: { $first: '$batchSeq' },
          submittedAt: { $first: '$submittedAt' },
          approvedAt: { $first: '$approvedAt' },
          studentCount: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'uploadedBy',
          foreignField: '_id',
          as: 'teacher'
        }
      },
      { $unwind: '$teacher' },
      { $sort: { createdAt: -1 } }
    ]);
    res.json(batches);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching pending results', error: error.message });
  }
};

const getApprovedBatches = async (req, res) => {
  try {
    const batches = await Result.aggregate([
      { $match: { status: { $in: ['approved', 'disapproved'] } } },
      {
        $group: {
          _id: '$batchId',
          batchName: { $first: '$batchName' },
          subject: { $first: '$subject' },
          uploadedBy: { $first: '$uploadedBy' },
          createdAt: { $first: '$createdAt' },
          submittedAt: { $first: '$submittedAt' },
          approvedAt: { $first: '$approvedAt' },
          disapprovedAt: { $first: '$disapprovedAt' },
          status: { $first: '$status' },
          studentCount: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'uploadedBy',
          foreignField: '_id',
          as: 'teacher'
        }
      },
      { $unwind: '$teacher' },
      { $sort: { createdAt: -1 } }
    ]);
    res.json(batches);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching approved batches', error: error.message });
  }
};

const deleteApprovedBatch = async (req, res) => {
  try {
    const { batchId } = req.params;
    
    // Find all results in this batch to get student IDs
    const results = await Result.find({ batchId, status: { $in: ['approved', 'disapproved'] } });
    const studentIds = results.map(r => r.student);

    // Delete all results in this batch first
    await Result.deleteMany({ batchId, status: { $in: ['approved', 'disapproved'] } });
    
    // Delete the associated file upload
    await FileUpload.deleteOne({ batchId });

    // For each student, check if they have any OTHER results. If not, delete the student.
    if (studentIds.length > 0) {
      for (const sId of studentIds) {
        const remainingResults = await Result.countDocuments({ student: sId });
        if (remainingResults === 0) {
          await User.findByIdAndDelete(sId);
        }
      }
    }

    res.json({ message: 'Records deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting approved batch', error: error.message });
  }
};

const approveBatch = async (req, res) => {
  try {
    const { batchId } = req.params;
    
    // Check if all students in the batch have photos uploaded
    const results = await Result.find({ batchId }).populate('student');
    const missingPhotos = results.filter(r => !r.student || !r.student.profileImageId);
    
    if (missingPhotos.length > 0) {
      return res.status(201).json({ message: `Cannot approve batch. ${missingPhotos.length} student(s) missing photos.` });
    }

    await Result.updateMany({ batchId }, { status: 'approved', approvedAt: new Date() });
    res.json({ message: 'Batch approved successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error approving batch', error: error.message });
  }
};

const disapproveBatch = async (req, res) => {
  try {
    const { batchId } = req.params;
    await Result.updateMany({ batchId }, { status: 'disapproved', disapprovedAt: new Date() });
    res.json({ message: 'Batch disapproved successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error disapproving batch', error: error.message });
  }
};

const getTeachers = async (req, res) => {
  try {
    const teachers = await User.find({ role: 'teacher' }).select('-password');
    res.json(teachers);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching teachers', error: error.message });
  }
};

const getStudents = async (req, res) => {
  try {
    const users = await User.find({ role: 'student' })
                            .select('name email rollNo profileImageId')
                            .collation({ locale: "en_US", numericOrdering: true })
                            .sort({ rollNo: 1, name: 1 })
                            .lean();

    // Fetch all results to map status and rollNo for old students
    const userIds = users.map(u => u._id);
    const results = await Result.find({ student: { $in: userIds } })
                                .select('student status rollNo')
                                .lean();

    const students = users.map(user => {
      const userResults = results.filter(r => r.student.toString() === user._id.toString());
      
      const hasApprovedResult = userResults.some(r => r.status === 'approved');
      const fallbackRollNo = userResults.length > 0 ? userResults[0].rollNo : '';
      
      return {
        ...user,
        hasApprovedResult,
        rollNo: user.rollNo || fallbackRollNo
      };
    });

    res.json(students);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching students', error: error.message });
  }
};

const getPendingBatchPreview = async (req, res) => {
  try {
    const { batchId } = req.params;
    // Added collation for numeric sorting of roll numbers
    const results = await Result.find({ batchId })
                                .populate('student', 'name email profileImageId')
                                .collation({ locale: "en_US", numericOrdering: true })
                                .sort({ rollNo: 1 });
    res.json({ results });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching preview', error: error.message });
  }
};

// Restore teacher management functions
const addTeacher = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const teacherExists = await User.findOne({ email });
    if (teacherExists) return res.status(201).json({ message: 'Teacher already exists' });

    const teacher = await User.create({ name, email, password, role: 'teacher' });
    res.status(201).json({ _id: teacher._id, name: teacher.name, email: teacher.email, role: teacher.role });
  } catch (error) {
    res.status(500).json({ message: 'Error adding teacher', error: error.message });
  }
};

const removeTeacher = async (req, res) => {
  try {
    const teacherId = req.params.teacherId;
    if (!mongoose.Types.ObjectId.isValid(teacherId)) return res.status(201).json({ message: 'Invalid teacher ID' });

    const pendingResults = await Result.findOne({ uploadedBy: teacherId, status: 'pending' });
    if (pendingResults) return res.status(201).json({ message: 'Cannot remove teacher with pending results.' });

    const removedTeacher = await User.findByIdAndDelete(teacherId);
    if (!removedTeacher) return res.status(201).json({ message: 'Teacher not found' });

    res.json({ message: 'Teacher removed successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error removing teacher', error: error.message });
  }
};

const changeTeacherPassword = async (req, res) => {
  try {
    const teacherId = req.params.teacherId;
    const { newPassword } = req.body;
    if (!newPassword) return res.status(201).json({ message: 'Password is required' });

    const user = await User.findById(teacherId);
    if (!user) return res.status(201).json({ message: 'Teacher not found' });

    user.password = newPassword; // Hashing handled by pre-save hook
    await user.save();

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error changing password', error: error.message });
  }
};

const deleteDraftBatch = async (req, res) => {
  try {
    const { batchId } = req.params;
    
    // Ensure the batch is actually a draft before deleting
    const draftResults = await Result.find({ batchId, status: 'draft' });
    if (draftResults.length === 0) {
      return res.status(201).json({ message: 'Draft batch not found or already processed' });
    }

    const studentIds = draftResults.map(r => r.student);

    // Delete all results in this batch
    await Result.deleteMany({ batchId, status: 'draft' });
    
    // Delete the associated file upload
    await FileUpload.deleteOne({ batchId });

    // Clean up orphaned students
    if (studentIds.length > 0) {
      for (const sId of studentIds) {
        if (sId) {
          const remainingResults = await Result.countDocuments({ student: sId });
          if (remainingResults === 0) {
            await User.findByIdAndDelete(sId);
          }
        }
      }
    }

    res.json({ message: 'Draft batch and orphaned student records deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting draft batch', error: error.message });
  }
};

const updateBatchResults = async (req, res) => {
  try {
    const { results } = req.body;
    
    await Promise.all(results.map(async (item) => {
      const ia = item.iaMarks === 'AB' ? 0 : (parseFloat(item.iaMarks) || 0);
      const me = item.meMarks === 'AB' ? 0 : (parseFloat(item.meMarks) || 0);
      const marksTotal = ia + me;
      return Result.findByIdAndUpdate(item.resultId, {
        iaMarks: item.iaMarks,
        meMarks: item.meMarks,
        marksTotal: marksTotal,
        resultRemarkEnglish: item.resultRemarkEnglish,
        resultRemarkHindi: item.resultRemarkHindi
      });
    }));

    res.json({ message: 'Results updated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error updating results', error: error.message });
  }
};

const uploadStudentPhoto = async (req, res) => {
  console.log('--- PHOTO UPLOAD START (Google Drive) ---');
  try {
    const { studentId } = req.params;
    console.log('Target Student ID:', studentId);

    if (!req.file) {
      console.log('Error: No file in request');
      return res.status(400).json({ message: 'No image uploaded' });
    }

    // Check if result is already published — no photo changes allowed after approval
    const publishedResult = await Result.findOne({ student: studentId, status: 'approved' });
    if (publishedResult) {
      return res.status(403).json({ message: 'Photo cannot be changed once the result is published.' });
    }

    // If the student already has a Drive file stored, delete the old one first
    const existingStudent = await User.findById(studentId).select('profileImageId profileDriveFileId rollNo');
    if (existingStudent?.profileDriveFileId) {
      console.log('Deleting old Drive file:', existingStudent.profileDriveFileId);
      await deleteFileFromDrive(existingStudent.profileDriveFileId);
    }

    console.log('Uploading to Google Drive...');

    // Use a cleaner filename with the student's roll number
    const ext = req.file.originalname.split('.').pop() || 'jpg';
    const rollNumber = existingStudent?.rollNo || studentId;
    const fileName = `${rollNumber}_Photo.${ext}`;

    const driveResult = await uploadFileToDrive({
      buffer: req.file.buffer,
      mimeType: req.file.mimetype,
      fileName,
    });

    console.log('Google Drive upload successful. File ID:', driveResult.fileId);
    console.log('Direct URL:', driveResult.directUrl);

    // Store the direct embeddable URL + file ID in the database
    const updatedUser = await User.findByIdAndUpdate(
      studentId,
      {
        profileImageId: driveResult.directUrl,       // URL used in certificates & UI
        profileDriveFileId: driveResult.fileId,      // Drive file ID for future deletion
      },
      { new: true }
    );

    if (!updatedUser) {
      console.log('Error: Student not found in DB');
      return res.status(404).json({ message: 'Student not found in database' });
    }

    console.log('Database updated successfully');
    res.json({
      message: 'Photo uploaded to Google Drive successfully',
      imageUrl: driveResult.directUrl,
      driveFileId: driveResult.fileId,
    });
  } catch (error) {
    console.error('CRITICAL UPLOAD ERROR:', error);
    res.status(500).json({
      message: 'Photo Upload Failed',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
};

const getStudentPhoto = async (req, res) => {
  try {
    const student = await User.findById(req.params.id);
    if (!student || !student.profileImageId) {
      return res.status(404).send('Photo not found');
    }
    const url = student.profileImageId;
    if (url.startsWith('http')) {
      const axios = require('axios');
      // Add a browser-like User-Agent so Google's CDN serves the actual image
      // instead of redirecting to an HTML error page
      const response = await axios.get(url, {
        responseType: 'arraybuffer',
        maxRedirects: 5,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
          'Referer': 'https://drive.google.com/',
        },
      });
      // Make sure we got an image back (not HTML redirect/error page)
      const contentType = response.headers['content-type'] || 'image/jpeg';
      if (!contentType.startsWith('image/')) {
        return res.status(502).send('Failed to fetch photo from storage');
      }
      res.set('Content-Type', contentType);
      res.set('Cache-Control', 'public, max-age=3600');
      res.send(response.data);
    } else {
      const path = require('path');
      res.sendFile(path.join(__dirname, '..', 'uploads', url));
    }
  } catch (err) {
    console.error('getStudentPhoto error:', err.message);
    res.status(500).send('Error fetching photo');
  }
};

const CertificateSignature = require('../models/CertificateSignature');
const path = require('path');
const fs = require('fs');

const uploadCertificateSignature = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const { role } = req.body;
    if (!role || !['Verifying Authority', 'Controller of Examination'].includes(role)) {
      return res.status(400).json({ message: 'Invalid or missing signature role' });
    }

    const mimeType = req.file.mimetype;
    const extension = path.extname(req.file.originalname).toLowerCase();

    if (mimeType !== 'image/png' || extension !== '.png') {
      return res.status(400).json({ message: 'Only PNG images are allowed' });
    }

    // Convert to base64 data URL — stored in MongoDB so no filesystem needed
    const imageData = `data:image/png;base64,${req.file.buffer.toString('base64')}`;

    // Also write to disk as fallback
    const filename = `cert-sig-${role.replace(/\s+/g, '')}-${Date.now()}.png`;
    const uploadPath = path.join(__dirname, '../uploads', filename);

    const uploadsDir = path.dirname(uploadPath);
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    fs.writeFileSync(uploadPath, req.file.buffer);
    const filePath = `uploads/${filename}`;

    // Deactivate previous signature for this specific role
    await CertificateSignature.updateMany({ isActive: true, role }, { isActive: false });

    const newSignature = await CertificateSignature.create({
      filePath: filePath,
      imageData: imageData,
      role: role,
      signatoryLabel: role,
      isActive: true,
      uploadedBy: req.user._id
    });

    res.status(200).json(newSignature);
  } catch (error) {
    console.error('Certificate Signature Upload Error:', error);
    res.status(500).json({ message: 'Signature upload failed', error: error.message });
  }
};

const getActiveCertificateSignature = async (req, res) => {
  try {
    const activeSigs = await CertificateSignature.find({ isActive: true });
    res.status(200).json(activeSigs);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch signature', error: error.message });
  }
};

const deactivateCertificateSignature = async (req, res) => {
  try {
    const { id } = req.params;
    const sig = await CertificateSignature.findById(id);
    if (sig) {
      sig.isActive = false;
      await sig.save();
    }
    res.status(200).json({ message: 'Signature deactivated' });
  } catch (error) {
    res.status(500).json({ message: 'Deactivation failed', error: error.message });
  }
};

module.exports = {
  uploadStudents,
  assignBatch,
  getDraftBatches,
  getPendingResults,
  approveBatch,
  disapproveBatch,
  getTeachers,
  getStudents,
  getApprovedBatches,
  getPendingBatchPreview,
  addTeacher,
  removeTeacher,
  changeTeacherPassword,
  deleteDraftBatch,
  deleteApprovedBatch,
  updateBatchResults,
  uploadStudentPhoto,
  getStudentPhoto,
  uploadCertificateSignature,
  getActiveCertificateSignature,
  deactivateCertificateSignature
};
