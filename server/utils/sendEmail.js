const nodemailer = require('nodemailer');

const sendEmail = async (email, subject, text) => {
    try {
        // 1. Create transporter
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
        });

        // 2. Set email content
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: subject,
            text: text,
        };

        // 3. Send
        await transporter.sendMail(mailOptions);
        console.log('Email sent successfully to:', email);
        return true;
    } catch (error) {
        console.log('Email not sent!');
        console.error(error);
        return false;
    }
};

module.exports = sendEmail;
