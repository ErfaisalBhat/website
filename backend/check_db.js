const mongoose = require('mongoose');
const Result = require('./models/Result');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const results = await Result.find({}).limit(50).select('rollNo dateOfBirth candidateNameEnglish');
  const valid = results.filter(r => r.dateOfBirth && r.dateOfBirth.length > 2);
  console.log('Sample DB Records with DOB:', valid.slice(0,10));
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});