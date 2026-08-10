const express = require("express");

const Question = require("../models/Question");
const Session = require("../models/Session");
const Student = require("../models/Student");
const Subject = require("../models/Subject");
const {
  authenticateToken,
  allowRoles,
  lecturerOnly,
  studentOnly,
  requireSelf,
} = require("../middleware/authMiddleware");

const router = express.Router();

const requireLecturerQuestion = async (req, res, next) => {
  try {
    const question = await Question.findById(req.params.id)
      .select("_id sessionId");

    if (!question) {
      return res.status(404).json({
        success: false,
        message: "Question not found",
      });
    }

    const ownsSession = await Session.exists({
      _id: question.sessionId,
      lecturerId: req.user.id,
    });

    if (!ownsSession) {
      return res.status(403).json({
        success: false,
        message:
          "You are not authorised to manage this question",
      });
    }

    return next();
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid question ID",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Unable to verify question ownership",
    });
  }
};

router.post("/questions", ...studentOnly, async (req, res) => {
  try {
    const {
      sessionId,
      sessionCode,
      question,
    } = req.body;
    const studentId = req.user.id;

    if (
      !sessionId ||
      !sessionCode ||
      !studentId ||
      !question?.trim()
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Session, student and question details are required",
      });
    }

    /*
      Find the session using both its database ID and
      session code. This prevents mismatched details.
    */

    const session = await Session.findOne({
      _id: sessionId,

      sessionCode: sessionCode
        .trim()
        .toUpperCase(),
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Session not found",
      });
    }

    /*
      Students cannot submit new questions after the
      lecturer ends the session.
    */

    if (session.status !== "active") {
      return res.status(403).json({
        success: false,
        message:
          "This session has ended. You can review existing questions, but you cannot submit a new question.",
      });
    }

    if (!session.subjectId) {
      return res.status(403).json({
        success: false,
        message:
          "This session is not linked to a subject",
      });
    }

    /*
      studentId is the logged-in User account ID.

      Find the Student profile connected to this user
      and confirm that they are registered for the
      session's subject.
    */

    const student = await Student.findOne({
      userId: studentId,
      status: "active",
      subjects: session.subjectId,
    }).populate("userId", "name");

    if (!student) {
      return res.status(403).json({
        success: false,
        message:
          "You are not registered for this session's subject",
      });
    }

    /*
      Confirm the assignment from the subject side
      as well.
    */

    const subjectContainsStudent =
      await Subject.exists({
        _id: session.subjectId,
        students: student._id,
        status: "active",
      });

    if (!subjectContainsStudent) {
      return res.status(403).json({
        success: false,
        message:
          "Your subject registration is not active",
      });
    }

    const newQuestion = await Question.create({
      sessionId: session._id,
      sessionCode: session.sessionCode,

      // Question.studentId stores the User account ID
      studentId,

      studentName:
        student.userId?.name ||
        "Registered Student",

      question: question.trim(),
      status: "Pending",
      pinned: false,
    });

    return res.status(201).json({
      success: true,
      message:
        "Question submitted successfully",
      question: newQuestion,
    });
  } catch (error) {
    console.error(
      "Submit question error:",
      error
    );

    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message:
          "Invalid session or student information",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Error submitting question",
    });
  }
});


router.get(
  "/questions/:sessionId",
  authenticateToken,
  allowRoles("lecturer", "student"),
  async (req, res) => {
    try {
      const session = await Session.findById(
        req.params.sessionId
      ).select("_id lecturerId participants");

      if (!session) {
        return res.status(404).json({
          success: false,
          message: "Session not found",
        });
      }

      if (
        req.user.role === "lecturer" &&
        String(session.lecturerId) !== String(req.user.id)
      ) {
        return res.status(403).json({
          success: false,
          message:
            "You are not authorised to view this session's questions",
        });
      }

      if (req.user.role === "student") {
        const student = await Student.findOne({
          userId: req.user.id,
          status: "active",
        }).select("_id");

        const joined = student && session.participants.some(
          (participant) =>
            String(participant.studentId) === String(student._id)
        );

        if (!joined) {
          return res.status(403).json({
            success: false,
            message:
              "You must join this session before viewing its questions",
          });
        }
      }

      const questions = await Question.find({
        sessionId: req.params.sessionId,
      }).sort({
        pinned: -1,
        createdAt: -1,
      });

      const anonymousQuestions = questions.map(
        (question) => ({
          _id: question._id,
          sessionId: question.sessionId,
          sessionCode: question.sessionCode,
          question: question.question,
          answer: question.answer,
          status: question.status,
          pinned: question.pinned,
          createdAt: question.createdAt,
          updatedAt: question.updatedAt,
          displayName: "Anonymous Student",
        })
      );

      return res.status(200).json({
        success: true,
        questions: anonymousQuestions,
      });
    } catch (error) {
      console.error(
        "Get session questions error:",
        error
      );

      return res.status(500).json({
        success: false,
        message: "Error fetching questions",
      });
    }
  }
);

