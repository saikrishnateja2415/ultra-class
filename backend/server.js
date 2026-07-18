const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcryptjs");

const User = require("./models/User");

const authRoutes = require("./routes/authRoutes");
const sessionRoutes = require("./routes/sessionRoutes");
const questionRoutes = require("./routes/questionRoutes");
const courseRoutes = require("./routes/courseRoutes");
const subjectRoutes = require("./routes/subjectRoutes");
const studentRoutes = require("./routes/studentRoutes");
const staffRoutes = require("./routes/staffRoutes");
const adminSettingsRoutes = require("./routes/adminSettingsRoutes");

const app = express();

app.use(cors());
app.use(express.json());

mongoose
  .connect("mongodb://127.0.0.1:27017/ultra_class")
  .then(() => {
    console.log("MongoDB Connected");
    createAdmin();
  })
  .catch((err) => console.log(err));

const createAdmin = async () => {
  try {
    const adminExists = await User.findOne({
      email: "admin@ultraclass.com",
    });

    if (!adminExists) {
      const hashedPassword = await bcrypt.hash("admin123", 10);

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

app.get("/", (req, res) => {
  res.send("Ultra Class Backend Running 🚀");
});

app.use("/", authRoutes);
app.use("/", sessionRoutes);
app.use("/", questionRoutes);
app.use("/", courseRoutes);
app.use("/", subjectRoutes);
app.use("/", studentRoutes);
app.use("/", staffRoutes);
app.use("/", adminSettingsRoutes);

const PORT = 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});