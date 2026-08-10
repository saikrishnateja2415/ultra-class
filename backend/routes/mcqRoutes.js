const express = require("express");

const Session = require("../models/Session");
const Student = require("../models/Student");
const MCQPoll = require("../models/MCQPoll");
const MCQResponse = require(
  "../models/MCQResponse"
);
const {
  lecturerOnly,
  studentOnly,
  requireSelf,
} = require("../middleware/authMiddleware");

const router = express.Router();

/*
  Convert an unknown value into a trimmed string.
*/

const normalizeText = (value) => {
  return typeof value === "string"
    ? value.trim()
    : "";
};

/*
  Convert manual options into the structure required
  by MCQPoll.
*/

const normalizeOptions = (options) => {
  if (!Array.isArray(options)) {
    return [];
  }

  return options
    .map((option) => {
      if (typeof option === "string") {
        return {
          text: option.trim(),
        };
      }

      return {
        text: normalizeText(option?.text),
      };
    })
    .filter((option) => option.text);
};

/*
  Confirm that a session belongs to the lecturer.

  No session-status restriction is applied because an
  MCQ can remain open after its classroom session ends.
*/

const findLecturerSession = async (
  sessionId,
  lecturerId
) => {
  return Session.findOne({
    _id: sessionId,
    lecturerId,
  })
    .select(
      "_id title sessionCode subjectId subjectName lecturerId status"
    )
    .maxTimeMS(5000);
};

/*
  Format Mongoose validation errors.
*/

const getValidationMessage = (error) => {
  if (
    error.name !== "ValidationError"
  ) {
    return null;
  }

  return Object.values(error.errors)
    .map((item) => item.message)
    .join(", ");
};

/*
  Validate one Excel row.

  Excel row 1 contains column headings, so the first
  question is Excel row 2.
*/

const validateExcelRow = ({
  row,
  index,
  existingQuestionSet,
  uploadedQuestionSet,
}) => {
  const rowNumber = index + 2;
  const errors = [];

  const question = normalizeText(
    row?.question
  );

  const explanation = normalizeText(
    row?.explanation
  );

  const rawOptions = [
    normalizeText(row?.optionA),
    normalizeText(row?.optionB),
    normalizeText(row?.optionC),
    normalizeText(row?.optionD),
    normalizeText(row?.optionE),
    normalizeText(row?.optionF),
  ];

  const correctOption = normalizeText(
    row?.correctOption
  ).toUpperCase();

  const immediateResult = normalizeText(
    row?.immediateResult
  ).toUpperCase();

  /*
    Validate question.
  */

  if (!question) {
    errors.push(
      "Question is required."
    );
  } else if (question.length > 500) {
    errors.push(
      "Question cannot exceed 500 characters."
    );
  }

  /*
    At least Option A and Option B are required.
  */

  if (!rawOptions[0]) {
    errors.push(
      "Option A is required."
    );
  }

  if (!rawOptions[1]) {
    errors.push(
      "Option B is required."
    );
  }

  /*
    Validate option lengths and prevent gaps.

    Invalid example:

    Option A: React
    Option B: MongoDB
    Option C: empty
    Option D: Express
  */

  let emptyOptionFound = false;

  rawOptions.forEach(
    (optionText, optionIndex) => {
      const optionLetter =
        String.fromCharCode(
          65 + optionIndex
        );

      if (!optionText) {
        emptyOptionFound = true;
        return;
      }

      if (
        emptyOptionFound &&
        optionIndex > 1
      ) {
        errors.push(
          `Option ${optionLetter} cannot be supplied after an empty option.`
        );
      }

      if (optionText.length > 300) {
        errors.push(
          `Option ${optionLetter} cannot exceed 300 characters.`
        );
      }
    }
  );

  const cleanedOptions = rawOptions
    .filter(Boolean)
    .map((optionText) => ({
      text: optionText,
    }));

  if (
    cleanedOptions.length < 2 ||
    cleanedOptions.length > 6
  ) {
    errors.push(
      "Between 2 and 6 answer options are required."
    );
  }

  /*
    Convert A-F into an array index.
  */

  const correctOptionLetters = [
    "A",
    "B",
    "C",
    "D",
    "E",
    "F",
  ];

  if (
    !correctOptionLetters.includes(
      correctOption
    )
  ) {
    errors.push(
      "Correct Option must be A, B, C, D, E or F."
    );
  }

  const correctOptionIndex =
    correctOptionLetters.indexOf(
      correctOption
    );

  if (
    correctOptionIndex >=
    cleanedOptions.length
  ) {
    errors.push(
      `Correct Option ${
        correctOption || "selected"
      } does not contain an answer.`
    );
  }

  /*
    Validate lecturer explanation.
  */

  if (!explanation) {
    errors.push(
      "Explanation is required."
    );
  } else if (
    explanation.length > 1000
  ) {
    errors.push(
      "Explanation cannot exceed 1000 characters."
    );
  }

  /*
    Immediate Result must contain YES or NO.
  */

  if (
    !["YES", "NO"].includes(
      immediateResult
    )
  ) {
    errors.push(
      "Immediate Result must be YES or NO."
    );
  }

  const normalizedQuestion =
    question.toLowerCase();

  /*
    Detect duplicates inside the Excel file.
  */

  if (
    question &&
    uploadedQuestionSet.has(
      normalizedQuestion
    )
  ) {
    errors.push(
      "Duplicate question in the uploaded Excel file."
    );
  }

  /*
    Detect questions already stored for this session.
  */

  if (
    question &&
    existingQuestionSet.has(
      normalizedQuestion
    )
  ) {
    errors.push(
      "This question already exists in the selected session."
    );
  }

  if (question) {
    uploadedQuestionSet.add(
      normalizedQuestion
    );
  }

  if (errors.length > 0) {
    return {
      valid: false,

      invalidRow: {
        rowNumber,

        question:
          question ||
          "Question missing",

        errors,
      },
    };
  }

  return {
    valid: true,

    validRow: {
      rowNumber,
      question,
      options: cleanedOptions,
      correctOption,
      correctOptionIndex,
      explanation,

      revealAnswerAfterSubmission:
        immediateResult === "YES",
    },
  };
};

