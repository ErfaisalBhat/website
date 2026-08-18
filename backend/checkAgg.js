const mongoose = require('mongoose');
require('dotenv').config();
const Result = require('./models/Result');
const User = require('./models/User');

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const teachers = await User.find({ role: 'teacher' });
  if(teachers.length === 0) { console.log('no teachers'); process.exit(); }
  
  const tId = teachers[0]._id;
  console.log('Teacher ID:', tId);
  
  const batches = await Result.aggregate([
    { $match: { uploadedBy: tId } }
  ]);
  
  const batchesStr = await Result.aggregate([
    { $match: { uploadedBy: tId.toString() } }
  ]);
  
  console.log('ObjectId match count:', batches.length);
  console.log('String match count:', batchesStr.length);
  
  mongoose.disconnect();
});
