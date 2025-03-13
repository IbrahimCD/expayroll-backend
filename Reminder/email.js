// utils/email.js
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'smtp', // or your email provider
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

const sendEmail = (to, subject, text) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to,
    subject,
    text
  };
  transporter.sendMail(mailOptions, function (error, info) {
    if (error) console.error(error);
    else console.log('Email sent: ' + info.response);
  });
};

module.exports = { sendEmail };