/* =================================================
   BULK VALIDATE OR IMPORT MCQS

   POST /lecturer/mcq-polls/bulk
   ================================================= */

router.post(
  "/lecturer/mcq-polls/bulk",
  ...lecturerOnly,
  async (req, res) => {
    try {
      const {
        sessionId,
        mode = "validate",
        rows,
      } = req.body;
      const lecturerId = req.user.id;

      console.log(
        "Bulk MCQ request received:",
        mode,
        Array.isArray(rows)
          ? rows.length
          : "No rows"
      );

      if (!sessionId || !lecturerId) {
        return res.status(400).json({
          success: false,

          message:
            "Session and lecturer information are required.",
        });
      }

      if (
        !["validate", "import"].includes(
          mode
        )
      ) {
        return res.status(400).json({
          success: false,

          message:
            "Bulk-upload mode must be validate or import.",
        });
      }

      if (!Array.isArray(rows)) {
        return res.status(400).json({
          success: false,

          message:
            "Excel rows must be supplied as an array.",
        });
      }

      if (rows.length === 0) {
        return res.status(400).json({
          success: false,

          message:
            "The Excel file does not contain any question rows.",
        });
      }

      if (rows.length > 200) {
        return res.status(400).json({
          success: false,

          message:
            "A maximum of 200 MCQs can be uploaded at one time.",
        });
      }

      /*
        Confirm lecturer ownership.
      */

      const session =
        await findLecturerSession(
          sessionId,
          lecturerId
        );

      if (!session) {
        return res.status(403).json({
          success: false,

          message:
            "Session not found or you do not have permission to upload MCQs to it.",
        });
      }

      /*
        Load existing questions for duplicate checking.
      */

      const existingPolls =
        await MCQPoll.find({
          sessionId: session._id,
        })
          .select("question")
          .maxTimeMS(5000)
          .lean();

      const existingQuestionSet =
        new Set(
          existingPolls.map((poll) =>
            poll.question
              .trim()
              .toLowerCase()
          )
        );

      const uploadedQuestionSet =
        new Set();

      const validRows = [];
      const invalidRows = [];

      rows.forEach((row, index) => {
        const validationResult =
          validateExcelRow({
            row,
            index,
            existingQuestionSet,
            uploadedQuestionSet,
          });

        if (validationResult.valid) {
          validRows.push(
            validationResult.validRow
          );
        } else {
          invalidRows.push(
            validationResult.invalidRow
          );
        }
      });

      /*
        Validation mode never creates database data.
      */

      if (mode === "validate") {
        console.log(
          "Bulk MCQ validation completed:",
          {
            totalRows: rows.length,
            validRows:
              validRows.length,
            invalidRows:
              invalidRows.length,
          }
        );

        return res.status(200).json({
          success: true,

          message:
            "Excel rows validated successfully.",

          mode,
          totalRows: rows.length,

          validCount:
            validRows.length,

          invalidCount:
            invalidRows.length,

          validRows,
          invalidRows,
        });
      }

      /*
        Import mode revalidates the same file before
        inserting questions.
      */

      if (validRows.length === 0) {
        return res.status(400).json({
          success: false,

          message:
            "No valid MCQ questions were available to import.",

          totalRows: rows.length,
          validCount: 0,

          invalidCount:
            invalidRows.length,

          invalidRows,
        });
      }

      const pollsToCreate =
        validRows.map((row) => ({
          sessionId: session._id,
          lecturerId,

          question:
            row.question,

          options:
            row.options,

          correctOptionIndex:
            row.correctOptionIndex,

          explanation:
            row.explanation,

          creationMethod: "bulk",
          status: "draft",

          revealAnswerAfterSubmission:
            row.revealAnswerAfterSubmission,
        }));

      const createdPolls =
        await MCQPoll.insertMany(
          pollsToCreate,
          {
            ordered: true,
          }
        );

      console.log(
        "Bulk MCQ import completed:",
        createdPolls.length
      );

      return res.status(201).json({
        success: true,

        message: `${createdPolls.length} MCQ questions imported successfully as drafts.`,

        mode,
        totalRows: rows.length,

        importedCount:
          createdPolls.length,

        invalidCount:
          invalidRows.length,

        invalidRows,
        polls: createdPolls,
      });
    } catch (error) {
      console.error(
        "Bulk MCQ upload error:",
        error
      );

      if (
        error.name ===
        "MongooseServerSelectionError"
      ) {
        return res.status(503).json({
          success: false,

          message:
            "MongoDB is unavailable. Please check the database connection.",
        });
      }

      if (
        error.name ===
        "MongooseError" &&
        error.message?.includes(
          "timed out"
        )
      ) {
        return res.status(504).json({
          success: false,

          message:
            "The database query timed out. Please try again.",
        });
      }

      if (error.code === 11000) {
        return res.status(409).json({
          success: false,

          message:
            "One or more questions already exist in the selected session. Please validate the Excel file again.",
        });
      }

      if (error.name === "CastError") {
        return res.status(400).json({
          success: false,

          message:
            "Invalid session or lecturer information.",
        });
      }

      const validationMessage =
        getValidationMessage(error);

      if (validationMessage) {
        return res.status(400).json({
          success: false,
          message: validationMessage,
        });
      }

      return res.status(500).json({
        success: false,

        message:
          "Server error while processing the MCQ Excel upload.",
      });
    }
  }
);

