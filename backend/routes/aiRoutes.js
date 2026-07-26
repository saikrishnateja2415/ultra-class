const express = require("express");
const crypto = require("crypto");

const Question = require("../models/Question");
const Session = require("../models/Session");
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

module.exports = router;