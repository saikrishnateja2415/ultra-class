import { useCallback, useEffect, useState } from "react";
import axios from "axios";

import "./EngagementAnalysis.css";

function EngagementAnalysis({
  session,
  user,
  onBack,
}) {
  const [analysis, setAnalysis] =
    useState(null);

  const [metadata, setMetadata] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [generating, setGenerating] =
    useState(false);

  const [error, setError] =
    useState("");

  const lecturerId =
    user?.id || user?._id;

  const loadSavedAnalysis =
    useCallback(async () => {
      if (!session?._id || !lecturerId) {
        setError(
          "Session or lecturer information is unavailable."
        );

        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");

        const response = await axios.get(
          `http://localhost:5000/ai/sessions/${session._id}/engagement-sentiment`,
          {
            params: {
              lecturerId,
            },
          }
        );

        setAnalysis(
          response.data.engagementAndSentiment
        );

        setMetadata(
          response.data.metadata || null
        );
      } catch (requestError) {
        if (
          requestError.response?.status === 404 &&
          requestError.response?.data
            ?.status === "not_generated"
        ) {
          setAnalysis(null);
          setError("");
        } else {
          setError(
            requestError.response?.data
              ?.message ||
              "Unable to load engagement analysis."
          );
        }
      } finally {
        setLoading(false);
      }
    }, [session?._id, lecturerId]);

  useEffect(() => {
    loadSavedAnalysis();
  }, [loadSavedAnalysis]);

  const generateAnalysis = async (
    forceRegenerate = false
  ) => {
    if (!session?._id || !lecturerId) {
      return;
    }

    try {
      setGenerating(true);
      setError("");

      const response = await axios.post(
        `http://localhost:5000/ai/sessions/${session._id}/engagement-sentiment`,
        {
          lecturerId,
          forceRegenerate,
        }
      );

      setAnalysis(
        response.data.engagementAndSentiment
      );

      setMetadata(
        response.data.metadata || null
      );
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "Unable to generate engagement analysis."
      );
    } finally {
      setGenerating(false);
    }
  };

  const renderList = (
    items,
    emptyMessage
  ) => {
    if (
      !Array.isArray(items) ||
      items.length === 0
    ) {
      return (
        <p className="engagement-empty-list">
          {emptyMessage}
        </p>
      );
    }

    return (
      <div className="engagement-insight-list">
        {items.map((item, index) => (
          <div
            className="engagement-insight-item"
            key={`${index}-${item}`}
          >
            <span>{index + 1}</span>
            <p>{item}</p>
          </div>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <section className="engagement-page">
        <button
          type="button"
          className="engagement-back-button"
          onClick={onBack}
        >
          ← Back to Session
        </button>

        <div className="engagement-state-card">
          <div className="engagement-loader"></div>

          <h2>
            Loading engagement analysis...
          </h2>

          <p>
            Checking for previously saved
            classroom intelligence.
          </p>
        </div>
      </section>
    );
  }

  const metrics = analysis?.metrics || {
    registeredStudents: 0,
    joinedStudents: 0,
    participationRate: 0,
    totalQuestions: 0,
    answeredQuestions: 0,
    pendingQuestions: 0,
    pinnedQuestions: 0,
    questionsPerParticipant: 0,
    lecturerResponseRate: 0,
  };

  const distribution =
    analysis?.signalDistribution || {
      positive: 0,
      neutral: 0,
      confused: 0,
    };

  const totalSignals =
    distribution.positive +
    distribution.neutral +
    distribution.confused;

  const positivePercentage =
    totalSignals === 0
      ? 0
      : Math.round(
          (distribution.positive /
            totalSignals) *
            100
        );

  const neutralPercentage =
    totalSignals === 0
      ? 0
      : Math.round(
          (distribution.neutral /
            totalSignals) *
            100
        );

  const confusedPercentage =
    totalSignals === 0
      ? 0
      : Math.max(
          0,
          100 -
            positivePercentage -
            neutralPercentage
        );

  const positiveDegree =
    positivePercentage * 3.6;

  const neutralDegree =
    neutralPercentage * 3.6;

  return (
    <section className="engagement-page">
      <button
        type="button"
        className="engagement-back-button"
        onClick={onBack}
      >
        ← Back to Session
      </button>

      <div className="engagement-hero">
        <div>
          <span className="engagement-feature-label">
            AI FEATURE 3
          </span>

          <h1>
            Engagement & Learning Signals
          </h1>

          <p>
            Session-specific participation,
            response and aggregated question
            analysis.
          </p>
        </div>

        {analysis?.status === "completed" && (
          <div className="engagement-score-box">
            <span>Engagement Score</span>

            <strong>
              {analysis.engagementScore || 0}%
            </strong>

            <small>
              {analysis.engagementLevel ||
                "Low"}{" "}
              Engagement
            </small>
          </div>
        )}
      </div>

      <div className="engagement-session-banner">
        <div>
          <span>Session</span>
          <strong>{session?.title}</strong>
        </div>

        <div>
          <span>Subject</span>
          <strong>
            {session?.subjectName ||
              session?.subject?.subjectName ||
              "Not available"}
          </strong>
        </div>

        <div>
          <span>Session Code</span>
          <strong>
            {session?.sessionCode}
          </strong>
        </div>

        <div>
          <span>Status</span>
          <strong className="engagement-session-status">
            {session?.status}
          </strong>
        </div>
      </div>

      {error && (
        <div className="engagement-error">
          {error}
        </div>
      )}

      {!analysis ? (
        <div className="engagement-not-generated">
          <div className="engagement-ai-icon">
            AI
          </div>

          <h2>
            Analyse this classroom session
          </h2>

          <p>
            Generate objective engagement
            metrics and aggregated learning
            signals from anonymous student
            questions.
          </p>

          <ul>
            <li>
              Student identities are not sent
              to Gemini.
            </li>

            <li>
              Participation metrics are
              calculated by Ultra Class.
            </li>

            <li>
              The analysis does not diagnose
              individual student emotions.
            </li>
          </ul>

          <button
            type="button"
            onClick={() =>
              generateAnalysis(false)
            }
            disabled={generating}
          >
            {generating
              ? "Analysing Session..."
              : "Generate Engagement Analysis"}
          </button>
        </div>
      ) : (
        <>
          <div className="engagement-analysis-toolbar">
            <div>
              <h2>
                Classroom Intelligence
              </h2>

              <p>
                Generated{" "}
                {analysis.generatedAt
                  ? new Date(
                      analysis.generatedAt
                    ).toLocaleString()
                  : "recently"}
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                generateAnalysis(true)
              }
              disabled={generating}
            >
              {generating
                ? "Regenerating..."
                : "Regenerate Analysis"}
            </button>
          </div>

          <div className="engagement-metrics-grid">
            <div className="engagement-metric-card">
              <span>
                Registered Students
              </span>

              <strong>
                {metrics.registeredStudents}
              </strong>
            </div>

            <div className="engagement-metric-card">
              <span>Joined Students</span>

              <strong>
                {metrics.joinedStudents}
              </strong>
            </div>

            <div className="engagement-metric-card">
              <span>Participation Rate</span>

              <strong>
                {metrics.participationRate}%
              </strong>
            </div>

            <div className="engagement-metric-card">
              <span>Total Questions</span>

              <strong>
                {metrics.totalQuestions}
              </strong>
            </div>

            <div className="engagement-metric-card">
              <span>Answered</span>

              <strong>
                {metrics.answeredQuestions}
              </strong>
            </div>

            <div className="engagement-metric-card">
              <span>Pending</span>

              <strong>
                {metrics.pendingQuestions}
              </strong>
            </div>

            <div className="engagement-metric-card">
              <span>
                Questions per Participant
              </span>

              <strong>
                {metrics.questionsPerParticipant}
              </strong>
            </div>

            <div className="engagement-metric-card">
              <span>
                Lecturer Response Rate
              </span>

              <strong>
                {metrics.lecturerResponseRate}%
              </strong>
            </div>
          </div>

          <div className="engagement-progress-grid">
            <div className="engagement-progress-card">
              <div>
                <h3>Participation</h3>

                <strong>
                  {metrics.participationRate}%
                </strong>
              </div>

              <div className="engagement-progress-track">
                <div
                  className="engagement-progress-fill participation"
                  style={{
                    width: `${metrics.participationRate}%`,
                  }}
                ></div>
              </div>
            </div>

            <div className="engagement-progress-card">
              <div>
                <h3>Response Coverage</h3>

                <strong>
                  {metrics.lecturerResponseRate}%
                </strong>
              </div>

              <div className="engagement-progress-track">
                <div
                  className="engagement-progress-fill response"
                  style={{
                    width: `${metrics.lecturerResponseRate}%`,
                  }}
                ></div>
              </div>
            </div>
          </div>

          <div className="engagement-main-grid">
            <div className="engagement-panel">
              <div className="engagement-panel-heading">
                <div>
                  <span>LEARNING SIGNALS</span>

                  <h2>
                    Anonymous Question
                    Distribution
                  </h2>
                </div>

                <strong className="engagement-signal-badge">
                  {analysis.overallLearningSignal ||
                    "Neutral"}
                </strong>
              </div>

              <div className="engagement-chart-area">
                <div
                  className="engagement-donut"
                  style={{
                    background:
                      totalSignals === 0
                        ? "#e5e7eb"
                        : `conic-gradient(
                            #22c55e 0deg ${positiveDegree}deg,
                            #3b82f6 ${positiveDegree}deg ${
                              positiveDegree +
                              neutralDegree
                            }deg,
                            #f59e0b ${
                              positiveDegree +
                              neutralDegree
                            }deg 360deg
                          )`,
                  }}
                >
                  <div className="engagement-donut-center">
                    <strong>
                      {totalSignals}
                    </strong>

                    <span>Questions</span>
                  </div>
                </div>

                <div className="engagement-chart-legend">
                  <div>
                    <span className="signal-colour positive"></span>

                    <p>
                      Positive
                      <strong>
                        {distribution.positive} (
                        {positivePercentage}%)
                      </strong>
                    </p>
                  </div>

                  <div>
                    <span className="signal-colour neutral"></span>

                    <p>
                      Neutral
                      <strong>
                        {distribution.neutral} (
                        {neutralPercentage}%)
                      </strong>
                    </p>
                  </div>

                  <div>
                    <span className="signal-colour confused"></span>

                    <p>
                      Confused
                      <strong>
                        {distribution.confused} (
                        {confusedPercentage}%)
                      </strong>
                    </p>
                  </div>
                </div>
              </div>

              <div className="engagement-ethics-note">
                These are aggregated language
                signals, not diagnoses of
                individual student emotions.
              </div>
            </div>

            <div className="engagement-panel">
              <div className="engagement-panel-heading">
                <div>
                  <span>AI OBSERVATIONS</span>

                  <h2>
                    Classroom Engagement
                    Findings
                  </h2>
                </div>
              </div>

              {renderList(
                analysis.observations,
                "No additional observations were generated."
              )}
            </div>
          </div>

          <div className="engagement-insights-grid">
            <div className="engagement-insight-panel confusion">
              <h2>Confusion Indicators</h2>

              <p>
                Question patterns suggesting
                uncertainty or required
                clarification.
              </p>

              {renderList(
                analysis.confusionIndicators,
                "No clear confusion indicators were detected."
              )}
            </div>

            <div className="engagement-insight-panel positive">
              <h2>
                Positive Learning Indicators
              </h2>

              <p>
                Question patterns suggesting
                constructive progress or
                understanding.
              </p>

              {renderList(
                analysis.positiveIndicators,
                "No strong positive indicators were detected."
              )}
            </div>

            <div className="engagement-insight-panel actions">
              <h2>
                Suggested Lecturer Actions
              </h2>

              <p>
                Evidence-based actions for the
                next teaching interaction.
              </p>

              {renderList(
                analysis.recommendedActions,
                "No additional actions were suggested."
              )}
            </div>
          </div>

          <div className="engagement-metadata">
            <span>
              Analysis provider:{" "}
              <strong>
                {metadata?.provider ||
                  "Ultra Class"}
              </strong>
            </span>

            <span>
              Model:{" "}
              <strong>
                {metadata?.model ||
                  "Platform metrics only"}
              </strong>
            </span>
          </div>
        </>
      )}
    </section>
  );
}

export default EngagementAnalysis;