// backend/userManagement/userManagement.controller.js
const bcrypt = require('bcrypt');
const User = require('../LoginSignup/user.model');

/**
 * CREATE a new user in the same organization
 * No verification needed for Manager/Staff. Admin only.
 */
exports.createUser = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    const orgId = req.user.orgId; // from JWT

    // Check if email is already used in this org
    const existing = await User.findOne({ email, organizationId: orgId });
    if (existing) {
      return res.status(400).json({ message: 'Email already exists in your organization' });
    }

    const hashed = await bcrypt.hash(password, 10);
    const newUser = await User.create({
      name,
      email,
      password: hashed,
      organizationId: orgId,
      role,
      verified: true // For non-admin, we skip verification flow
    });

    return res.status(201).json({
      message: 'User created successfully',
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role
      }
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error creating user' });
  }
};

/**
 * GET all users in the same org
 * Admin or Manager might be allowed
 */
exports.getUsers = async (req, res) => {
  try {
    const orgId = req.user.orgId;
    const users = await User.find({ organizationId: orgId }).select('-password');

    return res.status(200).json({ users });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error fetching users' });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { role, status } = req.body;
    const orgId = req.user.orgId; // Ensure this value is correct

    if (!orgId) {
      return res.status(400).json({ message: 'Organization ID is missing from token.' });
    }

    // Find the user by _id and matching organizationId
    const userToUpdate = await User.findOne({ _id: userId, organizationId: orgId });
    if (!userToUpdate) {
      return res.status(404).json({ message: 'User not found in your organization' });
    }

    // Update fields if provided
    if (role) userToUpdate.role = role;
    if (status) userToUpdate.status = status;

    await userToUpdate.save();

    return res.status(200).json({
      message: 'User updated successfully',
      user: {
        id: userToUpdate._id,
        name: userToUpdate.name,
        email: userToUpdate.email,
        role: userToUpdate.role,
        status: userToUpdate.status
      }
    });
  } catch (err) {
    console.error('Error updating user:', err);
    return res.status(500).json({ message: 'Server error updating user' });
  }
};
exports.deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const orgId = req.user.orgId; // Ensure this value is correct

    if (!orgId) {
      return res.status(400).json({ message: 'Organization ID is missing from token.' });
    }

    const deletedUser = await User.findOneAndDelete({ _id: userId, organizationId: orgId });
    if (!deletedUser) {
      return res.status(404).json({ message: 'User not found or already removed' });
    }

    return res.status(200).json({ message: 'User deleted successfully' });
  } catch (err) {
    console.error('Error deleting user:', err);
    return res.status(500).json({ message: 'Server error deleting user' });
  }
};
