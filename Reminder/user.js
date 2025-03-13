// utils/user.js
const User = require('../LoginSignup/user.model');

const getUsersByOrganization = async (orgId) => {
  return await User.find({ organizationId: orgId });
};

module.exports = { getUsersByOrganization };
