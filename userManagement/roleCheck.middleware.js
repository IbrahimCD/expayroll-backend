// backend/userManagement/roleCheck.middleware.js
function roleCheck(allowedRoles = []) {
    return (req, res, next) => {
      // req.user is set by the 'protect' middleware (JWT in LoginSignup)
      if (!req.user || !allowedRoles.includes(req.user.role)) {
        return res.status(403).json({ message: 'Forbidden: insufficient role' });
      }
      next();
    };
  }
  
  module.exports = { roleCheck };
  