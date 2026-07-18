const mongoose = require("mongoose");

const courseSchema = new mongoose.Schema(
  {
    courseName: {
      type: String,
      required: [true, "Course name is required"],
      trim: true,
    },

    courseCode: {
      type: String,
      required: [true, "Course code is required"],
      unique: true,
      trim: true,
      uppercase: true,
    },

    department: {
      type: String,
      required: [true, "Department is required"],
      trim: true,
    },

    qualificationLevel: {
      type: String,
      required: [true, "Qualification level is required"],
      enum: [
        "undergraduate",
        "postgraduate",
        "masters",
        "phd",
        "diploma",
        "certificate",
      ],
    },

    duration: {
      type: String,
      required: [true, "Course duration is required"],
      enum: [
        "1-year",
        "2-years",
        "3-years",
        "4-years",
        "5-years",
      ],
    },

    academicYear: {
      type: String,
      required: [true, "Academic year is required"],
      trim: true,
    },

    description: {
      type: String,
      trim: true,
      default: "",
      maxlength: [1000, "Description cannot exceed 1000 characters"],
    },

    status: {
      type: String,
      enum: ["active", "inactive", "draft"],
      default: "active",
    },

    subjects: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Subject",
      },
    ],

    students: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Student",
      },
    ],
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Course", courseSchema);