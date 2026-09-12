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
            from: `Varāhamihira Multidisciplinary Institute <${process.env.MAIL_FROM}>`,
            to: email,
            subject: title,
            html: body
        });

        console.log("Email sent successfully:", info.messageId);
        return info;
    } catch (err) {
        console.error("Error sending email:", err.message);
        console.error("--- DEBUG INFO (If this does not say zeptomail, you MUST restart the server!) ---");
        console.error("Host:", process.env.MAIL_HOST);
        console.error("User:", process.env.MAIL_USER);
        console.error("From:", process.env.MAIL_FROM);
        console.error("-------------------------------------------------------------------------------");
        return { success: false, error: err.message };
    }
};

module.exports = mailSender;
