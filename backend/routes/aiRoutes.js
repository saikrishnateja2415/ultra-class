const express = require("express");
const crypto = require("crypto");

const Question = require("../models/Question");
const Session = require("../models/Session");
const Student = require("../models/Student");
const SessionAIAnalysis = require(
    "../models/SessionAIAnalysis"
);

const {
    generateStructuredContent,
    getGeminiModel,
} = require("../services/geminiService");

const router = express.Router();

/*
The fingerprint identifies the exact collection of
questions analysed. If questions have not changed,
the saved AI result can be reused.
*/

function createQuestionFingerprint(questions) {
    const fingerprintContent = questions
        .map((question) => ({
            id: question._id.toString(),
            question: question.question.trim(),
            updatedAt: question.updatedAt,
        }))
        .sort((firstQuestion, secondQuestion) =>
            firstQuestion.id.localeCompare(
                secondQuestion.id
            )
        );

    return crypto
        .createHash("sha256")
        .update(JSON.stringify(fingerprintContent))
        .digest("hex");
}

/*
Unlike the clustering fingerprint, this includes
lecturer answers and question statuses because they
are used to generate the session summary.
*/

function createSummaryContentFingerprint(questions) {
  const fingerprintContent = questions
    .map((question) => ({
      id: question._id.toString(),

      question:
        question.question?.trim() || "",

      answer:
        question.answer?.trim() || "",

      status:
        question.status || "Pending",

      pinned:
        Boolean(question.pinned),

      updatedAt:
        question.updatedAt || null,
    }))
    .sort((firstQuestion, secondQuestion) =>
      firstQuestion.id.localeCompare(
        secondQuestion.id
      )
    );

  return crypto
    .createHash("sha256")
    .update(JSON.stringify(fingerprintContent))
    .digest("hex");
}

async function findLecturerSession({
    sessionId,
    lecturerId,
}) {
    if (!sessionId || !lecturerId) {
        return null;
    }

    return Session.findOne({
        _id: sessionId,
        lecturerId,
    });
}


function formatAndValidateClusters(
    generatedClusters,
    questions
) {
    const questionMap = new Map(
        questions.map((question) => [
            question._id.toString(),
            question,
        ])
    );

    const assignedQuestionIds = new Set();

    const validClusters = (
        generatedClusters || []
    )
        .map((cluster) => {
            const clusterQuestions = (
                cluster.questionIds || []
            )
                .map((questionId) => {
                    const normalisedId =
                        questionId?.toString();

                    const matchedQuestion =
                        questionMap.get(normalisedId);

                    if (
                        !matchedQuestion ||
                        assignedQuestionIds.has(normalisedId)
                    ) {
                        return null;
                    }

                    assignedQuestionIds.add(normalisedId);

                    return {
                        questionId: matchedQuestion._id,
                        questionText:
                            matchedQuestion.question,
                    };
                })
                .filter(Boolean);

            if (clusterQuestions.length === 0) {
                return null;
            }

            const acceptedPriorities = [
                "Low",
                "Medium",
                "High",
            ];

            return {
                clusterName:
                    cluster.clusterName?.trim() ||
                    "Related Questions",

                description:
                    cluster.description?.trim() || "",

                priority: acceptedPriorities.includes(
                    cluster.priority
                )
                    ? cluster.priority
                    : "Medium",

                questions: clusterQuestions,

                questionCount:
                    clusterQuestions.length,
            };
        })
        .filter(Boolean);

    /*
      Gemini may occasionally omit a question.

      Any omitted questions are placed into a safe
      fallback cluster so no student question is lost.
    */

    const unassignedQuestions = questions.filter(
        (question) =>
            !assignedQuestionIds.has(
                question._id.toString()
            )
    );

    if (unassignedQuestions.length > 0) {
        validClusters.push({
            clusterName: "Other Questions",

            description:
                "Questions that did not strongly match another generated topic.",

            priority: "Medium",

            questions: unassignedQuestions.map(
                (question) => ({
                    questionId: question._id,
                    questionText: question.question,
                })
            ),

            questionCount: unassignedQuestions.length,
        });
    }

    return validClusters;
}

