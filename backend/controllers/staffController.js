const bcrypt = require("bcryptjs");

const Staff = require("../models/Staff");
const User = require("../models/User");

const createStaff = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      staffId,
      department,
      qualification,
      designation,
      status,
    } = req.body;

    if (
      !name ||
      !email ||
      !password ||
      !staffId ||
      !department
    ) {
      return res.status(400).json({
        message:
          "Name, email, password, staff ID and department are required.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedStaffId = staffId.trim().toUpperCase();

    const existingUser = await User.findOne({
      email: normalizedEmail,
    });

    if (existingUser) {
      return res.status(409).json({
        message: "An account already exists with this email.",
      });
    }

    const existingStaff = await Staff.findOne({
      staffId: normalizedStaffId,
    });

    if (existingStaff) {
      return res.status(409).json({
        message: "This staff ID is already registered.",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      role: "lecturer",
    });

    try {
      const staff = await Staff.create({
        userId: user._id,
        staffId: normalizedStaffId,
        name: name.trim(),
        email: normalizedEmail,
        department: department.trim(),
        qualification: qualification?.trim() || "",
        designation: designation || "Lecturer",
        status: status || "active",
      });

      const populatedStaff = await Staff.findById(staff._id)
        .populate("userId", "name email role")
        .populate("subjects", "subjectName subjectCode")
        .populate("courses", "courseName courseCode");

      return res.status(201).json({
        message: "Staff member created successfully.",
        staff: populatedStaff,
      });
    } catch (staffError) {
      await User.findByIdAndDelete(user._id);
      throw staffError;
    }
  } catch (error) {
    console.error("Create staff error:", error);

    return res.status(500).json({
      message: "Unable to create staff member.",
      error: error.message,
    });
  }
};

const getAllStaff = async (req, res) => {
  try {
    const staff = await Staff.find()
      .populate("userId", "name email role")
      .populate("subjects", "subjectName subjectCode")
      .populate("courses", "courseName courseCode")
      .sort({ createdAt: -1 });

    return res.status(200).json(staff);
  } catch (error) {
    console.error("Get staff error:", error);

    return res.status(500).json({
      message: "Unable to retrieve staff members.",
      error: error.message,
    });
  }
};

const getStaffById = async (req, res) => {
  try {
    const staff = await Staff.findById(req.params.id)
      .populate("userId", "name email role")
      .populate("subjects", "subjectName subjectCode")
      .populate("courses", "courseName courseCode");

    if (!staff) {
      return res.status(404).json({
        message: "Staff member not found.",
      });
    }

    return res.status(200).json(staff);
  } catch (error) {
    return res.status(500).json({
      message: "Unable to retrieve staff member.",
      error: error.message,
    });
  }
};

const updateStaff = async (req, res) => {
  try {
    const {
      name,
      email,
      staffId,
      department,
      qualification,
      designation,
      status,
    } = req.body;

    const staff = await Staff.findById(req.params.id);

    if (!staff) {
      return res.status(404).json({
        message: "Staff member not found.",
      });
    }

    const normalizedEmail = email?.trim().toLowerCase();
    const normalizedStaffId = staffId?.trim().toUpperCase();

    if (normalizedEmail && normalizedEmail !== staff.email) {
      const existingUser = await User.findOne({
        email: normalizedEmail,
        _id: { $ne: staff.userId },
      });

      if (existingUser) {
        return res.status(409).json({
          message: "Another account already uses this email.",
        });
      }
    }

    if (normalizedStaffId && normalizedStaffId !== staff.staffId) {
      const existingStaffId = await Staff.findOne({
        staffId: normalizedStaffId,
        _id: { $ne: staff._id },
      });

      if (existingStaffId) {
        return res.status(409).json({
          message: "Another staff member already uses this staff ID.",
        });
      }
    }

    staff.name = name?.trim() || staff.name;
    staff.email = normalizedEmail || staff.email;
    staff.staffId = normalizedStaffId || staff.staffId;
    staff.department = department?.trim() || staff.department;
    staff.qualification =
      qualification !== undefined
        ? qualification.trim()
        : staff.qualification;
    staff.designation = designation || staff.designation;
    staff.status = status || staff.status;

    await staff.save();

    await User.findByIdAndUpdate(
      staff.userId,
      {
        name: staff.name,
        email: staff.email,
      },
      {
        new: true,
        runValidators: true,
      }
    );

    const updatedStaff = await Staff.findById(staff._id)
      .populate("userId", "name email role")
      .populate("subjects", "subjectName subjectCode")
      .populate("courses", "courseName courseCode");

    return res.status(200).json({
      message: "Staff member updated successfully.",
      staff: updatedStaff,
    });
  } catch (error) {
    console.error("Update staff error:", error);

    return res.status(500).json({
      message: "Unable to update staff member.",
      error: error.message,
    });
  }
};

const deleteStaff = async (req, res) => {
  try {
    const staff = await Staff.findById(req.params.id);

    if (!staff) {
      return res.status(404).json({
        message: "Staff member not found.",
      });
    }

    const linkedUserId = staff.userId;

    await Staff.findByIdAndDelete(req.params.id);

    if (linkedUserId) {
      await User.findByIdAndDelete(linkedUserId);
    }

    return res.status(200).json({
      message: "Staff member deleted successfully.",
    });
  } catch (error) {
    console.error("Delete staff error:", error);

    return res.status(500).json({
      message: "Unable to delete staff member.",
      error: error.message,
    });
  }
};

module.exports = {
  createStaff,
  getAllStaff,
  getStaffById,
  updateStaff,
  deleteStaff,
};