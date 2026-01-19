import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { API_URL } from '../config';

const VerifyEmail = () => {
    const navigate = useNavigate();
    const location = useLocation();

    // Get email from state or default to empty
    const [email, setEmail] = useState(location.state?.email || '');
    const [code, setCode] = useState('');
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');

    // Countdown state
    const [countdown, setCountdown] = useState(0);

    useEffect(() => {
        let timer;
        if (countdown > 0) {
            timer = setTimeout(() => setCountdown(countdown - 1), 1000);
        }
        return () => clearTimeout(timer);
    }, [countdown]);

    const handleResend = async () => {
        if (countdown > 0) return;
        setError('');
        setMessage('');

        try {
            const res = await fetch(`${API_URL}/auth/resend-verification`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });
            const data = await res.json();

            if (res.ok) {
                setMessage(data.message || '驗證碼已重新發送');
                setCountdown(60); // Start 60s cooldown
            } else {
                setError(data.error || '發送失敗');
            }
        } catch {
            setError('連線錯誤，請稍後再試');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setMessage('');

        try {
            // Call verification API
            const res = await fetch(`${API_URL}/auth/verify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, code }),
            });

            const data = await res.json();

            if (res.ok) {
                // Redirect to login on success
                alert('驗證成功！請登入');
                navigate('/login', { state: { email } });
            } else {
                // Display error
                setError(data.error || '驗證失敗');
            }
        } catch {
            setError('連線錯誤，請稍後再試');
        }
    };

    return (
        // Use same container style as login page
        <div className="page-center">
            <div className="auth-container">
                <h2>帳號驗證</h2>
                <p style={{ marginBottom: '20px', color: '#666', fontSize: '0.9rem' }}>請至信箱收取驗證信，並輸入 6 位數代碼</p>

                {/* Use same form style as login page */}
                <form onSubmit={handleSubmit} className="auth-form">
                    <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                    <input
                        type="text"
                        placeholder="請輸入驗證碼"
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        required
                        maxLength="6" // Limit to 6 characters
                    />

                    <button type="submit">驗證帳號</button>
                </form>

                <div className="mt-4 text-center">
                    <button
                        type="button"
                        onClick={handleResend}
                        disabled={countdown > 0 || !email}
                        className={`text-sm ${countdown > 0 ? 'text-gray-400 cursor-not-allowed' : 'text-blue-500 hover:text-blue-600 underline'}`}
                        style={{ background: 'none', border: 'none', padding: 0 }}
                    >
                        {countdown > 0 ? `重發驗證碼 (${countdown}s)` : '沒收到？重新發送驗證碼'}
                    </button>
                </div>

                {/* Message display area */}
                {message && <p className="success-msg mt-2 text-green-600 text-sm text-center">{message}</p>}
                {error && <p className="error-msg mt-2 text-red-500 text-sm text-center">{error}</p>}
            </div>
        </div>
    );
};

export default VerifyEmail;
