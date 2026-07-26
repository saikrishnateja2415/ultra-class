const mongoose = require("mongoose");


const sessionParticipantSchema =
  new mongoose.Schema(
    {
      /*
        References the student's Student profile,
        not their User account.
      */

      studentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Student",
        required: true,
      },

      joinedAt: {
        type: Date,
        default: Date.now,
      },
    },
    {
      /*
        Participants do not need separate MongoDB
        document IDs inside the session.
      */

      _id: false,
    }
  );

const sessionSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },

    moduleCode: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },

    subjectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subject",
      required: true,
    },

    subjectName: {
      type: String,
      required: true,
      trim: true,
    },

    sessionCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },

    lecturerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    lecturerName: {
      type: String,
      required: true,
      trim: true,
    },

    /*
      Contains students who actually joined this
      specific classroom session.
    */

    participants: {
      type: [sessionParticipantSchema],
      default: [],
    },

    status: {
      type: String,
      enum: ["active", "ended"],
      default: "active",
    },

    /*
      Records the exact time at which the lecturer
      ended the session.
    */

    endedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model(
  "Session",
  sessionSchema
);