const mongoose = require('mongoose');
require('dotenv').config();
const Result = require('./models/Result');

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const batches = await Result.aggregate([
    { $group: { _id: { batchId: '$batchId', status: '$status' }, count: { $sum: 1 } } }
  ]);
  console.log(batches);
  mongoose.disconnect();
});