/* =================================================
   CREATE ONE MCQ MANUALLY

   POST /lecturer/mcq-polls
   ================================================= */

router.post(
  "/lecturer/mcq-polls",
  ...lecturerOnly,
  async (req, res) => {
    try {
      const {
        sessionId,
        question,
        options,
        correctOptionIndex,
        explanation,
        revealAnswerAfterSubmission,
      } = req.body;
      const lecturerId = req.user.id;

      if (!sessionId || !lecturerId) {
        return res.status(400).json({
          success: false,

          message:
            "Session and lecturer information are required.",
        });
      }

      const cleanedQuestion =
        normalizeText(question);

      const cleanedExplanation =
        normalizeText(explanation);

      const cleanedOptions =
        normalizeOptions(options);

      if (!cleanedQuestion) {
        return res.status(400).json({
          success: false,
          message: "Question is required.",
        });
      }

      if (cleanedQuestion.length > 500) {
        return res.status(400).json({
          success: false,

          message:
            "Question cannot exceed 500 characters.",
        });
      }

      if (
        cleanedOptions.length < 2 ||
        cleanedOptions.length > 6
      ) {
        return res.status(400).json({
          success: false,

          message:
            "An MCQ must contain between 2 and 6 answer options.",
        });
      }

      const optionTooLong =
        cleanedOptions.some(
          (option) =>
            option.text.length > 300
        );

      if (optionTooLong) {
        return res.status(400).json({
          success: false,

          message:
            "An answer option cannot exceed 300 characters.",
        });
      }

      const parsedCorrectOptionIndex =
        Number(correctOptionIndex);

      if (
        !Number.isInteger(
          parsedCorrectOptionIndex
        ) ||
        parsedCorrectOptionIndex < 0 ||
        parsedCorrectOptionIndex >=
          cleanedOptions.length
      ) {
        return res.status(400).json({
          success: false,

          message:
            "Please select a valid correct answer.",
        });
      }

      if (!cleanedExplanation) {
        return res.status(400).json({
          success: false,

          message:
            "A correct-answer explanation is required.",
        });
      }

      if (
        cleanedExplanation.length > 1000
      ) {
        return res.status(400).json({
          success: false,

          message:
            "Explanation cannot exceed 1000 characters.",
        });
      }

      const session =
        await findLecturerSession(
          sessionId,
          lecturerId
        );

      if (!session) {
        return res.status(403).json({
          success: false,

          message:
            "Session not found or you do not have permission to create a poll for it.",
        });
      }

      /*
        Application-level duplicate check.
      */

      const duplicatePoll =
        await MCQPoll.findOne({
          sessionId: session._id,
          question: cleanedQuestion,
        })
          .collation({
            locale: "en",
            strength: 2,
          })
          .maxTimeMS(5000);

      if (duplicatePoll) {
        return res.status(409).json({
          success: false,

          message:
            "This question already exists in the selected session.",
        });
      }

      const poll =
        await MCQPoll.create({
          sessionId:
            session._id,

          lecturerId,

          question:
            cleanedQuestion,

          options:
            cleanedOptions,

          correctOptionIndex:
            parsedCorrectOptionIndex,

          explanation:
            cleanedExplanation,

          creationMethod: "manual",
          status: "draft",

          revealAnswerAfterSubmission:
            revealAnswerAfterSubmission !==
            false,
        });

      return res.status(201).json({
        success: true,

        message:
          "MCQ created successfully as a draft.",

        poll,
      });
    } catch (error) {
      console.error(
        "Create MCQ poll error:",
        error
      );

      if (error.code === 11000) {
        return res.status(409).json({
          success: false,

          message:
            "This question already exists in the selected session.",
        });
      }

      if (error.name === "CastError") {
        return res.status(400).json({
          success: false,

          message:
            "Invalid session or lecturer information.",
        });
      }

      const validationMessage =
        getValidationMessage(error);

      if (validationMessage) {
        return res.status(400).json({
          success: false,
          message: validationMessage,
        });
      }

      return res.status(500).json({
        success: false,

        message:
          "Server error while creating the MCQ.",
      });
    }
  }
);