router.put(
  "/questions/:id/respond",
  ...lecturerOnly,
  requireLecturerQuestion,
  async (req, res) => {
    try {
      const { answer } = req.body;

      if (!answer?.trim()) {
        return res.status(400).json({
          success: false,
          message: "Answer is required",
        });
      }

      const updatedQuestion =
        await Question.findByIdAndUpdate(
          req.params.id,
          {
            answer: answer.trim(),
            status: "Answered",
          },
          {
            new: true,
          }
        );

      if (!updatedQuestion) {
        return res.status(404).json({
          success: false,
          message: "Question not found",
        });
      }

      return res.status(200).json({
        success: true,
        message:
          "Answer submitted successfully",
        question: updatedQuestion,
      });
    } catch (error) {
      console.error(
        "Submit answer error:",
        error
      );

      return res.status(500).json({
        success: false,
        message: "Error submitting answer",
      });
    }
  }
);


router.put(
  "/questions/:id/answer",
  ...lecturerOnly,
  requireLecturerQuestion,
  async (req, res) => {
    try {
      const updatedQuestion =
        await Question.findByIdAndUpdate(
          req.params.id,
          {
            status: "Answered",
          },
          {
            new: true,
          }
        );

      if (!updatedQuestion) {
        return res.status(404).json({
          success: false,
          message: "Question not found",
        });
      }

      return res.status(200).json({
        success: true,
        message:
          "Question marked as answered",
        question: updatedQuestion,
      });
    } catch (error) {
      console.error(
        "Update question status error:",
        error
      );

      return res.status(500).json({
        success: false,
        message: "Error updating question",
      });
    }
  }
);

router.put(
  "/questions/:id/pin",
  ...lecturerOnly,
  requireLecturerQuestion,
  async (req, res) => {
    try {
      const question = await Question.findById(
        req.params.id
      );

      if (!question) {
        return res.status(404).json({
          success: false,
          message: "Question not found",
        });
      }

      question.pinned = !question.pinned;

      await question.save();

      return res.status(200).json({
        success: true,
        message:
          "Question pin status updated",
        question,
      });
    } catch (error) {
      console.error(
        "Pin question error:",
        error
      );

      return res.status(500).json({
        success: false,
        message: "Error pinning question",
      });
    }
  }
);

router.delete(
  "/questions/:id",
  ...lecturerOnly,
  requireLecturerQuestion,
  async (req, res) => {
    try {
      const deletedQuestion =
        await Question.findByIdAndDelete(
          req.params.id
        );

      if (!deletedQuestion) {
        return res.status(404).json({
          success: false,
          message: "Question not found",
        });
      }

      return res.status(200).json({
        success: true,
        message: "Question deleted",
      });
    } catch (error) {
      console.error(
        "Delete question error:",
        error
      );

      return res.status(500).json({
        success: false,
        message: "Error deleting question",
      });
    }
  }
);

router.get(
  "/student/questions/:studentId",
  ...studentOnly,
  requireSelf("studentId"),
  async (req, res) => {
    try {
      /*
        This query does not filter by session status.

        Therefore, questions from both active and
        ended sessions remain visible to the student.
      */

      const questions = await Question.find({
        studentId: req.params.studentId,
      })
        .sort({
          createdAt: -1,
        })
        .populate(
          "sessionId",
          "title moduleCode subjectName lecturerName sessionCode status"
        );

      const formattedQuestions = questions.map(
        (question) => ({
          _id: question._id,
          question: question.question,
          answer: question.answer,
          status: question.status,
          pinned: question.pinned,
          createdAt: question.createdAt,

          sessionTitle:
            question.sessionId?.title ||
            "Unknown Session",

          moduleCode:
            question.sessionId?.moduleCode || "",

          subjectName:
            question.sessionId?.subjectName || "",

          lecturerName:
            question.sessionId?.lecturerName ||
            "Unknown Lecturer",

          sessionCode:
            question.sessionId?.sessionCode ||
            question.sessionCode,

          sessionStatus:
            question.sessionId?.status ||
            "unavailable",
        })
      );

      return res.status(200).json({
        success: true,
        questions: formattedQuestions,
      });
    } catch (error) {
      console.error(
        "Load student questions error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Error loading student questions",
      });
    }
  }
);

module.exports = router;