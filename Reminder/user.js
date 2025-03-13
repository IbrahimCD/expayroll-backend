// utils/user.js
const User = require('../models/User');

const getUsersByOrganization = async (orgId) => {
  return await User.find({ organizationId: orgId });
};

module.exports = { getUsersByOrganization };
