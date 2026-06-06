const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcryptjs");

const User = require("./models/User");

const app = express();

app.use(cors());
app.use(express.json());

/* --MongoDB Connection--*/

mongoose
  .connect("mongodb://127.0.0.1:27017/ultra_class")
  .then(() => {
    console.log("MongoDB Connected");
    createAdmin();
  })
  .catch((err) => console.log(err));

/* ---Session Model--- */

const SessionSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },

  moduleCode: {
    type: String,
    required: true,
  },

  sessionCode: {
    type: String,
    required: true,
    unique: true,
  },

  lecturerId: {
    type: String,
    required: true,
  },

  lecturerName: {
    type: String,
    required: true,
  },

  status: {
    type: String,
    enum: ["active", "closed"],
    default: "active",
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const Session = mongoose.model("Session", SessionSchema);

/* ---Generate Session Code---*/

function generateSessionCode() {
  const randomCode = Math.random()
    .toString(36)
    .substring(2, 7)
    .toUpperCase();

  return `UC-${randomCode}`;
}

/* --Create Default Admin--*/

const createAdmin = async () => {
  try {
    const adminExists = await User.findOne({
      email: "admin@ultraclass.com",
    });

    if (!adminExists) {
      const hashedPassword = await bcrypt.hash(
        "admin123",
        10
      );

      await User.create({
        name: "System Admin",
        email: "admin@ultraclass.com",
        password: hashedPassword,
        role: "admin",
      });

      console.log("✅ Default Admin Created");
    } else {
      console.log("✅ Admin Already Exists");
    }
  } catch (error) {
    console.log(error);
  }
};

/* --Test Route-- */

app.get("/", (req, res) => {
  res.send("Ultra Class Backend Running 🚀");
});

/* --Login Route-- */

app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "User not found",
      });
    }

    const validPassword = await bcrypt.compare(
      password,
      user.password
    );

    if (!validPassword) {
      return res.status(400).json({
        success: false,
        message: "Invalid password",
      });
    }

    res.json({
      success: true,
      message: "Login Successful",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
});

/* --Create User Route Admin creates lecturer/student accounts--*/

app.post("/create-user", async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    if (!["lecturer", "student"].includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Invalid role",
      });
    }

    const existingUser = await User.findOne({
      email,
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(
      password,
      10
    );

    const newUser = await User.create({
      name,
      email,
      password: hashedPassword,
      role,
    });

    res.json({
      success: true,
      message: "User created successfully",
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
      },
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
});

/* --Lecturer: Create Session-- */

app.post("/lecturer/sessions", async (req, res) => {
  try {
    const {
      title,
      moduleCode,
      lecturerId,
      lecturerName,
    } = req.body;

    if (
      !title ||
      !moduleCode ||
      !lecturerId ||
      !lecturerName
    ) {
      return res.status(400).json({
        success: false,
        message: "All session fields are required",
      });
    }

    let sessionCode;
    let codeExists = true;

    while (codeExists) {
      sessionCode = generateSessionCode();

      codeExists = await Session.findOne({
        sessionCode,
      });
    }

    const session = await Session.create({
      title,
      moduleCode,
      sessionCode,
      lecturerId,
      lecturerName,
    });

    res.status(201).json({
      success: true,
      message: "Session created successfully",
      session,
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      success: false,
      message: "Error creating session",
    });
  }
});

/* --Lecturer: Get Own Sessions-- */

app.get("/lecturer/sessions/:lecturerId", async (req, res) => {
  try {
    const sessions = await Session.find({
      lecturerId: req.params.lecturerId,
    }).sort({ createdAt: -1 });

    res.json({
      success: true,
      sessions,
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      success: false,
      message: "Error fetching sessions",
    });
  }
});

app.delete("/delete-session/:id", async (req, res) => {
  try {
    await Session.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: "Session deleted"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error deleting session"
    });
  }
});

/* --Start Server-- */

const PORT = 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});