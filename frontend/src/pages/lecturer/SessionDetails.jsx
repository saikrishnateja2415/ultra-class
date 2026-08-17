import { useState } from "react";
import QRCode from "react-qr-code";

import {
  APP_URL,
} from "../../config/api";

import "./SessionDetails.css";

function SessionDetails({
  session,
  onBack,
  onDelete,
  onManageQuestions,
  onManageMCQ,
  onViewParticipants,
  onViewAnalytics,
  onViewSummary,
  onViewEngagement,
  onViewTeachingRecommendations,
  onEndSession,
}) {
  const [endingSession, setEndingSession] =
    useState(false);

  if (!session) {
    return null;
  }

  const sessionEnded =
    session.status === "ended";

  const handleEndSession = async () => {
    if (sessionEnded) {
      return;
    }

    const confirmed = window.confirm(
      "Are you sure you want to end this session? Students will no longer be able to join or submit new classroom activity."
    );

    if (!confirmed) {
      return;
    }

    try {
      setEndingSession(true);

      await onEndSession(session._id);
    } finally {
      setEndingSession(false);
    }
  };

  return (
    <section className="session-details-page">
      <button
        type="button"
        className="details-back-btn"
        onClick={onBack}
      >
        ← Back to Sessions
      </button>

      <div className="details-header">
        <div>
          <span className="details-page-label">
            Classroom Session
          </span>

          <h2>{session.title}</h2>

          {session.subjectName && (
            <p className="details-subject-name">
              {session.subjectName}
            </p>
          )}
        </div>

        <span
          className={`details-status ${sessionEnded
            ? "details-status-ended"
            : "details-status-active"
            }`}
        >
          {session.status}
        </span>
      </div>

      <div className="details-grid">
        <div className="details-info-card">
          <h3>Session Information</h3>

          <p>
            <strong>Subject:</strong>{" "}
            {session.subjectName ||
              session.subjectId?.subjectName ||
              "Not available"}
          </p>

          <p>
            <strong>Module Code:</strong>{" "}
            {session.moduleCode}
          </p>

          <p>
            <strong>Session Code:</strong>{" "}
            {session.sessionCode}
          </p>

          <p>
            <strong>Lecturer:</strong>{" "}
            {session.lecturerName}
          </p>

          <p>
            <strong>Status:</strong>{" "}
            {session.status}
          </p>

          {session.createdAt && (
            <p>
              <strong>Created:</strong>{" "}
              {new Date(
                session.createdAt
              ).toLocaleString()}
            </p>
          )}

          {session.endedAt && (
            <p>
              <strong>Ended:</strong>{" "}
              {new Date(
                session.endedAt
              ).toLocaleString()}
            </p>
          )}
        </div>

        <div className="details-qr-card">
          <h3>Student Access QR</h3>

          {sessionEnded ? (
            <div className="ended-session-message">
              <h4>Session Ended</h4>

              <p>
                Student access to this session is
                closed.
              </p>
            </div>
          ) : (
            <>
              <div className="details-qr-box">
                <QRCode
                  value={`${APP_URL}/?sessionCode=${encodeURIComponent(
                    session.sessionCode
                  )}`}
                />
              </div>

              <p>
                Students registered for this subject
                can scan this QR code to access the
                session.
              </p>
            </>
          )}
        </div>
      </div>

      <div className="details-actions">
        <button
          type="button"
          onClick={onViewParticipants}
        >
          View Participants
        </button>

        <button
          type="button"
          onClick={onManageQuestions}
        >
          Manage Questions
        </button>

        <button
          type="button"
          className="details-mcq-btn"
          onClick={onManageMCQ}
        >
          Manage MCQ Polls
        </button>

        <button
          type="button"
          onClick={onViewAnalytics}
        >
          View Analytics
        </button>

        <button
          type="button"
          className="details-ai-summary-btn"
          onClick={onViewSummary}
        >
          AI Session Summary
        </button>

        <button
          type="button"
          className="details-engagement-btn"
          onClick={onViewEngagement}
        >
          Engagement Analysis
        </button>

        <button
          type="button"
          className="details-teaching-btn"
          onClick={onViewTeachingRecommendations}
        >
          Teaching Recommendations
        </button>

        <button
          type="button"
          className="details-end-btn"
          onClick={handleEndSession}
          disabled={
            sessionEnded || endingSession
          }
        >
          {endingSession
            ? "Ending Session..."
            : sessionEnded
              ? "Session Ended"
              : "End Session"}
        </button>

        <button
          type="button"
          className="details-delete-btn"
          onClick={() =>
            onDelete(session._id)
          }
        >
          Delete Session
        </button>
      </div>
    </section>
  );
}

export default SessionDetails;