router.post(
    "/ai/sessions/:sessionId/question-clusters",
    async (req, res) => {
        let session = null;

        try {
            const { sessionId } = req.params;

            const {
                lecturerId,
                forceRegenerate = false,
            } = req.body;

            if (!lecturerId) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Lecturer account is required",
                });
            }

            /*
              Confirm that this session belongs to the
              lecturer requesting the analysis.
            */

            session = await findLecturerSession({
                sessionId,
                lecturerId,
            });

            if (!session) {
                return res.status(404).json({
                    success: false,
                    message:
                        "Session not found or you are not authorised to analyse it",
                });
            }

            /*
              Only anonymous question text and database
              question IDs are selected.

              Student names, emails and student IDs are
              never sent to Gemini.
            */

            const questions = await Question.find({
                sessionId: session._id,
            })
                .select(
                    "_id question createdAt updatedAt"
                )
                .sort({
                    createdAt: 1,
                })
                .lean();

            if (questions.length < 2) {
                return res.status(400).json({
                    success: false,
                    message:
                        "At least two questions are required for meaningful AI clustering",
                });
            }

            const questionFingerprint =
                createQuestionFingerprint(questions);

            const existingAnalysis =
                await SessionAIAnalysis.findOne({
                    sessionId: session._id,
                });

            /*
              Return the saved result when questions have
              not changed, unless the lecturer explicitly
              requests regeneration.
            */

            if (
                !forceRegenerate &&
                existingAnalysis
                    ?.questionClustering?.status ===
                "completed" &&
                existingAnalysis
                    ?.questionClustering
                    ?.questionFingerprint ===
                questionFingerprint
            ) {
                return res.status(200).json({
                    success: true,
                    message:
                        "Saved question clusters loaded",

                    cached: true,

                    clustering:
                        existingAnalysis.questionClustering,

                    metadata:
                        existingAnalysis.metadata,
                });
            }

            /*
              Save the generating state before contacting
              Gemini.
            */

            await SessionAIAnalysis.findOneAndUpdate(
                {
                    sessionId: session._id,
                },
                {
                    $set: {
                        sessionCode: session.sessionCode,
                        lecturerId: session.lecturerId,

                        "questionClustering.status":
                            "generating",

                        "questionClustering.errorMessage":
                            "",
                    },
                },
                {
                    upsert: true,
                    returnDocument: "after",
                    setDefaultsOnInsert: true,
                }
            );

            const questionList = questions
                .map(
                    (question, index) =>
                        `${index + 1}. ID: ${question._id}\nQuestion: ${question.question}`
                )
                .join("\n\n");

            const prompt = `
You are analysing anonymous classroom questions from one university teaching session.

Session title: ${session.title}
Subject: ${session.subjectName}
Subject code: ${session.moduleCode}

Group semantically similar questions into clear teaching-topic clusters.

Requirements:
1. Every question ID must appear exactly once.
2. Do not invent, rewrite or remove question IDs.
3. Use concise and meaningful cluster names.
4. Provide a short description explaining the shared topic.
5. Set priority to High when many questions indicate confusion or an important unresolved concept.
6. Set priority to Medium for normal clarification topics.
7. Set priority to Low for isolated or less urgent questions.
8. Return only the structured JSON required by the schema.
9. Do not identify or make assumptions about students.

Anonymous questions:

${questionList}
      `.trim();

            const responseJsonSchema = {
                type: "object",

                properties: {
                    clusters: {
                        type: "array",

                        items: {
                            type: "object",

                            properties: {
                                clusterName: {
                                    type: "string",
                                },

                                description: {
                                    type: "string",
                                },

                                priority: {
                                    type: "string",
                                    enum: [
                                        "Low",
                                        "Medium",
                                        "High",
                                    ],
                                },

                                questionIds: {
                                    type: "array",

                                    items: {
                                        type: "string",
                                    },
                                },
                            },

                            required: [
                                "clusterName",
                                "description",
                                "priority",
                                "questionIds",
                            ],
                        },
                    },
                },

                required: ["clusters"],
            };

            const generatedResult =
                await generateStructuredContent({
                    prompt,
                    responseJsonSchema,
                });

            const formattedClusters =
                formatAndValidateClusters(
                    generatedResult.clusters,
                    questions
                );

            if (formattedClusters.length === 0) {
                throw new Error(
                    "Gemini did not generate any valid question clusters"
                );
            }

            const generatedAt = new Date();

            const savedAnalysis =
                await SessionAIAnalysis.findOneAndUpdate(
                    {
                        sessionId: session._id,
                    },
                    {
                        $set: {
                            sessionCode: session.sessionCode,
                            lecturerId: session.lecturerId,

                            "questionClustering.status":
                                "completed",

                            "questionClustering.clusters":
                                formattedClusters,

                            "questionClustering.totalQuestionsAnalysed":
                                questions.length,

                            "questionClustering.generatedAt":
                                generatedAt,

                            "questionClustering.questionFingerprint":
                                questionFingerprint,

                            "questionClustering.errorMessage":
                                "",

                            "metadata.provider":
                                "Google Gemini",

                            "metadata.model":
                                getGeminiModel(),

                            "metadata.lastGeneratedAt":
                                generatedAt,
                        },
                    },
                    {
                        returnDocument: "after",
                        upsert: true,
                        setDefaultsOnInsert: true,
                    }
                );

            return res.status(200).json({
                success: true,

                message:
                    "Question clusters generated successfully",

                cached: false,

                clustering:
                    savedAnalysis.questionClustering,

                metadata: savedAnalysis.metadata,
            });
        } catch (error) {
            console.error(
                "Generate question clusters error:",
                error
            );

            /*
              Record the failed status when the session was
              successfully identified.
            */

            if (session?._id) {
                try {
                    await SessionAIAnalysis.findOneAndUpdate(
                        {
                            sessionId: session._id,
                        },
                        {
                            $set: {
                                "questionClustering.status":
                                    "failed",

                                "questionClustering.errorMessage":
                                    error.message,
                            },
                        }
                    );
                } catch (saveError) {
                    console.error(
                        "Save clustering failure error:",
                        saveError
                    );
                }
            }

            if (error.name === "CastError") {
                return res.status(400).json({
                    success: false,
                    message:
                        "Invalid session or lecturer information",
                });
            }

            return res.status(500).json({
                success: false,

                message:
                    "Unable to generate question clusters",

                error:
                    process.env.NODE_ENV === "production"
                        ? undefined
                        : error.message,
            });
        }
    }
);

