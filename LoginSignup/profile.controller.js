const jwt = require('jsonwebtoken');
const User = require('./user.model');

/**
 * GET /auth/profile
 * Returns the profile of the currently authenticated user.
 * Assumes req.user.userId is set by the protect middleware.
 */
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    return res.status(200).json({ user });
  } catch (error) {
    console.error('Error in getProfile:', error);
    return res.status(500).json({ message: 'Server error while fetching profile' });
  }
};

/**
 * PUT /auth/profile
 * Updates the logged-in user's profile (name and profilePic) and re-issues a new token that reflects the updated data.
 */
exports.updateProfile = async (req, res) => {
  try {
    // Expect { name, profilePic } in request body
    const { name, profilePic } = req.body;
    const userId = req.user.userId; // Ensure your auth middleware sets this property

    // Find the user by ID
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update the fields if provided
    if (name) user.name = name;
    if (profilePic) user.profilePic = profilePic;

    await user.save();

    // Re-issue a new token that reflects the updated profile
    const newToken = jwt.sign(
      {
        userId: user._id,
        role: user.role,
        orgId: user.organizationId,
        profilePic: user.profilePic,
        name: user.name
      },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    return res.status(200).json({
      message: 'Profile updated successfully',
      token: newToken,
      user: {
        name: user.name,
        profilePic: user.profilePic
      }
    });
  } catch (err) {
    console.error('Error updating profile:', err);
    return res.status(500).json({ message: 'Server error updating profile' });
  }
};
