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
  programmeName: {
    type: String,
    default: ''
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
  },
  driveFileId: {
    type: String,
    default: ''
  },
  driveUrl: {
    type: String,
    default: ''
  },
  // Reference to the Signature record active at the time of issuance.
  // Used so that if the signature is later changed, old certificates
  // still render with the original signatory's image and label.
  signatureId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Signature',
    default: null
  }
}, {
  timestamps: true
});

const DiplomaCertificate = mongoose.model('DiplomaCertificate', diplomaCertificateSchema);
module.exports = DiplomaCertificate;
