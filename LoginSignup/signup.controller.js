// backend/LoginSignup/signup.controller.js
const bcrypt = require('bcrypt');
const User = require('./user.model');
const Organization = require('./organization.model');
const { sendMail } = require('./mailer');

function generateVerificationCode() {
  // Simple numeric or alphanumeric code
  return Math.random().toString().substring(2, 8);
}

exports.adminSignup = async (req, res) => {
  try {
    const { name, email, password, organizationName } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already in use' });
    }

    // Create organization
    const org = new Organization({ name: organizationName });

    // Create Admin user
    const hashedPassword = await bcrypt.hash(password, 10);
    const verificationCode = generateVerificationCode();

    const adminUser = new User({
      name,
      email,
      password: hashedPassword,
      organizationId: org._id,
      role: 'Admin',
      verified: false,
      verificationCode
    });

    // Link org to admin
    org.createdBy = adminUser._id;

    // Save both
    await org.save();
    await adminUser.save();

    // Send code to provider email
    await sendMail({
      to: process.env.PROVIDER_EMAIL,
      subject: 'New Admin Verification Code',
      text: `Admin: ${name} (${email})\nCode: ${verificationCode}`
    });

    return res.status(201).json({
      message: 'Signup successful. Await verification code from provider.'
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error during signup' });
  }
};
