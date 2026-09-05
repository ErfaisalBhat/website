/**
 * One-time migration: reads existing signature PNG files from disk
 * and saves them as base64 imageData in MongoDB.
 * Run once on your LOCAL machine (which has the files):
 *   node backend/migrateSignatures.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const CertificateSignature = require('./models/CertificateSignature');

async function migrate() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ Connected to MongoDB');

  const sigs = await CertificateSignature.find({});
  console.log(`Found ${sigs.length} signature records`);

  let updated = 0;
  let skipped = 0;

  for (const sig of sigs) {
    if (sig.imageData) {
      console.log(`⏭  Skipping ${sig.role} (already has imageData)`);
      skipped++;
      continue;
    }

    // sig.filePath = "uploads/cert-sig-xxx.png" — relative to backend/
    const resolvedPath = path.join(__dirname, sig.filePath);

    if (!fs.existsSync(resolvedPath)) {
      console.log(`❌ File not found for ${sig.role}: ${resolvedPath}`);
      skipped++;
      continue;
    }

    const buffer = fs.readFileSync(resolvedPath);
    const ext = path.extname(resolvedPath).slice(1) || 'png';
    sig.imageData = `data:image/${ext};base64,${buffer.toString('base64')}`;
    await sig.save();
    console.log(`✅ Updated ${sig.role} — ${sig.filePath}`);
    updated++;
  }

  console.log(`\nDone! Updated: ${updated}, Skipped: ${skipped}`);
  await mongoose.disconnect();
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
