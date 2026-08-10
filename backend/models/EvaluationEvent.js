const mongoose = require("mongoose");

const evaluationEventSchema = new mongoose.Schema(
  {
    participantCode: {
      type: String,
      required: true,
      index: true,
      immutable: true,
    },
    role: {
      type: String,
      enum: ["admin", "lecturer", "student"],
      required: true,
      index: true,
    },
    eventType: {
      type: String,
      enum: [
        "session_created",
        "session_joined",
        "session_ended",
        "question_submitted",
        "question_answered",
        "ai_analysis_generated",
        "ai_summary_published",
        "quiz_opened",
        "quiz_submitted",
        "quiz_closed",
        "quiz_reviewed",
      ],
      required: true,
      index: true,
    },
    sessionCode: {
      type: String,
      default: "",
      index: true,
    },
    subjectCode: {
      type: String,
      default: "",
    },
    metrics: {
      questionCount: { type: Number, default: null },
      answeredCount: { type: Number, default: null },
      responseCount: { type: Number, default: null },
      correctCount: { type: Number, default: null },
      scorePercentage: { type: Number, default: null },
      durationSeconds: { type: Number, default: null },
      success: { type: Boolean, default: true },
    },
    occurredAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

evaluationEventSchema.index({ sessionCode: 1, occurredAt: 1 });
evaluationEventSchema.index({ eventType: 1, occurredAt: 1 });

module.exports = mongoose.model("EvaluationEvent", evaluationEventSchema);