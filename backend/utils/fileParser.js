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

const formatResultDateEnglish = (dateVal) => {
  if (!dateVal) return '';

  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  // Handle Excel Serial Dates (number or 5-digit string like 46178)
  const isSerial = typeof dateVal === 'number' || (typeof dateVal === 'string' && /^\d{5}$/.test(dateVal.trim()));
  if (isSerial) {
    const num = typeof dateVal === 'number' ? dateVal : parseInt(dateVal.trim(), 10);
    const date = new Date(Math.round((num - 25569) * 864e5));
    if (!isNaN(date.getTime())) {
      const day = String(date.getUTCDate()).padStart(2, '0');
      const monthName = months[date.getUTCMonth()];
      const year = date.getUTCFullYear();
      return `${day} ${monthName} ${year}`;
    }
  }

  if (dateVal instanceof Date) {
    const day = String(dateVal.getUTCDate()).padStart(2, '0');
    const monthName = months[dateVal.getUTCMonth()];
    const year = dateVal.getUTCFullYear();
    return `${day} ${monthName} ${year}`;
  }

  const str = dateVal.toString().trim();

  // If already formatted like "15 May 2025" or "05 June 2026"
  if (/^\d{1,2}\s+[A-Za-z]+\s+\d{4}$/.test(str)) {
    return str;
  }

  // Handle DD-MM-YYYY or DD/MM/YYYY
  const dmyMatch = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (dmyMatch) {
    const [_, d, m, y] = dmyMatch;
    const mIdx = parseInt(m, 10) - 1;
    if (mIdx >= 0 && mIdx < 12) {
      return `${d.padStart(2, '0')} ${months[mIdx]} ${y}`;
    }
  }

  // Handle YYYY-MM-DD
  const ymdMatch = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (ymdMatch) {
    const [_, y, m, d] = ymdMatch;
    const mIdx = parseInt(m, 10) - 1;
    if (mIdx >= 0 && mIdx < 12) {
      return `${d.padStart(2, '0')} ${months[mIdx]} ${y}`;
    }
  }

  return str;
};



