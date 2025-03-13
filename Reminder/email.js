// /Reminder/email.js
const nodemailer = require('nodemailer');

// Create transporter with your env variables
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST, // should be "smtp.gmail.com"
  port: parseInt(process.env.EMAIL_PORT, 10), // should be 587
  secure: false, // false for port 587
  auth: {
    user: process.env.EMAIL_USER, // your Gmail address
    pass: process.env.EMAIL_PASS, // your Gmail app password
  },
});

const sendEmail = (to, subject, text) => {
  const mailOptions = {
    from: process.env.PROVIDER_EMAIL, // sender address
    to,
    subject,
    text,
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error('Error sending email:', error);
    } else {
      console.log('Email sent:', info.response);
    }
  });
};

module.exports = { sendEmail };
