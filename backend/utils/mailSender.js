require('dotenv').config();
const nodemailer = require('nodemailer');

const mailSender = async (email, title, body) => {
    try {
        // If credentials are not set, log and return early instead of throwing
        if (!process.env.MAIL_USER || !process.env.MAIL_PASS) {
            console.log(`[Email Simulation] Would send email to ${email} with title: ${title}`);
            return { success: true, simulated: true };
        }

        let transporter = nodemailer.createTransport({
            host: process.env.MAIL_HOST || 'smtp.gmail.com',
            port: 587, // Use 465 if 587 is blocked
            secure: false, // Use true for port 465 (SSL)
            auth: {
                user: process.env.MAIL_USER,
                pass: process.env.MAIL_PASS
            }
        });

        let info = await transporter.sendMail({
            from: `Asssr <${process.env.MAIL_USER}>`,
            to: email,
            subject: title,
            html: body
        });

        console.log("Email sent successfully:", info.messageId);
        return info;
    } catch (err) {
        console.error("Error sending email:", err.message);
        return { success: false, error: err.message };
    }
};

module.exports = mailSender;
