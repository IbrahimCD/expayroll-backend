// backend/LoginSignup/reset.controller.js
const bcrypt = require('bcrypt');
const User = require('./user.model');

exports.resetPassword = async (req, res) => {
  try {
    const { email, resetCode, newPassword } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!user.passwordResetCode || !user.passwordResetExpires) {
      return res.status(400).json({ message: 'No reset code request found' });
    }

    if (user.passwordResetCode !== resetCode) {
      return res.status(400).json({ message: 'Invalid reset code' });
    }

    if (Date.now() > user.passwordResetExpires) {
      return res.status(400).json({ message: 'Reset code expired' });
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    user.password = hashed;
    user.passwordResetCode = null;
    user.passwordResetExpires = null;
    await user.save();

    return res.status(200).json({ message: 'Password reset successful.' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error during reset password' });
  }
};
