import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sun, Moon } from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';
import LoadingOverlay from '../components/LoadingOverlay';
import { API_URL } from '../config';

function AuthPage({ onLogin, isDarkMode, toggleTheme }) {
    const navigate = useNavigate();
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleGoogleSuccess = async (credentialResponse) => {
        setIsLoading(true);
        setError('');
        try {
            const res = await fetch(`${API_URL}/auth/google`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ credential: credentialResponse.credential }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Google 登入失敗');

            onLogin(data.token, data.email || data.name);
            navigate('/');
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleGoogleError = () => {
        setError('Google 授權失敗或已取消');
    };

    return (
        <>
            <LoadingOverlay isVisible={isLoading} />
            <div className="page-center">
                <div className="auth-container" style={{ textAlign: 'center' }}>
                    <button onClick={toggleTheme} className="theme-toggle-btn" title={isDarkMode ? '切換至淺色模式' : '切換至深色模式'}>
                        {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
                    </button>

                    <div className="auth-header">
                        <span className="auth-logo">💰</span>
                        <h1 className="auth-title">Money Tracker</h1>
                        <p className="auth-slogan">
                            簡單紀錄每一筆開銷
                            <br />
                        </p>
                    </div>

                    <div style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.25rem' }}>
                        <div style={{ margin: '1rem 0' }}>
                            <GoogleLogin
                                onSuccess={handleGoogleSuccess}
                                onError={handleGoogleError}
                                theme={isDarkMode ? 'filled_black' : 'outline'}
                                shape="pill"
                                size="large"
                                text="continue_with"
                                locale="zh-TW"
                            />
                        </div>

                        {error && (
                            <div className="error-msg" style={{ width: '100%' }}>
                                {error}
                            </div>
                        )}

                    </div>
                </div>
            </div>
        </>
    );
}

export default AuthPage;
