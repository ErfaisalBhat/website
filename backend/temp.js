const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/asssr').then(async () => {
  const Result = mongoose.connection.db.collection('results');
  const batches = await Result.aggregate([{ $group: { _id: { batchId: '$batchId', status: '$status' }, count: { $sum: 1 } } }]).toArray();
  console.log(batches);
  process.exit(0);
});
