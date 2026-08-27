/**
 * csvTemplate.js
 *
 * Parses + validates the Diploma Certificate CSV upload, and maps each
 * valid row into the exact data shape expected by certificateTemplate.js.
 *
 * Expected CSV headers (in this order):
 *   S.No, DateOfBirth, ExamRollNo, CandidateName, FatherName,
 *   P1_Code, P1_Name, P1_IA, P1_TH, P1_PRPW, P1_Result,
 *   P2_Code, P2_Name, P2_IA, P2_TH, P2_PRPW, P2_Result,
 *   P3_Code, P3_Name, P3_IA, P3_TH, P3_PRPW, P3_Result,
 *   P4_Code, P4_Name, P4_IA, P4_TH, P4_PRPW, P4_Result,
 *   P5_Code, P5_Name, P5_IA, P5_TH, P5_PRPW, P5_Result,
 *   P6_Code, P6_Name, P6_IA, P6_TH, P6_PRPW, P6_Result,
 *   TotalMaxMarks, TotalObtainedMarks, Division,
 *   CourseName, Date, Session, Semester, Part, ExamFlag, AcademicYear
 *
 * Usage:
 *   const { parseCertificateCSV } = require('./csvTemplate');
 *   const { valid, errors } = await parseCertificateCSV('/path/to/upload.csv');
 */

const fs = require('fs');
const { parse } = require('csv-parse/sync');

// ---------- schema ----------

const REQUIRED_HEADERS = [
  'S.No', 'DateOfBirth', 'ExamRollNo', 'CandidateName', 'FatherName',
  'P1_Code', 'P1_Name', 'P1_IA', 'P1_TH', 'P1_PRPW', 'P1_Result',
  'P2_Code', 'P2_Name', 'P2_IA', 'P2_TH', 'P2_PRPW', 'P2_Result',
  'P3_Code', 'P3_Name', 'P3_IA', 'P3_TH', 'P3_PRPW', 'P3_Result',
  'P4_Code', 'P4_Name', 'P4_IA', 'P4_TH', 'P4_PRPW', 'P4_Result',
  'P5_Code', 'P5_Name', 'P5_IA', 'P5_TH', 'P5_PRPW', 'P5_Result',
  'P6_Code', 'P6_Name', 'P6_IA', 'P6_TH', 'P6_PRPW', 'P6_Result',
  'TotalMaxMarks', 'TotalObtainedMarks', 'Division',
  'CourseName', 'Date', 'Session', 'Semester', 'Part', 'ExamFlag', 'AcademicYear',
];

// Fields that must not be blank for a row to be usable at all.
const REQUIRED_FIELDS = [
  'ExamRollNo', 'CandidateName', 'FatherName', 'CourseName', 'Semester',
];

// A mark cell like "18/20" or "58 / 80" -> allowed. Blank -> allowed (means N/A).
const MARK_PATTERN = /^\s*\d+(\.\d+)?\s*\/\s*\d+(\.\d+)?\s*$/;

// ---------- helpers ----------

function isBlank(val) {
  return val === undefined || val === null || String(val).trim() === '';
}

function cleanStr(val) {
  return isBlank(val) ? '' : String(val).trim();
}

/** Validates a single mark cell. Blank is valid (means not applicable). */
function validateMarkCell(val, fieldName, rowErrors) {
  if (isBlank(val)) return; // blank is fine — e.g. no practical for this subject
  if (!MARK_PATTERN.test(val)) {
    rowErrors.push(`${fieldName} has an invalid mark format: "${val}" (expected "Obtained/Max", e.g. "18/20")`);
  }
}

/** Builds the 6-paper array for one row, matching certificateTemplate.js's expected shape. */
function buildPapers(row, rowErrors) {
  const papers = [];
  for (let i = 1; i <= 6; i++) {
    const code = cleanStr(row[`P${i}_Code`]);
    const name = cleanStr(row[`P${i}_Name`]);
    const ia = cleanStr(row[`P${i}_IA`]);
    const th = cleanStr(row[`P${i}_TH`]);
    const prpw = cleanStr(row[`P${i}_PRPW`]);
    const result = cleanStr(row[`P${i}_Result`]);

    // A subject slot with a code/name but a totally blank result is suspicious — flag it.
    if ((code || name) && !result) {
      rowErrors.push(`Paper ${i} ("${name || code}") is missing a Paper Result (P/F/AB/etc.)`);
    }
    // A subject slot with a result but no code/name is malformed.
    if (result && !code && !name) {
      rowErrors.push(`Paper ${i} has a Result ("${result}") but no Paper Code/Name`);
    }

    validateMarkCell(ia, `Paper ${i} IA`, rowErrors);
    validateMarkCell(th, `Paper ${i} TH`, rowErrors);
    validateMarkCell(prpw, `Paper ${i} PR/PW`, rowErrors);

    papers.push({
      code, name, sem: cleanStr(row.Semester),
      ia, th, prpw, result,
    });
  }
  return papers;
}

