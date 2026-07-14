const express = require("express");
const Attendance = require("../models/Attendance");
const AttendanceChallenge = require("../models/AttendanceChallenge");

const router = express.Router();

const shapes = ["Diamond", "Circle", "Triangle", "Square", "Star"];
const colors = ["Blue", "Green", "Red", "Purple", "Orange"];

const generateCode = () => {
  return Math.random().toString(36).substring(2, 7).toUpperCase();
};

const generateChallengeId = () => {
  return `AIDV-${Date.now()}-${Math.random()
    .toString(36)
    .substring(2, 8)
    .toUpperCase()}`;
};

/* Lecturer starts AI attendance */
router.post("/attendance/start", async (req, res) => {
  try {
    const { sessionId, sessionCode, lecturerId } = req.body;

    if (!sessionId || !sessionCode || !lecturerId) {
      return res.status(400).json({
        success: false,
        message: "sessionId, sessionCode and lecturerId are required",
      });
    }

    await AttendanceChallenge.updateMany(
      { sessionId, isActive: true },
      { isActive: false }
    );

    const randomShape = shapes[Math.floor(Math.random() * shapes.length)];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];

    const challenge = await AttendanceChallenge.create({
      sessionId,
      sessionCode,
      lecturerId,
      challengeId: generateChallengeId(),
      challengeCode: generateCode(),
      shape: randomShape,
      color: randomColor,
      expiresAt: new Date(Date.now() + 60 * 1000),
      isActive: true,
    });

    res.status(201).json({
      success: true,
      message: "Attendance challenge started",
      challenge,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: "Error starting attendance",
    });
  }
});

/* Get active attendance challenge for session */
router.get("/attendance/challenge/:sessionId", async (req, res) => {
  try {
    const challenge = await AttendanceChallenge.findOne({
      sessionId: req.params.sessionId,
      isActive: true,
      expiresAt: { $gt: new Date() },
    }).sort({ createdAt: -1 });

    res.json({
      success: true,
      challenge,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: "Error loading attendance challenge",
    });
  }
});

/* Lecturer closes attendance manually */
router.put("/attendance/close/:challengeId", async (req, res) => {
  try {
    const challenge = await AttendanceChallenge.findOneAndUpdate(
      { challengeId: req.params.challengeId },
      { isActive: false },
      { new: true }
    );

    res.json({
      success: true,
      message: "Attendance closed",
      challenge,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: "Error closing attendance",
    });
  }
});

/* Temporary student mark attendance route */
router.post("/attendance/mark", async (req, res) => {
  try {
    const {
      sessionId,
      sessionCode,
      studentId,
      studentName,
      challengeId,
    } = req.body;

    if (!sessionId || !sessionCode || !studentId || !studentName || !challengeId) {
      return res.status(400).json({
        success: false,
        message: "Missing attendance fields",
      });
    }

    const challenge = await AttendanceChallenge.findOne({
      challengeId,
      sessionId,
      isActive: true,
      expiresAt: { $gt: new Date() },
    });

    if (!challenge) {
      return res.status(400).json({
        success: false,
        message: "Attendance challenge expired or invalid",
      });
    }

    const attendance = await Attendance.create({
      sessionId,
      sessionCode,
      studentId,
      studentName,
      challengeId,
      attendanceDate: new Date(),
      verificationScore: 100,
      attendanceStatus: "Verified",
      verifiedAt: new Date(),
    });

    res.status(201).json({
      success: true,
      message: "Attendance marked successfully",
      attendance,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Attendance already marked for this session",
      });
    }

    console.log(error);
    res.status(500).json({
      success: false,
      message: "Error marking attendance",
    });
  }
});

/* Get attendance records for one session */
router.get("/attendance/session/:sessionId", async (req, res) => {
  try {
    const records = await Attendance.find({
      sessionId: req.params.sessionId,
    }).sort({ createdAt: -1 });

    res.json({
      success: true,
      records,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: "Error loading attendance records",
    });
  }
});

module.exports = router;