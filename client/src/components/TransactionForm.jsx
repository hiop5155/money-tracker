import React, { useState } from 'react';

function TransactionForm({ onAdd }) {
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [category, setCategory] = useState('飲食');
    const [date, setDate] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!description || !amount || !date) {
            alert('請填寫完整資訊');
            return;
        }
        onAdd({
            description,
            amount: Number(amount), // Remember to convert to number
            category,
            date,
        });
        setDescription('');
        setAmount('');
    };

    return (
        <form onSubmit={handleSubmit} className="transaction-form">
            {/* Here we use simple HTML structure */}
            <div className="input-group">
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="form-input" />
                <select value={category} onChange={(e) => setCategory(e.target.value)} className="form-input">
                    <option value="飲食">飲食</option>
                    <option value="交通">交通</option>
                    <option value="娛樂">娛樂</option>
                    <option value="購物">購物</option>
                    <option value="其他">其他</option>
                </select>
                <input
                    type="text"
                    placeholder="消費項目"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="form-input"
                />
                <input type="number" placeholder="金額" value={amount} onChange={(e) => setAmount(e.target.value)} className="form-input" />
                <button type="submit" className="submit-btn">
                    新增紀錄
                </button>
            </div>
        </form>
    );
}

export default TransactionForm;
