const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');
const { isUserPro, syncUserProStatus } = require('../utils/planHelper');

// 1. 查詢用戶當前方案狀態 (/api/payment/status)
router.get('/status', auth, async (req, res) => {
    try {
        const userId = req.user.id;
        const userEmail = req.user.email;
        let user = await User.findById(userId).catch(() => null);
        if (!user && userEmail) {
            user = await User.findOne({ email: userEmail.toLowerCase().trim() });
        }
        if (!user) return res.status(404).json({ error: '找不到用戶', code: 'USER_NOT_FOUND' });

        // 確保特權設定之用戶在資料庫中為合法的付費會員
        user = await syncUserProStatus(user);

        // 若非終身會員且有到期日，檢查是否已過期
        if (user.plan_type !== 'pro_lifetime' && user.plan_type !== 'lifetime' && user.plan_expires_at) {
            if (new Date(user.plan_expires_at) <= new Date()) {
                user.plan_type = 'free';
                user.plan_expires_at = null;
                await user.save();
            }
        }

        const isPro = isUserPro(user);
        const planType = isPro ? (user.plan_type || 'free') : 'free';

        res.json({
            isPro,
            planType,
            planExpiresAt: user.plan_expires_at || null,
            isAutoRenewing: Boolean(user.helio_customer_id),
            userId: user._id,
            email: user.email,
            code: 'PAYMENT_STATUS_SUCCESS',
        });
    } catch (err) {
        res.status(500).json({ error: err.message, code: 'INTERNAL_SERVER_ERROR' });
    }
});

// 2. 測試模擬切換方案狀態 (/api/payment/simulate-upgrade & /api/payment/simulate)
const handleSimulate = async (req, res) => {
    try {
        const userId = req.user.id;
        const { planType = 'pro_monthly' } = req.body || {};
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ error: '找不到用戶', code: 'USER_NOT_FOUND' });

        let expiresAt = null;
        let helioId = null;
        if (planType === 'pro_monthly') {
            const nextMonth = new Date();
            nextMonth.setDate(nextMonth.getDate() + 32);
            expiresAt = nextMonth;
            helioId = 'sub_simulated_active';
        } else if (planType === 'pro_yearly') {
            const nextYear = new Date();
            nextYear.setDate(nextYear.getDate() + 370);
            expiresAt = nextYear;
            helioId = 'sub_simulated_active';
        } else if (planType === 'pro_lifetime' || planType === 'free') {
            expiresAt = null;
            helioId = null;
        }

        user.plan_type = planType;
        user.plan_expires_at = expiresAt;
        user.helio_customer_id = helioId;
        await user.save();

        const isPro = planType !== 'free';

        res.json({
            success: true,
            isPro,
            planType,
            planExpiresAt: expiresAt,
            code: planType === 'free' ? 'PLAN_RESET_FREE' : 'PLAN_SIMULATED',
            message: planType === 'free' ? '已重設為免費版' : `已模擬切換為 ${planType} 方案`,
        });
    } catch (err) {
        res.status(500).json({ error: err.message, code: 'INTERNAL_SERVER_ERROR' });
    }
};

router.post('/simulate-upgrade', auth, handleSimulate);
router.post('/simulate', auth, handleSimulate);

// 3. Helio Webhook (/api/payment/helio/webhook)
router.post('/helio/webhook', async (req, res) => {
    try {
        const payload = req.body || {};
        const event = payload.event || payload.type || 'PAYMENT_COMPLETED';
        const transaction = payload.transaction || payload.data || payload;
        const customer = transaction.customer || payload.customer || {};
        const customMeta = transaction.customMeta || payload.customMeta || payload.meta || {};

        const targetUserId = customMeta.userId || customMeta.id;
        const targetEmail = (customer.email || customMeta.email || '').toLowerCase().trim();
        const selectedPlan = customMeta.plan || '';

        let planType = 'pro_monthly';
        let expiresAt = null;

        if (selectedPlan === 'yearly' || event.includes('YEARLY')) {
            planType = 'pro_yearly';
            const nextYear = new Date();
            nextYear.setDate(nextYear.getDate() + 370);
            expiresAt = nextYear;
        } else if (selectedPlan === 'lifetime' || event.includes('LIFETIME')) {
            planType = 'pro_lifetime';
            expiresAt = null;
        } else {
            planType = 'pro_monthly';
            const nextMonth = new Date();
            nextMonth.setDate(nextMonth.getDate() + 32);
            expiresAt = nextMonth;
        }

        let user = null;
        if (targetUserId) {
            user = await User.findById(targetUserId);
        }
        if (!user && targetEmail) {
            user = await User.findOne({ email: targetEmail });
        }

        if (user) {
            user.plan_type = planType;
            user.plan_expires_at = expiresAt;
            if (customer.walletAddress) {
                user.helio_customer_id = customer.walletAddress;
            }
            await user.save();
        }

        res.json({ success: true, message: 'Payment processed', planType });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 3. 取消訂閱 (/api/payment/cancel)
router.post('/cancel', auth, async (req, res) => {
    try {
        const userId = req.user.id;
        const userEmail = req.user.email;
        let user = await User.findById(userId).catch(() => null);
        if (!user && userEmail) {
            user = await User.findOne({ email: userEmail.toLowerCase().trim() });
        }
        if (!user) return res.status(404).json({ error: '找不到用戶', code: 'USER_NOT_FOUND' });

        // 取消自動定期續約
        user.helio_customer_id = null;

        const expiresAt = user.plan_expires_at;
        const isStillValid = expiresAt ? new Date(expiresAt) > new Date() : false;
        const isLifetime = user.plan_type === 'pro_lifetime' || user.plan_type === 'lifetime';
        const isPro = isLifetime || isStillValid;

        if (!isPro) {
            user.plan_type = 'free';
            user.plan_expires_at = null;
        }

        await user.save();

        res.json({
            success: true,
            isPro,
            planType: isPro ? user.plan_type : 'free',
            planExpiresAt: isPro ? user.plan_expires_at : null,
            isAutoRenewing: false,
            code: isStillValid ? 'AUTO_RENEW_CANCELLED' : 'SUBSCRIPTION_CANCELLED',
            message: isStillValid
                ? '已成功終止下期自動扣款，您的專業版權限將持續有效至到期日。'
                : '已成功取消訂閱，金流定期扣款已終止，方案已重設為免費版。',
        });
    } catch (err) {
        res.status(500).json({ error: err.message, code: 'INTERNAL_SERVER_ERROR' });
    }
});

module.exports = router;