/* =================================================
   GET ALL MCQS FOR A LECTURER SESSION

   GET /lecturer/:lecturerId/sessions/:sessionId/mcq-polls
   ================================================= */

router.get(
  "/lecturer/:lecturerId/sessions/:sessionId/mcq-polls",
  ...lecturerOnly,
  requireSelf("lecturerId"),
  async (req, res) => {
    try {
      const {
        lecturerId,
        sessionId,
      } = req.params;

      const session =
        await findLecturerSession(
          sessionId,
          lecturerId
        );

      if (!session) {
        return res.status(403).json({
          success: false,

          message:
            "Session not found or you do not have permission to view its polls.",
        });
      }

      const polls = await MCQPoll.find({
        sessionId: session._id,
        lecturerId,
      })
        .sort({
          createdAt: -1,
        })
        .maxTimeMS(5000)
        .lean();

      const pollIds = polls.map(
        (poll) => poll._id
      );

      const responseCounts =
        pollIds.length === 0
          ? []
          : await MCQResponse.aggregate([
              {
                $match: {
                  pollId: {
                    $in: pollIds,
                  },
                },
              },

              {
                $group: {
                  _id: "$pollId",

                  responseCount: {
                    $sum: 1,
                  },

                  correctCount: {
                    $sum: {
                      $cond: [
                        "$isCorrect",
                        1,
                        0,
                      ],
                    },
                  },
                },
              },
            ]).option({
              maxTimeMS: 5000,
            });

      const responseCountMap =
        new Map(
          responseCounts.map((item) => [
            item._id.toString(),

            {
              responseCount:
                item.responseCount,

              correctCount:
                item.correctCount,
            },
          ])
        );

      const formattedPolls =
        polls.map((poll) => {
          const responseInformation =
            responseCountMap.get(
              poll._id.toString()
            ) || {
              responseCount: 0,
              correctCount: 0,
            };

          return {
            ...poll,
            ...responseInformation,
          };
        });

      return res.status(200).json({
        success: true,

        session: {
          _id: session._id,
          title: session.title,

          sessionCode:
            session.sessionCode,

          subjectName:
            session.subjectName,

          status: session.status,
        },

        totalPolls:
          formattedPolls.length,

        polls:
          formattedPolls,
      });
    } catch (error) {
      console.error(
        "Get lecturer MCQ polls error:",
        error
      );

      if (error.name === "CastError") {
        return res.status(400).json({
          success: false,

          message:
            "Invalid session or lecturer information.",
        });
      }

      return res.status(500).json({
        success: false,

        message:
          "Server error while loading MCQ polls.",
      });
    }
  }
);

/* =================================================
   OPEN ALL DRAFT MCQS FOR A SESSION

   PUT /lecturer/mcq-polls/session/:sessionId/open-all
   ================================================= */

router.put(
  "/lecturer/mcq-polls/session/:sessionId/open-all",
  ...lecturerOnly,
  async (req, res) => {
    try {
      const { sessionId } = req.params;
      const lecturerId = req.user.id;

      if (!lecturerId) {
        return res.status(400).json({
          success: false,

          message:
            "Session and lecturer information are required.",
        });
      }

      const session =
        await findLecturerSession(
          sessionId,
          lecturerId
        );

      if (!session) {
        return res.status(403).json({
          success: false,

          message:
            "Session not found or you do not have permission to open its poll.",
        });
      }

      const draftCount =
        await MCQPoll.countDocuments({
          sessionId: session._id,
          lecturerId,
          status: "draft",
        }).maxTimeMS(5000);

      if (draftCount === 0) {
        const openCount =
          await MCQPoll.countDocuments({
            sessionId: session._id,
            lecturerId,
            status: "open",
          }).maxTimeMS(5000);

        if (openCount > 0) {
          return res.status(200).json({
            success: true,
            message:
              "The session poll is already open.",
            openedCount: openCount,
          });
        }

        return res.status(400).json({
          success: false,
          message:
            "There are no draft questions available to open.",
        });
      }

      const openedAt = new Date();

      const updateResult =
        await MCQPoll.updateMany(
          {
            sessionId: session._id,
            lecturerId,
            status: "draft",
          },
          {
            $set: {
              status: "open",
              openedAt,
              closedAt: null,
            },
          }
        ).maxTimeMS(5000);

      return res.status(200).json({
        success: true,

        message: `${updateResult.modifiedCount} questions opened successfully.`,

        openedCount:
          updateResult.modifiedCount,
      });
    } catch (error) {
      console.error(
        "Open all MCQ polls error:",
        error
      );

      if (error.name === "CastError") {
        return res.status(400).json({
          success: false,

          message:
            "Invalid session or lecturer information.",
        });
      }

      return res.status(500).json({
        success: false,

        message:
          "Server error while opening the session poll.",
      });
    }
  }
);

