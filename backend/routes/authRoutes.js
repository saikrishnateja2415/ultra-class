const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const User = require("../models/User");
const {
  adminOnly,
} = require("../middleware/authMiddleware");

const router = express.Router();

/*
  Login route

  Checks the email and password and returns a JWT token.
*/

router.post("/login", async (req, res) => {
  try {
    const email = String(req.body.email || "")
      .trim()
      .toLowerCase();

    const password = String(req.body.password || "");

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const user = await User.findOne({
      email,
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const validPassword = await bcrypt.compare(
      password,
      user.password
    );

    if (!validPassword) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    if (!process.env.JWT_SECRET) {
      throw new Error(
        "JWT_SECRET is not configured in backend/.env"
      );
    }

    /*
      Create a secure login token.

      The token contains the authenticated user's ID,
      email and role. It expires after eight hours.
    */

    const token = jwt.sign(
      {
        id: String(user._id),
        email: user.email,
        role: user.role,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "8h",
      }
    );

    return res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Login error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while logging in",
    });
  }
});

/*
  Create user route

  Only an authenticated administrator can use this
  endpoint to create a lecturer or student account.
*/

router.post(
  "/create-user",
  ...adminOnly,
  async (req, res) => {
    try {
      const name = String(req.body.name || "").trim();

      const email = String(req.body.email || "")
        .trim()
        .toLowerCase();

      const password = String(
        req.body.password || ""
      );

      const role = String(req.body.role || "")
        .trim()
        .toLowerCase();

      if (!name || !email || !password || !role) {
        return res.status(400).json({
          success: false,
          message: "All fields are required",
        });
      }

      if (
        !["lecturer", "student"].includes(role)
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Role must be lecturer or student",
        });
      }

      if (password.length < 8) {
        return res.status(400).json({
          success: false,
          message:
            "Password must contain at least 8 characters",
        });
      }

      const existingUser = await User.findOne({
        email,
      });

      if (existingUser) {
        return res.status(409).json({
          success: false,
          message:
            "A user with this email already exists",
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

      return res.status(201).json({
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
      console.error("Create user error:", error);

      if (error.code === 11000) {
        return res.status(409).json({
          success: false,
          message:
            "A user with this email already exists",
        });
      }

      return res.status(500).json({
        success: false,
        message:
          "Server error while creating user",
      });
    }
  }
);

module.exports = router;