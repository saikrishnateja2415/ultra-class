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
      studentName, // stored privately
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
      status: q.status,
      pinned: q.pinned,
      createdAt: q.createdAt,
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

module.exports = router;