router.get(
    "/ai/sessions/:sessionId/question-clusters",
    async (req, res) => {
        try {
            const { sessionId } = req.params;
            const { lecturerId } = req.query;

            if (!lecturerId) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Lecturer account is required",
                });
            }

            const session = await findLecturerSession({
                sessionId,
                lecturerId,
            });

            if (!session) {
                return res.status(404).json({
                    success: false,
                    message:
                        "Session not found or you are not authorised to view its analysis",
                });
            }

            const analysis =
                await SessionAIAnalysis.findOne({
                    sessionId: session._id,
                });

            if (
                !analysis ||
                analysis.questionClustering.status ===
                "not_generated"
            ) {
                return res.status(200).json({
                    success: true,
                    generated: false,
                    clustering: null,
                });
            }

            return res.status(200).json({
                success: true,

                generated:
                    analysis.questionClustering.status ===
                    "completed",

                clustering:
                    analysis.questionClustering,

                metadata: analysis.metadata,
            });
        } catch (error) {
            console.error(
                "Get saved question clusters error:",
                error
            );

            if (error.name === "CastError") {
                return res.status(400).json({
                    success: false,
                    message: "Invalid session information",
                });
            }

            return res.status(500).json({
                success: false,
                message:
                    "Unable to load saved question clusters",
            });
        }
    }
);


