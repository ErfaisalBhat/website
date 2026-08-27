const mongoose = require('mongoose');

const diplomaCertificateSchema = new mongoose.Schema({
  certificateNo: {
    type: String,
    required: true,
    unique: true
  },
  rollNo: {
    type: String,
    required: true
  },
  candidateName: {
    type: String,
    required: true
  },
  fatherName: {
    type: String,
    default: ''
  },
  dateOfBirth: {
    type: String,
    required: true
  },
  courseName: {
    type: String,
    required: true
  },
  semester: {
    type: String,
    required: true
  },
  academicYear: {
    type: String,
    default: ''
  },
  division: {
    type: String,
    default: ''
  },
  marksHash: {
    type: String,
    required: true
  },
  marksData: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  issuedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

const DiplomaCertificate = mongoose.model('DiplomaCertificate', diplomaCertificateSchema);
module.exports = DiplomaCertificate;
