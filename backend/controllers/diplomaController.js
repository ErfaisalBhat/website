const DiplomaCertificate = require('../models/DiplomaCertificate');
const Signature = require('../models/Signature');
const csv = require('csv-parse');
const crypto = require('crypto');
const JSZip = require('jszip');
const { generateCertificatePDF, generateBulkCertificates } = require('../utils/certificateTemplate');
const path = require('path');
const fs = require('fs');
const { parseCertificateCSV } = require('../utils/csvTemplate');

// Helper to parse "Obt/Max" strings
const parseMarks = (val) => {
  if (!val || val.toString().trim() === '' || val.toString().trim() === '-') {
    return { obt: null, max: null };
  }
  const parts = val.toString().split('/');
  if (parts.length === 2) {
    const obt = parseFloat(parts[0].trim());
    const max = parseFloat(parts[1].trim());
    return {
      obt: isNaN(obt) ? null : obt,
      max: isNaN(max) ? null : max
    };
  }
  return { obt: null, max: null };
};

// Validate a paper and calculate result
const calculatePaperResult = (paperCode, paperName, iaVal, thVal, prVal) => {
  const ia = parseMarks(iaVal);
  const th = parseMarks(thVal);
  const pr = parseMarks(prVal);

  let paperObt = 0;
  let paperMax = 0;
  let passed = true;
  let componentsChecked = 0;

  if (th.max !== null && th.obt !== null) {
    componentsChecked++;
    paperObt += th.obt;
    paperMax += th.max;
    if (th.max > 0 && (th.obt / th.max) < 0.40) passed = false;
  }

  if (ia.max !== null && ia.obt !== null) {
    componentsChecked++;
    paperObt += ia.obt;
    paperMax += ia.max;
    if (ia.max > 0 && (ia.obt / ia.max) < 0.40) passed = false;
  }

  if (pr.max !== null && pr.obt !== null) {
    componentsChecked++;
    paperObt += pr.obt;
    paperMax += pr.max;
    if (pr.max > 0 && (pr.obt / pr.max) < 0.40) passed = false;
  }

  if (componentsChecked > 0) {
    if (paperMax > 0 && (paperObt / paperMax) < 0.40) passed = false;
  } else {
    // If no marks at all, we don't count it as failed unless required
  }

  return {
    code: paperCode || '',
    name: paperName || '',
    ia: iaVal || '-',
    th: thVal || '-',
    pr: prVal || '-',
    obt: paperObt,
    max: paperMax,
    status: componentsChecked > 0 ? (passed ? 'Pass' : 'E.R.') : '-'
  };
};

