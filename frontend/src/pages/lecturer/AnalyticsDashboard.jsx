import { useEffect, useMemo, useState } from "react";
import axios from "axios";

import "./AnalyticsDashboard.css";

function AnalyticsDashboard({
  session,
  allQuestions = [],
  onBack,
}) {
  const [participantData, setParticipantData] =
    useState({
      registeredCount: 0,
      joinedCount: 0,
      notJoinedCount: 0,
    });

  const [loadingParticipants, setLoadingParticipants] =
    useState(true);

  const [error, setError] = useState("");

  useEffect(() => {
    const fetchSessionParticipants = async () => {
      if (!session?._id) {
        setLoadingParticipants(false);
        return;
      }

      try {
        setLoadingParticipants(true);
        setError("");

        const response = await axios.get(
          `http://localhost:5000/lecturer/session/${session._id}/participants`
        );

        setParticipantData({
          registeredCount:
            response.data.registeredCount || 0,

          joinedCount:
            response.data.joinedCount || 0,

          notJoinedCount:
            response.data.notJoinedCount || 0,
        });
      } catch (requestError) {
        console.error(
          "Load session analytics participants error:",
          requestError
        );

        setError(
          requestError.response?.data?.message ||
            "Unable to load participant analytics"
        );
      } finally {
        setLoadingParticipants(false);
      }
    };

    fetchSessionParticipants();
  }, [session?._id]);

  const sessionQuestions = useMemo(() => {
    if (!session) {
      return [];
    }

    return allQuestions.filter((question) => {
      const questionSessionId =
        typeof question.sessionId === "object"
          ? question.sessionId?._id
          : question.sessionId;

      const matchesSessionId =
        questionSessionId?.toString() ===
        session._id?.toString();

      const matchesSessionCode =
        question.sessionCode === session.sessionCode;

      return matchesSessionId || matchesSessionCode;
    });
  }, [allQuestions, session]);

  const isAnswered = (question) => {
    return (
      question.status === "Answered" ||
      Boolean(question.answer?.trim())
    );
  };

  const totalQuestions = sessionQuestions.length;

  const answeredQuestions = sessionQuestions.filter(
    isAnswered
  ).length;

  const pendingQuestions =
    totalQuestions - answeredQuestions;

  const pinnedQuestions = sessionQuestions.filter(
    (question) => question.pinned
  ).length;

  const answerRate =
    totalQuestions === 0
      ? 0
      : Math.round(
          (answeredQuestions / totalQuestions) * 100
        );

  const pendingRate =
    totalQuestions === 0
      ? 0
      : Math.round(
          (pendingQuestions / totalQuestions) * 100
        );

  const answeredDegree =
    totalQuestions === 0
      ? 0
      : Math.round(
          (answeredQuestions / totalQuestions) * 360
        );

  const pendingDegree =
    totalQuestions === 0
      ? 0
      : 360 - answeredDegree;

  const {
    registeredCount,
    joinedCount,
    notJoinedCount,
  } = participantData;

  const participationRate =
    registeredCount === 0
      ? 0
      : Math.round(
          (joinedCount / registeredCount) * 100
        );

  const questionsPerJoinedStudent =
    joinedCount === 0
      ? 0
      : Number(
          (totalQuestions / joinedCount).toFixed(1)
        );

  /*
  Participation contributes 50%.
  Question activity contributes 30%.
  Lecturer answer rate contributes 20%.
  */

  const questionActivityScore =
    joinedCount === 0
      ? 0
      : Math.min(
          100,
          Math.round(
            (totalQuestions / joinedCount) * 50
          )
        );

  const engagementScore = Math.round(
    participationRate * 0.5 +
      questionActivityScore * 0.3 +
      answerRate * 0.2
  );

  const getSessionDuration = () => {
    if (!session?.createdAt) {
      return "Not available";
    }

    const startTime = new Date(session.createdAt);

    const endTime = session.endedAt
      ? new Date(session.endedAt)
      : new Date();

    const differenceMilliseconds =
      endTime.getTime() - startTime.getTime();

    if (
      Number.isNaN(differenceMilliseconds) ||
      differenceMilliseconds < 0
    ) {
      return "Not available";
    }

    const totalMinutes = Math.floor(
      differenceMilliseconds / 60000
    );

    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    if (hours === 0) {
      return `${minutes} minutes`;
    }

    return `${hours}h ${minutes}m`;
  };

  if (!session) {
    return (
      <section className="analytics-dashboard-page">
        <div className="analytics-empty-state">
          <h2>No Session Selected</h2>

          <p>
            Select a session before opening its analytics.
          </p>

          <button type="button" onClick={onBack}>
            Back to Sessions
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="analytics-dashboard-page">
      <button
        type="button"
        className="analytics-back-button"
        onClick={onBack}
      >
        ← Back to Session
      </button>

      <div className="analytics-hero">
        <div>
          <span className="analytics-page-label">
            Session Analytics
          </span>

          <h1>{session.title}</h1>

          <p>
            {session.subjectName ||
              session.subjectId?.subjectName ||
              "Subject unavailable"}
            {" • "}
            {session.moduleCode}
            {" • "}
            {session.sessionCode}
          </p>
        </div>

        <div className="analytics-hero-right">
          <span
            className={`analytics-session-status ${
              session.status === "ended"
                ? "analytics-status-ended"
                : "analytics-status-active"
            }`}
          >
            {session.status}
          </span>

          <div className="analytics-score-box">
            <span>Engagement Score</span>
            <strong>{engagementScore}%</strong>
          </div>
        </div>
      </div>

      {error && (
        <div className="analytics-error-message">
          {error}
        </div>
      )}

      <div className="analytics-page-grid">
        <div className="analytics-card">
          <p>Registered Students</p>

          <h3>
            {loadingParticipants
              ? "..."
              : registeredCount}
          </h3>
        </div>

        <div className="analytics-card">
          <p>Joined Session</p>

          <h3>
            {loadingParticipants ? "..." : joinedCount}
          </h3>
        </div>

        <div className="analytics-card">
          <p>Did Not Join</p>

          <h3>
            {loadingParticipants
              ? "..."
              : notJoinedCount}
          </h3>
        </div>

        <div className="analytics-card">
          <p>Total Questions</p>
          <h3>{totalQuestions}</h3>
        </div>

        <div className="analytics-card">
          <p>Answered Questions</p>
          <h3>{answeredQuestions}</h3>
        </div>

        <div className="analytics-card">
          <p>Pending Questions</p>
          <h3>{pendingQuestions}</h3>
        </div>

        <div className="analytics-card">
          <p>Pinned Questions</p>
          <h3>{pinnedQuestions}</h3>
        </div>

        <div className="analytics-card">
          <p>Session Duration</p>
          <h3 className="analytics-duration">
            {getSessionDuration()}
          </h3>
        </div>
      </div>

      <div className="analytics-progress-section">
        <div className="progress-card">
          <div className="progress-top">
            <h3>Participation Rate</h3>
            <strong>{participationRate}%</strong>
          </div>

          <div className="progress-track">
            <div
              className="progress-fill participation-fill"
              style={{
                width: `${participationRate}%`,
              }}
            />
          </div>
        </div>

        <div className="progress-card">
          <div className="progress-top">
            <h3>Answer Rate</h3>
            <strong>{answerRate}%</strong>
          </div>

          <div className="progress-track">
            <div
              className="progress-fill"
              style={{
                width: `${answerRate}%`,
              }}
            />
          </div>
        </div>

        <div className="progress-card">
          <div className="progress-top">
            <h3>Pending Rate</h3>
            <strong>{pendingRate}%</strong>
          </div>

          <div className="progress-track">
            <div
              className="progress-fill pending-fill"
              style={{
                width: `${pendingRate}%`,
              }}
            />
          </div>
        </div>
      </div>

      <div className="analytics-insights-grid">
        <div className="insight-card">
          <span>Student Participation</span>

          <h3>
            {participationRate >= 70
              ? "Strong"
              : participationRate >= 40
                ? "Moderate"
                : "Needs Attention"}
          </h3>

          <p>
            {joinedCount} of {registeredCount} registered
            students joined this session.
          </p>
        </div>

        <div className="insight-card">
          <span>Answer Performance</span>

          <h3>
            {answerRate >= 70
              ? "Strong"
              : answerRate >= 40
                ? "Moderate"
                : "Needs Attention"}
          </h3>

          <p>
            {answeredQuestions} of {totalQuestions} questions
            have been answered.
          </p>
        </div>

        <div className="insight-card">
          <span>Question Activity</span>

          <h3>
            {questionsPerJoinedStudent}
          </h3>

          <p>
            Average questions per student who joined.
          </p>
        </div>
      </div>

      <div className="analytics-two-column">
        <div className="analytics-panel">
          <h2>Question Status Distribution</h2>

          <div className="donut-chart-wrap">
            <div
              className="donut-chart"
              style={{
                background:
                  totalQuestions === 0
                    ? "#e5e7eb"
                    : `conic-gradient(
                        #2563eb 0deg ${answeredDegree}deg,
                        #f97316 ${answeredDegree}deg ${
                          answeredDegree + pendingDegree
                        }deg
                      )`,
              }}
            >
              <div className="donut-center">
                <strong>{totalQuestions}</strong>
                <span>Total</span>
              </div>
            </div>

            <div className="donut-legend">
              <p>
                <span className="legend-blue" />
                Answered: {answeredQuestions}
              </p>

              <p>
                <span className="legend-orange" />
                Pending: {pendingQuestions}
              </p>

              <p>
                <span className="legend-green" />
                Pinned: {pinnedQuestions}
              </p>
            </div>
          </div>
        </div>

        <div className="analytics-panel">
          <h2>Session Participation</h2>

          <div className="participation-summary">
            <div className="participation-summary-row">
              <span>Registered students</span>
              <strong>{registeredCount}</strong>
            </div>

            <div className="participation-summary-row">
              <span>Joined session</span>
              <strong>{joinedCount}</strong>
            </div>

            <div className="participation-summary-row">
              <span>Did not join</span>
              <strong>{notJoinedCount}</strong>
            </div>

            <div className="participation-summary-row">
              <span>Questions submitted</span>
              <strong>{totalQuestions}</strong>
            </div>
          </div>
        </div>
      </div>

      <div className="analytics-panel ai-preview-panel">
        <h2>AI Classroom Intelligence</h2>

        <div className="ai-insight-card">
          <span>Current Rule-Based Insight</span>

          <h3>
            {totalQuestions === 0
              ? "No questions were submitted in this session"
              : pendingQuestions > answeredQuestions
                ? "Several student questions still need lecturer attention"
                : "Question response progress is currently positive"}
          </h3>

          <p>
            After session analytics is completed, this
            section will display AI question clusters,
            session summaries, sentiment analysis and
            teaching recommendations for this session.
          </p>
        </div>
      </div>
    </section>
  );
}

export default AnalyticsDashboard;