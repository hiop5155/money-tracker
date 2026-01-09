const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const sendEmail = require('../utils/sendEmail');
const validator = require('validator');

router.post('/register', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!validator.isEmail(email)) {
            return res.status(400).json({ error: 'Email 格式不正確 (例如: user@example.com)' });
        }

        if (password.length < 6) {
            return res.status(400).json({ error: '密碼長度至少需 6 個字元' });
        }

        let user = await User.findOne({ email });
        if (user) return res.status(400).json({ error: 'Email 已被註冊' });

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
        });

        // Send verification email
        const subject = 'Money Tracker - 帳號驗證碼';
        const text = `歡迎加入！你的驗證碼是：${verificationCode}`;
        await sendEmail(email, subject, text);

        res.json({ message: '註冊成功！請檢查 Email 並輸入驗證碼啟用帳號。' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

router.post('/verify', async (req, res) => {
    try {
        const { email, code } = req.body;
        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ error: '使用者不存在' });
        if (user.isVerified) return res.status(400).json({ error: '此帳號已驗證，請直接登入' });
        if (user.verificationToken !== code) {
            return res.status(400).json({ error: '驗證碼錯誤' });
        }

        user.isVerified = true;
        user.verificationToken = undefined;
        await user.save();

        res.json({ message: '驗證成功！您現在可以登入了。' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });

        if (!user) return res.status(400).json({ error: 'Email 不存在或密碼錯誤' });
        if (!user.isVerified) return res.status(403).json({ error: '帳號尚未驗證，請先檢查 Email。' });
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ error: 'Email 不存在或密碼錯誤' });

        // Put email in Token
        const token = jwt.sign({ id: user._id, email: user.email }, process.env.JWT_SECRET);

        // Return email instead of username
        res.json({ token, email: user.email });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({ error: '找不到此 Email 的使用者' });
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        // Set OTP and expiration time (current time + 10 minutes)
        user.resetPasswordToken = otp;
        user.resetPasswordExpires = Date.now() + 10 * 60 * 1000;

        await user.save();

        // Send email
        const subject = 'Money Tracker - 重設密碼';
        const text = `您正在申請重設密碼。您的驗證碼是：${otp}\n此驗證碼將在 10 分鐘後失效。`;

        await sendEmail(email, subject, text);

        res.json({ message: '重設密碼驗證信已發送，請檢查您的 Email' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
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
            return res.status(400).json({ error: '驗證碼無效或已過期' });
        }

        // Just return success, no data change needed
        res.json({ message: '驗證碼正確' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
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
            return res.status(400).json({ error: '驗證碼無效或已過期，請重新申請' });
        }

        // Encrypt password
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);

        // Clear reset password related fields
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;

        await user.save();

        res.json({ message: '密碼重設成功！請使用新密碼登入。' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
