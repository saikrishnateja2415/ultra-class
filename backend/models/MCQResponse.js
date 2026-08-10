const mongoose = require("mongoose");

const mcqResponseSchema =
  new mongoose.Schema(
    {
      pollId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "MCQPoll",
        required: [
          true,
          "Poll ID is required",
        ],
        index: true,
      },

      sessionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Session",
        required: [
          true,
          "Session ID is required",
        ],
        index: true,
      },

      studentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Student",
        required: [
          true,
          "Student ID is required",
        ],
        index: true,
      },

      selectedOptionIndex: {
        type: Number,
        required: [
          true,
          "Selected option is required",
        ],
        min: [
          0,
          "Selected option index cannot be negative",
        ],
      },

      isCorrect: {
        type: Boolean,
        required: true,
      },


      submittedAt: {
        type: Date,
        default: Date.now,
        required: true,
      },
    },
    {
      timestamps: true,
    }
  );

mcqResponseSchema.index(
  {
    pollId: 1,
    studentId: 1,
  },
  {
    unique: true,
  }
);

mcqResponseSchema.index({
  pollId: 1,
  submittedAt: -1,
});

mcqResponseSchema.index({
  sessionId: 1,
  submittedAt: -1,
});

mcqResponseSchema.index({
  studentId: 1,
  submittedAt: -1,
});

module.exports = mongoose.model(
  "MCQResponse",
  mcqResponseSchema
);