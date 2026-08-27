const Result = require('../models/Result');
const jwt = require('jsonwebtoken');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const verifyStudent = async (req, res) => {
  try {
    const { rollNo, dateOfBirth } = req.body;

    console.log('Searching for student with:', { rollNo, dateOfBirth });

    // Find student result with matching credentials, grabbing the most recent upload
    const studentResult = await Result.findOne({ rollNo: rollNo })
      .sort({ createdAt: -1 })
      .select("status rollNo enrolmentNo candidateNameEnglish dateOfBirth");

    if (studentResult) {
      console.log('DB value:', studentResult.dateOfBirth);
      console.log('Received value:', req.body.dateOfBirth);
      console.log('Types:', typeof studentResult.dateOfBirth, typeof req.body.dateOfBirth);
    }

    if (studentResult) {
      console.log('DB value:', studentResult.dateOfBirth);
      console.log('Received value:', req.body.dateOfBirth);
      console.log('Types:', typeof studentResult.dateOfBirth, typeof req.body.dateOfBirth);
    }

    if (!studentResult) {
      return res.status(401).json({ message: 'No results found for these credentials' });
    }

    if (!studentResult.dateOfBirth || studentResult.dateOfBirth === '') {
      return res.status(401).json({
        message: 'Date of birth is not registered in our system. Please contact administration.'
      });
    }

    // Check if DOB is completely missing in the database
    if (!studentResult.dateOfBirth || studentResult.dateOfBirth.trim() === '') {
      return res.status(401).json({ 
        message: 'Date of birth is not registered in our system for this Roll Number. Please contact the administration to update your records.' 
      });
    }

    // Helper to robustly standardize dates to YYYY-MM-DD
    const standardizeDate = (d) => {
      if (!d) return '';
      const str = d.toString().trim();
      
      // Try YYYY-MM-DD or YYYY/MM/DD
      let match = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
      if (match) {
        return `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`;
      }

      // Try DD-MM-YYYY or DD/MM/YYYY (This handles the frontend's explicit formatting)
      match = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
      if (match) {
        return `${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`;
      }

      // Try MM-DD-YYYY or MM/DD/YYYY (US format fallback)
      match = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
      if (match) {
        // Assume first digits might be month if greater than 12
         return `${match[3]}-${match[1].padStart(2, '0')}-${match[2].padStart(2, '0')}`;
      }

      // Fallback to JS Date parsing
      const dt = new Date(str);
      if (!isNaN(dt.getTime())) {
        return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
      }
      
      return str;
    };

    const stdInputDate = standardizeDate(dateOfBirth);
    const stdStoredDate = standardizeDate(studentResult.dateOfBirth);

    console.log('Comparing dates:', {
      input: dateOfBirth,
      stored: studentResult.dateOfBirth,
      stdInput: stdInputDate,
      stdStored: stdStoredDate
    });

    if (stdInputDate !== stdStoredDate && dateOfBirth !== studentResult.dateOfBirth) {
      return res.status(401).json({ 
        message: 'Invalid date of birth' 
      });
    }

    const token = jwt.sign(
      {
        id: studentResult._id,
        rollNo: studentResult.rollNo,
        enrolmentNo: studentResult.enrolmentNo,
      },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    console.log("status:", studentResult.status);

    res.json({
      token,
      student: {
        rollNo: studentResult.rollNo,
        enrolmentNo: studentResult.enrolmentNo,
        name: studentResult.candidateNameEnglish,
        status: studentResult.status || "pending",
      }
    });
  } catch (error) {
    console.error('Verification error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const getStudentResults = async (req, res) => {
  try {
    const { rollNo, enrolmentNo } = req.student;

    const results = await Result.find({
      rollNo,
      enrolmentNo,
      status: 'approved'
    }).populate('student', 'profileImageId');

    if (!results.length) {
      return res.status(404).json({ message: 'No approved results found' });
    }

    res.json(results);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching results', error: error.message });
  }
};

const generateCertificate = async (req, res) => {
  try {
    const { resultId } = req.params;
    const { rollNo, enrolmentNo } = req.student;

    const result = await Result.findOne({
      _id: resultId,
      rollNo,
      enrolmentNo,
      status: 'approved'
    }).populate('student', 'profileImageId');

    if (!result) {
      return res.status(404).json({ message: 'Result not found' });
    }

    if (!result.certificateNo) {
      result.certificateNo = `VMI-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      result.issuedAt = new Date();
      await result.save();
    }

    const certificateData = {
      rollNo: result.rollNo,
      enrolmentNo: result.enrolmentNo,
      courseNameHindi: result.courseNameHindi,
      courseNameEnglish: result.courseNameEnglish,
      courseYearHindi: result.courseYearHindi,
      courseYearEnglish: result.courseYearEnglish,
      candidateNameHindi: result.candidateNameHindi,
      fatherNameHindi: result.fatherNameHindi,
      candidateNameEnglish: result.candidateNameEnglish,
      fatherNameEnglish: result.fatherNameEnglish,
      durationHindi: result.durationHindi,
      durationEnglish: result.durationEnglish,
      modeHindi: result.modeHindi,
      modeEnglish: result.modeEnglish,
      iaSubCode: result.iaSubCode,
      meSubCode: result.meSubCode,
      iaMaxMarks: result.iaMaxMarks,
      meMaxMarks: result.meMaxMarks,
      maxMarks: result.maxMarks,
      iaMarks: result.iaMarks,
      meMarks: result.meMarks,
      marksTotal: result.marksTotal,
      resultRemarkHindi: result.resultRemarkHindi,
      resultRemarkEnglish: result.resultRemarkEnglish,
      dateOfResultHindi: result.dateOfResultHindi,
      dateOfResultEnglish: result.dateOfResultEnglish,
      certificateNo: result.certificateNo,
      issuedAt: result.issuedAt,
      profileImageId: result.student?.profileImageId
    };

    res.json(certificateData);
  } catch (error) {
    console.error('Error generating certificate:', error);
    res.status(500).json({ message: 'Error generating certificate', error: error.message });
  }
};

const verifyCertificate = async (req, res) => {
  try {
    const { certificateNo } = req.params;

    if (!certificateNo) {
      return res.status(400).json({ message: 'Certificate number is required' });
    }

    let result = await Result.findOne({
      certificateNo,
      status: 'approved' 
    }).populate('student', 'profileImageId');

    if (!result) {
      const DiplomaCertificate = require('../models/DiplomaCertificate');
      const diploma = await DiplomaCertificate.findOne({ certificateNo });
      if (!diploma) {
        return res.status(404).json({ message: 'Invalid certificate number' });
      }
      return res.json({
        studentName: diploma.candidateName,
        rollNo: diploma.rollNo,
        enrolmentNo: diploma.marksData?.enrolmentNo || 'N/A',
        subject: diploma.courseName,
        courseName: diploma.courseName,
        issuedAt: diploma.issuedAt,
        status: 'Verified (Diploma)',
        profileImageId: null
      });
    }

    res.json({
      studentName: result.candidateNameEnglish,
      rollNo: result.rollNo,
      enrolmentNo: result.enrolmentNo,
      subject: result.subject,
      courseName: result.courseNameEnglish,
      issuedAt: result.issuedAt,
      status: 'Verified',
      profileImageId: result.student?.profileImageId
    });
  } catch (error) {
    console.error('Verification error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  verifyStudent,
  getStudentResults,
  generateCertificate,
  verifyCertificate
};
