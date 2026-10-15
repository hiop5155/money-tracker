import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import BudgetApp from './pages/BudgetApp';
import AuthPage from './pages/AuthPage';
import VerifyEmail from './pages/VerifyEmail';
import ForgotPassword from './pages/ForgotPassword';
const enableDevPreview = import.meta.env.VITE_ENABLE_DEV_PREVIEW === 'true';
const DevPreview = enableDevPreview ? React.lazy(() => import('./pages/DevPreview')) : null;
import { getSharedAuth, setSharedAuth, clearSharedAuth } from './utils/cookieAuth';

// Protected Route
const ProtectedRoute = ({ token, children }) => {
    if (!token) return <Navigate to="/login" replace />;
    return children;
};

function App() {
    // Initialize Token (僅在本地開發環境支援 URL 測試參數注入，並立即清理網址列)
    const [token, setToken] = useState(() => {
        if (import.meta.env.DEV && typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            const devToken = params.get('token');
            if (devToken) {
                localStorage.setItem('token', devToken);
                params.delete('token');
                const cleanSearch = params.toString() ? `?${params.toString()}` : '';
                window.history.replaceState({}, document.title, window.location.pathname + cleanSearch);
                return devToken;
            }
        }
        const shared = getSharedAuth();
        return shared.token || localStorage.getItem('token');
    });
    const [username, setUsername] = useState(() => {
        if (import.meta.env.DEV && typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            const devUser = params.get('username') || params.get('email');
            if (devUser) {
                localStorage.setItem('username', devUser);
                params.delete('username');
                params.delete('email');
                const cleanSearch = params.toString() ? `?${params.toString()}` : '';
                window.history.replaceState({}, document.title, window.location.pathname + cleanSearch);
                return devUser;
            }
        }
        const shared = getSharedAuth();
        if (shared.user) return shared.user.name || shared.user.email;
        return localStorage.getItem('username');
    });
    const [avatar, setAvatar] = useState(() => {
        const shared = getSharedAuth();
        if (shared.user?.avatar) return shared.user.avatar;
        return localStorage.getItem('avatar') || '';
    });

    // Initialize Dark Mode
    const [isDarkMode, setIsDarkMode] = useState(() => {
        return localStorage.getItem('theme') === 'dark';
    });

    // Apply dark mode class to html and body
    useEffect(() => {
        if (isDarkMode) {
            document.documentElement.classList.add('dark', 'dark-mode');
            document.body.classList.add('dark', 'dark-mode');
            localStorage.setItem('theme', 'dark');
        } else {
            document.documentElement.classList.remove('dark', 'dark-mode');
            document.body.classList.remove('dark', 'dark-mode');
            localStorage.setItem('theme', 'light');
        }
    }, [isDarkMode]);

    // Toggle mode function (passed to child components)
    const toggleTheme = () => setIsDarkMode(!isDarkMode);

    // Synchronize SSO cookie when logged in
    useEffect(() => {
        if (token && username) {
            setSharedAuth(token, { name: username, email: username, avatar });
        }
    }, [token, username, avatar]);

    const handleLogin = (newToken, newUsername, newAvatar) => {
        localStorage.setItem('token', newToken);
        localStorage.setItem('username', newUsername);
        if (newAvatar) localStorage.setItem('avatar', newAvatar);
        setSharedAuth(newToken, { name: newUsername, email: newUsername, avatar: newAvatar });
        setToken(newToken);
        setUsername(newUsername);
        if (newAvatar) setAvatar(newAvatar);
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('username');
        clearSharedAuth();
        setToken(null);
        setUsername(null);
    };

    return (
        <BrowserRouter>
            <Routes>
                {/* Pass toggleTheme to AuthPage */}
                <Route
                    path="/login"
                    element={token ? <Navigate to="/" /> : <AuthPage onLogin={handleLogin} isDarkMode={isDarkMode} toggleTheme={toggleTheme} />}
                />

                {/* Deprecated auth routes redirect to login */}
                <Route path="/verify" element={<Navigate to="/login" replace />} />
                <Route path="/forgot-password" element={<Navigate to="/login" replace />} />
                {enableDevPreview && DevPreview && (
                    <Route
                        path="/dev-preview"
                        element={
                            <React.Suspense fallback={<div className="p-4 text-center text-sm">載入預覽中...</div>}>
                                <DevPreview isDarkMode={isDarkMode} toggleTheme={toggleTheme} />
                            </React.Suspense>
                        }
                    />
                )}

                <Route
                    path="/"
                    element={
                        <ProtectedRoute token={token}>
                            {/* If BudgetApp also has a toggle button, pass toggleTheme */}
                            <BudgetApp
                                token={token}
                                username={username}
                                avatar={avatar}
                                onLogout={handleLogout}
                                isDarkMode={isDarkMode} // Let BudgetApp know the state
                                toggleTheme={toggleTheme} // Let BudgetApp toggle as well
                            />
                        </ProtectedRoute>
                    }
                />
                <Route path="*" element={<Navigate to="/login" />} />
            </Routes>
        </BrowserRouter>
    );
}

export default App;
