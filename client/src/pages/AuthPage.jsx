import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Sun, Moon } from 'lucide-react';
import LoadingOverlay from '../components/LoadingOverlay';
import { API_URL } from '../config';

// Receive props: isDarkMode, toggleTheme
function AuthPage({ onLogin, isDarkMode, toggleTheme }) {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');

    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    const toggleMode = () => {
        setIsLogin(!isLogin);
        setError('');
        setConfirmPassword('');
        setPassword('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        if (!isLogin && password !== confirmPassword) {
            setError('兩次密碼輸入不一致，請重新確認');
            return;
        }

        const endpoint = isLogin ? '/auth/login' : '/auth/register';

        try {
            const res = await fetch(`${API_URL}${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });

            const data = await res.json();

            if (!res.ok) throw new Error(data.error || '操作失敗');

            if (isLogin) {
                onLogin(data.token, data.email);
                navigate('/');
            } else {
                alert('註冊成功！請至信箱收取驗證碼。');
                navigate('/verify', { state: { email } });
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            {/* Full screen loading overlay */}
            <LoadingOverlay isVisible={isLoading} />
            <div className="page-center">
                <div className="auth-container">
                    {/* === Dark Mode Toggle Button === */}
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

                    <h2>{isLogin ? '登入' : '註冊'}</h2>
                    <form onSubmit={handleSubmit} className="auth-form">
                        <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                        <input type="password" placeholder="密碼" value={password} onChange={(e) => setPassword(e.target.value)} required />

                        {!isLogin && (
                            <input
                                type="password"
                                placeholder="再次輸入密碼"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                            />
                        )}

                        <button type="submit">{isLogin ? '登入' : '註冊'}</button>
                    </form>

                    {error && <p className="error-msg">{error}</p>}

                    <div className="auth-links">
                        <p>
                            {isLogin ? '還沒帳號？' : '已有帳號？'}
                            <span onClick={toggleMode} className="toggle-link">
                                {isLogin ? '去註冊' : '去登入'}
                            </span>
                        </p>

                        {isLogin && (
                            <p>
                                <Link to="/forgot-password">忘記密碼？</Link>
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}

export default AuthPage;