/* =================================================
   DELETE ONE DRAFT MCQ

   DELETE /lecturer/mcq-polls/:pollId
   ================================================= */

router.delete(
  "/lecturer/mcq-polls/:pollId",
  ...lecturerOnly,
  async (req, res) => {
    try {
      const { pollId } = req.params;

      const lecturerId = req.user.id;

      if (!lecturerId) {
        return res.status(400).json({
          success: false,
          message:
            "Lecturer information is required.",
        });
      }

      const poll =
        await MCQPoll.findOne({
          _id: pollId,
          lecturerId,
        }).maxTimeMS(5000);

      if (!poll) {
        return res.status(404).json({
          success: false,
          message:
            "Question not found or you do not have permission to delete it.",
        });
      }

      if (poll.status !== "draft") {
        return res.status(400).json({
          success: false,
          message:
            "Only draft questions can be deleted.",
        });
      }

      const responseCount =
        await MCQResponse.countDocuments({
          pollId: poll._id,
        }).maxTimeMS(5000);

      if (responseCount > 0) {
        return res.status(400).json({
          success: false,
          message:
            "This question cannot be deleted because students have responded to it.",
        });
      }

      await MCQPoll.deleteOne({
        _id: poll._id,
        lecturerId,
        status: "draft",
      }).maxTimeMS(5000);

      return res.status(200).json({
        success: true,
        message:
          "Question deleted successfully.",
        deletedPollId: poll._id,
      });
    } catch (error) {
      console.error(
        "Delete MCQ question error:",
        error
      );

      if (error.name === "CastError") {
        return res.status(400).json({
          success: false,
          message:
            "Invalid question or lecturer information.",
        });
      }

      return res.status(500).json({
        success: false,
        message:
          "Server error while deleting the question.",
      });
    }
  }
);

/* =================================================
   CLOSE ALL OPEN MCQS FOR A SESSION

   PUT /lecturer/mcq-polls/session/:sessionId/close-all
   ================================================= */

router.put(
  "/lecturer/mcq-polls/session/:sessionId/close-all",
  ...lecturerOnly,
  async (req, res) => {
    try {
      const { sessionId } = req.params;
      const lecturerId = req.user.id;

      if (!lecturerId) {
        return res.status(400).json({
          success: false,
          message:
            "Session and lecturer information are required.",
        });
      }

      const session =
        await findLecturerSession(
          sessionId,
          lecturerId
        );

      if (!session) {
        return res.status(403).json({
          success: false,
          message:
            "Session not found or you do not have permission to close its poll.",
        });
      }

      const openCount =
        await MCQPoll.countDocuments({
          sessionId: session._id,
          lecturerId,
          status: "open",
        }).maxTimeMS(5000);

      if (openCount === 0) {
        const closedCount =
          await MCQPoll.countDocuments({
            sessionId: session._id,
            lecturerId,
            status: "closed",
          }).maxTimeMS(5000);

        if (closedCount > 0) {
          return res.status(200).json({
            success: true,
            message:
              "The session poll is already closed.",
            closedCount,
          });
        }

        return res.status(400).json({
          success: false,
          message:
            "There are no open questions available to close.",
        });
      }

      const closedAt = new Date();

      const updateResult =
        await MCQPoll.updateMany(
          {
            sessionId: session._id,
            lecturerId,
            status: "open",
          },
          {
            $set: {
              status: "closed",
              closedAt,
            },
          }
        ).maxTimeMS(5000);

      return res.status(200).json({
        success: true,
        message: `${updateResult.modifiedCount} questions closed successfully.`,
        closedCount:
          updateResult.modifiedCount,
      });
    } catch (error) {
      console.error(
        "Close all MCQ polls error:",
        error
      );

      if (error.name === "CastError") {
        return res.status(400).json({
          success: false,
          message:
            "Invalid session or lecturer information.",
        });
      }

      return res.status(500).json({
        success: false,
        message:
          "Server error while closing the session poll.",
      });
    }
  }
);

/* =================================================
   CLOSE ONE MCQ POLL (LEGACY ROUTE)

   PUT /lecturer/mcq-polls/:pollId/close
   ================================================= */

