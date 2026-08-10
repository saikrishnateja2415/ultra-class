require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcryptjs");

const User = require("./models/User");

const authRoutes = require("./routes/authRoutes");
const sessionRoutes = require("./routes/sessionRoutes");
const questionRoutes = require("./routes/questionRoutes");
const mcqRoutes = require("./routes/mcqRoutes");
const aiRoutes = require("./routes/aiRoutes");
const courseRoutes = require("./routes/courseRoutes");
const subjectRoutes = require("./routes/subjectRoutes");
const studentRoutes = require("./routes/studentRoutes");
const staffRoutes = require("./routes/staffRoutes");
const adminSettingsRoutes = require("./routes/adminSettingsRoutes");
const evaluationRoutes = require("./routes/evaluationRoutes");

const app = express();

/*
|--------------------------------------------------------------------------
| REQUIRED ENVIRONMENT VARIABLES
|--------------------------------------------------------------------------
*/

if (!process.env.JWT_SECRET) {
  throw new Error(
    "JWT_SECRET must be set in backend/.env"
  );
}

/*
|--------------------------------------------------------------------------
| CORS CONFIGURATION
|--------------------------------------------------------------------------
|
| Allows the frontend to connect using:
| - localhost
| - 127.0.0.1
| - the laptop's local network IP
|
*/

const allowedOrigins = (
  process.env.FRONTEND_ORIGINS ||
  "http://localhost:5173,http://127.0.0.1:5173,http://10.12.0.49:5173"
)
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const corsOptions = {
  origin(origin, callback) {
    /*
      Requests made by server tools or native clients
      may not contain an Origin header.
    */

    if (!origin) {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    console.warn(
      `CORS blocked request from: ${origin}`
    );

    return callback(
      new Error(
        "This frontend origin is not allowed"
      )
    );
  },

  methods: [
    "GET",
    "POST",
    "PUT",
    "PATCH",
    "DELETE",
    "OPTIONS",
  ],

  allowedHeaders: [
    "Content-Type",
    "Authorization",
  ],

  credentials: false,

  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));
app.use(express.json());

/*
|--------------------------------------------------------------------------
| DEFAULT ADMIN ACCOUNT
|--------------------------------------------------------------------------
*/

const createAdmin = async () => {
  try {
    const adminEmail =
      process.env.DEFAULT_ADMIN_EMAIL ||
      "admin@ultraclass.com";

    const adminPassword =
      process.env.DEFAULT_ADMIN_PASSWORD ||
      "admin123";

    const adminExists = await User.findOne({
      email: adminEmail,
    });

    if (!adminExists) {
      const hashedPassword =
        await bcrypt.hash(
          adminPassword,
          10
        );

      await User.create({
        name: "System Admin",
        email: adminEmail,
        password: hashedPassword,
        role: "admin",
      });

      console.log(
        "Default admin account created"
      );
    } else {
      console.log(
        "Default admin account already exists"
      );
    }
  } catch (error) {
    console.error(
      "Create default admin error:",
      error
    );
  }
};

/*
|--------------------------------------------------------------------------
| DATABASE CONNECTION
|--------------------------------------------------------------------------
*/

const connectDatabase = async () => {
  try {
    const mongoDatabaseUrl =
      process.env.MONGODB_URI ||
      "mongodb://127.0.0.1:27017/ultra_class";

    await mongoose.connect(
      mongoDatabaseUrl
    );

    console.log("MongoDB Connected");

    await createAdmin();
  } catch (error) {
    console.error(
      "MongoDB connection error:",
      error
    );

    process.exit(1);
  }
};

/*
|--------------------------------------------------------------------------
| HEALTH CHECK
|--------------------------------------------------------------------------
*/

app.get("/", (req, res) => {
  return res.status(200).json({
    success: true,
    message:
      "Ultra Class Backend Running",
  });
});

/*
|--------------------------------------------------------------------------
| APPLICATION ROUTES
|--------------------------------------------------------------------------
*/

app.use("/", authRoutes);
app.use("/", sessionRoutes);
app.use("/", questionRoutes);
app.use("/", mcqRoutes);
app.use(aiRoutes);
app.use("/", courseRoutes);
app.use("/", subjectRoutes);
app.use("/", studentRoutes);
app.use("/", staffRoutes);
app.use("/", adminSettingsRoutes);
app.use("/", evaluationRoutes);

/*
|--------------------------------------------------------------------------
| UNKNOWN API ROUTE
|--------------------------------------------------------------------------
*/

app.use((req, res) => {
  return res.status(404).json({
    success: false,
    message: "API route not found",
  });
});

/*
|--------------------------------------------------------------------------
| GENERAL ERROR HANDLER
|--------------------------------------------------------------------------
*/

app.use((error, req, res, next) => {
  console.error(
    "Unhandled server error:",
    error
  );

  if (
    error.message ===
    "This frontend origin is not allowed"
  ) {
    return res.status(403).json({
      success: false,
      message:
        "This frontend address is not allowed to access the API",
    });
  }

  return res.status(500).json({
    success: false,
    message:
      "An unexpected server error occurred",
  });
});

/*
|--------------------------------------------------------------------------
| START SERVER
|--------------------------------------------------------------------------
*/

const PORT =
  process.env.PORT || 5000;

const startServer = async () => {
  await connectDatabase();

  /*
    0.0.0.0 allows phones and other devices on the
    same network to connect to the backend.
  */

  app.listen(
    PORT,
    "0.0.0.0",
    () => {
      console.log(
        `Server running on http://0.0.0.0:${PORT}`
      );

      console.log(
        `Allowed frontend origins: ${allowedOrigins.join(
          ", "
        )}`
      );
    }
  );
};

startServer();