/**
 * Role-based authorization middleware.
 * Usage: authorize("admin") or authorize("user", "admin")
 * Must be used AFTER the auth middleware (req.user must exist).
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to perform this action"
      });
    }

    next();
  };
};

module.exports = authorize;