router.post(
  "/ai/sessions/:sessionId/summary",
  async (req, res) => {
    let session = null;

    try {
      const { sessionId } = req.params;

      const {
        lecturerId,
        forceRegenerate = false,
      } = req.body;

      if (!lecturerId) {
        return res.status(400).json({
          success: false,
          message:
            "Lecturer account is required",
        });
      }

      /*
        Verify that the selected session belongs to
        the lecturer requesting the summary.
      */

      session = await findLecturerSession({
        sessionId,
        lecturerId,
      });

      if (!session) {
        return res.status(404).json({
          success: false,
          message:
            "Session not found or you are not authorised to summarise it",
        });
      }

      /*
        Load anonymous classroom content.

        Student names, emails and user IDs are not
        selected or sent to Gemini.
      */

      const questions = await Question.find({
        sessionId: session._id,
      })
        .select(
          "_id question answer status pinned createdAt updatedAt"
        )
        .sort({
          createdAt: 1,
        })
        .lean();

      if (questions.length === 0) {
        return res.status(400).json({
          success: false,
          message:
            "At least one question is required to generate a session summary",
        });
      }

      const contentFingerprint =
        createSummaryContentFingerprint(
          questions
        );

      const existingAnalysis =
        await SessionAIAnalysis.findOne({
          sessionId: session._id,
        });

      /*
        Reuse the saved summary when questions and
        answers have not changed.
      */

      if (
        !forceRegenerate &&
        existingAnalysis?.sessionSummary
          ?.status === "completed" &&
        existingAnalysis?.sessionSummary
          ?.contentFingerprint ===
          contentFingerprint
      ) {
        return res.status(200).json({
          success: true,

          message:
            "Saved session summary loaded",

          cached: true,

          sessionSummary:
            existingAnalysis.sessionSummary,

          metadata:
            existingAnalysis.metadata,
        });
      }

      /*
        Mark the summary as generating.

        Any regenerated summary becomes unpublished
        until the lecturer reviews it again.
      */

      await SessionAIAnalysis.findOneAndUpdate(
        {
          sessionId: session._id,
        },
        {
          $set: {
            sessionCode: session.sessionCode,
            lecturerId: session.lecturerId,

            "sessionSummary.status":
              "generating",

            "sessionSummary.errorMessage":
              "",

            "sessionSummary.isPublished":
              false,

            "sessionSummary.publishedAt":
              null,
          },
        },
        {
          upsert: true,
          returnDocument: "after",
          setDefaultsOnInsert: true,
        }
      );

      /*
        Include saved cluster topics when Feature 1
        has already been generated.
      */

      const savedClusters =
        existingAnalysis?.questionClustering
          ?.status === "completed"
          ? existingAnalysis.questionClustering
              .clusters
          : [];

      const clusterContext =
        savedClusters.length === 0
          ? "No saved question clusters are available."
          : savedClusters
              .map(
                (cluster, index) =>
                  `${index + 1}. ${
                    cluster.clusterName
                  }: ${cluster.description}`
              )
              .join("\n");

      const questionAndAnswerContext =
        questions
          .map((question, index) => {
            const lecturerAnswer =
              question.answer?.trim()
                ? question.answer.trim()
                : "No lecturer answer was provided.";

            return `
Question ${index + 1}:
${question.question}

Lecturer answer:
${lecturerAnswer}

Status:
${question.status || "Pending"}

Pinned:
${question.pinned ? "Yes" : "No"}
            `.trim();
          })
          .join("\n\n");

      const prompt = `
You are creating a factual teaching-session summary for a university lecturer.

Session title: ${session.title}
Subject: ${session.subjectName}
Subject code: ${session.moduleCode}
Session status: ${session.status}

Previously detected question topics:
${clusterContext}

Anonymous student questions and lecturer answers:
${questionAndAnswerContext}

Instructions:

1. Write a concise session summary based only on the supplied content.
2. Do not invent lecture material, explanations or learning outcomes.
3. Identify the main topics discussed.
4. Identify common student difficulties shown by the questions.
5. Extract important explanations only when supported by lecturer answers.
6. If questions have no lecturer answers, state the difficulty but do not invent an explanation.
7. Create practical revision points grounded in the supplied content.
8. Do not identify or make assumptions about individual students.
9. Do not mention student names because the questions are anonymous.
10. Return only the structured JSON required by the schema.
      `.trim();

      const responseJsonSchema = {
        type: "object",

        properties: {
          summary: {
            type: "string",
          },

          keyTopics: {
            type: "array",
            items: {
              type: "string",
            },
          },

          commonDifficulties: {
            type: "array",
            items: {
              type: "string",
            },
          },

          importantExplanations: {
            type: "array",
            items: {
              type: "string",
            },
          },

          revisionPoints: {
            type: "array",
            items: {
              type: "string",
            },
          },
        },

        required: [
          "summary",
          "keyTopics",
          "commonDifficulties",
          "importantExplanations",
          "revisionPoints",
        ],
      };

      const generatedResult =
        await generateStructuredContent({
          prompt,
          responseJsonSchema,
        });

      if (!generatedResult.summary?.trim()) {
        throw new Error(
          "Gemini returned an empty session summary"
        );
      }

      /*
        Remove empty and duplicated list items before
        saving the result.
      */

      const cleanStringArray = (items) => {
        if (!Array.isArray(items)) {
          return [];
        }

        return [
          ...new Set(
            items
              .filter(
                (item) =>
                  typeof item === "string"
              )
              .map((item) => item.trim())
              .filter(Boolean)
          ),
        ];
      };

      const generatedAt = new Date();

      const savedAnalysis =
        await SessionAIAnalysis.findOneAndUpdate(
          {
            sessionId: session._id,
          },
          {
            $set: {
              sessionCode: session.sessionCode,
              lecturerId: session.lecturerId,

              "sessionSummary.status":
                "completed",

              "sessionSummary.summary":
                generatedResult.summary.trim(),

              "sessionSummary.keyTopics":
                cleanStringArray(
                  generatedResult.keyTopics
                ),

              "sessionSummary.commonDifficulties":
                cleanStringArray(
                  generatedResult.commonDifficulties
                ),

              "sessionSummary.importantExplanations":
                cleanStringArray(
                  generatedResult.importantExplanations
                ),

              "sessionSummary.revisionPoints":
                cleanStringArray(
                  generatedResult.revisionPoints
                ),

              "sessionSummary.contentFingerprint":
                contentFingerprint,

              "sessionSummary.generatedAt":
                generatedAt,

              "sessionSummary.errorMessage":
                "",

              "sessionSummary.isPublished":
                false,

              "sessionSummary.publishedAt":
                null,

              "metadata.provider":
                "Google Gemini",

              "metadata.model":
                getGeminiModel(),

              "metadata.lastGeneratedAt":
                generatedAt,
            },
          },
          {
            returnDocument: "after",
            upsert: true,
            setDefaultsOnInsert: true,
          }
        );

      return res.status(200).json({
        success: true,

        message:
          "AI session summary generated successfully",

        cached: false,

        sessionSummary:
          savedAnalysis.sessionSummary,

        metadata: savedAnalysis.metadata,
      });
    } catch (error) {
      console.error(
        "Generate AI session summary error:",
        error
      );

      /*
        Record failure without affecting existing
        question clusters.
      */

      if (session?._id) {
        try {
          await SessionAIAnalysis.findOneAndUpdate(
            {
              sessionId: session._id,
            },
            {
              $set: {
                "sessionSummary.status":
                  "failed",

                "sessionSummary.errorMessage":
                  error.message,
              },
            }
          );
        } catch (saveError) {
          console.error(
            "Save session summary failure error:",
            saveError
          );
        }
      }

      if (error.name === "CastError") {
        return res.status(400).json({
          success: false,
          message:
            "Invalid session or lecturer information",
        });
      }

      return res.status(500).json({
        success: false,

        message:
          "Unable to generate AI session summary",

        error:
          process.env.NODE_ENV === "production"
            ? undefined
            : error.message,
      });
    }
  }
);

