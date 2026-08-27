/**
 * FIELD_MAPPING.js
 *
 * AUTHORITATIVE, VERIFIED field map for DIPLOMA_CERTIFICTAE.docx.
 */

const FIELD_MAP = {
  rollNo:        { placeholder: 'F3',  csvColumn: 'ExamRollNo' },
  candidateName: { placeholder: 'F4',  csvColumn: 'CandidateName' },
  fatherName:    { placeholder: 'F5',  csvColumn: 'FatherName' },
  courseName:    { placeholder: 'F43', csvColumn: 'CourseName', location: 'table1_row1_cell2' },
  semester:      { placeholder: 'F48', csvColumn: 'Semester' },
  examSession:   { placeholder: 'F47', csvColumn: 'Session' },
  dateOfResult:  { placeholder: 'F46', csvColumn: 'Date' },
  totalMax:       { placeholder: 'F42', csvColumn: 'TotalMaxMarks' },
  totalObtained:  { placeholder: 'F49', csvColumn: 'TotalObtainedMarks', location: 'table3_row1_cell1' },
  division:       { placeholder: 'F44', csvColumn: 'Division' },
};

const PAPER_FIELD_OFFSETS = ['Code', 'Name', 'IA', 'TH', 'PRPW', 'Result'];

function paperPlaceholders(paperIndex) {
  const base = 6 + (paperIndex - 1) * 6;
  const map = {};
  PAPER_FIELD_OFFSETS.forEach((field, i) => {
    map[field] = `F${base + i}`;
  });
  return map;
}

const PAPER_MAP = {
  1: paperPlaceholders(1),
  2: paperPlaceholders(2),
  3: paperPlaceholders(3),
  4: paperPlaceholders(4),
  5: paperPlaceholders(5),
  6: paperPlaceholders(6),
};

const DOCX_STRUCTURE = {
  table1_studentInfo: {
    tableIndex: 1,
    rows: {
      0: { label: 'Exam Roll Number', cellIndex: 2, placeholder: 'F3' },
      1: { label: 'Course Name',      cellIndex: 2, placeholder: 'F43' },
      2: { label: 'Semester',         cellIndex: 2, placeholder: 'F48' },
      3: { label: "Name of Candidate",cellIndex: 2, placeholder: 'F4' },
      4: { label: "Father's Name",    cellIndex: 2, placeholder: 'F5' },
    },
  },
  table2_marksGrid: {
    tableIndex: 2,
    headerRow: 0,
    paperRowStart: 1,
    cellOrder: ['srNo', 'code', 'name', 'sem', 'ia', 'th', 'prpw', 'result'],
  },
  table3_summary: {
    tableIndex: 3,
    headerRow: 0,
    dataRow: 1,
    cellOrder: ['division', 'totalObtained', 'totalMax'],
    placeholders: { division: 'F44', totalObtained: 'F49', totalMax: 'F42' },
  },
};

module.exports = {
  FIELD_MAP,
  PAPER_MAP,
  DOCX_STRUCTURE,
  paperPlaceholders,
};
