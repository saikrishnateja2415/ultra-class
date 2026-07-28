const bcrypt = require("bcryptjs");

const User = require("../models/User");
const Staff = require("../models/Staff");

const getLecturerSettings = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findOne({
      _id: userId,
      role: "lecturer",
    }).select(
      "_id name email role createdAt"
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message:
          "Lecturer account was not found",
      });
    }

    const staff = await Staff.findOne({
      userId: user._id,
    })
      .populate(
        "subjects",
        "subjectName subjectCode"
      )
      .populate(
        "courses",
        "courseName courseCode"
      )
      .select(
        "staffId name email department qualification designation status subjects courses createdAt"
      );

    if (!staff) {
      return res.status(404).json({
        success: false,
        message:
          "Lecturer staff profile was not found",
      });
    }

    return res.status(200).json({
      success: true,

      lecturer: {
        userId: user._id,
        staffId: staff.staffId,
        name: user.name,
        email: user.email,
        role: user.role,
        department: staff.department,
        qualification:
          staff.qualification || "",
        designation: staff.designation,
        status: staff.status,
        subjects: staff.subjects || [],
        courses: staff.courses || [],
        accountCreatedAt: user.createdAt,
        staffCreatedAt: staff.createdAt,
      },
    });
  } catch (error) {
    console.error(
      "Get lecturer settings error:",
      error
    );

    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message:
          "Invalid lecturer account information",
      });
    }

    return res.status(500).json({
      success: false,
      message:
        "Unable to load lecturer settings",
    });
  }
};

const updateLecturerProfile = async (
  req,
  res
) => {
  try {
    const { userId } = req.params;

    const {
      name,
      email,
      qualification,
    } = req.body;

    const cleanedName = name?.trim();

    const cleanedEmail = email
      ?.trim()
      .toLowerCase();

    const cleanedQualification =
      qualification?.trim() || "";

    if (!cleanedName) {
      return res.status(400).json({
        success: false,
        message: "Name is required",
      });
    }

    if (!cleanedEmail) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    const emailPattern =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(cleanedEmail)) {
      return res.status(400).json({
        success: false,
        message:
          "Enter a valid email address",
      });
    }

    const user = await User.findOne({
      _id: userId,
      role: "lecturer",
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message:
          "Lecturer account was not found",
      });
    }

    const staff = await Staff.findOne({
      userId: user._id,
    });

    if (!staff) {
      return res.status(404).json({
        success: false,
        message:
          "Lecturer staff profile was not found",
      });
    }

    const userEmailExists =
      await User.findOne({
        email: cleanedEmail,
        _id: {
          $ne: user._id,
        },
      });

    if (userEmailExists) {
      return res.status(409).json({
        success: false,
        message:
          "This email is already used by another account",
      });
    }

    const staffEmailExists =
      await Staff.findOne({
        email: cleanedEmail,
        _id: {
          $ne: staff._id,
        },
      });

    if (staffEmailExists) {
      return res.status(409).json({
        success: false,
        message:
          "This email is already used by another staff profile",
      });
    }

    user.name = cleanedName;
    user.email = cleanedEmail;

    staff.name = cleanedName;
    staff.email = cleanedEmail;
    staff.qualification =
      cleanedQualification;

    await user.save();
    await staff.save();

    return res.status(200).json({
      success: true,
      message:
        "Lecturer profile updated successfully",

      lecturer: {
        userId: user._id,
        staffId: staff.staffId,
        name: user.name,
        email: user.email,
        role: user.role,
        department: staff.department,
        qualification:
          staff.qualification || "",
        designation: staff.designation,
        status: staff.status,
        subjects: staff.subjects || [],
        courses: staff.courses || [],
      },
    });
  } catch (error) {
    console.error(
      "Update lecturer profile error:",
      error
    );

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message:
          "The name or email conflicts with another account",
      });
    }

    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message:
          "Invalid lecturer account information",
      });
    }

    return res.status(500).json({
      success: false,
      message:
        "Unable to update lecturer profile",
    });
  }
};

const changeLecturerPassword = async (
  req,
  res
) => {
  try {
    const { userId } = req.params;

    const {
      currentPassword,
      newPassword,
      confirmPassword,
    } = req.body;

    if (
      !currentPassword ||
      !newPassword ||
      !confirmPassword
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Current password, new password and confirmation are required",
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message:
          "New password and confirmation do not match",
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message:
          "New password must contain at least 8 characters",
      });
    }

    if (currentPassword === newPassword) {
      return res.status(400).json({
        success: false,
        message:
          "New password must be different from the current password",
      });
    }

    const user = await User.findOne({
      _id: userId,
      role: "lecturer",
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message:
          "Lecturer account was not found",
      });
    }

    const passwordMatches =
      await bcrypt.compare(
        currentPassword,
        user.password
      );

    if (!passwordMatches) {
      return res.status(401).json({
        success: false,
        message:
          "Current password is incorrect",
      });
    }

    user.password = await bcrypt.hash(
      newPassword,
      10
    );

    await user.save();

    return res.status(200).json({
      success: true,
      message:
        "Password changed successfully. Please log in again.",
    });
  } catch (error) {
    console.error(
      "Change lecturer password error:",
      error
    );

    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message:
          "Invalid lecturer account information",
      });
    }

    return res.status(500).json({
      success: false,
      message:
        "Unable to change lecturer password",
    });
  }
};

module.exports = {
  getLecturerSettings,
  updateLecturerProfile,
  changeLecturerPassword,
};