router.put(
  "/lecturer/mcq-polls/:pollId/close",
  ...lecturerOnly,
  async (req, res) => {
    try {
      const { pollId } = req.params;
      const lecturerId = req.user.id;

      if (!lecturerId) {
        return res.status(400).json({
          success: false,

          message:
            "Lecturer information is required.",
        });
      }

      const poll =
        await MCQPoll.findOne({
          _id: pollId,
          lecturerId,
        }).maxTimeMS(5000);

      if (!poll) {
        return res.status(404).json({
          success: false,

          message:
            "Poll not found or you do not have permission to close it.",
        });
      }

      if (poll.status === "draft") {
        return res.status(400).json({
          success: false,

          message:
            "A draft poll must be opened before it can be closed.",
        });
      }

      if (poll.status === "closed") {
        return res.status(400).json({
          success: false,

          message:
            "This poll is already closed.",
        });
      }

      poll.status = "closed";
      poll.closedAt = new Date();

      await poll.save();

      return res.status(200).json({
        success: true,

        message:
          "MCQ poll closed successfully.",

        poll,
      });
    } catch (error) {
      console.error(
        "Close MCQ poll error:",
        error
      );

      if (error.name === "CastError") {
        return res.status(400).json({
          success: false,

          message:
            "Invalid poll or lecturer information.",
        });
      }

      return res.status(500).json({
        success: false,

        message:
          "Server error while closing the poll.",
      });
    }
  }
);

/* =================================================
   GET MCQS FOR A STUDENT SESSION

   GET /student/:studentId/sessions/:sessionId/mcq-polls

   studentId is the logged-in User account ID.
   Correct answers remain hidden until the result is
   allowed to be revealed.
   ================================================= */

router.get(
  "/student/:studentId/sessions/:sessionId/mcq-polls",
  ...studentOnly,
  requireSelf("studentId"),
  async (req, res) => {
    try {
      const {
        studentId,
        sessionId,
      } = req.params;

      const student =
        await Student.findOne({
          userId: studentId,
          status: "active",
        })
          .select("_id userId studentId status")
          .maxTimeMS(5000)
          .lean();

      if (!student) {
        return res.status(404).json({
          success: false,
          message:
            "Active student profile not found.",
        });
      }

      const session =
        await Session.findOne({
          _id: sessionId,
          "participants.studentId":
            student._id,
        })
          .select(
            "_id title moduleCode subjectName sessionCode lecturerName status endedAt participants"
          )
          .maxTimeMS(5000)
          .lean();

      if (!session) {
        return res.status(403).json({
          success: false,
          message:
            "You must join this session before viewing its MCQ poll.",
        });
      }

      const polls =
        await MCQPoll.find({
          sessionId: session._id,
          status: {
            $in: ["open", "closed"],
          },
        })
          .sort({
            createdAt: 1,
          })
          .maxTimeMS(5000)
          .lean();

      const pollIds = polls.map(
        (poll) => poll._id
      );

      const responses =
        pollIds.length === 0
          ? []
          : await MCQResponse.find({
              pollId: {
                $in: pollIds,
              },
              studentId: student._id,
            })
              .select(
                "pollId selectedOptionIndex isCorrect submittedAt"
              )
              .maxTimeMS(5000)
              .lean();

      const responseMap = new Map(
        responses.map((response) => [
          response.pollId.toString(),
          response,
        ])
      );

      /*
        Open questions are visible to the student.

        Closed questions are also visible to joined
        students, including students who did not attempt
        them. Correct answers are revealed only because
        the poll has already closed.
      */

      const visiblePolls = polls.map((poll) => {
          const response =
            responseMap.get(
              poll._id.toString()
            ) || null;

          const resultAvailable = Boolean(
            poll.status === "closed" ||
              (response &&
                poll.revealAnswerAfterSubmission)
          );

          const safePoll = {
            _id: poll._id,
            sessionId: poll.sessionId,
            question: poll.question,

            options: poll.options.map(
              (option) => ({
                text: option.text,
              })
            ),

            status: poll.status,
            openedAt: poll.openedAt,
            closedAt: poll.closedAt,

            hasSubmitted:
              Boolean(response),

            attemptStatus: response
              ? "attempted"
              : "not_attempted",

            resultAvailable,

            response: response
              ? {
                  selectedOptionIndex:
                    response.selectedOptionIndex,

                  submittedAt:
                    response.submittedAt,

                  ...(resultAvailable
                    ? {
                        isCorrect:
                          response.isCorrect,
                      }
                    : {}),
                }
              : null,
          };

          if (resultAvailable) {
            safePoll.correctOptionIndex =
              poll.correctOptionIndex;

            safePoll.explanation =
              poll.explanation;
          }

          return safePoll;
        });

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

        totalPolls: visiblePolls.length,
        polls: visiblePolls,
      });
    } catch (error) {
      console.error(
        "Get student MCQ polls error:",
        error
      );

      if (error.name === "CastError") {
        return res.status(400).json({
          success: false,
          message:
            "Invalid student or session information.",
        });
      }

      return res.status(500).json({
        success: false,
        message:
          "Server error while loading the student MCQ poll.",
      });
    }
  }
);