/** Generates a unique certificate number. Swap for your own scheme / DB sequence if needed. */
function generateCertificateNumber(academicYear, rollNo, semester) {
  const yearPart = academicYear ? String(academicYear).trim() : String(new Date().getFullYear());
  return `${yearPart}-${rollNo}-${semester}`;
}

// ---------- main parse/validate/map ----------

/**
 * Parses and validates a diploma CSV file or string buffer, mapping each valid row to the
 * shape certificateTemplate.js expects.
 *
 * @param {string|Buffer} filePathOrBuffer Path to CSV or file buffer.
 * @returns {Promise<{ valid: object[], errors: { row: number, message: string }[] }>}
 */
async function parseCertificateCSV(filePathOrBuffer) {
  const raw = Buffer.isBuffer(filePathOrBuffer) 
    ? filePathOrBuffer.toString('utf8') 
    : (fs.existsSync(filePathOrBuffer) ? fs.readFileSync(filePathOrBuffer, 'utf8') : filePathOrBuffer);

  let records;
  try {
    records = parse(raw, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      bom: true,
    });
  } catch (err) {
    return {
      valid: [],
      errors: [{ row: 0, message: `Could not parse CSV file: ${err.message}` }],
    };
  }

  if (records.length === 0) {
    return { valid: [], errors: [{ row: 0, message: 'CSV file has no data rows.' }] };
  }

  // Header check
  const actualHeaders = Object.keys(records[0]);
  const missingHeaders = REQUIRED_HEADERS.filter((h) => !actualHeaders.includes(h));
  if (missingHeaders.length > 0) {
    return {
      valid: [],
      errors: [{
        row: 0,
        message: `CSV is missing required column(s): ${missingHeaders.join(', ')}`,
      }],
    };
  }

  const valid = [];
  const errors = [];

  records.forEach((row, idx) => {
    const rowNum = idx + 2; // +1 for 0-index, +1 for header row
    const rowErrors = [];

    // Required identity fields
    REQUIRED_FIELDS.forEach((field) => {
      if (isBlank(row[field])) {
        rowErrors.push(`Missing required field: ${field}`);
      }
    });

    // DOB sanity check
    if (isBlank(row.DateOfBirth)) {
      rowErrors.push('Missing DateOfBirth (needed for student self-service lookup)');
    }

    const papers = buildPapers(row, rowErrors);

    // Totals sanity check
    const totalMax = cleanStr(row.TotalMaxMarks);
    const totalObtained = cleanStr(row.TotalObtainedMarks);
    if (isBlank(totalMax)) rowErrors.push('Missing TotalMaxMarks');
    if (isBlank(totalObtained)) rowErrors.push('Missing TotalObtainedMarks');
    if (!isBlank(totalMax) && !isBlank(totalObtained)) {
      const maxNum = Number(totalMax);
      const obtNum = Number(totalObtained);
      if (!Number.isNaN(maxNum) && !Number.isNaN(obtNum) && obtNum > maxNum) {
        rowErrors.push(`TotalObtainedMarks (${obtNum}) cannot exceed TotalMaxMarks (${maxNum})`);
      }
    }

    if (isBlank(row.Division)) {
      rowErrors.push('Missing Division');
    }

    if (rowErrors.length > 0) {
      errors.push({
        row: rowNum,
        rollNo: cleanStr(row.ExamRollNo) || '(unknown)',
        error: rowErrors.join('; '),
      });
      return;
    }

    // Map to the shape certificateTemplate.js expects
    valid.push({
      rollNo: cleanStr(row.ExamRollNo),
      dateOfBirth: cleanStr(row.DateOfBirth),
      candidateName: cleanStr(row.CandidateName),
      fatherName: cleanStr(row.FatherName),
      courseName: cleanStr(row.CourseName),
      semester: cleanStr(row.Semester),
      part: cleanStr(row.Part),
      examSession: cleanStr(row.Session),
      examFlag: cleanStr(row.ExamFlag),
      academicYear: cleanStr(row.AcademicYear),
      dateOfResult: cleanStr(row.Date),
      certificateNumber: generateCertificateNumber(row.AcademicYear, cleanStr(row.ExamRollNo), cleanStr(row.Semester)),
      papers,
      totalMax: cleanStr(row.TotalMaxMarks),
      totalObtained: cleanStr(row.TotalObtainedMarks),
      division: cleanStr(row.Division),
    });
  });

  return { valid, errors };
}

module.exports = {
  parseCertificateCSV,
  generateCertificateNumber,
  REQUIRED_HEADERS,
};
