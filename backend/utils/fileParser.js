const csv = require('csv-parse');
const xlsx = require('xlsx');

const { computeRemark } = require('./remarkCalculator');

const tryParseDate = (dateVal) => {
  if (!dateVal) return '';
  
  // Handle Excel Serial Dates (numbers)
  if (typeof dateVal === 'number') {
    // Excel date epoch is 1899-12-30. Using UTC math to avoid timezone shifts.
    const date = new Date(Math.round((dateVal - 25569) * 864e5));
    // Important: we just get the UTC parts to avoid local timezone off-by-one errors.
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  if (dateVal instanceof Date) {
    // Treat the date as UTC to extract the exact year/month/day without local shift
    const year = dateVal.getUTCFullYear();
    const month = String(dateVal.getUTCMonth() + 1).padStart(2, '0');
    const day = String(dateVal.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  const dateStr = dateVal.toString().trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;

  // Try to handle DD-MM-YYYY or DD/MM/YYYY
  const dmYMatch = dateStr.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (dmYMatch) {
    const [_, d, m, y] = dmYMatch;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  const d = new Date(dateStr);
  if (!isNaN(d.getTime())) {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  
  return dateStr;
};



const processCSV = (buffer) => {
  return new Promise((resolve, reject) => {
    csv.parse(buffer, { columns: false, trim: true, relax_column_count: true }, (err, data) => {
      if (err) return reject(err);

      // Always skip first 2 rows:
      // Row 0 = institution title / metadata
      // Row 1 = column headers (FIELD1, FIELD2... or Roll No, Name, etc.)
      const results = data.slice(2)
        .filter(row => row && row[2] && row[2].toString().trim() !== '')
        .map(row => mapRowToResult(row));

      resolve(results.filter(r => r.rollNo.trim() !== '' && r.enrolmentNo.trim() !== '' && r.candidateNameEnglish.trim() !== ''));
    });
  });
};

const processExcel = (buffer) => {
  const workbook = xlsx.read(buffer);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });

  // Always skip first 2 rows:
  // Row 0 = institution title / metadata
  // Row 1 = column headers
  const results = data.slice(2)
    .filter(row => row && row[2] && row[2].toString().trim() !== '')
    .map(row => mapRowToResult(row));

  return results.filter(r => r.rollNo.trim() !== '' && r.enrolmentNo.trim() !== '' && r.candidateNameEnglish.trim() !== '');
};

const mapRowToResult = (row) => {
  const dateOfBirth = tryParseDate(row[1]);
  let maxMarks = parseFloat(row[20]);
  if (isNaN(maxMarks) || maxMarks <= 0) maxMarks = parseFloat(row[19]);
  if (isNaN(maxMarks) || maxMarks <= 0) maxMarks = parseFloat(row[21]);

  const iaMaxMarks = parseFloat(row[18]) || 0;
  const meMaxMarks = parseFloat(row[19]) || 0;
  const iaMarks = row[21] && row[21].toString().trim().toUpperCase() === 'AB' ? 'AB' : (isNaN(parseFloat(row[21])) ? '0' : parseFloat(row[21]).toString());
  const meMarks = row[22] && row[22].toString().trim().toUpperCase() === 'AB' ? 'AB' : (isNaN(parseFloat(row[22])) ? '0' : parseFloat(row[22]).toString());
  
  const iaNum = iaMarks === 'AB' ? 0 : parseFloat(iaMarks);
  const meNum = meMarks === 'AB' ? 0 : parseFloat(meMarks);
  const marksTotal = iaNum + meNum;

  const computedRemark = computeRemark(iaMarks, iaMaxMarks, meMarks, meMaxMarks);

  return {
    sNo:                  parseInt(row[0]) || 0,
    dateOfBirth,
    rollNo:               row[2]?.toString().trim() || '',
    enrolmentNo:          row[3]?.toString().trim() || '',
    courseNameHindi:      row[4]  || '',
    courseNameEnglish:    row[5]  || '',
    courseYearHindi:      row[6]  || '',
    courseYearEnglish:    row[7]  || '',
    candidateNameHindi:   row[8]  || '',
    fatherNameHindi:      row[9]  || '',
    candidateNameEnglish: row[10] || '',
    fatherNameEnglish:    row[11] || '',
    durationHindi:        row[12] || '',
    durationEnglish:      row[13] || '',
    modeHindi:            row[14] || '',
    modeEnglish:          row[15] || '',
    iaSubCode:            row[16] || '',
    meSubCode:            row[17] || '',
    iaMaxMarks,
    meMaxMarks,
    maxMarks:             maxMarks || 0,
    iaMarks,
    meMarks,
    marksTotal,
    resultRemarkHindi:    computedRemark.hindi,
    resultRemarkEnglish:  computedRemark.english,
    dateOfResultHindi:    row[26] || '',
    dateOfResultEnglish:  row[27] || '',
    subjectCode:          row[28]?.toString() || '',
    academicYear:         row[29] || '',
    courseName:           row[30] || '',
    examFlag:             row[31] || '',
    part:                 row[32] || '',
    semester:             row[33] || '',
    email:                `${row[2]}@student.com`
  };
};

module.exports = { processCSV, processExcel };