/* =================================================
   SUBMIT ONE STUDENT MCQ ANSWER

   POST /student/mcq-polls/:pollId/submit

   A unique database index on pollId + studentId also
   enforces one attempt if two requests arrive together.
   ================================================= */

router.post(
  "/student/mcq-polls/:pollId/submit",
  ...studentOnly,
  async (req, res) => {
    try {
      const { pollId } = req.params;

      const { selectedOptionIndex } = req.body;
      const studentId = req.user.id;

      if (!studentId) {
        return res.status(400).json({
          success: false,
          message:
            "Student information is required.",
        });
      }

      const parsedOptionIndex = Number(
        selectedOptionIndex
      );

      if (
        !Number.isInteger(
          parsedOptionIndex
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Please select a valid answer option.",
        });
      }

      const student =
        await Student.findOne({
          userId: studentId,
          status: "active",
        })
          .select("_id userId studentId status")
          .maxTimeMS(5000);

      if (!student) {
        return res.status(404).json({
          success: false,
          message:
            "Active student profile not found.",
        });
      }

      const poll =
        await MCQPoll.findById(pollId)
          .maxTimeMS(5000);

      if (!poll) {
        return res.status(404).json({
          success: false,
          message:
            "MCQ question not found.",
        });
      }

      if (poll.status !== "open") {
        return res.status(400).json({
          success: false,
          message:
            "This poll is not currently open for submissions.",
        });
      }

      if (
        parsedOptionIndex < 0 ||
        parsedOptionIndex >=
          poll.options.length
      ) {
        return res.status(400).json({
          success: false,
          message:
            "The selected answer option is invalid.",
        });
      }

      const session =
        await Session.findOne({
          _id: poll.sessionId,
          "participants.studentId":
            student._id,
        })
          .select("_id status participants")
          .maxTimeMS(5000);

      if (!session) {
        return res.status(403).json({
          success: false,
          message:
            "You must join this session before submitting an answer.",
        });
      }

      const previousResponse =
        await MCQResponse.findOne({
          pollId: poll._id,
          studentId: student._id,
        })
          .select("_id")
          .maxTimeMS(5000)
          .lean();

      if (previousResponse) {
        return res.status(409).json({
          success: false,
          message:
            "You have already submitted an answer for this question.",
        });
      }

      const isCorrect =
        parsedOptionIndex ===
        poll.correctOptionIndex;

      const response =
        await MCQResponse.create({
          pollId: poll._id,
          sessionId: poll.sessionId,
          studentId: student._id,

          selectedOptionIndex:
            parsedOptionIndex,

          isCorrect,
        });

      const resultAvailable =
        poll.revealAnswerAfterSubmission;

      const responseData = {
        _id: response._id,
        pollId: response.pollId,

        selectedOptionIndex:
          response.selectedOptionIndex,

        submittedAt:
          response.submittedAt,

        resultAvailable,
      };

      if (resultAvailable) {
        responseData.isCorrect =
          response.isCorrect;

        responseData.correctOptionIndex =
          poll.correctOptionIndex;

        responseData.explanation =
          poll.explanation;
      }

      return res.status(201).json({
        success: true,

        message: resultAvailable
          ? "Answer submitted successfully."
          : "Answer submitted successfully. The result will be available after the poll closes.",

        response: responseData,
      });
    } catch (error) {
      console.error(
        "Submit student MCQ answer error:",
        error
      );

      if (error.code === 11000) {
        return res.status(409).json({
          success: false,
          message:
            "You have already submitted an answer for this question.",
        });
      }

      if (error.name === "CastError") {
        return res.status(400).json({
          success: false,
          message:
            "Invalid student, poll or session information.",
        });
      }

      const validationMessage =
        getValidationMessage(error);

      if (validationMessage) {
        return res.status(400).json({
          success: false,
          message: validationMessage,
        });
      }

      return res.status(500).json({
        success: false,
        message:
          "Server error while submitting the MCQ answer.",
      });
    }
  }
);

/* =================================================
   GET STUDENT QUIZ HISTORY

   GET /student/:studentId/mcq-history

   Returns one history record per joined session quiz,
   rather than returning one history row per question.
   ================================================= */

