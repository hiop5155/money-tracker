const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const sendEmail = require('../utils/sendEmail');
const validator = require('validator');
const auth = require('../middleware/auth');
const { syncUserProStatus } = require('../utils/planHelper');

router.post('/register', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!validator.isEmail(email)) {
            return res.status(400).json({ error: 'Email 格式不正確 (例如: user@example.com)', code: 'INVALID_EMAIL' });
        }

        if (password.length < 6) {
            return res.status(400).json({ error: '密碼長度至少需 6 個字元', code: 'PASSWORD_TOO_SHORT' });
        }

        let user = await User.findOne({ email });
        if (user) return res.status(400).json({ error: 'Email 已被註冊', code: 'EMAIL_ALREADY_EXISTS' });

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Generate verification code
        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

        // Create User (username no longer stored)
        user = await User.create({
            email,
            password: hashedPassword,
            verificationToken: verificationCode,
            isVerified: false,
            lastVerificationEmailSentAt: Date.now(),
        });

        // Send verification email
        const subject = 'Money Tracker - 帳號驗證碼';
        const text = `歡迎加入！你的驗證碼是：${verificationCode}`;
        await sendEmail(email, subject, text);

        res.json({ success: true, code: 'REGISTER_SUCCESS', message: '註冊成功！請檢查 Email 並輸入驗證碼啟用帳號。' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message, code: 'INTERNAL_SERVER_ERROR' });
    }
});

router.post('/verify', async (req, res) => {
    try {
        const { email, code } = req.body;
        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ error: '使用者不存在', code: 'USER_NOT_FOUND' });
        if (user.isVerified) return res.status(400).json({ error: '此帳號已驗證，請直接登入', code: 'ALREADY_VERIFIED' });
        if (user.verificationToken !== code) {
            return res.status(400).json({ error: '驗證碼錯誤', code: 'INVALID_VERIFICATION_CODE' });
        }

        user.isVerified = true;
        user.verificationToken = undefined;
        await user.save();

        res.json({ success: true, code: 'VERIFY_SUCCESS', message: '驗證成功！您現在可以登入了。' });
    } catch (err) {
        res.status(500).json({ error: err.message, code: 'INTERNAL_SERVER_ERROR' });
    }
});

router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });

        if (!user) return res.status(400).json({ error: 'Email 不存在或密碼錯誤', code: 'INVALID_CREDENTIALS' });
        if (!user.isVerified) return res.status(403).json({ error: '帳號尚未驗證，請先檢查 Email。', code: 'ACCOUNT_NOT_VERIFIED' });
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ error: 'Email 不存在或密碼錯誤', code: 'INVALID_CREDENTIALS' });

        // 登入時若為特權帳號，自動更新資料庫為合法的永久付費會員
        await syncUserProStatus(user);

        // Put email in Token
        const token = jwt.sign({ id: user._id, email: user.email }, process.env.JWT_SECRET);

        // Return email instead of username
        res.json({ token, email: user.email, code: 'LOGIN_SUCCESS' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({ error: '找不到此 Email 的使用者', code: 'USER_NOT_FOUND' });
        }

        // Check cooldown (1 minute)
        if (user.lastResetPasswordEmailSentAt) {
            const timeSinceLastSend = Date.now() - new Date(user.lastResetPasswordEmailSentAt).getTime();
            if (timeSinceLastSend < 60000) {
                const remainingSeconds = Math.ceil((60000 - timeSinceLastSend) / 1000);
                return res.status(429).json({ error: `請等待 ${remainingSeconds} 秒後再試`, code: 'RATE_LIMITED' });
            }
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        // Set OTP and expiration time (current time + 10 minutes)
        user.resetPasswordToken = otp;
        user.resetPasswordExpires = Date.now() + 10 * 60 * 1000;
        user.lastResetPasswordEmailSentAt = Date.now();

        await user.save();

        // Send email
        const subject = 'Money Tracker - 重設密碼';
        const text = `您正在申請重設密碼。您的驗證碼是：${otp}\n此驗證碼將在 10 分鐘後失效。`;

        await sendEmail(email, subject, text);

        res.json({ success: true, code: 'OTP_SENT', message: '重設密碼驗證信已發送，請檢查您的 Email' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message, code: 'INTERNAL_SERVER_ERROR' });
    }
});

router.post('/verify-reset-otp', async (req, res) => {
    try {
        const { email, otp } = req.body;

        // Search user: Email matches + Token matches + Not expired
        const user = await User.findOne({
            email,
            resetPasswordToken: otp,
            resetPasswordExpires: { $gt: Date.now() },
        });

        if (!user) {
            return res.status(400).json({ error: '驗證碼無效或已過期', code: 'INVALID_OTP' });
        }

        // Just return success, no data change needed
        res.json({ success: true, code: 'OTP_VERIFIED', message: '驗證碼正確' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message, code: 'INTERNAL_SERVER_ERROR' });
    }
});

// Resend Verification Code
router.post('/resend-verification', async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });

        if (!user) return res.status(404).json({ error: '找不到此 Email 的使用者', code: 'USER_NOT_FOUND' });
        if (user.isVerified) return res.status(400).json({ error: '此帳號已驗證，請直接登入', code: 'ALREADY_VERIFIED' });

        // Check cooldown (1 minute)
        if (user.lastVerificationEmailSentAt) {
            const timeSinceLastSend = Date.now() - new Date(user.lastVerificationEmailSentAt).getTime();
            if (timeSinceLastSend < 60000) {
                const remainingSeconds = Math.ceil((60000 - timeSinceLastSend) / 1000);
                return res.status(429).json({ error: `請等待 ${remainingSeconds} 秒後再試`, code: 'RATE_LIMITED' });
            }
        }

        // Generate new verification code
        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
        user.verificationToken = verificationCode;
        user.lastVerificationEmailSentAt = Date.now();
        await user.save();

        // Send email
        const subject = 'Money Tracker - 帳號驗證碼';
        const text = `您的新驗證碼是：${verificationCode}`;
        await sendEmail(email, subject, text);

        res.json({ success: true, code: 'OTP_RESENT', message: '驗證碼已重新發送，請檢查您的 Email' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message, code: 'INTERNAL_SERVER_ERROR' });
    }
});

router.post('/reset-password', async (req, res) => {
    try {
        // Frontend note: Even if verified in previous step, OTP is still required here for identity proof
        const { email, otp, newPassword } = req.body;

        const user = await User.findOne({
            email,
            resetPasswordToken: otp,
            resetPasswordExpires: { $gt: Date.now() },
        });

        if (!user) {
            return res.status(400).json({ error: '驗證碼無效或已過期，請重新申請', code: 'INVALID_OTP' });
        }

        // Encrypt password
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);

        // Clear reset password related fields
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;

        // Auto-verify user on successful password reset
        user.isVerified = true;
        user.verificationToken = undefined;

        await user.save();

        res.json({ success: true, code: 'PASSWORD_RESET_SUCCESS', message: '密碼重設成功！請使用新密碼登入。' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message, code: 'INTERNAL_SERVER_ERROR' });
    }
});

// Soft Delete Account
// Using PUT because we are updating the resource status
router.put('/delete', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ error: 'User not found', code: 'USER_NOT_FOUND' });

        // Set isVerified to false as per user request (soft delete)
        user.isVerified = false;
        await user.save();

        res.json({ success: true, code: 'ACCOUNT_DELETED', message: '帳號已成功刪除' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server Error' });
    }
});

module.exports = router;
