const mongoose = require('mongoose');
const Result = require('./models/Result');
const User = require('./models/User');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  console.log('Updating User collection...');
  // Note: Your User model might not have rollNo directly if it's tied to email, 
  // but we'll try updating by email associated with that rollNo just in case.
  const resultRef = await Result.findOne({ rollNo: '25260165' });
  if (resultRef && resultRef.student) {
    const userUpdate = await User.updateOne(
      { _id: resultRef.student },
      { $set: { dateOfBirth: '2000-09-29' } }
    );
    console.log('User update result:', userUpdate);
  } else {
    console.log('User update skipped: No matching Result found to link student ID.');
  }

  console.log('Updating Result collection...');
  const resultUpdate = await Result.updateMany(
    { rollNo: '25260165' },
    { $set: { dateOfBirth: '2000-09-29' } }
  );
  console.log('Result update result:', resultUpdate);

  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});