router.get(
  "/ai/sessions/:sessionId/summary",
  async (req, res) => {
    try {
      const { sessionId } = req.params;
      const { lecturerId } = req.query;

      if (!lecturerId) {
        return res.status(400).json({
          success: false,
          message:
            "Lecturer account is required",
        });
      }

      /*
        Confirm that the session belongs to the
        lecturer requesting its summary.
      */

      const session =
        await findLecturerSession({
          sessionId,
          lecturerId,
        });

      if (!session) {
        return res.status(404).json({
          success: false,
          message:
            "Session not found or you are not authorised to view its summary",
        });
      }

      const analysis =
        await SessionAIAnalysis.findOne({
          sessionId: session._id,
        });

      if (
        !analysis ||
        analysis.sessionSummary.status ===
          "not_generated"
      ) {
        return res.status(200).json({
          success: true,
          generated: false,
          sessionSummary: null,
          metadata: null,
        });
      }

      return res.status(200).json({
        success: true,

        generated:
          analysis.sessionSummary.status ===
          "completed",

        sessionSummary:
          analysis.sessionSummary,

        metadata: analysis.metadata,
      });
    } catch (error) {
      console.error(
        "Get AI session summary error:",
        error
      );

      if (error.name === "CastError") {
        return res.status(400).json({
          success: false,
          message:
            "Invalid session information",
        });
      }

      return res.status(500).json({
        success: false,
        message:
          "Unable to load AI session summary",
      });
    }
  }
);

