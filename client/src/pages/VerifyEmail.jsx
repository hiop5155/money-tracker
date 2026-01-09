import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { API_URL } from '../config';

const VerifyEmail = () => {
    const navigate = useNavigate();
    const location = useLocation();

    // Get email from state or default to empty
    const [email, setEmail] = useState(location.state?.email || '');
    const [code, setCode] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

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
                navigate('/login');
            } else {
                // Display error
                setError(data.error || '驗證失敗');
            }
        } catch (err) {
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

                {/* Error message display area */}
                {error && <p className="error-msg">{error}</p>}
            </div>
        </div>
    );
};

export default VerifyEmail;
