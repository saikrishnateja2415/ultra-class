const bcrypt = require("bcryptjs");

const User = require("../models/User");
const Student = require("../models/Student");


const buildStudentSettings = async (userId) => {
  const user = await User.findOne({
    _id: userId,
    role: "student",
  })
    .select("_id name email role createdAt")
    .maxTimeMS(5000)
    .lean();

  if (!user) {
    return null;
  }

  const student = await Student.findOne({
    userId: user._id,
  })
    .populate(
      "courseId",
      "courseName courseCode department academicYear"
    )
    .populate(
      "subjects",
      "subjectName subjectCode credits semester"
    )
    .select(
      "userId studentId qualification yearOfStudy courseId subjects status createdAt updatedAt"
    )
    .maxTimeMS(5000)
    .lean();

  if (!student) {
    return null;
  }

  return {
    userId: user._id,
    profileId: student._id,
    name: user.name,
    email: user.email,
    role: user.role,
    studentId: student.studentId,
    qualification: student.qualification || "",
    yearOfStudy: student.yearOfStudy,
    course: student.courseId || null,
    subjects: student.subjects || [],
    status: student.status,
    accountCreatedAt: user.createdAt,
    profileCreatedAt: student.createdAt,
    profileUpdatedAt: student.updatedAt,
  };
};


const getStudentSettings = async (req, res) => {
  try {
    const { userId } = req.params;

    const student = await buildStudentSettings(userId);

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student account or profile was not found.",
      });
    }

    return res.status(200).json({
      success: true,
      student,
    });
  } catch (error) {
    console.error("Get student settings error:", error);

    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid student account information.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Unable to load student settings.",
    });
  }
};



const updateStudentSettingsProfile = async (req, res) => {
  try {
    const { userId } = req.params;
    const { qualification, yearOfStudy } = req.body;

    const cleanedQualification =
      typeof qualification === "string"
        ? qualification.trim()
        : "";

    const parsedYearOfStudy = Number(yearOfStudy);

    if (cleanedQualification.length > 150) {
      return res.status(400).json({
        success: false,
        message:
          "Qualification cannot exceed 150 characters.",
      });
    }

    if (
      !Number.isInteger(parsedYearOfStudy) ||
      parsedYearOfStudy < 1 ||
      parsedYearOfStudy > 10
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Year of study must be a whole number between 1 and 10.",
      });
    }

    const user = await User.findOne({
      _id: userId,
      role: "student",
    })
      .select("_id role")
      .maxTimeMS(5000);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Student account was not found.",
      });
    }

    const studentProfile = await Student.findOne({
      userId: user._id,
    }).maxTimeMS(5000);

    if (!studentProfile) {
      return res.status(404).json({
        success: false,
        message: "Student profile was not found.",
      });
    }

    studentProfile.qualification = cleanedQualification;
    studentProfile.yearOfStudy = parsedYearOfStudy;

    await studentProfile.save();

    const updatedStudent = await buildStudentSettings(user._id);

    return res.status(200).json({
      success: true,
      message: "Student profile updated successfully.",
      student: updatedStudent,
    });
  } catch (error) {
    console.error("Update student settings error:", error);

    if (error.name === "ValidationError") {
      const message = Object.values(error.errors)
        .map((item) => item.message)
        .join(", ");

      return res.status(400).json({
        success: false,
        message,
      });
    }

    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid student account information.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Unable to update student settings.",
    });
  }
};



const changeStudentSettingsPassword = async (req, res) => {
  try {
    const { userId } = req.params;

    const {
      currentPassword,
      newPassword,
      confirmPassword,
    } = req.body;

    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message:
          "Current password, new password and confirmation are required.",
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message:
          "New password and confirmation do not match.",
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message:
          "New password must contain at least 8 characters.",
      });
    }

    if (newPassword.length > 128) {
      return res.status(400).json({
        success: false,
        message:
          "New password cannot exceed 128 characters.",
      });
    }

    if (currentPassword === newPassword) {
      return res.status(400).json({
        success: false,
        message:
          "New password must be different from the current password.",
      });
    }

    const user = await User.findOne({
      _id: userId,
      role: "student",
    }).maxTimeMS(5000);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Student account was not found.",
      });
    }

    const passwordMatches = await bcrypt.compare(
      currentPassword,
      user.password
    );

    if (!passwordMatches) {
      return res.status(401).json({
        success: false,
        message: "Current password is incorrect.",
      });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    return res.status(200).json({
      success: true,
      message:
        "Password changed successfully. Please log in again.",
    });
  } catch (error) {
    console.error("Change student password error:", error);

    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid student account information.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Unable to change student password.",
    });
  }
};

module.exports = {
  getStudentSettings,
  updateStudentSettingsProfile,
  changeStudentSettingsPassword,
};