router.put(
  "/ai/sessions/:sessionId/summary",
  async (req, res) => {
    try {
      const { sessionId } = req.params;

      const {
        lecturerId,
        summary,
        keyTopics,
        commonDifficulties,
        importantExplanations,
        revisionPoints,
      } = req.body;

      if (!lecturerId) {
        return res.status(400).json({
          success: false,
          message:
            "Lecturer account is required",
        });
      }

      if (!summary?.trim()) {
        return res.status(400).json({
          success: false,
          message:
            "The session overview cannot be empty",
        });
      }

      const session =
        await findLecturerSession({
          sessionId,
          lecturerId,
        });

      if (!session) {
        return res.status(404).json({
          success: false,
          message:
            "Session not found or you are not authorised to edit its summary",
        });
      }

      const existingAnalysis =
        await SessionAIAnalysis.findOne({
          sessionId: session._id,
        });

      if (
        !existingAnalysis ||
        existingAnalysis.sessionSummary.status !==
          "completed"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Generate a session summary before editing it",
        });
      }

      /*
        Validate and clean each lecturer-edited list.
      */

      const cleanStringArray = (items) => {
        if (!Array.isArray(items)) {
          return [];
        }

        return [
          ...new Set(
            items
              .filter(
                (item) =>
                  typeof item === "string"
              )
              .map((item) => item.trim())
              .filter(Boolean)
          ),
        ];
      };

      existingAnalysis.sessionSummary.summary =
        summary.trim();

      existingAnalysis.sessionSummary.keyTopics =
        cleanStringArray(keyTopics);

      existingAnalysis.sessionSummary
        .commonDifficulties =
        cleanStringArray(commonDifficulties);

      existingAnalysis.sessionSummary
        .importantExplanations =
        cleanStringArray(importantExplanations);

      existingAnalysis.sessionSummary
        .revisionPoints =
        cleanStringArray(revisionPoints);

      /*
        Editing creates a new private draft.

        If a previously published summary is edited,
        it must be reviewed and published again.
      */

      existingAnalysis.sessionSummary.isPublished =
        false;

      existingAnalysis.sessionSummary.publishedAt =
        null;

      await existingAnalysis.save();

      return res.status(200).json({
        success: true,

        message:
          "Session summary draft saved successfully",

        sessionSummary:
          existingAnalysis.sessionSummary,

        metadata:
          existingAnalysis.metadata,
      });
    } catch (error) {
      console.error(
        "Save edited session summary error:",
        error
      );

      if (error.name === "CastError") {
        return res.status(400).json({
          success: false,
          message:
            "Invalid session or lecturer information",
        });
      }

      return res.status(500).json({
        success: false,
        message:
          "Unable to save the session summary draft",
      });
    }
  }
);