router.get(
  "/student/:studentId/mcq-history",
  ...studentOnly,
  requireSelf("studentId"),
  async (req, res) => {
    try {
      const { studentId } = req.params;

      const student =
        await Student.findOne({
          userId: studentId,
          status: "active",
        })
          .select("_id userId studentId status")
          .maxTimeMS(5000)
          .lean();

      if (!student) {
        return res.status(404).json({
          success: false,
          message:
            "Active student profile not found.",
        });
      }

      const joinedSessions =
        await Session.find({
          "participants.studentId":
            student._id,
        })
          .select(
            "_id title moduleCode subjectName sessionCode lecturerName status endedAt createdAt"
          )
          .sort({
            createdAt: -1,
          })
          .maxTimeMS(5000)
          .lean();

      if (joinedSessions.length === 0) {
        return res.status(200).json({
          success: true,
          totalQuizzes: 0,
          quizzes: [],
        });
      }

      const sessionIds = joinedSessions.map(
        (session) => session._id
      );

      const polls = await MCQPoll.find({
        sessionId: {
          $in: sessionIds,
        },
        status: {
          $in: ["open", "closed"],
        },
      })
        .select(
          "_id sessionId status openedAt closedAt"
        )
        .sort({
          createdAt: 1,
        })
        .maxTimeMS(5000)
        .lean();

      if (polls.length === 0) {
        return res.status(200).json({
          success: true,
          totalQuizzes: 0,
          quizzes: [],
        });
      }

      const pollIds = polls.map(
        (poll) => poll._id
      );

      const responses =
        await MCQResponse.find({
          pollId: {
            $in: pollIds,
          },
          studentId: student._id,
        })
          .select(
            "pollId sessionId isCorrect submittedAt"
          )
          .maxTimeMS(5000)
          .lean();

      const responseMap = new Map(
        responses.map((response) => [
          response.pollId.toString(),
          response,
        ])
      );

      const pollsBySession = new Map();

      polls.forEach((poll) => {
        const sessionKey =
          poll.sessionId.toString();

        if (!pollsBySession.has(sessionKey)) {
          pollsBySession.set(sessionKey, []);
        }

        pollsBySession.get(sessionKey).push(poll);
      });

      const quizzes = joinedSessions
        .filter((session) =>
          pollsBySession.has(
            session._id.toString()
          )
        )
        .map((session) => {
          const sessionPolls =
            pollsBySession.get(
              session._id.toString()
            );

          const sessionResponses =
            sessionPolls
              .map((poll) =>
                responseMap.get(
                  poll._id.toString()
                )
              )
              .filter(Boolean);

          const totalQuestions =
            sessionPolls.length;

          const attemptedQuestions =
            sessionResponses.length;

          const correctAnswers =
            sessionResponses.filter(
              (response) =>
                response.isCorrect
            ).length;

          const openQuestions =
            sessionPolls.filter(
              (poll) =>
                poll.status === "open"
            ).length;

          const closedQuestions =
            sessionPolls.filter(
              (poll) =>
                poll.status === "closed"
            ).length;

          let attemptStatus =
            "not_attempted";

          if (
            attemptedQuestions ===
            totalQuestions
          ) {
            attemptStatus = "completed";
          } else if (
            attemptedQuestions > 0
          ) {
            attemptStatus = "partially_attempted";
          }

          const submittedTimes =
            sessionResponses
              .map((response) =>
                response.submittedAt
                  ? new Date(
                      response.submittedAt
                    ).getTime()
                  : null
              )
              .filter(Boolean);

          const openedTimes = sessionPolls
            .map((poll) =>
              poll.openedAt
                ? new Date(
                    poll.openedAt
                  ).getTime()
                : null
            )
            .filter(Boolean);

          const closedTimes = sessionPolls
            .map((poll) =>
              poll.closedAt
                ? new Date(
                    poll.closedAt
                  ).getTime()
                : null
            )
            .filter(Boolean);

          const scorePercentage =
            attemptedQuestions > 0
              ? Math.round(
                  (correctAnswers /
                    attemptedQuestions) *
                    100
                )
              : null;

          return {
            sessionId: session._id,
            title: session.title,
            moduleCode:
              session.moduleCode,
            subjectName:
              session.subjectName,
            sessionCode:
              session.sessionCode,
            lecturerName:
              session.lecturerName,
            sessionStatus:
              session.status,

            quizStatus:
              openQuestions > 0
                ? "open"
                : "closed",

            attemptStatus,
            totalQuestions,
            attemptedQuestions,
            correctAnswers,
            openQuestions,
            closedQuestions,
            scorePercentage,

            openedAt:
              openedTimes.length > 0
                ? new Date(
                    Math.min(
                      ...openedTimes
                    )
                  )
                : null,

            submittedAt:
              submittedTimes.length > 0
                ? new Date(
                    Math.max(
                      ...submittedTimes
                    )
                  )
                : null,

            closedAt:
              closedTimes.length > 0
                ? new Date(
                    Math.max(
                      ...closedTimes
                    )
                  )
                : null,
          };
        });

      return res.status(200).json({
        success: true,
        totalQuizzes: quizzes.length,
        quizzes,
      });
    } catch (error) {
      console.error(
        "Get student quiz history error:",
        error
      );

      if (error.name === "CastError") {
        return res.status(400).json({
          success: false,
          message:
            "Invalid student information.",
        });
      }

      return res.status(500).json({
        success: false,
        message:
          "Server error while loading quiz history.",
      });
    }
  }
);

module.exports = router;