const FIELD_DEFINITIONS = [
  { field: 'FIELD1',  defaultIndex: 0,  prop: 'sNo',                 labels: ['s. no.', 's. no', 's.no.', 's.no', 's no', 'sno', 'serial no', 'sr. no.', 'sr no'] },
  { field: 'FIELD2',  defaultIndex: 1,  prop: 'dateOfBirth',         labels: ['date of birth', 'dob', 'birth date'] },
  { field: 'FIELD3',  defaultIndex: 2,  prop: 'rollNo',              labels: ['roll no.', 'roll no', 'rollno', 'exam roll no', 'exam roll number'] },
  { field: 'FIELD4',  defaultIndex: 3,  prop: 'enrolmentNo',         labels: ['enrolment number', 'enrolment no.', 'enrolment no', 'enrolmentno', 'enrollment number', 'enrollment no'] },
  { field: 'FIELD5',  defaultIndex: 4,  prop: 'paperNameHindi',      labels: ['paper name (hindi)', 'paper name hindi'] },
  { field: 'FIELD6',  defaultIndex: 5,  prop: 'paperNameEnglish',    labels: ['paper name (english)', 'paper name english'] },
  { field: 'FIELD7',  defaultIndex: 6,  prop: 'courseYearHindi',     labels: ['course year (hindi)', 'course year hindi'] },
  { field: 'FIELD8',  defaultIndex: 7,  prop: 'courseYearEnglish',   labels: ['course year (english)', 'course year english'] },
  { field: 'FIELD9',  defaultIndex: 8,  prop: 'candidateNameHindi',  labels: ["candidate's name (hindi)", 'candidate name (hindi)', 'candidate name hindi', "candidate's name hindi"] },
  { field: 'FIELD10', defaultIndex: 9,  prop: 'fatherNameHindi',     labels: ["father's name (hindi)", 'father name (hindi)', 'father name hindi', "father's name hindi"] },
  { field: 'FIELD11', defaultIndex: 10, prop: 'candidateNameEnglish', labels: ["candidate's name (english)", 'candidate name (english)', 'candidate name english', "candidate's name english", 'candidate name', 'student name'] },
  { field: 'FIELD12', defaultIndex: 11, prop: 'fatherNameEnglish',   labels: ["father's name (english)", 'father name (english)', 'father name english', "father's name english", 'father name'] },
  { field: 'FIELD13', defaultIndex: 12, prop: 'durationHindi',       labels: ['duration (hindi)', 'duration hindi'] },
  { field: 'FIELD14', defaultIndex: 13, prop: 'durationEnglish',     labels: ['duration (english)', 'duration english', 'duration'] },
  { field: 'FIELD15', defaultIndex: 14, prop: 'modeHindi',           labels: ['mode (hindi)', 'mode hindi'] },
  { field: 'FIELD16', defaultIndex: 15, prop: 'modeEnglish',         labels: ['mode (english)', 'mode english', 'mode'] },
  { field: 'FIELD17', defaultIndex: 16, prop: 'iaSubCode',           labels: ['ia sub code', 'ia subcode', 'ia subject code'] },
  { field: 'FIELD18', defaultIndex: 17, prop: 'meSubCode',           labels: ['me sub code', 'me subcode', 'me subject code'] },
  { field: 'FIELD19', defaultIndex: 18, prop: 'iaMaxMarks',          labels: ['ia max mark', 'ia max marks', 'ia maximum marks'] },
  { field: 'FIELD20', defaultIndex: 19, prop: 'meMaxMarks',          labels: ['me max mark', 'me max marks', 'me maximum marks'] },
  { field: 'FIELD21', defaultIndex: 20, prop: 'maxMarks',            labels: ['maximum marks', 'max marks', 'total max marks', 'total marks'] },
  { field: 'FIELD22', defaultIndex: 21, prop: 'iaMarks',             labels: ['obtained ia marks', 'ia marks', 'ia obtained'] },
  { field: 'FIELD23', defaultIndex: 22, prop: 'meMarks',             labels: ['obtained me marks', 'me marks', 'me obtained'] },
  { field: 'FIELD24', defaultIndex: 23, prop: 'marksTotal',          labels: ['obtained marks total', 'marks total', 'total obtained', 'total obtained marks'] },
  { field: 'FIELD25', defaultIndex: 24, prop: 'resultRemarkHindi',   labels: ['result remark (hindi)', 'result remark hindi'] },
  { field: 'FIELD26', defaultIndex: 25, prop: 'resultRemarkEnglish', labels: ['result remark (english)', 'result remark english', 'result remark', 'remark'] },
  { field: 'FIELD27', defaultIndex: 26, prop: 'dateOfResultHindi',   labels: ['date of result (hindi)', 'date of result hindi'] },
  { field: 'FIELD28', defaultIndex: 27, prop: 'dateOfResultEnglish', labels: ['date of result (english)', 'date of result english', 'date of result'] },
  { field: 'FIELD29', defaultIndex: 28, prop: 'subjectCode',         labels: ['subject code', 'sub code'] },
  { field: 'FIELD30', defaultIndex: 29, prop: 'academicYear',        labels: ['academic year', 'acad year', 'session'] },
  { field: 'FIELD31', defaultIndex: 30, prop: 'courseNameHindi',     labels: ['course name (hindi)', 'course name hindi'] },
  { field: 'FIELD32', defaultIndex: 31, prop: 'courseNameEnglish',   labels: ['course name (english)', 'course name english', 'course name'] },
  { field: 'FIELD33', defaultIndex: 32, prop: 'examFlag',            labels: ['exam flag'] },
  { field: 'FIELD34', defaultIndex: 33, prop: 'part',                labels: ['part'] },
  { field: 'FIELD35', defaultIndex: 34, prop: 'semester',            labels: ['semester', 'sem'] }
];

