const mongoose = require("mongoose");

const clusteredQuestionSchema =
  new mongoose.Schema(
    {
      questionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Question",
        required: true,
      },

      questionText: {
        type: String,
        required: true,
        trim: true,
      },
    },
    {
      _id: false,
    }
  );

const questionClusterSchema =
  new mongoose.Schema(
    {
      clusterName: {
        type: String,
        required: true,
        trim: true,
      },

      description: {
        type: String,
        default: "",
        trim: true,
      },

      priority: {
        type: String,
        enum: ["Low", "Medium", "High"],
        default: "Medium",
      },

      questions: {
        type: [clusteredQuestionSchema],
        default: [],
      },

      questionCount: {
        type: Number,
        default: 0,
        min: 0,
      },
    },
    {
      _id: true,
    }
  );

const sessionAIAnalysisSchema =
  new mongoose.Schema(
    {
      sessionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Session",
        required: true,
        unique: true,
        index: true,
      },

      sessionCode: {
        type: String,
        required: true,
        trim: true,
        uppercase: true,
      },

      lecturerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },

      questionClustering: {
        status: {
          type: String,
          enum: [
            "not_generated",
            "generating",
            "completed",
            "failed",
          ],
          default: "not_generated",
        },

        clusters: {
          type: [questionClusterSchema],
          default: [],
        },

        totalQuestionsAnalysed: {
          type: Number,
          default: 0,
          min: 0,
        },

        generatedAt: {
          type: Date,
          default: null,
        },

        questionFingerprint: {
          type: String,
          default: "",
        },

        errorMessage: {
          type: String,
          default: "",
        },
      },

      sessionSummary: {
        status: {
          type: String,
          enum: [
            "not_generated",
            "generating",
            "completed",
            "failed",
          ],
          default: "not_generated",
        },

        summary: {
          type: String,
          default: "",
        },

        keyTopics: {
          type: [String],
          default: [],
        },

        revisionPoints: {
          type: [String],
          default: [],
        },

        generatedAt: {
          type: Date,
          default: null,
        },
      },

      engagementAndSentiment: {
        status: {
          type: String,
          enum: [
            "not_generated",
            "generating",
            "completed",
            "failed",
          ],
          default: "not_generated",
        },

        overallSentiment: {
          type: String,
          enum: [
            "",
            "Positive",
            "Neutral",
            "Confused",
            "Negative",
            "Mixed",
          ],
          default: "",
        },

        sentimentScore: {
          type: Number,
          default: 0,
          min: 0,
          max: 100,
        },

        engagementLevel: {
          type: String,
          enum: ["", "Low", "Moderate", "High"],
          default: "",
        },

        observations: {
          type: [String],
          default: [],
        },

        generatedAt: {
          type: Date,
          default: null,
        },
      },

      teachingRecommendations: {
        status: {
          type: String,
          enum: [
            "not_generated",
            "generating",
            "completed",
            "failed",
          ],
          default: "not_generated",
        },

        recommendations: {
          type: [String],
          default: [],
        },

        priorityTopic: {
          type: String,
          default: "",
        },

        suggestedNextAction: {
          type: String,
          default: "",
        },

        generatedAt: {
          type: Date,
          default: null,
        },
      },

      metadata: {
        provider: {
          type: String,
          default: "",
        },

        model: {
          type: String,
          default: "",
        },

        lastGeneratedAt: {
          type: Date,
          default: null,
        },
      },
    },
    {
      timestamps: true,
    }
  );

module.exports = mongoose.model(
  "SessionAIAnalysis",
  sessionAIAnalysisSchema
);