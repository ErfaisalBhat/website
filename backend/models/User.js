const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const mailSender = require('../utils/mailSender')

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: ['admin', 'teacher', 'student'],
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  dateOfBirth: {
    type: String,
    default: ''
  },
  rollNo: {
    type: String,
    default: ''
  },
  profileImageId: {
    type: String,
    default: ''
  },
  profileDriveFileId: {
    type: String,
    default: ''
  },
  resetPasswordToken: String,
  resetPasswordExpires: Date,
}, { timestamps: true });


async function sendUserInformation(email, name, password) {
  try {
    const message = `<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; padding: 20px; background-color: #f4f4f4;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #fff; border-radius: 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); overflow: hidden;">
    <div style="background-color: #4CAF50; color: #fff; padding: 15px; text-align: center; font-size: 20px; font-weight: bold;">
      Your Login Credentials
    </div>
    <div style="padding: 20px;">
      <p style="font-size: 16px; margin: 0;">Dear <strong>${name}</strong>,</p>
      <p style="font-size: 16px; margin: 15px 0 0;">We are delighted to provide you with your login credentials to the Result Management System Portal:</p>
      <div style="padding: 15px; border: 1px solid #ddd; border-radius: 8px; background-color: #f9f9f9; margin: 15px 0; font-size: 16px;">
        <p style="margin: 0;"><strong>Email ID:</strong> ${email}</p>
        <p style="margin: 0;"><strong>Password:</strong> ${password}</p>
      </div>
      <p style="font-size: 16px; color: #555; margin: 0;">
        ⚠️ <strong>Important:</strong> Please ensure you keep this information confidential and do not share it with anyone.
      </p>
      <p style="font-size: 16px; margin: 15px 0 0;">If you have any questions or require assistance, feel free to contact our support team at 
        <a href="mailto:support@example.com" style="color: #4CAF50; text-decoration: none;">admin@vminstitute.in</a>.
      </p>
      <p style="margin-top: 20px; font-size: 16px;">
        <strong>Best regards,</strong><br>
        <span>Admin</span><br>
        <span>V.M.Institute</span><br>
        <span>admin@vminstitute.in</span>
      </p>
    </div>
  </div>
  <div style="text-align: center; font-size: 12px; color: #aaa; margin-top: 15px;">
    This email is intended for ${name}. If you received this email by mistake, please delete it.
  </div>
</div>`;

    const mailResponse = await mailSender(email, "User Information", message);
    console.log("Email sent successfully", mailResponse);
  } catch (err) {
    console.log("Error while sending mail", err);
  }
}

userSchema.pre("save", async function (next) {
  await sendUserInformation(this.email, this.name, this.password);
  next();
});

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// Method to compare password
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model('User', userSchema);
module.exports = User;