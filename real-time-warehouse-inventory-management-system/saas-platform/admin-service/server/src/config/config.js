require("dotenv").config();

/**
 * Application configuration object
 * Centralizes all environment variable handling
 */
const config = {
  // Server configuration
  server: {
    port: process.env.PORT || 7000,
    host: process.env.HOST || "localhost",
    env: process.env.NODE_ENV || "development",
  },

  // Database configuration
  database: {
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT) || 5432,
    name: process.env.DB_NAME || "cnh_admin_dev",
    username: process.env.DB_USERNAME || "postgres",
    password: process.env.DB_PASSWORD || "password",
    ssl: process.env.DB_SSL === "true",
    dialect: "postgres",
    pool: {
      max: parseInt(process.env.DB_POOL_MAX) || 20,
      min: parseInt(process.env.DB_POOL_MIN) || 5,
      acquire: parseInt(process.env.DB_POOL_ACQUIRE) || 30000,
      idle: parseInt(process.env.DB_POOL_IDLE) || 10000,
    },
  },

  // Security configuration
  security: {
    jwtSecret:
      process.env.JWT_SECRET || "default-jwt-secret-change-in-production",
    jwtExpires: process.env.JWT_EXPIRES || "24h",
    encryptionKey:
      process.env.ENCRYPTION_KEY ||
      "default-encryption-key-change-in-production-32-chars",
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS) || 12,
  },

  // CORS configuration
  cors: {
    allowedOrigins: process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(",").map((origin) => origin.trim())
      : ["http://localhost:3000", "http://localhost:3001"],
    credentials: true,
  },

  // Rate limiting configuration
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 1000,
    authWindowMs:
      parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
    authMaxRequests: parseInt(process.env.AUTH_RATE_LIMIT_MAX_REQUESTS) || 5,
  },

  // Email configuration
  email: {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === "true",
    user: process.env.SMTP_USER,
    password: process.env.SMTP_PASS,
    fromEmail: process.env.FROM_EMAIL || "admin@cnhdistributors.com",
  },

  // Stripe configuration
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
  },

  // Redis configuration
  redis: {
    host: process.env.REDIS_HOST || "localhost",
    port: parseInt(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB) || 0,
  },

  // File upload configuration
  upload: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024, // 10MB
    allowedTypes: process.env.ALLOWED_FILE_TYPES
      ? process.env.ALLOWED_FILE_TYPES.split(",")
      : ["image/jpeg", "image/png", "image/gif", "application/pdf"],
  },

  // SSL configuration
  ssl: {
    certPath: process.env.SSL_CERT_PATH,
    keyPath: process.env.SSL_KEY_PATH,
    autoRenew: process.env.SSL_AUTO_RENEW === "true",
  },

  // Monitoring configuration
  monitoring: {
    sentryDsn: process.env.SENTRY_DSN,
    newRelicKey: process.env.NEW_RELIC_LICENSE_KEY,
    logLevel: process.env.LOG_LEVEL || "info",
  },

  // Backup configuration
  backup: {
    schedule: process.env.BACKUP_SCHEDULE || "0 2 * * *", // 2 AM daily
    retentionDays: parseInt(process.env.BACKUP_RETENTION_DAYS) || 30,
    storagePath: process.env.BACKUP_STORAGE_PATH || "/backups",
  },

  // Feature flags
  features: {
    enableRegistration: process.env.ENABLE_REGISTRATION !== "false",
    enableTwoFactor: process.env.ENABLE_TWO_FACTOR === "true",
    enableEmailVerification: process.env.ENABLE_EMAIL_VERIFICATION === "true",
    enableAnalytics: process.env.ENABLE_ANALYTICS !== "false",
  },
};

/**
 * Validate required configuration
 * Throws an error if critical configuration is missing
 */
const validateConfig = () => {
  const requiredVars = ["DB_NAME", "DB_USERNAME", "DB_PASSWORD", "JWT_SECRET"];

  const missingVars = requiredVars.filter((varName) => !process.env[varName]);

  if (missingVars.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingVars.join(", ")}`
    );
  }

  // Validate JWT secret length
  if (config.security.jwtSecret.length < 32) {
    console.warn(
      "⚠️  JWT secret should be at least 32 characters long for security"
    );
  }

  // Validate encryption key length
  if (config.security.encryptionKey.length < 32) {
    console.warn(
      "⚠️  Encryption key should be at least 32 characters long for security"
    );
  }

  // Validate production environment
  if (config.server.env === "production") {
    const productionChecks = [
      {
        key: "JWT_SECRET",
        value: process.env.JWT_SECRET,
        default: "default-jwt-secret-change-in-production",
      },
      {
        key: "ENCRYPTION_KEY",
        value: process.env.ENCRYPTION_KEY,
        default: "default-encryption-key-change-in-production-32-chars",
      },
    ];

    productionChecks.forEach((check) => {
      if (check.value === check.default) {
        throw new Error(
          `${check.key} must be changed from default value in production`
        );
      }
    });
  }
};

// Validate configuration on module load
if (process.env.NODE_ENV !== "test") {
  validateConfig();
}

module.exports = config;
