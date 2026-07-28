import {
  useCallback,
  useEffect,
  useState,
} from "react";

import axios from "axios";

import "./TeachingRecommendations.css";

function TeachingRecommendations({
  session,
  user,
  onBack,
}) {
  const [recommendations, setRecommendations] =
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

  const loadSavedRecommendations =
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
          `http://localhost:5000/ai/sessions/${session._id}/teaching-recommendations`,
          {
            params: {
              lecturerId,
            },
          }
        );

        const savedRecommendations =
          response.data
            .teachingRecommendations;

        if (
          savedRecommendations?.status ===
          "failed"
        ) {
          setRecommendations(null);

          setError(
            savedRecommendations.errorMessage ||
              "The previous recommendation generation failed."
          );
        } else {
          setRecommendations(
            savedRecommendations
          );

          setMetadata(
            response.data.metadata || null
          );
        }
      } catch (requestError) {
        if (
          requestError.response?.status ===
            404 &&
          requestError.response?.data
            ?.status === "not_generated"
        ) {
          setRecommendations(null);
          setError("");
        } else {
          setError(
            requestError.response?.data
              ?.message ||
              "Unable to load teaching recommendations."
          );
        }
      } finally {
        setLoading(false);
      }
    }, [session?._id, lecturerId]);

  useEffect(() => {
    loadSavedRecommendations();
  }, [loadSavedRecommendations]);

  const generateRecommendations = async (
    forceRegenerate = false
  ) => {
    if (!session?._id || !lecturerId) {
      return;
    }

    try {
      setGenerating(true);
      setError("");

      const response = await axios.post(
        `http://localhost:5000/ai/sessions/${session._id}/teaching-recommendations`,
        {
          lecturerId,
          forceRegenerate,
        }
      );

      setRecommendations(
        response.data
          .teachingRecommendations
      );

      setMetadata(
        response.data.metadata || null
      );
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "Unable to generate teaching recommendations."
      );
    } finally {
      setGenerating(false);
    }
  };

  const getPriorityClass = (priority) => {
    if (priority === "High") {
      return "high";
    }

    if (priority === "Low") {
      return "low";
    }

    return "medium";
  };

  const renderNumberedList = (
    items,
    emptyMessage
  ) => {
    if (
      !Array.isArray(items) ||
      items.length === 0
    ) {
      return (
        <p className="teaching-empty-list">
          {emptyMessage}
        </p>
      );
    }

    return (
      <div className="teaching-numbered-list">
        {items.map((item, index) => (
          <div
            className="teaching-numbered-item"
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
      <section className="teaching-page">
        <button
          type="button"
          className="teaching-back-button"
          onClick={onBack}
        >
          ← Back to Session
        </button>

        <div className="teaching-state-card">
          <div className="teaching-loader"></div>

          <h2>
            Loading teaching recommendations...
          </h2>

          <p>
            Checking for previously saved
            classroom recommendations.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="teaching-page">
      <button
        type="button"
        className="teaching-back-button"
        onClick={onBack}
      >
        ← Back to Session
      </button>

      <div className="teaching-hero">
        <div>
          <span className="teaching-feature-label">
            AI FEATURE 4
          </span>

          <h1>
            AI Teaching Recommendations
          </h1>

          <p>
            Evidence-based teaching actions
            generated from questions, summaries,
            engagement metrics and learning
            signals.
          </p>
        </div>

        {recommendations?.status ===
          "completed" && (
          <div className="teaching-complete-badge">
            <span>Analysis</span>
            <strong>Complete</strong>
            <small>
              Lecturer Decision Support
            </small>
          </div>
        )}
      </div>

      <div className="teaching-session-banner">
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

          <strong className="teaching-session-status">
            {session?.status}
          </strong>
        </div>
      </div>

      {error && (
        <div className="teaching-error">
          {error}
        </div>
      )}

      {!recommendations ? (
        <div className="teaching-not-generated">
          <div className="teaching-ai-icon">
            AI
          </div>

          <h2>
            Generate evidence-based teaching
            recommendations
          </h2>

          <p>
            Ultra Class will combine the selected
            session’s questions, clustering,
            summary and engagement analysis to
            recommend practical lecturer actions.
          </p>

          <div className="teaching-requirements">
            <strong>Before generating:</strong>

            <ul>
              <li>
                The session must contain at least
                one student question.
              </li>

              <li>
                Engagement Analysis must already
                be completed.
              </li>

              <li>
                Recommendations remain private to
                the lecturer.
              </li>
            </ul>
          </div>

          <button
            type="button"
            onClick={() =>
              generateRecommendations(false)
            }
            disabled={generating}
          >
            {generating
              ? "Generating Recommendations..."
              : "Generate Teaching Recommendations"}
          </button>
        </div>
      ) : (
        <>
          <div className="teaching-toolbar">
            <div>
              <h2>
                Teaching Decision Support
              </h2>

              <p>
                Generated{" "}
                {recommendations.generatedAt
                  ? new Date(
                      recommendations.generatedAt
                    ).toLocaleString()
                  : "recently"}
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                generateRecommendations(true)
              }
              disabled={generating}
            >
              {generating
                ? "Regenerating..."
                : "Regenerate Recommendations"}
            </button>
          </div>

          <div className="teaching-priority-grid">
            <div className="teaching-priority-card">
              <span>Priority Teaching Topic</span>

              <h2>
                {recommendations.priorityTopic ||
                  "Not identified"}
              </h2>

              <p>
                The topic requiring the strongest
                lecturer attention based on the
                current session evidence.
              </p>
            </div>

            <div className="teaching-next-action-card">
              <span>
                Suggested Immediate Action
              </span>

              <h2>
                {
                  recommendations
                    .suggestedNextAction
                }
              </h2>

              <p>
                Recommended as the first lecturer
                response before the next session.
              </p>
            </div>
          </div>

          <div className="teaching-section-heading">
            <div>
              <span>
                EVIDENCE-BASED RECOMMENDATIONS
              </span>

              <h2>
                Recommended Teaching Actions
              </h2>

              <p>
                Each recommendation includes its
                rationale, supporting evidence and
                a concrete action.
              </p>
            </div>
          </div>

          <div className="teaching-recommendations-grid">
            {(
              recommendations.recommendations ||
              []
            ).map((item, index) => (
              <article
                className="teaching-recommendation-card"
                key={`${index}-${item.title}`}
              >
                <div className="teaching-recommendation-top">
                  <span className="teaching-recommendation-number">
                    {String(index + 1).padStart(
                      2,
                      "0"
                    )}
                  </span>

                  <span
                    className={`teaching-priority-badge ${getPriorityClass(
                      item.priority
                    )}`}
                  >
                    {item.priority}
                  </span>
                </div>

                <span className="teaching-category">
                  {item.category}
                </span>

                <h3>{item.title}</h3>

                <div className="teaching-detail-box">
                  <strong>Why</strong>
                  <p>{item.rationale}</p>
                </div>

                <div className="teaching-detail-box evidence">
                  <strong>Session Evidence</strong>
                  <p>{item.evidence}</p>
                </div>

                <div className="teaching-detail-box action">
                  <strong>Lecturer Action</strong>
                  <p>{item.action}</p>
                </div>
              </article>
            ))}
          </div>

          <div className="teaching-planning-grid">
            <div className="teaching-plan-panel">
              <div className="teaching-panel-heading">
                <span>01</span>

                <div>
                  <h2>Next Session Plan</h2>

                  <p>
                    A suggested sequence for the
                    next teaching interaction.
                  </p>
                </div>
              </div>

              {renderNumberedList(
                recommendations.nextSessionPlan,
                "No next-session plan was generated."
              )}
            </div>

            <div className="teaching-plan-panel follow-up">
              <div className="teaching-panel-heading">
                <span>02</span>

                <div>
                  <h2>
                    Follow-up Questions
                  </h2>

                  <p>
                    Questions the lecturer can use
                    to check student understanding.
                  </p>
                </div>
              </div>

              {renderNumberedList(
                recommendations
                  .followUpQuestions,
                "No follow-up questions were generated."
              )}
            </div>
          </div>

          <div className="teaching-decision-note">
            <strong>
              Lecturer decision remains final
            </strong>

            <p>
              These recommendations are generated
              as teaching decision support. The
              lecturer should review their
              relevance before applying them.
            </p>
          </div>

          <div className="teaching-metadata">
            <span>
              Provider:{" "}
              <strong>
                {metadata?.provider ||
                  "Google Gemini"}
              </strong>
            </span>

            <span>
              Model:{" "}
              <strong>
                {metadata?.model ||
                  "Not available"}
              </strong>
            </span>
          </div>
        </>
      )}
    </section>
  );
}

export default TeachingRecommendations;