/**
 * 404 Not Found handler
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 */
const notFoundHandler = (req, res) => {
  res.status(404).json({
    error: "Route not found",
    message: `The route ${req.method} ${req.originalUrl} does not exist on this server.`,
    timestamp: new Date().toISOString(),
    requestId: req.id,
  });
};

/**
 * Global error handler
 * @param {Error} err - Error object
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {Function} next - Express next function
 */
const errorHandler = (err, req, res, next) => {
  // Log error with request context
  console.error("Error occurred:", {
    error: err.message,
    stack: err.stack,
    requestId: req.id,
    method: req.method,
    url: req.originalUrl,
    userAgent: req.get("User-Agent"),
    ip: req.ip,
    timestamp: new Date().toISOString(),
  });

  // Default error response
  let error = {
    message: "Internal server error",
    status: 500,
    code: "INTERNAL_ERROR",
  };

  // Sequelize validation errors
  if (err.name === "SequelizeValidationError") {
    error = {
      message: "Validation failed",
      status: 400,
      code: "VALIDATION_ERROR",
      details: err.errors.map((e) => ({
        field: e.path,
        message: e.message,
        value: e.value,
      })),
    };
  }

  // Sequelize unique constraint errors
  if (err.name === "SequelizeUniqueConstraintError") {
    error = {
      message: "A record with that value already exists",
      status: 409,
      code: "DUPLICATE_ERROR",
      field: err.errors[0]?.path,
    };
  }

  // Sequelize foreign key constraint errors
  if (err.name === "SequelizeForeignKeyConstraintError") {
    error = {
      message: "Referenced record does not exist",
      status: 400,
      code: "REFERENCE_ERROR",
      field: err.fields,
    };
  }

  // Sequelize database connection errors
  if (err.name === "SequelizeConnectionError") {
    error = {
      message: "Database connection failed",
      status: 503,
      code: "DATABASE_ERROR",
    };
  }

  // JWT errors
  if (err.name === "JsonWebTokenError") {
    error = {
      message: "Invalid authentication token",
      status: 401,
      code: "INVALID_TOKEN",
    };
  }

  if (err.name === "TokenExpiredError") {
    error = {
      message: "Authentication token has expired",
      status: 401,
      code: "TOKEN_EXPIRED",
    };
  }

  // CORS errors
  if (err.message === "Not allowed by CORS") {
    error = {
      message: "CORS policy violation",
      status: 403,
      code: "CORS_ERROR",
    };
  }

  // Multer file upload errors
  if (err.code === "LIMIT_FILE_SIZE") {
    error = {
      message: "File size exceeds the allowed limit",
      status: 413,
      code: "FILE_TOO_LARGE",
    };
  }

  // Rate limiting errors
  if (err.status === 429) {
    error = {
      message: "Too many requests, please try again later",
      status: 429,
      code: "RATE_LIMIT_EXCEEDED",
      retryAfter: err.retryAfter,
    };
  }

  // Custom application errors
  if (err.status && err.code) {
    error = {
      message: err.message,
      status: err.status,
      code: err.code,
      ...(err.details && { details: err.details }),
    };
  }

  // Override with custom error properties if they exist
  if (err.status) error.status = err.status;
  if (err.message) error.message = err.message;
  if (err.code) error.code = err.code;

  // Prepare response
  const response = {
    error: error.message,
    code: error.code,
    timestamp: new Date().toISOString(),
    requestId: req.id,
    ...(error.details && { details: error.details }),
    ...(error.field && { field: error.field }),
    ...(error.retryAfter && { retryAfter: error.retryAfter }),
  };

  // Include stack trace in development
  if (process.env.NODE_ENV === "development") {
    response.stack = err.stack;
    response.originalError = err.name;
  }

  // Send error response
  res.status(error.status).json(response);
};

/**
 * Async error wrapper for route handlers
 * @param {Function} fn - Async route handler function
 * @returns {Function} Wrapped function with error handling
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Create custom application error
 * @param {string} message - Error message
 * @param {number} status - HTTP status code
 * @param {string} code - Error code
 * @param {Object} details - Additional error details
 * @returns {Error} Custom error object
 */
const createError = (
  message,
  status = 500,
  code = "APPLICATION_ERROR",
  details = null
) => {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  if (details) error.details = details;
  return error;
};

module.exports = {
  notFoundHandler,
  errorHandler,
  asyncHandler,
  createError,
};
