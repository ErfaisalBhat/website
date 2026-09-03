const express = require('express');
const router = express.Router();
const Result = require('../models/Result');

// POST /api/zoho/webhook
router.post('/webhook', async (req, res) => {
  try {
    const payload = req.body;
    console.log("💳 Zoho Webhook Received:", JSON.stringify(payload, null, 2));

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
      }).sort({ paymentInitiatedAt: -1 }); // Most recently initiated first

      if (result) {
        result.paymentStatus = 'paid';
        result.lastPaidAt = new Date();
        result.paymentInitiated = false; // Reset flag
        await result.save();
        console.log(`✅ Certificate unlocked for Result ID: ${result._id} | Roll No: ${result.rollNo}`);
      } else {
        console.warn("⚠️ Payment succeeded but no matching pending payment found!");
        console.warn("📧 Customer Email:", payment.receipt_email);
        console.warn("📞 Customer Phone:", payment.phone);
        console.warn("💳 Payment ID:", payment.payment_id);
      }
    }

    // Always return 200 OK to Zoho
    res.status(200).send("Webhook processed successfully");
  } catch (error) {
    console.error("❌ Webhook Error:", error);
    res.status(500).send("Server Error");
  }
});

module.exports = router;

