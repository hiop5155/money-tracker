const mongoose = require('mongoose');
const validator = require('validator');

const UserSchema = new mongoose.Schema({
    email: {
        type: String,
        required: [true, '請輸入 Email'],
        unique: true,
        lowercase: true,
        validate: [validator.isEmail, '請輸入有效的 Email 格式'],
    },
    password: {
        type: String,
        required: [true, '請輸入密碼'],
        minlength: [6, '密碼長度至少需 6 個字元'],
    },
    isVerified: { type: Boolean, default: false },
    verificationToken: { type: String },
    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date },
    lastVerificationEmailSentAt: { type: Date },
    lastResetPasswordEmailSentAt: { type: Date },
});

module.exports = mongoose.model('User', UserSchema);
