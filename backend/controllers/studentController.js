const Result = require('../models/Result');
const jwt = require('jsonwebtoken');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const https = require('https');

/**
 * Downloads an image from a URL and returns a base64 data URI.
 * Used to embed Google Drive photos directly in certificates so they
 * render correctly when the page is printed / downloaded as PDF.
 */
function imageUrlToBase64(url) {
  return new Promise((resolve) => {
    if (!url || !url.startsWith('http')) return resolve(null);
    https.get(url, (res) => {
      // Follow redirect if needed
      if ([301, 302, 303, 307, 308].includes(res.statusCode)) {
        return imageUrlToBase64(res.headers.location).then(resolve);
      }
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        const buffer = Buffer.concat(chunks);
        const mimeType = res.headers['content-type'] || 'image/jpeg';
        resolve(`data:${mimeType};base64,${buffer.toString('base64')}`);
      });
      res.on('error', () => resolve(null));
    }).on('error', () => resolve(null));
  });
}


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
      // Generate sequence number based on year
      const yearStr = result.courseYearEnglish || new Date().getFullYear().toString();
      const match = yearStr.match(/\d{4}/);
      const year = match ? parseInt(match[0], 10) : new Date().getFullYear();
      const shortYear1 = String(year).slice(-2);
      const shortYear2 = String(year + 1).slice(-2);
      const prefix = `${shortYear1}${shortYear2}`;

      // Find highest certificateNo with this prefix
      const lastResult = await Result.findOne({ certificateNo: new RegExp(`^${prefix}`) })
        .sort({ certificateNo: -1 })
        .exec();

      let nextNum = 1;
      if (lastResult && lastResult.certificateNo) {
        const lastNumStr = lastResult.certificateNo.slice(prefix.length);
        const lastNum = parseInt(lastNumStr, 10);
        if (!isNaN(lastNum)) {
          nextNum = lastNum + 1;
        }
      }
      
      const seqStr = String(nextNum).padStart(3, '0');
      result.certificateNo = `${prefix}${seqStr}`;
      result.issuedAt = new Date();
      await result.save();
    }

    // Convert the Drive image URL → base64 so it renders in print/PDF correctly
    const rawImageUrl = result.student?.profileImageId || null;
    // For Drive thumbnail, request a higher-res version for print quality
    const highResUrl = rawImageUrl && rawImageUrl.includes('drive.google.com/thumbnail')
      ? rawImageUrl.replace(/sz=w\d+-h\d+/, 'sz=w800-h1000')
      : rawImageUrl;

    const profileImageBase64 = await imageUrlToBase64(highResUrl);

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
      // Send base64 data URI — works in preview AND print/PDF (no CORS issues)
      profileImageId: profileImageBase64 || rawImageUrl
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
