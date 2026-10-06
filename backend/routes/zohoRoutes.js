const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const Result = require('../models/Result');

// POST /api/zoho/webhook
router.post('/webhook', async (req, res) => {
  try {
    // ── DEBUG: Log ALL headers Zoho sends ────────────────────────────────────
    // This helps us see exactly what headers/signature format Zoho uses
    console.log('📩 Webhook Headers:', JSON.stringify(req.headers, null, 2));
    console.log('📦 Webhook Body:', JSON.stringify(req.body, null, 2));

    // ── Signature Verification (LOG ONLY — does not block) ───────────────────
    const secret = process.env.ZOHO_WEBHOOK_SECRET;
    const zohoSignature = req.headers['x-zoho-signature']
                       || req.headers['x-zoho-webhook-token']
                       || req.headers['authorization'];

    if (zohoSignature && secret) {
      const computedBase64 = crypto.createHmac('sha256', secret).update(JSON.stringify(req.body)).digest('base64');
      const computedHex    = crypto.createHmac('sha256', secret).update(JSON.stringify(req.body)).digest('hex');
      console.log('🔑 Zoho sent signature  :', zohoSignature);
      console.log('🔑 Our computed (base64):', computedBase64);
      console.log('🔑 Our computed (hex)   :', computedHex);
      console.log('✅ Signature match (base64)?', zohoSignature === computedBase64);
      console.log('✅ Signature match (hex)?   ', zohoSignature === computedHex);
    } else {
      console.warn('⚠️ No signature header found — Zoho may use a different header name');
    }
    // ─────────────────────────────────────────────────────────────────────────

    const payload = req.body;
    const payment = payload?.event_object?.payment;

    // Zoho sends 'payment.succeeded' with status: 'succeeded'
    if (payload.event_type === 'payment.succeeded' && payment?.status === 'succeeded') {

      // Find the result that was most recently marked as payment initiated
      // within the last 30 minutes (to avoid matching stale records)
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

      const result = await Result.findOne({
        paymentInitiated: true,
        paymentStatus: 'unpaid',
        paymentInitiatedAt: { $gte: thirtyMinutesAgo }
      }).sort({ paymentInitiatedAt: -1 });

      if (result) {
        result.paymentStatus = 'paid';
        result.lastPaidAt = new Date();
        result.transactionId = payment.payment_id || null;
        result.paymentInitiated = false;
        await result.save();
        console.log(`✅ Certificate unlocked for Result ID: ${result._id} | Roll No: ${result.rollNo}`);
      } else {
        console.warn('⚠️ Payment succeeded but no matching pending payment found!');
        console.warn('📧 Email:', payment.receipt_email);
        console.warn('💳 Payment ID:', payment.payment_id);
      }
    }

    // Always return 200 OK to Zoho
    res.status(200).send('Webhook processed successfully');
  } catch (error) {
    console.error('❌ Webhook Error:', error);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
