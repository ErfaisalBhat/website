const User = require('../models/User');
const Result = require('../models/Result');
const FileUpload = require('../models/FileUpload');
const { processCSV, processExcel } = require('../utils/fileParser');
const mongoose = require('mongoose');
const cloudinary = require('cloudinary').v2;
const { Readable } = require('stream');

// Cloudinary Configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

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
          status: { $first: '$status' },
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
    res.status(500).json({ message: 'Error fetching approved batches', error: error.message });
  }
};

const deleteApprovedBatch = async (req, res) => {
  try {
    const { batchId } = req.params;
    
    // Find all results in this batch (approved or disapproved) to get student IDs
    const results = await Result.find({ batchId, status: { $in: ['approved', 'disapproved'] } });
    const studentIds = results.map(r => r.student);

    // Delete all results in this batch
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

    res.json({ message: 'Batch and associated student records deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting batch', error: error.message });
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
    await Result.updateMany({ batchId }, { status: 'disapproved' });
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
    // Find all student IDs that have at least one non-disapproved result
    const activeStudentIds = await Result.distinct('student', { status: { $ne: 'disapproved' } });
    const approvedStudentIds = await Result.distinct('student', { status: 'approved' });

    const students = await User.find({ 
                                 role: 'student',
                                 _id: { $in: activeStudentIds }
                               })
                               .select('name email rollNo profileImageId')
                               .collation({ locale: "en_US", numericOrdering: true })
                               .sort({ rollNo: 1, name: 1 });
                               
    const approvedSet = new Set(approvedStudentIds.map(id => id?.toString()));

    const formattedStudents = students.map(s => ({
      _id: s._id,
      name: s.name,
      email: s.email,
      rollNo: s.rollNo || s.email.split('@')[0],
      profileImageId: s.profileImageId,
      hasApprovedResult: approvedSet.has(s._id.toString())
    }));
                               
    res.json(formattedStudents);
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
  console.log('--- PHOTO UPLOAD START ---');
  try {
    const { studentId } = req.params;
    console.log('Target Student ID:', studentId);
    
    if (!req.file) {
      console.log('Error: No file in request');
      return res.status(201).json({ message: 'No image uploaded' });
    }

    console.log('Cloud Name (at upload time):', process.env.CLOUDINARY_CLOUD_NAME);

    // Convert buffer to base64
    const fileBase64 = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
    
    console.log('Attempting Cloudinary upload...');
    
    const result = await cloudinary.uploader.upload(fileBase64, {
      folder: 'student_photos',
      public_id: `student_${studentId}`,
      overwrite: true,
      transformation: [
        { width: 400, height: 500, crop: 'fill', gravity: 'face' }
      ]
    });

    console.log('Cloudinary Result URL:', result.secure_url);
    
    // Store the secure URL in the database
    const updatedUser = await User.findByIdAndUpdate(
      studentId, 
      { profileImageId: result.secure_url },
      { new: true }
    );

    if (!updatedUser) {
      console.log('Error: Student not found in DB');
      return res.status(201).json({ message: 'Student not found in database' });
    }

    console.log('Database updated successfully');
    res.json({ 
      message: 'Photo uploaded and linked successfully', 
      imageUrl: result.secure_url 
    });
  } catch (error) {
    console.error('CRITICAL UPLOAD ERROR:', error);
    res.status(500).json({ 
      message: 'Photo Upload Failed', 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
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
  uploadStudentPhoto
};