const buildColumnIndexMap = (headerRows = []) => {
  const map = {};
  FIELD_DEFINITIONS.forEach(def => {
    map[def.field] = def.defaultIndex;
    map[def.prop]  = def.defaultIndex;
  });

  const normalize = (str) => (str ? String(str).trim().toLowerCase() : '');
  const maxCols = Math.max(0, ...headerRows.map(r => (Array.isArray(r) ? r.length : 0)));

  for (let c = 0; c < maxCols; c++) {
    for (const hRow of headerRows) {
      if (!Array.isArray(hRow) || hRow[c] === undefined || hRow[c] === null) continue;
      const cell = normalize(hRow[c]);
      if (!cell) continue;

      const matchedByField = FIELD_DEFINITIONS.find(def => def.field.toLowerCase() === cell);
      if (matchedByField) {
        map[matchedByField.field] = c;
        map[matchedByField.prop]  = c;
        break;
      }

      const matchedByLabel = FIELD_DEFINITIONS.find(def => def.labels.includes(cell));
      if (matchedByLabel) {
        map[matchedByLabel.field] = c;
        map[matchedByLabel.prop]  = c;
        break;
      }
    }
  }

  return map;
};

const mapRowToResult = (row, colMap = {}) => {
  const get = (key) => {
    const idx = colMap[key];
    if (idx !== undefined && row[idx] !== undefined && row[idx] !== null) {
      return row[idx];
    }
    return '';
  };

  const dateOfBirth = tryParseDate(get('FIELD2'));
  let maxMarks = parseFloat(get('FIELD21'));
  if (isNaN(maxMarks) || maxMarks <= 0) maxMarks = parseFloat(get('FIELD20'));
  if (isNaN(maxMarks) || maxMarks <= 0) maxMarks = parseFloat(get('FIELD19'));

  const iaMaxMarks = parseFloat(get('FIELD19')) || 0;
  const meMaxMarks = parseFloat(get('FIELD20')) || 0;

  const rawIa = get('FIELD22');
  const rawMe = get('FIELD23');
  const iaMarks = rawIa && rawIa.toString().trim().toUpperCase() === 'AB' ? 'AB' : (isNaN(parseFloat(rawIa)) ? '0' : parseFloat(rawIa).toString());
  const meMarks = rawMe && rawMe.toString().trim().toUpperCase() === 'AB' ? 'AB' : (isNaN(parseFloat(rawMe)) ? '0' : parseFloat(rawMe).toString());

  const iaNum = iaMarks === 'AB' ? 0 : parseFloat(iaMarks);
  const meNum = meMarks === 'AB' ? 0 : parseFloat(meMarks);
  const marksTotal = iaNum + meNum;

  const computedRemark = computeRemark(iaMarks, iaMaxMarks, meMarks, meMaxMarks);

  const rawDateHindi   = get('FIELD27');
  const rawDateEnglish = get('FIELD28');
  const dateOfResultHindi   = (/[\u0900-\u097F]/.test(String(rawDateEnglish)) && !/[\u0900-\u097F]/.test(String(rawDateHindi))) ? (rawDateEnglish || '') : (rawDateHindi || '');
  const dateOfResultEnglish = formatResultDateEnglish((/[\u0900-\u097F]/.test(String(rawDateEnglish)) && !/[\u0900-\u097F]/.test(String(rawDateHindi))) ? (rawDateHindi || '') : (rawDateEnglish || ''));

  const rollNo = get('FIELD3')?.toString().trim() || '';
  const enrolmentNo = get('FIELD4')?.toString().trim() || '';
  const candidateNameEnglish = get('FIELD11')?.toString().trim() || '';
  const courseNameHindi = get('FIELD31')?.toString().trim() || '';
  const courseNameEnglish = get('FIELD32')?.toString().trim() || '';

  return {
    sNo:                  parseInt(get('FIELD1'), 10) || 0,
    dateOfBirth,
    rollNo,
    enrolmentNo,
    paperNameHindi:       get('FIELD5')?.toString().trim() || '',
    paperNameEnglish:     get('FIELD6')?.toString().trim() || '',
    courseYearHindi:      get('FIELD7')?.toString().trim() || '',
    courseYearEnglish:    get('FIELD8')?.toString().trim() || '',
    candidateNameHindi:   get('FIELD9')?.toString().trim() || '',
    fatherNameHindi:      get('FIELD10')?.toString().trim() || '',
    candidateNameEnglish,
    fatherNameEnglish:    get('FIELD12')?.toString().trim() || '',
    durationHindi:        get('FIELD13')?.toString().trim() || '',
    durationEnglish:      get('FIELD14')?.toString().trim() || '',
    modeHindi:            get('FIELD15')?.toString().trim() || '',
    modeEnglish:          get('FIELD16')?.toString().trim() || '',
    iaSubCode:            get('FIELD17')?.toString().trim() || '',
    meSubCode:            get('FIELD18')?.toString().trim() || '',
    iaMaxMarks,
    meMaxMarks,
    maxMarks:             maxMarks || 0,
    iaMarks,
    meMarks,
    marksTotal,
    resultRemarkHindi:    computedRemark.hindi,
    resultRemarkEnglish:  computedRemark.english,
    dateOfResultHindi,
    dateOfResultEnglish,
    subjectCode:          get('FIELD29')?.toString().trim() || '',
    academicYear:         get('FIELD30')?.toString().trim() || '',
    courseNameHindi,
    courseNameEnglish,
    courseName:           courseNameEnglish || courseNameHindi || '',
    examFlag:             get('FIELD33')?.toString().trim() || '',
    part:                 get('FIELD34')?.toString().trim() || '',
    semester:             get('FIELD35')?.toString().trim() || '',
    email:                `${rollNo}@student.com`
  };
};

