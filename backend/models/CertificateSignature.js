const mongoose = require('mongoose');

const CertificateSignatureSchema = new mongoose.Schema({
  filePath: {
    type: String,
    default: ''
  },
  imageData: {
    type: String, // base64 data URL e.g. "data:image/png;base64,..."
    default: ''
  },
  signatoryLabel: {
    type: String,
    default: 'Verifying Authority'
  },
  role: {
    type: String,
    enum: ['Verifying Authority', 'Controller of Examination'],
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  uploadedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

module.exports = mongoose.model('CertificateSignature', CertificateSignatureSchema);
