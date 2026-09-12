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

    // --- ZOHO PAYMENT LOGIC ---
    // Change FREE_PERIOD_MINUTES to (180 * 24 * 60) for production (180 days)
    const FREE_PERIOD_MINUTES = 5;
    const currentDate = new Date();
    const zohoCheckoutBaseUrl = "https://zohosecurepay.in/checkout/9sdqjs08-yj6kfy0fx7l46/TESTFORCERT";
    const finalPaymentUrl = `${zohoCheckoutBaseUrl}?Result_ID=${result._id}`;

    if (!result.firstDownloadedAt) {
      // First ever download — start the free period
      result.firstDownloadedAt = currentDate;
      await result.save();
    } else {
      const diffTime = Math.abs(currentDate - result.firstDownloadedAt);
      const diffMinutes = Math.floor(diffTime / (1000 * 60));

      if (diffMinutes >= FREE_PERIOD_MINUTES) {
        if (result.paymentStatus === 'paid' && result.lastPaidAt) {
          // Student has paid — check if the paid period has also expired
          const paidDiff = Math.abs(currentDate - result.lastPaidAt);
          const paidDiffMinutes = Math.floor(paidDiff / (1000 * 60));

          if (paidDiffMinutes >= FREE_PERIOD_MINUTES) {
            // Paid period expired — reset for a new cycle, must pay again
            result.paymentStatus = 'unpaid';
            result.transactionId = null;
            await result.save();

            return res.status(403).json({
              success: false,
              message: "A miscellaneous fee of \u20B91500/- has to be paid to Reissue of e-Certificate after 180 days of declaration of result.",
              paymentUrl: finalPaymentUrl
            });
          }
          // else: still within paid period — allow download
        } else {
          // Free period expired and not paid — block
          return res.status(403).json({
            success: false,
            message: "A miscellaneous fee of \u20B91500/- has to be paid to Reissue of e-Certificate after 180 days of declaration of result.",
            paymentUrl: finalPaymentUrl
          });
        }
      }
      // else: still within free period — allow download
    }
    // --- END ZOHO PAYMENT LOGIC ---

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

      // --- Snapshot current active signatures at FIRST DOWNLOAD time ---
      // This freezes the signature/label permanently for this result so that
      // future signature updates don't affect already-issued certificates.
      // Records that haven't been downloaded yet will always pick up the
      // latest active signature when they are first downloaded.
      const CertificateSignatureSnap = require('../models/CertificateSignature');
      const authSnapSig = await CertificateSignatureSnap.findOne({ role: 'Verifying Authority', isActive: true })
        .sort({ createdAt: -1 });
      const controllerSnapSig = await CertificateSignatureSnap.findOne({ role: 'Controller of Examination', isActive: true })
        .sort({ createdAt: -1 });

      if (authSnapSig) {
        result.snapshotAuthSignatureImage = authSnapSig.imageData || null;
        result.snapshotAuthSignatureLabel = authSnapSig.signatoryLabel || 'O.S.D. (Examination)';
      }
      if (controllerSnapSig) {
        result.snapshotControllerSignatureImage = controllerSnapSig.imageData || null;
        result.snapshotControllerSignatureLabel = controllerSnapSig.signatoryLabel || 'Controller of Examination';
      }
      // --- End snapshot ---

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
      _id: result._id,
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

    // --- Signature Resolution (3-tier) ---
    //
    // Tier 1 — Frozen snapshot: set at first-download time for all records issued
    //           after this feature was deployed. Never changes.
    //
    // Tier 2 — Legacy backfill: for records that already had a certificateNo BEFORE
    //           this feature existed, find the signature that was created on or before
    //           result.issuedAt (i.e. the one that was actually in the DB when the
    //           cert was first produced). Save it as the snapshot so it is frozen
    //           from this point forward and the lookup never runs again.
    //
    // Tier 3 — Live active: only for brand-new records not yet issued (no certificateNo).
    //           These are handled above in the certificateNo block (snapshot taken there).
    //           This tier is a safety net.
    //
    const CertificateSignature = require('../models/CertificateSignature');
    let needsLegacySave = false;

    // ── Auth Signature ──────────────────────────────────────────────────────────
    if (result.snapshotAuthSignatureImage || result.snapshotAuthSignatureLabel) {
      // Tier 1: use the frozen snapshot
      certificateData.authSignatureLabel = result.snapshotAuthSignatureLabel || 'O.S.D. (Examination)';
      certificateData.authSignatureImage = result.snapshotAuthSignatureImage || null;

    } else if (result.issuedAt) {
      // Tier 2: legacy record — find the signature that existed at issuance time
      const legacyAuthSig = await CertificateSignature.findOne({
        role: 'Verifying Authority',
        createdAt: { $lte: result.issuedAt }
      }).sort({ createdAt: -1 });

      const legacyAuth = legacyAuthSig || await CertificateSignature.findOne({ role: 'Verifying Authority' })
        .sort({ createdAt: 1 }); // oldest as last resort

      if (legacyAuth) {
        certificateData.authSignatureLabel = legacyAuth.signatoryLabel || 'O.S.D. (Examination)';
        if (legacyAuth.imageData) {
          certificateData.authSignatureImage = legacyAuth.imageData;
        } else {
          const sigPath = path.join(__dirname, '..', legacyAuth.filePath);
          if (fs.existsSync(sigPath)) {
            const ext = path.extname(sigPath).slice(1) || 'png';
            const buffer = fs.readFileSync(sigPath);
            certificateData.authSignatureImage = `data:image/${ext};base64,${buffer.toString('base64')}`;
          } else {
            certificateData.authSignatureImage = legacyAuth.filePath;
          }
        }
        // Freeze as snapshot so this path never runs again for this record
        result.snapshotAuthSignatureImage = certificateData.authSignatureImage;
        result.snapshotAuthSignatureLabel = certificateData.authSignatureLabel;
        needsLegacySave = true;
      }

    } else {
      // Tier 3: safety net — new record not yet issued (snapshot taken in certificateNo block above)
      const liveSig = await CertificateSignature.findOne({ role: 'Verifying Authority', isActive: true })
        .sort({ createdAt: -1 });
      if (liveSig) {
        certificateData.authSignatureLabel = liveSig.signatoryLabel || 'O.S.D. (Examination)';
        certificateData.authSignatureImage = liveSig.imageData || liveSig.filePath || null;
      }
    }

    // ── Controller Signature ────────────────────────────────────────────────────
    if (result.snapshotControllerSignatureImage || result.snapshotControllerSignatureLabel) {
      // Tier 1: use the frozen snapshot
      certificateData.controllerSignatureLabel = result.snapshotControllerSignatureLabel || 'Controller of Examination';
      certificateData.controllerSignatureImage = result.snapshotControllerSignatureImage || null;

    } else if (result.issuedAt) {
      // Tier 2: legacy record — find the signature that existed at issuance time
      const legacyCtrlSig = await CertificateSignature.findOne({
        role: 'Controller of Examination',
        createdAt: { $lte: result.issuedAt }
      }).sort({ createdAt: -1 });

      const legacyCtrl = legacyCtrlSig || await CertificateSignature.findOne({ role: 'Controller of Examination' })
        .sort({ createdAt: 1 }); // oldest as last resort

      if (legacyCtrl) {
        certificateData.controllerSignatureLabel = legacyCtrl.signatoryLabel || 'Controller of Examination';
        if (legacyCtrl.imageData) {
          certificateData.controllerSignatureImage = legacyCtrl.imageData;
        } else {
          const sigPath = path.join(__dirname, '..', legacyCtrl.filePath);
          if (fs.existsSync(sigPath)) {
            const ext = path.extname(sigPath).slice(1) || 'png';
            const buffer = fs.readFileSync(sigPath);
            certificateData.controllerSignatureImage = `data:image/${ext};base64,${buffer.toString('base64')}`;
          } else {
            certificateData.controllerSignatureImage = legacyCtrl.filePath;
          }
        }
        // Freeze as snapshot so this path never runs again for this record
        result.snapshotControllerSignatureImage = certificateData.controllerSignatureImage;
        result.snapshotControllerSignatureLabel = certificateData.controllerSignatureLabel;
        needsLegacySave = true;
      }

    } else {
      // Tier 3: safety net — new record not yet issued
      const liveSig = await CertificateSignature.findOne({ role: 'Controller of Examination', isActive: true })
        .sort({ createdAt: -1 });
      if (liveSig) {
        certificateData.controllerSignatureLabel = liveSig.signatoryLabel || 'Controller of Examination';
        certificateData.controllerSignatureImage = liveSig.imageData || liveSig.filePath || null;
      }
    }

    // Persist any legacy snapshots we just resolved (runs only once per legacy record)
    if (needsLegacySave) {
      await result.save();
    }
    // --- End Signature Resolution ---

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

    let query = { certificateNo, status: 'approved' };

    // Support verification of the visual format "VMI-[RollNo]-[SeqNo]"
    if (certificateNo.startsWith('VMI-')) {
      const parts = certificateNo.split('-');
      if (parts.length === 3) {
        const rollStr = parts[1];
        const seqStr = String(parts[2]).padStart(3, '0');
        query = { rollNo: rollStr, certificateNo: new RegExp(seqStr + '$'), status: 'approved' };
      }
    }

    let result = await Result.findOne(query).populate('student', 'profileImageId');

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

// Called BEFORE redirecting student to Zoho — marks which result is about to be paid
const initiatePayment = async (req, res) => {
  try {
    const { resultId } = req.body;
    const { rollNo, enrolmentNo } = req.student;

    const result = await Result.findOne({
      _id: resultId,
      rollNo,
      enrolmentNo,
      status: 'approved'
    });

    if (!result) {
      return res.status(404).json({ message: 'Result not found' });
    }

    // Mark this result as "payment initiated" with a timestamp
    result.paymentInitiated = true;
    result.paymentInitiatedAt = new Date();
    await result.save();

    console.log(`💳 Payment initiated for Result ID: ${resultId} by Roll No: ${rollNo}`);
    res.json({ success: true, message: 'Payment initiation recorded' });
  } catch (error) {
    console.error('Error initiating payment:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  verifyStudent,
  getStudentResults,
  generateCertificate,
  verifyCertificate,
  initiatePayment
};
