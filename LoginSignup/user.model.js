// backend/LoginSignup/user.model.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  profilePic: { type: String, default: null },
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization'
  },
  role: {
    type: String,
    enum: ['Admin', 'Manager', 'Area Manager', 'Accountant', 'Staff'],
    default: 'Staff'
  },
  verified: { type: Boolean, default: false },
  verificationCode: { type: String, default: null },
  passwordResetCode: { type: String, default: null },
  passwordResetExpires: { type: Date, default: null },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
