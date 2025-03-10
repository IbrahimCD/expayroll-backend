// backend/LoginSignup/verify.controller.js
const User = require('./user.model');

exports.verifyAccount = async (req, res) => {
  try {
    const { email, verificationCode } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Compare codes
    if (user.verificationCode !== verificationCode) {
      return res.status(400).json({ message: 'Invalid verification code' });
    }

    user.verified = true;
    user.verificationCode = null;
    await user.save();

    return res.status(200).json({ message: 'Admin verified. You can now log in.' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error during verification' });
  }
};