/*
====================================================
LECTURER PUBLISHES SESSION SUMMARY
====================================================
*/

router.put(
  "/ai/sessions/:sessionId/summary/publish",
  async (req, res) => {
    try {
      const { sessionId } = req.params;
      const { lecturerId } = req.body;

      if (!lecturerId) {
        return res.status(400).json({
          success: false,
          message:
            "Lecturer account is required",
        });
      }

      const session =
        await findLecturerSession({
          sessionId,
          lecturerId,
        });

      if (!session) {
        return res.status(404).json({
          success: false,
          message:
            "Session not found or you are not authorised to publish its summary",
        });
      }

      /*
        Students should receive the final learning
        material only after classroom activity ends.
      */

      if (session.status !== "ended") {
        return res.status(400).json({
          success: false,
          message:
            "End the session before publishing its summary",
        });
      }

      const analysis =
        await SessionAIAnalysis.findOne({
          sessionId: session._id,
        });

      if (
        !analysis ||
        analysis.sessionSummary.status !==
          "completed" ||
        !analysis.sessionSummary.summary?.trim()
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Generate and review the summary before publishing it",
        });
      }

      if (
        analysis.sessionSummary.isPublished
      ) {
        return res.status(200).json({
          success: true,
          message:
            "Session summary is already published",
          sessionSummary:
            analysis.sessionSummary,
        });
      }

      analysis.sessionSummary.isPublished = true;
      analysis.sessionSummary.publishedAt =
        new Date();

      await analysis.save();

      return res.status(200).json({
        success: true,

        message:
          "Session summary published successfully",

        sessionSummary:
          analysis.sessionSummary,

        metadata: analysis.metadata,
      });
    } catch (error) {
      console.error(
        "Publish session summary error:",
        error
      );

      if (error.name === "CastError") {
        return res.status(400).json({
          success: false,
          message:
            "Invalid session or lecturer information",
        });
      }

      return res.status(500).json({
        success: false,
        message:
          "Unable to publish the session summary",
      });
    }
  }
);

router.put(
  "/ai/sessions/:sessionId/summary/unpublish",
  async (req, res) => {
    try {
      const { sessionId } = req.params;
      const { lecturerId } = req.body;

      if (!lecturerId) {
        return res.status(400).json({
          success: false,
          message:
            "Lecturer account is required",
        });
      }

      const session =
        await findLecturerSession({
          sessionId,
          lecturerId,
        });

      if (!session) {
        return res.status(404).json({
          success: false,
          message:
            "Session not found or you are not authorised to unpublish its summary",
        });
      }

      const analysis =
        await SessionAIAnalysis.findOne({
          sessionId: session._id,
        });

      if (
        !analysis ||
        analysis.sessionSummary.status !==
          "completed"
      ) {
        return res.status(404).json({
          success: false,
          message:
            "A generated session summary was not found",
        });
      }

      if (
        !analysis.sessionSummary.isPublished
      ) {
        return res.status(200).json({
          success: true,
          message:
            "Session summary is already private",
          sessionSummary:
            analysis.sessionSummary,
        });
      }

      analysis.sessionSummary.isPublished = false;
      analysis.sessionSummary.publishedAt = null;

      await analysis.save();

      return res.status(200).json({
        success: true,

        message:
          "Session summary unpublished successfully",

        sessionSummary:
          analysis.sessionSummary,

        metadata: analysis.metadata,
      });
    } catch (error) {
      console.error(
        "Unpublish session summary error:",
        error
      );

      if (error.name === "CastError") {
        return res.status(400).json({
          success: false,
          message:
            "Invalid session or lecturer information",
        });
      }

      return res.status(500).json({
        success: false,
        message:
          "Unable to unpublish the session summary",
      });
    }
  }
);


