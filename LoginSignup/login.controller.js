// backend/LoginSignup/login.controller.js
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('./user.model');

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // If Admin, must be verified
    if (user.role === 'Admin' && !user.verified) {
      return res.status(403).json({ message: 'Admin not verified' });
    }

    // Create JWT
    const token = jwt.sign(
        {
          userId: user._id,
          role: user.role,
          orgId: user.organizationId,
          profilePic: user.profilePic  // <-- add this line
        },
        process.env.JWT_SECRET,
        { expiresIn: '1d' }
      );
      

    return res.status(200).json({
      message: 'Login successful',
      token
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error during login' });
  }
};
