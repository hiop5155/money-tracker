import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import BudgetApp from './pages/BudgetApp';
import AuthPage from './pages/AuthPage';
import VerifyEmail from './pages/VerifyEmail';
import ForgotPassword from './pages/ForgotPassword';

// Protected Route
const ProtectedRoute = ({ token, children }) => {
    if (!token) return <Navigate to="/login" replace />;
    return children;
};

function App() {
    // Initialize Token
    const [token, setToken] = useState(localStorage.getItem('token'));
    const [username, setUsername] = useState(localStorage.getItem('username'));

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

    const handleLogin = (newToken, newUsername) => {
        localStorage.setItem('token', newToken);
        localStorage.setItem('username', newUsername);
        setToken(newToken);
        setUsername(newUsername);
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('username');
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

                {/* Other pages benefit from body class, props not strictly needed unless button is displayed */}
                <Route path="/verify" element={<VerifyEmail />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />

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
