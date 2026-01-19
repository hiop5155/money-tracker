import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { API_URL } from '../config';

const ForgotPassword = () => {
    const navigate = useNavigate();
    const location = useLocation();

    const [step, setStep] = useState(1);
    const [email, setEmail] = useState(location.state?.email || '');
    const [otp, setOtp] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');

    // Countdown state for resend
    const [countdown, setCountdown] = useState(0);

    useEffect(() => {
        let timer;
        if (countdown > 0) {
            timer = setTimeout(() => setCountdown(countdown - 1), 1000);
        }
        return () => clearTimeout(timer);
    }, [countdown]);

    const callApi = async (endpoint, body) => {
        setLoading(true);
        setError('');
        setMessage('');
        try {
            const res = await fetch(`${API_URL}/auth/${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || '發生錯誤');
            return data;
        } catch (err) {
            setError(err.message);
            return null;
        } finally {
            setLoading(false);
        }
    };

    const handleSendOtp = async (e) => {
        if (e) e.preventDefault();
        const data = await callApi('forgot-password', { email });
        if (data) {
            setMessage('驗證碼已寄出，請檢查您的 Email');
            setStep(2);
            setCountdown(60); // Start cooldown
        }
    };

    const handleResendOtp = async () => {
        if (countdown > 0) return;
        // Reuse handleSendOtp logic but without event default prevention if triggered directly
        const data = await callApi('forgot-password', { email });
        if (data) {
            setMessage('驗證碼已重新寄出');
            setCountdown(60);
        }
    };

    const handleVerifyOtp = async (e) => {
        e.preventDefault();
        const data = await callApi('verify-reset-otp', { email, otp });
        if (data) {
            setStep(3);
            setMessage('');
        }
    };

    const handleResetPassword = async (e) => {
        e.preventDefault();

        if (newPassword !== confirmPassword) {
            setError('兩次密碼輸入不一致，請重新確認');
            return;
        }

        const data = await callApi('reset-password', { email, otp, newPassword });
        if (data) {
            alert('密碼重設成功！請使用新密碼登入。');
            navigate('/login', { state: { email } });
        }
    };

    return (
        <div className="page-center">
            <div className="auth-container">
                <h2>
                    {step === 1 && '忘記密碼'}
                    {step === 2 && '輸入驗證碼'}
                    {step === 3 && '設定新密碼'}
                </h2>

                {/* Step 1: Enter Email */}
                {step === 1 && (
                    <form onSubmit={handleSendOtp} className="auth-form">
                        <p style={{ color: '#666', fontSize: '0.9rem' }}>請輸入註冊時的 Email，我們將寄送重設驗證碼給您。</p>
                        <input type="email" placeholder="請輸入 Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                        <button type="submit" disabled={loading}>
                            {loading ? '發送中...' : '發送驗證碼'}
                        </button>
                    </form>
                )}

                {/* Step 2: Enter OTP */}
                {step === 2 && (
                    <form onSubmit={handleVerifyOtp} className="auth-form">
                        <p style={{ color: '#666', fontSize: '0.9rem' }}>驗證碼已發送至 {email}</p>
                        <input type="text" placeholder="6位數驗證碼" value={otp} onChange={(e) => setOtp(e.target.value)} required />
                        <button type="submit" disabled={loading}>
                            {loading ? '驗證中...' : '驗證'}
                        </button>

                        {/* Resend & Back Buttons */}
                        <div className="flex justify-between mt-4">
                            <button
                                type="button"
                                onClick={() => setStep(1)}
                                style={{
                                    background: 'transparent',
                                    color: '#666',
                                    marginTop: '0',
                                    width: 'auto',
                                    padding: '0 5px',
                                }}
                            >
                                回上一步
                            </button>
                            <button
                                type="button"
                                onClick={handleResendOtp}
                                disabled={countdown > 0}
                                style={{
                                    background: 'transparent',
                                    color: countdown > 0 ? '#999' : '#3B82F6',
                                    marginTop: '0',
                                    width: 'auto',
                                    padding: '0 5px',
                                    cursor: countdown > 0 ? 'not-allowed' : 'pointer',
                                }}
                            >
                                {countdown > 0 ? `重發 (${countdown}s)` : '重新發送'}
                            </button>
                        </div>
                    </form>
                )}

                {/* Step 3: Enter new password (added confirmation field) */}
                {step === 3 && (
                    <form onSubmit={handleResetPassword} className="auth-form">
                        <input
                            type="password"
                            placeholder="請輸入新密碼"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            required
                            minLength="6"
                        />
                        <input
                            type="password"
                            placeholder="再次輸入新密碼"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                            minLength="6"
                        />
                        <button type="submit" disabled={loading}>
                            {loading ? '處理中...' : '確認重設'}
                        </button>
                    </form>
                )}

                {message && <p className="success-msg mt-2 text-green-600 text-sm text-center">{message}</p>}
                {error && <p className="error-msg">{error}</p>}

                {step === 1 && (
                    <div className="auth-links">
                        <a
                            href="#"
                            onClick={(e) => {
                                e.preventDefault();
                                navigate('/login');
                            }}
                        >
                            返回登入
                        </a>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ForgotPassword;
