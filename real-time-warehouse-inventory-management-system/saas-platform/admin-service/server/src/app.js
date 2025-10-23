require("dotenv").config();
const express = require("express");
const cors = require("cors");

// Import database
const db = require("./models");

// Import routes
const routes = require("./routes");

const app = express();

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      "https://admin.zendensolutions.store",
      "http://localhost:5173",
      "http://localhost:5174",
      "http://localhost:5000",
      "http://localhost:5005",
    ];

    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));

// Database middleware
app.use((req, res, next) => {
  req.db = db;
  next();
});

// Routes
app.use("/api/super-admin", routes);

// Health check
app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    service: "CNH Admin Service",
    timestamp: new Date().toISOString(),
  });
});

// Database sync
const syncDatabase = async () => {
  try {
    await db.sequelize.authenticate();
    console.log("✅ Database connection established successfully.");

    if (process.env.NODE_ENV === "development") {
      await db.sequelize.sync({ alter: false });
      console.log("✅ Database synchronized successfully.");
    }
  } catch (error) {
    console.error("❌ Unable to connect to the database:", error);
    process.exit(1);
  }
};

syncDatabase();

module.exports = app;
