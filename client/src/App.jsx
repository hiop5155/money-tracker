import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import BudgetApp from './pages/BudgetApp';
import AuthPage from './pages/AuthPage';
import VerifyEmail from './pages/VerifyEmail';
import ForgotPassword from './pages/ForgotPassword';
import { getSharedAuth, setSharedAuth, clearSharedAuth } from './utils/cookieAuth';

// Protected Route
const ProtectedRoute = ({ token, children }) => {
    if (!token) return <Navigate to="/login" replace />;
    return children;
};

function App() {
    // Initialize Token (支援跨子網域 SSO 共用 Cookie)
    const [token, setToken] = useState(() => {
        const shared = getSharedAuth();
        return shared.token || localStorage.getItem('token');
    });
    const [username, setUsername] = useState(() => {
        const shared = getSharedAuth();
        if (shared.user) return shared.user.name || shared.user.email;
        return localStorage.getItem('username');
    });

    // Initialize Dark Mode
    const [isDarkMode, setIsDarkMode] = useState(() => {
        return localStorage.getItem('theme') === 'dark';
    });

    // Apply dark mode class to body
    useEffect(() => {
        if (isDarkMode) {
            document.body.classList.add('dark-mode');
            localStorage.setItem('theme', 'dark');
        } else {
            document.body.classList.remove('dark-mode');
            localStorage.setItem('theme', 'light');
        }
    }, [isDarkMode]);

    // Toggle mode function (passed to child components)
    const toggleTheme = () => setIsDarkMode(!isDarkMode);

    // Synchronize SSO cookie when logged in
    useEffect(() => {
        if (token && username) {
            setSharedAuth(token, { name: username, email: username });
        }
    }, [token, username]);

    const handleLogin = (newToken, newUsername) => {
        localStorage.setItem('token', newToken);
        localStorage.setItem('username', newUsername);
        setSharedAuth(newToken, { name: newUsername, email: newUsername });
        setToken(newToken);
        setUsername(newUsername);
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

                <Route
                    path="/"
                    element={
                        <ProtectedRoute token={token}>
                            {/* If BudgetApp also has a toggle button, pass toggleTheme */}
                            <BudgetApp
                                token={token}
                                username={username}
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
