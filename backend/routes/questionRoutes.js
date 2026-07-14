const express = require("express");
const Question = require("../models/Question");

const router = express.Router();

/* Student submits anonymous question */
router.post("/questions", async (req, res) => {
  try {
    const { sessionId, sessionCode, studentId, studentName, question } = req.body;

    if (!sessionId || !sessionCode || !studentId || !studentName || !question) {
      return res.status(400).json({
        success: false,
        message: "All question fields are required",
      });
    }

    const newQuestion = await Question.create({
      sessionId,
      sessionCode,
      studentId,
      studentName,
      question,
      status: "Pending",
      pinned: false,
    });

    res.status(201).json({
      success: true,
      message: "Question submitted successfully",
      question: newQuestion,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: "Error submitting question",
    });
  }
});

/* Lecturer gets questions anonymously */
router.get("/questions/:sessionId", async (req, res) => {
  try {
    const questions = await Question.find({
      sessionId: req.params.sessionId,
    }).sort({ pinned: -1, createdAt: -1 });

    const anonymousQuestions = questions.map((q) => ({
      _id: q._id,
      sessionId: q.sessionId,
      sessionCode: q.sessionCode,
      question: q.question,
      answer: q.answer,
      status: q.status,
      pinned: q.pinned,
      createdAt: q.createdAt,
      updatedAt: q.updatedAt,
      displayName: "Anonymous Student",
    }));

    res.json({
      success: true,
      questions: anonymousQuestions,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: "Error fetching questions",
    });
  }
});

/* Lecturer responds to question */
router.put("/questions/:id/respond", async (req, res) => {
  try {
    const { answer } = req.body;

    if (!answer) {
      return res.status(400).json({
        success: false,
        message: "Answer is required",
      });
    }

    const updatedQuestion = await Question.findByIdAndUpdate(
      req.params.id,
      {
        answer,
        status: "Answered",
      },
      { new: true }
    );

    res.json({
      success: true,
      message: "Answer submitted successfully",
      question: updatedQuestion,
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      success: false,
      message: "Error submitting answer",
    });
  }
});

/* Lecturer marks question as answered */
router.put("/questions/:id/answer", async (req, res) => {
  try {
    const updatedQuestion = await Question.findByIdAndUpdate(
      req.params.id,
      { status: "Answered" },
      { new: true }
    );

    res.json({
      success: true,
      message: "Question marked as answered",
      question: updatedQuestion,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: "Error updating question",
    });
  }
});

/* Lecturer pins/unpins question */
router.put("/questions/:id/pin", async (req, res) => {
  try {
    const question = await Question.findById(req.params.id);

    if (!question) {
      return res.status(404).json({
        success: false,
        message: "Question not found",
      });
    }

    question.pinned = !question.pinned;
    await question.save();

    res.json({
      success: true,
      message: "Question pin status updated",
      question,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: "Error pinning question",
    });
  }
});

/* Lecturer deletes question */
router.delete("/questions/:id", async (req, res) => {
  try {
    await Question.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: "Question deleted",
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: "Error deleting question",
    });
  }
});


/* Student gets only their own questions */
router.get("/student/questions/:studentId", async (req, res) => {
  try {
    const questions = await Question.find({
      studentId: req.params.studentId,
    })
      .sort({ createdAt: -1 })
      .populate("sessionId", "title moduleCode lecturerName sessionCode");

    const formattedQuestions = questions.map((q) => ({
      _id: q._id,
      question: q.question,
      answer: q.answer,
      status: q.status,
      pinned: q.pinned,
      createdAt: q.createdAt,
      sessionTitle: q.sessionId?.title || "Unknown Session",
      moduleCode: q.sessionId?.moduleCode || "",
      lecturerName: q.sessionId?.lecturerName || "Unknown Lecturer",
      sessionCode: q.sessionId?.sessionCode || q.sessionCode,
    }));

    res.json({
      success: true,
      questions: formattedQuestions,
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      success: false,
      message: "Error loading student questions",
    });
  }
});

module.exports = router;