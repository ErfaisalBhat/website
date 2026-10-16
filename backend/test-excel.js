const xlsx = require('xlsx');
const { processExcel } = require('./utils/fileParser');

// Create dummy workbook with 35 columns matching new template structure
const wb = xlsx.utils.book_new();
const wsData = [
  // Row 0: FIELD1 .. FIELD35
  [
    'FIELD1', 'FIELD2', 'FIELD3', 'FIELD4', 'FIELD5', 'FIELD6', 'FIELD7', 'FIELD8',
    'FIELD9', 'FIELD10', 'FIELD11', 'FIELD12', 'FIELD13', 'FIELD14', 'FIELD15', 'FIELD16',
    'FIELD17', 'FIELD18', 'FIELD19', 'FIELD20', 'FIELD21', 'FIELD22', 'FIELD23', 'FIELD24',
    'FIELD25', 'FIELD26', 'FIELD27', 'FIELD28', 'FIELD29', 'FIELD30', 'FIELD31', 'FIELD32',
    'FIELD33', 'FIELD34', 'FIELD35'
  ],
  // Row 1: Human-readable labels
  [
    'S. No.', 'Date of Birth', 'Roll No.', 'Enrolment Number', 'Paper Name (Hindi)', 'Paper Name (English)',
    'Course Year (Hindi)', 'Course Year (English)', "Candidate's Name (Hindi)", "Father's Name (Hindi)",
    "Candidate's Name (English)", "Father's Name (English)", 'Duration (Hindi)', 'Duration (English)',
    'Mode (Hindi)', 'Mode (English)', 'IA Sub Code', 'ME Sub Code', 'IA Max Mark', 'ME Max Mark',
    'Maximum Marks', 'Obtained IA Marks', 'Obtained ME Marks', 'Obtained Marks Total',
    'Result Remark (Hindi)', 'Result Remark (English)', 'Date of Result (Hindi)', 'Date of Result (English)',
    'Subject Code', 'Academic Year', 'Course Name (Hindi)', 'Course Name (English)',
    'Exam Flag', 'Part', 'Semester'
  ],
  // Row 2: Data row
  [
    1, '2000-01-01', 'R001', 'E001', 'पेपर हिंदी', 'Paper English',
    'प्रथम वर्ष', 'First Year', 'अभ्यर्थी', 'पिता',
    'John Doe', 'Father Doe', 'एक वर्ष', 'One Year',
    'नियमित', 'Regular', 'IA01', 'ME01', 20, 80,
    100, 15, 65, 80,
    'उत्तीर्ण', 'Passed', '15 मई 2025', '15 May 2025',
    'SUB01', '2024-25', 'कोर्स हिंदी प्रमाणपत्र', 'Course English',
    'Regular', 'I', '1'
  ]
];

const ws = xlsx.utils.aoa_to_sheet(wsData);
xlsx.utils.book_append_sheet(wb, ws, "Sheet1");
const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });

const results = processExcel(buffer);
console.log("Parsed valid results count:", results.length);
if (results.length > 0) {
  const r = results[0];
  console.log("Record 0 checks:");
  console.log("  rollNo:", r.rollNo);
  console.log("  enrolmentNo:", r.enrolmentNo);
  console.log("  paperNameHindi:", r.paperNameHindi);
  console.log("  paperNameEnglish:", r.paperNameEnglish);
  console.log("  courseNameHindi:", r.courseNameHindi);
  console.log("  courseNameEnglish:", r.courseNameEnglish);
  console.log("  academicYear:", r.academicYear);
  console.log("  maxMarks:", r.maxMarks);
  console.log("  marksTotal:", r.marksTotal);
  console.log("  resultRemarkEnglish:", r.resultRemarkEnglish);
  console.log("  semester:", r.semester);
}

if (results.length === 1 && results[0].paperNameEnglish === 'Paper English' && results[0].courseNameHindi === 'कोर्स हिंदी प्रमाणपत्र') {
  console.log("✅ All tests passed!");
} else {
  console.error("❌ Test failed!");
  process.exit(1);
}
