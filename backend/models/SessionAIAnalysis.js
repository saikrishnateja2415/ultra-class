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

                /*
                  Main lecturer-facing overview of the session.
                */

                summary: {
                    type: String,
                    default: "",
                    trim: true,
                },

                /*
                  Main concepts detected from student questions
                  and lecturer answers.
                */

                keyTopics: {
                    type: [String],
                    default: [],
                },

                /*
                  Concepts where student questions indicate
                  misunderstanding or uncertainty.
                */

                commonDifficulties: {
                    type: [String],
                    default: [],
                },

                /*
                  Important explanations taken from lecturer
                  answers. Gemini must not invent explanations
                  when no lecturer answer exists.
                */

                importantExplanations: {
                    type: [String],
                    default: [],
                },

                /*
                  Suggested revision points based on the session.
                */

                revisionPoints: {
                    type: [String],
                    default: [],
                },

                /*
                  Fingerprint of questions and answers used to
                  generate this summary. This allows us to detect
                  when the session content has changed.
                */

                contentFingerprint: {
                    type: String,
                    default: "",
                },

                generatedAt: {
                    type: Date,
                    default: null,
                },

                errorMessage: {
                    type: String,
                    default: "",
                },

                /*
                  These publishing fields will be used when we
                  later connect the student dashboard.
                */

                isPublished: {
                    type: Boolean,
                    default: false,
                },

                publishedAt: {
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

                /*
                  Deterministic engagement metrics calculated by
                  Ultra Class from session participation and
                  question activity.
                */

                metrics: {
                    registeredStudents: {
                        type: Number,
                        default: 0,
                        min: 0,
                    },

                    joinedStudents: {
                        type: Number,
                        default: 0,
                        min: 0,
                    },

                    participationRate: {
                        type: Number,
                        default: 0,
                        min: 0,
                        max: 100,
                    },

                    totalQuestions: {
                        type: Number,
                        default: 0,
                        min: 0,
                    },

                    answeredQuestions: {
                        type: Number,
                        default: 0,
                        min: 0,
                    },

                    pendingQuestions: {
                        type: Number,
                        default: 0,
                        min: 0,
                    },

                    pinnedQuestions: {
                        type: Number,
                        default: 0,
                        min: 0,
                    },

                    questionsPerParticipant: {
                        type: Number,
                        default: 0,
                        min: 0,
                    },

                    lecturerResponseRate: {
                        type: Number,
                        default: 0,
                        min: 0,
                        max: 100,
                    },
                },

                /*
                  Combined engagement score calculated from
                  participation, question activity and lecturer
                  response coverage.
                */

                engagementScore: {
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

                /*
                  Aggregated learning-language signals detected
                  from anonymous questions.

                  These values do not claim to identify individual
                  student emotions.
                */

                overallLearningSignal: {
                    type: String,
                    enum: [
                        "",
                        "Positive",
                        "Neutral",
                        "Confused",
                        "Mixed",
                    ],
                    default: "",
                },

                signalDistribution: {
                    positive: {
                        type: Number,
                        default: 0,
                        min: 0,
                    },

                    neutral: {
                        type: Number,
                        default: 0,
                        min: 0,
                    },

                    confused: {
                        type: Number,
                        default: 0,
                        min: 0,
                    },
                },

                /*
                  AI-generated aggregated observations.
                */

                observations: {
                    type: [String],
                    default: [],
                },

                confusionIndicators: {
                    type: [String],
                    default: [],
                },

                positiveIndicators: {
                    type: [String],
                    default: [],
                },

                recommendedActions: {
                    type: [String],
                    default: [],
                },

                /*
                  Used to avoid unnecessary Gemini requests when
                  the session questions and answers have not changed.
                */

                contentFingerprint: {
                    type: String,
                    default: "",
                },

                generatedAt: {
                    type: Date,
                    default: null,
                },

                errorMessage: {
                    type: String,
                    default: "",
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