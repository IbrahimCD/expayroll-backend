// backend/LoginSignup/mailer.js
require('dotenv').config();
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: false, // or true if using 465
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

async function sendMail({ to, subject, text }) {
  try {
    const info = await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to:process.env.EMAIL_USER,
      subject,
      text
    });
    console.log('Email sent:', info.messageId);
  } catch (error) {
    console.error('Email error:', error);
  }
}

module.exports = { sendMail };
