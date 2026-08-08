const Result = require('../models/Result');
const jwt = require('jsonwebtoken');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const verifyStudent = async (req, res) => {
  try {
    const { rollNo, dateOfBirth } = req.body;

    console.log('Searching for student with:', { rollNo, dateOfBirth });

    const studentResult = await Result.findOne({ rollNo: rollNo, status: 'approved' })
      .sort({ createdAt: -1 })
      .select("status rollNo enrolmentNo candidateNameEnglish dateOfBirth");

    console.log('Raw student result:', studentResult);

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

    const standardizeDate = (d) => {
      if (!d) return '';
      const str = d.toString().trim();

      let match = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
      if (match) {
        return `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`;
      }

      match = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
      if (match) {
        return `${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`;
      }

      const dt = new Date(str);
      if (!isNaN(dt.getTime())) {
        return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
      }

      return str;
    };

    const stdInput = standardizeDate(dateOfBirth);
    const stdStored = standardizeDate(studentResult.dateOfBirth);

    console.log('Comparing dates:', {
      input: dateOfBirth,
      stored: studentResult.dateOfBirth,
      stdInput,
      stdStored
    });

    if (stdInput !== stdStored) {
      return res.status(401).json({ message: 'Invalid date of birth' });
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

    const result = await Result.findOne({
      certificateNo,
      status: 'approved'
    }).populate('student', 'profileImageId');

    if (!result) {
      return res.status(404).json({ message: 'Invalid certificate number' });
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