// Upload and Parse Diploma CSV
const uploadDiplomas = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const { valid, errors } = await parseCertificateCSV(req.file.buffer);

    if (errors.length > 0 && valid.length === 0) {
      return res.status(200).json({
        message: 'CSV file validation failed.',
        processedCount: 0,
        failedCount: errors.length,
        errors
      });
    }

    const processed = [];

    for (const item of valid) {
      const {
        rollNo,
        dateOfBirth,
        candidateName,
        fatherName,
        courseName,
        semester,
        part,
        examSession,
        examFlag,
        academicYear,
        dateOfResult,
        certificateNumber,
        papers,
        totalMax,
        totalObtained,
        division
      } = item;

      // Prepare marksData JSON matching certificateTemplate.js
      const marksData = {
        rollNo,
        dob: dateOfBirth,
        name: candidateName,
        fatherName,
        courseName,
        semester,
        part,
        session: examSession,
        examFlag,
        academicYear,
        dateOfResult,
        papers,
        overallObt: totalObtained,
        overallMax: totalMax,
        division
      };

      const marksHash = crypto
        .createHash('sha256')
        .update(JSON.stringify(marksData))
        .digest('hex');

      try {
        // Keep only one certificate per roll number & semester
        await DiplomaCertificate.findOneAndDelete({ rollNo, semester });

        const newCert = await DiplomaCertificate.create({
          certificateNo: certificateNumber,
          rollNo,
          candidateName,
          fatherName,
          dateOfBirth,
          courseName,
          semester,
          academicYear,
          division,
          marksHash,
          marksData
        });

        processed.push(newCert);
      } catch (dbErr) {
        errors.push({
          row: 0,
          rollNo,
          error: `Database write error: ${dbErr.message}`
        });
      }
    }

    res.status(200).json({
      message: `Successfully processed ${processed.length} certificates. ${errors.length} rows failed.`,
      processedCount: processed.length,
      failedCount: errors.length,
      errors
    });
  } catch (error) {
    console.error('Diploma Upload Error:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

// List all generated Diploma Certificates
const listDiplomas = async (req, res) => {
  try {
    const certs = await DiplomaCertificate.find().sort({ createdAt: -1 });
    res.status(200).json(certs);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch certificates', error: error.message });
  }
};

// Public Certificate Verification Endpoint
const verifyDiploma = async (req, res) => {
  try {
    const { certificateNo } = req.params;
    const cert = await DiplomaCertificate.findOne({ certificateNo });

    if (!cert) {
      return res.status(404).json({ message: 'Certificate not found' });
    }

    // Verify tampering
    const currentHash = crypto
      .createHash('sha256')
      .update(JSON.stringify(cert.marksData))
      .digest('hex');

    const isValid = (currentHash === cert.marksHash);

    res.status(200).json({
      certificateNo: cert.certificateNo,
      candidateName: cert.candidateName,
      rollNo: cert.rollNo,
      courseName: cert.courseName,
      semester: cert.semester,
      academicYear: cert.academicYear,
      division: cert.division,
      issuedAt: cert.issuedAt,
      isValid: isValid ? 'Valid ✓' : 'Tampered ✗',
      marksData: cert.marksData // Return details for preview
    });
  } catch (error) {
    res.status(500).json({ message: 'Verification failed', error: error.message });
  }
};

// Public Student Self-service Lookup
const studentDownload = async (req, res) => {
  try {
    const { rollNo, dateOfBirth } = req.body;
    if (!rollNo || !dateOfBirth) {
      return res.status(400).json({ message: 'Roll Number and Date of Birth are required' });
    }

    const certs = await DiplomaCertificate.find({ rollNo });

    if (!certs.length) {
      return res.status(404).json({ message: 'No diploma certificates found for this Roll Number' });
    }

    const standardizeDate = (d) => {
      if (!d) return '';
      const str = d.toString().trim().replace(/[-/]/g, '');
      return str;
    };

    const inputDob = standardizeDate(dateOfBirth);
    const matchedCert = certs.find(c => standardizeDate(c.dateOfBirth) === inputDob);

    if (!matchedCert) {
      return res.status(401).json({ message: 'Invalid Date of Birth' });
    }

    res.status(200).json(matchedCert);
  } catch (error) {
    res.status(500).json({ message: 'Lookup failed', error: error.message });
  }
};

// Bulk ZIP generator endpoint (generates actual PDFs using Puppeteer)
const bulkDownload = async (req, res) => {
  try {
    const certs = await DiplomaCertificate.find();
    if (!certs.length) {
      return res.status(404).json({ message: 'No certificates found' });
    }

    const bgImagePath = path.join(__dirname, '../../frontend/public/Blue.png');
    const outDir = path.join(__dirname, `../uploads/bulk_${Date.now()}`);

    const activeSig = await Signature.findOne({ isActive: true });
    let signaturePath = '';
    let signatoryLabel = '';
    if (activeSig) {
      signaturePath = path.join(__dirname, '..', activeSig.filePath);
      signatoryLabel = activeSig.signatoryLabel;
    }

    const studentsData = certs.map(cert => ({
      rollNo: cert.rollNo,
      candidateName: cert.candidateName,
      fatherName: cert.fatherName,
      courseName: cert.courseName,
      semester: cert.semester,
      part: cert.marksData?.part || 'I',
      examSession: cert.marksData?.session || '',
      examFlag: cert.marksData?.examFlag || '',
      academicYear: cert.academicYear,
      dateOfResult: cert.marksData?.dateOfResult || '',
      certificateNumber: cert.certificateNo,
      papers: cert.marksData?.papers || [],
      totalMax: cert.marksData?.overallMax || 0,
      totalObtained: cert.marksData?.overallObt || 0,
      division: cert.division,
      signatureImage: signaturePath,
      signatoryLabel: signatoryLabel
    }));

    const pdfPaths = await generateBulkCertificates(studentsData, bgImagePath, outDir);

    const zip = new JSZip();
    pdfPaths.forEach(pdfPath => {
      const filename = path.basename(pdfPath);
      const fileBuffer = fs.readFileSync(pdfPath);
      zip.file(filename, fileBuffer);
    });

    const content = await zip.generateAsync({ type: 'nodebuffer' });

    // Clean up temp directory
    pdfPaths.forEach(pdfPath => {
      try {
        fs.unlinkSync(pdfPath);
      } catch (e) {}
    });
    try {
      fs.rmdirSync(outDir);
    } catch (e) {}

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename=diploma_certificates.zip');
    res.send(content);
  } catch (error) {
    console.error('ZIP bulk generation failed:', error);
    res.status(500).json({ message: 'ZIP generation failed', error: error.message });
  }
};

// Generate and Download single PDF
const downloadDiplomaPDF = async (req, res) => {
  try {
    const { id } = req.params;
    const cert = await DiplomaCertificate.findById(id);
    if (!cert) {
      return res.status(404).json({ message: 'Certificate not found' });
    }

    const bgImagePath = path.join(__dirname, '../../frontend/public/Blue.png');
    const outputPath = path.join(__dirname, `../uploads/${cert.rollNo}_Diploma.pdf`);

    const activeSig = await Signature.findOne({ isActive: true });
    let signaturePath = '';
    let signatoryLabel = '';
    if (activeSig) {
      signaturePath = path.join(__dirname, '..', activeSig.filePath);
      signatoryLabel = activeSig.signatoryLabel;
    }

    const studentData = {
      rollNo: cert.rollNo,
      candidateName: cert.candidateName,
      fatherName: cert.fatherName,
      courseName: cert.courseName,
      semester: cert.semester,
      part: cert.marksData?.part || 'I',
      examSession: cert.marksData?.session || '',
      examFlag: cert.marksData?.examFlag || '',
      academicYear: cert.academicYear,
      dateOfResult: cert.marksData?.dateOfResult || '',
      certificateNumber: cert.certificateNo,
      papers: cert.marksData?.papers || [],
      totalMax: cert.marksData?.overallMax || 0,
      totalObtained: cert.marksData?.overallObt || 0,
      division: cert.division,
      signatureImage: signaturePath,
      signatoryLabel: signatoryLabel
    };

    await generateCertificatePDF(studentData, bgImagePath, outputPath);

    res.download(outputPath, `${cert.rollNo}_${cert.candidateName.replace(/\s+/g, '_')}_Diploma.pdf`, (err) => {
      if (err) {
        console.error('File download error:', err);
      }
      try {
        fs.unlinkSync(outputPath);
      } catch (unlinkErr) {}
    });
  } catch (error) {
    console.error('PDF generation error:', error);
    res.status(500).json({ message: 'PDF generation failed', error: error.message });
  }
};

// Delete single certificate
const deleteDiploma = async (req, res) => {
  try {
    const { id } = req.params;
    await DiplomaCertificate.findByIdAndDelete(id);
    res.status(200).json({ message: 'Certificate deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Delete failed', error: error.message });
  }
};

// Upload Authorized Signature (PNG only)
const uploadSignature = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Verify MIME content-type and extension
    const mimeType = req.file.mimetype;
    const extension = path.extname(req.file.originalname).toLowerCase();

    if (mimeType !== 'image/png' || extension !== '.png') {
      return res.status(400).json({ message: 'Only PNG images are allowed' });
    }

    const filename = `signature-${Date.now()}.png`;
    const uploadPath = path.join(__dirname, '../uploads', filename);

    // Ensure uploads directory exists
    const uploadsDir = path.dirname(uploadPath);
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    fs.writeFileSync(uploadPath, req.file.buffer);
    const filePath = `uploads/${filename}`;

    // Deactivate previous active signatures
    await Signature.updateMany({ isActive: true }, { isActive: false });

    const newSignature = await Signature.create({
      filePath: filePath,
      signatoryLabel: req.body.signatoryLabel || 'O.S.D. (Examination)',
      isActive: true,
      uploadedBy: req.user._id
    });

    res.status(200).json(newSignature);
  } catch (error) {
    console.error('Signature Upload Error:', error);
    res.status(500).json({ message: 'Signature upload failed', error: error.message });
  }
};

// Get current active signature
const getActiveSignature = async (req, res) => {
  try {
    const activeSig = await Signature.findOne({ isActive: true });
    res.status(200).json(activeSig || null);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch signature', error: error.message });
  }
};

// Deactivate signature
const deactivateSignature = async (req, res) => {
  try {
    const { id } = req.params;
    await Signature.findByIdAndUpdate(id, { isActive: false });
    res.status(200).json({ message: 'Signature deactivated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Deactivation failed', error: error.message });
  }
};

module.exports = {
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
};
