const mongoose = require("mongoose");

const adminSettingsSchema = new mongoose.Schema(
  {
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },

    academicDefaults: {
      academicYear: {
        type: String,
        trim: true,
        default: "2026-2027",
      },

      department: {
        type: String,
        trim: true,
        default: "Computer Science",
      },

      courseStatus: {
        type: String,
        enum: ["active", "inactive", "draft"],
        default: "active",
      },

      subjectStatus: {
        type: String,
        enum: ["active", "inactive", "draft"],
        default: "active",
      },

      semester: {
        type: Number,
        min: 1,
        max: 12,
        default: 1,
      },

      studentYearOfStudy: {
        type: Number,
        min: 1,
        max: 10,
        default: 1,
      },
    },

    attendance: {
      challengeDuration: {
        type: Number,
        min: 15,
        max: 300,
        default: 60,
      },

      tokenExpiryDuration: {
        type: Number,
        min: 15,
        max: 300,
        default: 60,
      },

      allowManualOverride: {
        type: Boolean,
        default: true,
      },

      requireLiveCamera: {
        type: Boolean,
        default: true,
      },

      allowLateAttendance: {
        type: Boolean,
        default: false,
      },

      lateGracePeriod: {
        type: Number,
        min: 0,
        max: 60,
        default: 5,
      },

      attendanceThreshold: {
        type: Number,
        min: 0,
        max: 100,
        default: 75,
      },
    },

    systemPreferences: {
      confirmBeforeDelete: {
        type: Boolean,
        default: true,
      },

      enableExcelExport: {
        type: Boolean,
        default: true,
      },

      rowsPerPage: {
        type: Number,
        enum: [10, 20, 25, 50, 100],
        default: 20,
      },

      displayDensity: {
        type: String,
        enum: ["comfortable", "compact"],
        default: "comfortable",
      },

      dateFormat: {
        type: String,
        enum: ["DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD"],
        default: "DD/MM/YYYY",
      },
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model(
  "AdminSettings",
  adminSettingsSchema
);