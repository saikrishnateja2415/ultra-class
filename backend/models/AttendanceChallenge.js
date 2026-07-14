const mongoose = require("mongoose");

const attendanceChallengeSchema = new mongoose.Schema(
  {
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Session",
      required: true,
    },

    sessionCode: {
      type: String,
      required: true,
    },

    lecturerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    challengeId: {
      type: String,
      required: true,
      unique: true,
    },

    challengeCode: {
      type: String,
      required: true,
    },

    shape: {
      type: String,
      required: true,
    },

    color: {
      type: String,
      required: true,
    },

    expiresAt: {
      type: Date,
      required: true,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model(
  "AttendanceChallenge",
  attendanceChallengeSchema
);