const processCSV = (buffer) => {
  return new Promise((resolve, reject) => {
    csv.parse(buffer, { columns: false, trim: true, relax_column_count: true }, (err, data) => {
      if (err) return reject(err);

      // Row 0 = FIELD1..FIELD35, Row 1 = human-readable labels
      // Data starts from row 3 (index 2)
      const colMap = buildColumnIndexMap([data[0], data[1]]);
      const rollIdx = colMap['FIELD3'] !== undefined ? colMap['FIELD3'] : 2;

      const results = data.slice(2)
        .filter(row => row && row[rollIdx] && row[rollIdx].toString().trim() !== '')
        .map(row => mapRowToResult(row, colMap));

      resolve(results.filter(r => r.rollNo.trim() !== '' && r.enrolmentNo.trim() !== '' && r.candidateNameEnglish.trim() !== ''));
    });
  });
};

const processExcel = (buffer) => {
  // Removed cellDates: true to prevent xlsx from shifting dates backwards via local timezones.
  // We want the raw serial numbers so our custom UTC math can parse them accurately.
  const workbook = xlsx.read(buffer);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });

  // Row 0 = FIELD1..FIELD35, Row 1 = human-readable labels
  // Data starts from row 3 (index 2)
  const colMap = buildColumnIndexMap([data[0], data[1]]);
  const rollIdx = colMap['FIELD3'] !== undefined ? colMap['FIELD3'] : 2;

  const results = data.slice(2)
    .filter(row => row && row[rollIdx] && row[rollIdx].toString().trim() !== '')
    .map(row => mapRowToResult(row, colMap));

  return results.filter(r => r.rollNo.trim() !== '' && r.enrolmentNo.trim() !== '' && r.candidateNameEnglish.trim() !== '');
};

module.exports = {
  processCSV,
  processExcel,
  mapRowToResult,
  buildColumnIndexMap,
  FIELD_DEFINITIONS
};
