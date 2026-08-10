const express = require("express");
const ExcelJS = require("exceljs");

const EvaluationEvent = require("../models/EvaluationEvent");
const Session = require("../models/Session");
const Student = require("../models/Student");
const { logEvaluationEvent } = require("../services/evaluationLogger");
const {
  authenticateToken,
  allowRoles,
} = require("../middleware/authMiddleware");

const router = express.Router();

const EVENT_TYPES = new Set(EvaluationEvent.schema.path("eventType").enumValues);

const csvValue = (value) => {
  const normalised = value === null || value === undefined ? "" : String(value);
  return `"${normalised.replace(/"/g, '""')}"`;
};

const formatEvent = (event) => ({
  eventId: event._id.toString(),
  participantCode: event.participantCode,
  role: event.role,
  eventType: event.eventType,
  sessionCode: event.sessionCode || "",
  subjectCode: event.subjectCode || "",
  questionCount: event.metrics?.questionCount ?? "",
  answeredCount: event.metrics?.answeredCount ?? "",
  responseCount: event.metrics?.responseCount ?? "",
  correctCount: event.metrics?.correctCount ?? "",
  scorePercentage: event.metrics?.scorePercentage ?? "",
  durationSeconds: event.metrics?.durationSeconds ?? "",
  success: event.metrics?.success ?? true,
  occurredAt: event.occurredAt.toISOString(),
});

const buildExportFilter = async ({ requester, sessionCode, from, to }) => {
  const filter = {};

  if (requester.role === "lecturer") {
    const ownedSessions = await Session.find({ lecturerId: requester._id })
      .select("sessionCode")
      .lean();
    const ownedCodes = ownedSessions.map((session) => session.sessionCode);

    if (sessionCode && !ownedCodes.includes(sessionCode)) {
      const error = new Error("You can export only your own sessions");
      error.statusCode = 403;
      throw error;
    }

    filter.sessionCode = sessionCode || { $in: ownedCodes };
  } else if (sessionCode) {
    filter.sessionCode = sessionCode;
  }

  if (from || to) {
    filter.occurredAt = {};
    if (from) filter.occurredAt.$gte = new Date(`${from}T00:00:00.000Z`);
    if (to) filter.occurredAt.$lte = new Date(`${to}T23:59:59.999Z`);
  }

  return filter;
};

const authoriseAndFilter = async (req) => {
  const requester = {
    _id: req.user.id,
    role: req.user.role,
  };
  if (!requester || !["admin", "lecturer"].includes(requester.role)) {
    const error = new Error("Admin or lecturer access is required");
    error.statusCode = 403;
    throw error;
  }

  const sessionCode = String(req.query.sessionCode || "").trim().toUpperCase();
  return buildExportFilter({
    requester,
    sessionCode,
    from: req.query.from,
    to: req.query.to,
  });
};

router.post(
  "/evaluation/events",
  authenticateToken,
  allowRoles("admin", "lecturer", "student"),
  async (req, res) => {
  try {
    const { eventType, sessionId, metrics } = req.body;
    const actor = {
      _id: req.user.id,
      role: req.user.role,
    };

    if (!EVENT_TYPES.has(eventType)) {
      return res.status(400).json({ success: false, message: "A valid event type is required" });
    }

    let session = null;
    if (sessionId) {
      session = await Session.findById(sessionId)
        .select("sessionCode moduleCode lecturerId participants")
        .lean();
      if (!session) return res.status(404).json({ success: false, message: "Session not found" });

      if (actor.role === "lecturer" && String(session.lecturerId) !== String(actor._id)) {
        return res.status(403).json({ success: false, message: "This session does not belong to you" });
      }

      if (actor.role === "student") {
        const student = await Student.findOne({ userId: actor._id }).select("_id").lean();
        const joined = student && session.participants.some(
          (participant) => String(participant.studentId) === String(student._id)
        );
        if (!joined) return res.status(403).json({ success: false, message: "Join the session before logging activity" });
      }
    }

    await logEvaluationEvent({
      actorId: actor._id,
      role: actor.role,
      eventType,
      sessionCode: session?.sessionCode,
      subjectCode: session?.moduleCode,
      metrics,
    });

    return res.status(201).json({ success: true, message: "Anonymous evaluation event recorded" });
  } catch (error) {
    console.error("Evaluation logging error:", error.message);
    return res.status(500).json({ success: false, message: "Unable to record evaluation event" });
  }
  }
);

router.get(
  "/evaluation/summary",
  authenticateToken,
  allowRoles("admin", "lecturer"),
  async (req, res) => {
  try {
    const filter = await authoriseAndFilter(req);
    const [totalEvents, eventCounts, participantCodes] = await Promise.all([
      EvaluationEvent.countDocuments(filter),
      EvaluationEvent.aggregate([
        { $match: filter },
        { $group: { _id: "$eventType", count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      EvaluationEvent.distinct("participantCode", filter),
    ]);

    return res.json({
      success: true,
      summary: {
        totalEvents,
        anonymousParticipants: participantCodes.length,
        eventCounts: eventCounts.map((item) => ({ eventType: item._id, count: item.count })),
      },
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ success: false, message: error.message || "Unable to load evaluation summary" });
  }
  }
);

router.get(
  "/evaluation/export.csv",
  authenticateToken,
  allowRoles("admin", "lecturer"),
  async (req, res) => {
  try {
    const filter = await authoriseAndFilter(req);
    const rows = (await EvaluationEvent.find(filter).sort({ occurredAt: 1 }).lean()).map(formatEvent);
    const headings = Object.keys(formatEvent({
      _id: { toString: () => "" }, participantCode: "", role: "", eventType: "",
      sessionCode: "", subjectCode: "", metrics: {}, occurredAt: new Date(0),
    }));
    const csv = [headings.map(csvValue).join(","), ...rows.map((row) => headings.map((key) => csvValue(row[key])).join(","))].join("\n");

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="ultra-class-evaluation-${Date.now()}.csv"`);
    return res.send(`\uFEFF${csv}`);
  } catch (error) {
    return res.status(error.statusCode || 500).json({ success: false, message: error.message || "CSV export failed" });
  }
  }
);

router.get(
  "/evaluation/export.xlsx",
  authenticateToken,
  allowRoles("admin", "lecturer"),
  async (req, res) => {
  try {
    const filter = await authoriseAndFilter(req);
    const rows = (await EvaluationEvent.find(filter).sort({ occurredAt: 1 }).lean()).map(formatEvent);
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Ultra Class";
    const sheet = workbook.addWorksheet("Anonymous Events", { views: [{ state: "frozen", ySplit: 1 }] });
    const headings = rows.length ? Object.keys(rows[0]) : [
      "eventId", "participantCode", "role", "eventType", "sessionCode", "subjectCode",
      "questionCount", "answeredCount", "responseCount", "correctCount", "scorePercentage",
      "durationSeconds", "success", "occurredAt",
    ];
    sheet.columns = headings.map((key) => ({ header: key, key, width: Math.max(14, key.length + 2) }));
    rows.forEach((row) => sheet.addRow(row));
    sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    sheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF4338CA" } };
    sheet.autoFilter = { from: "A1", to: `${sheet.getColumn(headings.length).letter}1` };

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="ultra-class-evaluation-${Date.now()}.xlsx"`);
    await workbook.xlsx.write(res);
    return res.end();
  } catch (error) {
    if (!res.headersSent) return res.status(error.statusCode || 500).json({ success: false, message: error.message || "Excel export failed" });
    return res.end();
  }
  }
);

module.exports = router;