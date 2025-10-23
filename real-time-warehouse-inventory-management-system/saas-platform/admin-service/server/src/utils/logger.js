const config = require("../config/config");

/**
 * Logger utility for consistent logging across the application
 */
class Logger {
  constructor() {
    this.logLevel = this.getLogLevel(config.monitoring.logLevel);
  }

  getLogLevel(level) {
    const levels = {
      error: 0,
      warn: 1,
      info: 2,
      debug: 3,
    };
    return levels[level] || levels.info;
  }

  formatMessage(level, message, meta = {}) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      service: "cnh-admin-service",
      environment: config.server.env,
      ...meta,
    };

    return JSON.stringify(logEntry);
  }

  shouldLog(level) {
    const levels = {
      error: 0,
      warn: 1,
      info: 2,
      debug: 3,
    };
    return levels[level] <= this.logLevel;
  }

  error(message, meta = {}) {
    if (this.shouldLog("error")) {
      console.error(this.formatMessage("error", message, meta));
    }
  }

  warn(message, meta = {}) {
    if (this.shouldLog("warn")) {
      console.warn(this.formatMessage("warn", message, meta));
    }
  }

  info(message, meta = {}) {
    if (this.shouldLog("info")) {
      console.log(this.formatMessage("info", message, meta));
    }
  }

  debug(message, meta = {}) {
    if (this.shouldLog("debug")) {
      console.log(this.formatMessage("debug", message, meta));
    }
  }

  // Request logging middleware
  requestLogger() {
    return (req, res, next) => {
      const start = Date.now();

      // Log request
      this.info("Incoming request", {
        method: req.method,
        url: req.originalUrl,
        ip: req.ip,
        userAgent: req.get("User-Agent"),
        requestId: req.id,
      });

      // Override res.end to log response
      const originalEnd = res.end;
      res.end = function (chunk, encoding) {
        const duration = Date.now() - start;

        // Get response size
        const size = chunk ? Buffer.byteLength(chunk, encoding) : 0;

        // Log response
        logger.info("Request completed", {
          method: req.method,
          url: req.originalUrl,
          statusCode: res.statusCode,
          duration: `${duration}ms`,
          size: `${size} bytes`,
          requestId: req.id,
        });

        originalEnd.call(res, chunk, encoding);
      };

      next();
    };
  }

  // Database operation logging
  dbLog(operation, table, meta = {}) {
    this.debug("Database operation", {
      operation,
      table,
      ...meta,
    });
  }

  // Authentication logging
  authLog(event, user, meta = {}) {
    this.info("Authentication event", {
      event,
      user: user ? { id: user.id, username: user.username } : null,
      ...meta,
    });
  }

  // Security event logging
  securityLog(event, details = {}) {
    this.warn("Security event", {
      event,
      ...details,
    });
  }

  // Business logic logging
  businessLog(event, details = {}) {
    this.info("Business event", {
      event,
      ...details,
    });
  }
}

// Create singleton instance
const logger = new Logger();

module.exports = logger;
