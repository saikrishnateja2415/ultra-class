const mongoose = require("mongoose");

const staffSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },

    staffId: {
      type: String,
      required: [true, "Staff ID is required"],
      unique: true,
      trim: true,
      uppercase: true,
    },

    name: {
      type: String,
      required: [true, "Staff name is required"],
      trim: true,
    },

    email: {
      type: String,
      required: [true, "Staff email is required"],
      unique: true,
      trim: true,
      lowercase: true,
    },

    department: {
      type: String,
      required: [true, "Department is required"],
      trim: true,
    },

    qualification: {
      type: String,
      trim: true,
      default: "",
    },

    designation: {
      type: String,
      enum: [
        "Lecturer",
        "Senior Lecturer",
        "Professor",
        "Teaching Assistant",
        "Administrator",
      ],
      default: "Lecturer",
    },

    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },

    subjects: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Subject",
      },
    ],

    courses: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Course",
      },
    ],
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Staff", staffSchema);