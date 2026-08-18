const mongoose = require('mongoose');
require('dotenv').config();
const User = require('./models/User');
const Result = require('./models/Result');

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  console.log('Connected to DB');
  
  const allStudents = await User.find({ role: 'student' });
  console.log(`Total students in DB: ${allStudents.length}`);
  
  let orphaned = 0;
  for (const s of allStudents) {
    const resCount = await Result.countDocuments({ student: s._id });
    if (resCount === 0) {
      orphaned++;
      // console.log(`Orphaned student: ${s.email}`);
    }
  }
  
  console.log(`Orphaned students (0 results): ${orphaned}`);
  
  const activeIds = await Result.distinct('student', { status: { $ne: 'disapproved' } });
  console.log(`Students with active results: ${activeIds.length}`);
  
  mongoose.disconnect();
});
