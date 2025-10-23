const jwt = require("jsonwebtoken");
const { User, Role, Permission } = require('../models');

// Original token verification (keep for backward compatibility)
exports.verifyToken = (req, res, next) => {
  // Get token from Authorization header
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN format

  if (!token) {
    return res
      .status(401)
      .json({ message: "Access denied. No token provided." });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ message: "Invalid token" });
  }
};

// Enhanced token verification with user data loading
exports.authenticateToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ 
      success: false,
      message: "Access denied. No token provided." 
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Load full user data with role and permissions
    const user = await User.findByPk(decoded.user_id, {
      include: [
        {
          model: Role,
          as: 'userRole',
          include: [
            {
              model: Permission,
              as: 'permissions',
              through: { attributes: [] },
            }
          ],
        }
      ],
      attributes: { exclude: ['password'] },
    });

    if (!user) {
      return res.status(401).json({ 
        success: false,
        message: "User not found" 
      });
    }

    if (user.status !== 'active') {
      return res.status(403).json({ 
        success: false,
        message: "Account is not active" 
      });
    }

    req.user = user;
    req.userPermissions = user.userRole ? user.userRole.permissions : [];
    next();
  } catch (error) {
    return res.status(403).json({ 
      success: false,
      message: "Invalid token" 
    });
  }
};

// Legacy role-based authorization (keep for backward compatibility)
exports.authorize = (roles = []) => {
  if (typeof roles === "string") {
    roles = [roles];
  }

  return (req, res, next) => {
    if (!req.user) {
      return res
        .status(401)
        .json({ message: "Unauthorized: Authentication required" });
    }

    if (roles.length && !roles.includes(req.user.role)) {
      return res
        .status(403)
        .json({ message: "Forbidden: insufficient permissions" });
    }

    next();
  };
};

// Permission-based authorization
exports.requirePermission = (module, action, resource = null) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false,
        message: "Authentication required" 
      });
    }

    // Super admin bypass (if user has system admin role)
    if (req.user.role === 'admin' || (req.user.userRole && req.user.userRole.name === 'super_admin')) {
      return next();
    }

    // Check if user has the required permission
    const hasPermission = req.userPermissions.some(permission => {
      return permission.module === module && 
             permission.action === action && 
             (resource === null || permission.resource === resource || permission.resource === null);
    });

    if (!hasPermission) {
      return res.status(403).json({ 
        success: false,
        message: `Access denied. Required permission: ${module}.${action}${resource ? `.${resource}` : ''}` 
      });
    }

    next();
  };
};

// Check if user has any of the specified permissions
exports.requireAnyPermission = (permissions) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false,
        message: "Authentication required" 
      });
    }

    // Super admin bypass
    if (req.user.role === 'admin' || (req.user.userRole && req.user.userRole.name === 'super_admin')) {
      return next();
    }

    // Check if user has any of the required permissions
    const hasAnyPermission = permissions.some(({ module, action, resource = null }) => {
      return req.userPermissions.some(permission => {
        return permission.module === module && 
               permission.action === action && 
               (resource === null || permission.resource === resource || permission.resource === null);
      });
    });

    if (!hasAnyPermission) {
      return res.status(403).json({ 
        success: false,
        message: "Access denied. Insufficient permissions" 
      });
    }

    next();
  };
};

// Check if user can access specific resource (for data filtering)
exports.checkResourceAccess = (module, action, resource) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false,
        message: "Authentication required" 
      });
    }

    // Super admin bypass
    if (req.user.role === 'admin' || (req.user.userRole && req.user.userRole.name === 'super_admin')) {
      req.hasFullAccess = true;
      return next();
    }

    // Check specific resource permission
    const hasResourceAccess = req.userPermissions.some(permission => {
      return permission.module === module && 
             permission.action === action && 
             (permission.resource === resource || permission.resource === null);
    });

    req.hasResourceAccess = hasResourceAccess;
    req.hasFullAccess = req.userPermissions.some(permission => 
      permission.module === module && 
      permission.action === action && 
      permission.resource === null
    );

    next();
  };
};

// Utility function to check permissions programmatically
exports.hasPermission = (userPermissions, module, action, resource = null) => {
  return userPermissions.some(permission => {
    return permission.module === module && 
           permission.action === action && 
           (resource === null || permission.resource === resource || permission.resource === null);
  });
};

// Admin only middleware (for legacy compatibility)
exports.requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ 
      success: false,
      message: "Authentication required" 
    });
  }

  if (req.user.role !== 'admin' && (!req.user.userRole || req.user.userRole.name !== 'super_admin')) {
    return res.status(403).json({ 
      success: false,
      message: "Admin access required" 
    });
  }

  next();
};
