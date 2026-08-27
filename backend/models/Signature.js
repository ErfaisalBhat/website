const mongoose = require('mongoose');

const SignatureSchema = new mongoose.Schema({
  filePath: {
    type: String,
    required: true
  },
  signatoryLabel: {
    type: String,
    default: 'O.S.D. (Examination)'
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

module.exports = mongoose.model('Signature', SignatureSchema);
