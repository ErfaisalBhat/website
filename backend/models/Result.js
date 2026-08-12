const mongoose = require('mongoose');

const resultSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  subject: {
    type: String,
    required: true
  },
  maxMarks: {
    type: Number,
    required: true
  },
  iaMarks: {
    type: Number,
    default: 0
  },
  meMarks: {
    type: Number,
    default: 0
  },
  marksTotal: {
    type: Number,
    default: 0
  },
  iaMaxMarks: {
    type: Number,
    default: 0
  },
  meMaxMarks: {
    type: Number,
    default: 0
  },
  iaSubCode: {
    type: String,
    default: ''
  },
  meSubCode: {
    type: String,
    default: ''
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['draft', 'pending', 'approved', 'disapproved'],
    default: 'draft'
  },
  batchId: {
    type: String,
    required: true
  },
  batchName: {
    type: String,
    required: true
  },
  rollNo: {
    type: String,
    required: true
  },
  enrolmentNo: {
    type: String,
    required: true
  },
  modeEnglish: {
    type: String,
    default: ''
  },
  modeHindi: {
    type: String,
    default: ''
  },
  resultRemarkEnglish: {
    type: String,
    default: ''
  },
  resultRemarkHindi: {
    type: String,
    default: ''
  },
  dateOfResultEnglish: {
    type: String,
    default: ''
  },
  dateOfResultHindi: {
    type: String,
    default: ''
  },
  dateOfBirth: {
    type: String,
    default: ''
  },
  courseNameHindi: {
    type: String,
    default: ''
  },
  courseNameEnglish: {
    type: String,
    default: ''
  },
  courseYearHindi: {
    type: String,
    default: ''
  },
  courseYearEnglish: {
    type: String,
    default: ''
  },
  fatherNameHindi: {
    type: String,
    default: ''
  },
  fatherNameEnglish: {
    type: String,
    default: ''
  },
  candidateNameHindi: {
    type: String,
    default: ''
  },
  candidateNameEnglish: {
    type: String,
    default: ''
  },
  durationHindi: {
    type: String,
    default: ''
  },
  durationEnglish: {
    type: String,
    default: ''
  },
  academicYear: {
    type: String,
    default: ''
  },
  subjectCode: {
    type: String,
    default: ''
  },
  courseName: {
    type: String,
    default: ''
  },
  examFlag: {
    type: String,
    default: ''
  },
  part: {
    type: String,
    default: ''
  },
  semester: {
    type: String,
    default: ''
  },
  certificateURL: {
    type: String,
    default: () => `https://example.com/certificate/${Math.random().toString(36).substr(2, 10)}`
  },
  sNo: {
    type: Number,
    default: 0
  },
  certificateNo: {
    type: String,
    unique: true,
    sparse: true
  },
  issuedAt: {
    type: Date
  },
  submittedAt: {
    type: Date
  },
  approvedAt: {
    type: Date
  },
  teacherArchived: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

const Result = mongoose.model('Result', resultSchema);
module.exports = Result;