router.get(
  "/ai/student/sessions/:sessionId/published-summary",
  async (req, res) => {
    try {
      const { sessionId } = req.params;

      /*
        studentId is the logged-in User account ID,
        matching the existing student dashboard.
      */

      const { studentId } = req.query;

      if (!studentId) {
        return res.status(400).json({
          success: false,
          message:
            "Student account is required",
        });
      }

      const session = await Session.findById(
        sessionId
      ).select(
        "title moduleCode subjectId subjectName sessionCode lecturerName status endedAt participants"
      );

      if (!session) {
        return res.status(404).json({
          success: false,
          message: "Session not found",
        });
      }

      /*
        Published summaries are available only after
        the classroom session has ended.
      */

      if (session.status !== "ended") {
        return res.status(403).json({
          success: false,
          message:
            "The summary will be available after the session ends",
        });
      }

      /*
        Confirm that the User account belongs to an
        active Student registered for this subject.
      */

      const student = await Student.findOne({
        userId: studentId,
        status: "active",
        subjects: session.subjectId,
      }).select("_id userId subjects status");

      if (!student) {
        return res.status(403).json({
          success: false,
          message:
            "You are not registered for this session's subject",
        });
      }

      /*
        Confirm that the student joined this specific
        classroom session.
      */

      const joinedSession = (
        session.participants || []
      ).some(
        (participant) =>
          participant.studentId.toString() ===
          student._id.toString()
      );

      if (!joinedSession) {
        return res.status(403).json({
          success: false,
          message:
            "This summary is available only to students who joined the session",
        });
      }

      const analysis =
        await SessionAIAnalysis.findOne({
          sessionId: session._id,

          "sessionSummary.status":
            "completed",

          "sessionSummary.isPublished":
            true,
        }).select(
          "sessionSummary.summary sessionSummary.keyTopics sessionSummary.commonDifficulties sessionSummary.importantExplanations sessionSummary.revisionPoints sessionSummary.generatedAt sessionSummary.publishedAt"
        );

      if (!analysis) {
        return res.status(404).json({
          success: false,
          message:
            "The lecturer has not published a summary for this session",
        });
      }

      /*
        Return only approved student-facing content.

        Internal AI metadata, fingerprints, errors,
        sentiment and teaching recommendations are
        intentionally excluded.
      */

      return res.status(200).json({
        success: true,

        session: {
          _id: session._id,
          title: session.title,
          moduleCode: session.moduleCode,
          subjectName: session.subjectName,
          sessionCode: session.sessionCode,
          lecturerName: session.lecturerName,
          status: session.status,
          endedAt: session.endedAt,
        },

        sessionSummary: {
          summary:
            analysis.sessionSummary.summary,

          keyTopics:
            analysis.sessionSummary.keyTopics,

          commonDifficulties:
            analysis.sessionSummary
              .commonDifficulties,

          importantExplanations:
            analysis.sessionSummary
              .importantExplanations,

          revisionPoints:
            analysis.sessionSummary
              .revisionPoints,

          generatedAt:
            analysis.sessionSummary.generatedAt,

          publishedAt:
            analysis.sessionSummary.publishedAt,
        },
      });
    } catch (error) {
      console.error(
        "Get student published summary error:",
        error
      );

      if (error.name === "CastError") {
        return res.status(400).json({
          success: false,
          message:
            "Invalid student or session information",
        });
      }

      return res.status(500).json({
        success: false,
        message:
          "Unable to load the published session summary",
      });
    }
  }
);

module.exports = router;