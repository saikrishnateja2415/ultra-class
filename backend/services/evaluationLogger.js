const crypto = require("crypto");
const EvaluationEvent = require("../models/EvaluationEvent");

const ALLOWED_METRICS = [
  "questionCount",
  "answeredCount",
  "responseCount",
  "correctCount",
  "scorePercentage",
  "durationSeconds",
  "success",
];

const makeParticipantCode = (actorId) => {
  const secret = process.env.EVALUATION_ANONYMISATION_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error(
      "EVALUATION_ANONYMISATION_SECRET must contain at least 32 characters"
    );
  }

  return `P-${crypto
    .createHmac("sha256", secret)
    .update(String(actorId))
    .digest("hex")
    .slice(0, 16)
    .toUpperCase()}`;
};

const sanitiseMetrics = (input = {}) => {
  const metrics = {};

  ALLOWED_METRICS.forEach((key) => {
    if (input[key] === undefined || input[key] === null) return;

    if (key === "success") {
      metrics[key] = Boolean(input[key]);
      return;
    }

    const numericValue = Number(input[key]);
    if (Number.isFinite(numericValue)) metrics[key] = numericValue;
  });

  return metrics;
};

const logEvaluationEvent = async ({
  actorId,
  role,
  eventType,
  sessionCode = "",
  subjectCode = "",
  metrics = {},
  occurredAt = new Date(),
}) => {
  if (!actorId) throw new Error("actorId is required for evaluation logging");

  return EvaluationEvent.create({
    participantCode: makeParticipantCode(actorId),
    role,
    eventType,
    sessionCode: String(sessionCode || "").trim().toUpperCase(),
    subjectCode: String(subjectCode || "").trim().toUpperCase(),
    metrics: sanitiseMetrics(metrics),
    occurredAt,
  });
};

module.exports = {
  ALLOWED_METRICS,
  logEvaluationEvent,
  makeParticipantCode,
  sanitiseMetrics,
};