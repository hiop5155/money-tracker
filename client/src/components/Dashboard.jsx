import React from 'react';

// Receive props from App: balance, totalExpenses, budget
const Dashboard = ({ balance, totalExpenses, budget }) => {
    return (
        <div
            className="dashboard-container"
            style={{
                display: 'flex',
                justifyContent: 'space-around',
                padding: '20px',
                background: '#fff',
                borderRadius: '8px',
                boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
                marginBottom: '20px',
            }}
        >
            <div className="card">
                <h3>預算 (Budget)</h3>
                <p style={{ fontSize: '1.5em', color: '#2ecc71' }}>${Number(budget).toLocaleString()}</p>
            </div>

            <div className="card">
                <h3>總花費 (Expenses)</h3>
                <p style={{ fontSize: '1.5em', color: '#e74c3c' }}>${Number(totalExpenses).toLocaleString()}</p>
            </div>

            <div className="card">
                <h3>餘額 (Balance)</h3>
                <p style={{ fontSize: '1.5em', color: balance >= 0 ? '#3498db' : 'red' }}>${Number(balance).toLocaleString()}</p>
            </div>
        </div>
    );
};

export default Dashboard;
