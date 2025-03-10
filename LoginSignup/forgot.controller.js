// backend/LoginSignup/forgot.controller.js
const User = require('./user.model');
const { sendMail } = require('./mailer');

function generateResetCode() {
  return Math.random().toString().substr(2, 6); // e.g., '123456'
}

exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const resetCode = generateResetCode();
    user.passwordResetCode = resetCode;
    user.passwordResetExpires = Date.now() + 30 * 60 * 1000; // 30 min
    await user.save();

    // Send to provider's email
    await sendMail({
      to: process.env.PROVIDER_EMAIL,
      subject: 'Password Reset Request',
      text: `User: ${user.name} (${user.email})\nCode: ${resetCode}`
    });

    return res.status(200).json({
      message: 'Reset code sent to provider. You will receive it soon.'
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error during forgot password' });
  }
};
