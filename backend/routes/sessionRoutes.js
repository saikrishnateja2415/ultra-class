const express = require("express");
const Session = require("../models/Session");

const router = express.Router();

function generateSessionCode() {
  const randomCode = Math.random()
    .toString(36)
    .substring(2, 7)
    .toUpperCase();

  return `UC-${randomCode}`;
}

router.post("/lecturer/sessions", async (req, res) => {
  try {
    const { title, moduleCode, lecturerId, lecturerName } = req.body;

    if (!title || !moduleCode || !lecturerId || !lecturerName) {
      return res.status(400).json({
        success: false,
        message: "All session fields are required",
      });
    }

    let sessionCode;
    let codeExists = true;

    while (codeExists) {
      sessionCode = generateSessionCode();

      codeExists = await Session.findOne({
        sessionCode,
      });
    }

    const session = await Session.create({
      title,
      moduleCode,
      sessionCode,
      lecturerId,
      lecturerName,
    });

    res.status(201).json({
      success: true,
      message: "Session created successfully",
      session,
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      success: false,
      message: "Error creating session",
    });
  }
});

router.get("/lecturer/sessions/:lecturerId", async (req, res) => {
  try {
    const sessions = await Session.find({
      lecturerId: req.params.lecturerId,
    }).sort({ createdAt: -1 });

    res.json({
      success: true,
      sessions,
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      success: false,
      message: "Error fetching sessions",
    });
  }
});

router.delete("/delete-session/:id", async (req, res) => {
  try {
    await Session.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: "Session deleted",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error deleting session",
    });
  }
});

router.post("/student/join-session", async (req, res) => {
  try {
    const { sessionCode, studentId, studentName } = req.body;

    if (!sessionCode || !studentId || !studentName) {
      return res.status(400).json({
        success: false,
        message: "Session code and student details are required",
      });
    }

    const session = await Session.findOne({
      sessionCode: sessionCode.toUpperCase(),
      status: "active",
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Session not found or inactive",
      });
    }

    res.json({
      success: true,
      message: "Session joined successfully",
      session,
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      success: false,
      message: "Error joining session",
    });
  }
});

module.exports = router;