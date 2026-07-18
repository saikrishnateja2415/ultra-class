const bcrypt = require("bcryptjs");

const User = require("../models/User");
const AdminSettings = require("../models/AdminSettings");

const getAdminUser = async (adminId) => {
  const admin = await User.findById(adminId);

  if (!admin || admin.role !== "admin") {
    return null;
  }

  return admin;
};

// Get profile and settings
const getAdminSettings = async (req, res) => {
  try {
    const { adminId } = req.params;

    const admin = await getAdminUser(adminId);

    if (!admin) {
      return res.status(404).json({
        message: "Administrator account not found.",
      });
    }

    let settings = await AdminSettings.findOne({
      adminId: admin._id,
    });

    if (!settings) {
      settings = await AdminSettings.create({
        adminId: admin._id,
      });
    }

    return res.status(200).json({
      profile: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
      },
      settings,
    });
  } catch (error) {
    console.error("Get admin settings error:", error);

    if (error.name === "CastError") {
      return res.status(400).json({
        message: "Invalid administrator ID.",
      });
    }

    return res.status(500).json({
      message:
        "Server error while loading administrator settings.",
    });
  }
};

// Update admin profile
const updateAdminProfile = async (req, res) => {
  try {
    const { adminId } = req.params;
    const { name, email } = req.body;

    if (!name?.trim() || !email?.trim()) {
      return res.status(400).json({
        message: "Name and email are required.",
      });
    }

    const admin = await getAdminUser(adminId);

    if (!admin) {
      return res.status(404).json({
        message: "Administrator account not found.",
      });
    }

    const normalisedEmail = email.trim().toLowerCase();

    const duplicateUser = await User.findOne({
      email: normalisedEmail,
      _id: {
        $ne: admin._id,
      },
    });

    if (duplicateUser) {
      return res.status(409).json({
        message: "Another account already uses this email.",
      });
    }

    admin.name = name.trim();
    admin.email = normalisedEmail;

    await admin.save();

    return res.status(200).json({
      message: "Administrator profile updated successfully.",
      profile: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
      },
    });
  } catch (error) {
    console.error("Update admin profile error:", error);

    if (error.name === "CastError") {
      return res.status(400).json({
        message: "Invalid administrator ID.",
      });
    }

    if (error.code === 11000) {
      return res.status(409).json({
        message: "Another account already uses this email.",
      });
    }

    return res.status(500).json({
      message:
        "Server error while updating administrator profile.",
    });
  }
};

// Change admin password
const changeAdminPassword = async (req, res) => {
  try {
    const { adminId } = req.params;

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
        message: "Please complete all password fields.",
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        message:
          "New password and confirmation do not match.",
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        message:
          "New password must contain at least 8 characters.",
      });
    }

    if (currentPassword === newPassword) {
      return res.status(400).json({
        message:
          "New password must be different from the current password.",
      });
    }

    const admin = await getAdminUser(adminId);

    if (!admin) {
      return res.status(404).json({
        message: "Administrator account not found.",
      });
    }

    const currentPasswordIsValid = await bcrypt.compare(
      currentPassword,
      admin.password
    );

    if (!currentPasswordIsValid) {
      return res.status(400).json({
        message: "Current password is incorrect.",
      });
    }

    admin.password = await bcrypt.hash(newPassword, 10);

    await admin.save();

    return res.status(200).json({
      message: "Password changed successfully.",
    });
  } catch (error) {
    console.error("Change admin password error:", error);

    if (error.name === "CastError") {
      return res.status(400).json({
        message: "Invalid administrator ID.",
      });
    }

    return res.status(500).json({
      message:
        "Server error while changing administrator password.",
    });
  }
};

// Update academic, attendance and system settings
const updateAdminSettings = async (req, res) => {
  try {
    const { adminId } = req.params;

    const {
      academicDefaults,
      attendance,
      systemPreferences,
    } = req.body;

    const admin = await getAdminUser(adminId);

    if (!admin) {
      return res.status(404).json({
        message: "Administrator account not found.",
      });
    }

    let settings = await AdminSettings.findOne({
      adminId: admin._id,
    });

    if (!settings) {
      settings = new AdminSettings({
        adminId: admin._id,
      });
    }

    if (academicDefaults) {
      settings.academicDefaults = {
        ...settings.academicDefaults.toObject(),
        ...academicDefaults,
      };
    }

    if (attendance) {
      settings.attendance = {
        ...settings.attendance.toObject(),
        ...attendance,
      };
    }

    if (systemPreferences) {
      settings.systemPreferences = {
        ...settings.systemPreferences.toObject(),
        ...systemPreferences,
      };
    }

    await settings.save();

    return res.status(200).json({
      message: "Administrator settings saved successfully.",
      settings,
    });
  } catch (error) {
    console.error("Update admin settings error:", error);

    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map(
        (item) => item.message
      );

      return res.status(400).json({
        message: messages.join(", "),
      });
    }

    if (error.name === "CastError") {
      return res.status(400).json({
        message: "Invalid administrator ID.",
      });
    }

    return res.status(500).json({
      message:
        "Server error while saving administrator settings.",
    });
  }
};

module.exports = {
  getAdminSettings,
  updateAdminProfile,
  changeAdminPassword,
  updateAdminSettings,
};