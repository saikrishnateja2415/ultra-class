import { useCallback, useEffect, useState } from "react";
import "./StudentSessionSummary.css";

function StudentSessionSummary({ session, user, onBack }) {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const userId = user?.id || user?._id;

  const fetchPublishedSummary = useCallback(async () => {
    if (!session?._id || !userId) {
      setError("Student or session information is unavailable.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `http://localhost:5000/ai/student/sessions/${
          session._id
        }/published-summary?studentId=${encodeURIComponent(userId)}`
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Unable to load the published AI summary."
        );
      }

      setSummary(data.summary || data);
    } catch (fetchError) {
      console.error("Get student session summary error:", fetchError);

      setError(
        fetchError.message ||
          "Something went wrong while loading the session summary."
      );
    } finally {
      setLoading(false);
    }
  }, [session?._id, userId]);

  useEffect(() => {
    fetchPublishedSummary();
  }, [fetchPublishedSummary]);

  const renderList = (items, emptyMessage) => {
    if (!Array.isArray(items) || items.length === 0) {
      return <p className="student-summary-empty-text">{emptyMessage}</p>;
    }

    return (
      <div className="student-summary-list">
        {items.map((item, index) => (
          <div
            className="student-summary-list-item"
            key={`${index}-${String(item)}`}
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
      <section className="student-summary-page">
        <button
          type="button"
          className="student-summary-back-button"
          onClick={onBack}
        >
          ← Back to My Sessions
        </button>

        <div className="student-summary-state">
          <div className="student-summary-loader"></div>
          <h2>Loading AI session summary...</h2>
          <p>Retrieving the lecturer-approved revision material.</p>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="student-summary-page">
        <button
          type="button"
          className="student-summary-back-button"
          onClick={onBack}
        >
          ← Back to My Sessions
        </button>

        <div className="student-summary-state error">
          <span className="student-summary-state-icon">!</span>
          <h2>Summary unavailable</h2>
          <p>{error}</p>

          <button
            type="button"
            className="student-summary-retry-button"
            onClick={fetchPublishedSummary}
          >
            Try Again
          </button>
        </div>
      </section>
    );
  }

  const sessionInformation = summary?.session || session;
  const summaryContent = summary?.sessionSummary || summary;

  const overview =
    summaryContent?.summary ||
    "The lecturer has not provided a general overview for this session.";

  const keyTopics = summaryContent?.keyTopics || [];
  const commonDifficulties = summaryContent?.commonDifficulties || [];
  const importantExplanations =
    summaryContent?.importantExplanations || [];
  const revisionPoints = summaryContent?.revisionPoints || [];

  const publishedAt =
    summaryContent?.publishedAt ||
    summary?.publishedAt ||
    session?.summaryPublishedAt;

  return (
    <section className="student-summary-page">
      <button
        type="button"
        className="student-summary-back-button"
        onClick={onBack}
      >
        ← Back to My Sessions
      </button>

      <div className="student-summary-hero">
        <div>
          <span className="student-summary-label">
            LECTURER-APPROVED AI SUMMARY
          </span>

          <h1>{sessionInformation?.title || "Session Summary"}</h1>

          <p>
            {sessionInformation?.subjectName ||
              sessionInformation?.subject?.subjectName ||
              sessionInformation?.moduleName ||
              "Published classroom revision material"}
          </p>
        </div>

        <div className="student-summary-published-badge">
          <span>Published</span>
          <strong>
            {publishedAt
              ? new Date(publishedAt).toLocaleDateString()
              : "Available"}
          </strong>
        </div>
      </div>

      <div className="student-summary-session-info">
        <div>
          <span>Subject Code</span>
          <strong>
            {sessionInformation?.moduleCode ||
              sessionInformation?.subject?.subjectCode ||
              "Not available"}
          </strong>
        </div>

        <div>
          <span>Session Code</span>
          <strong>{sessionInformation?.sessionCode || "Not available"}</strong>
        </div>

        <div>
          <span>Session Status</span>
          <strong className="student-summary-ended-status">
            {sessionInformation?.status || "ended"}
          </strong>
        </div>
      </div>

      <div className="student-summary-overview-card">
        <div className="student-summary-section-heading">
          <span>01</span>

          <div>
            <h2>Session Overview</h2>
            <p>A concise explanation of what was discussed in this session.</p>
          </div>
        </div>

        <p className="student-summary-overview-text">{overview}</p>
      </div>

      <div className="student-summary-grid">
        <div className="student-summary-content-card topics">
          <div className="student-summary-section-heading">
            <span>02</span>

            <div>
              <h2>Key Topics</h2>
              <p>Main concepts covered during the classroom session.</p>
            </div>
          </div>

          {renderList(keyTopics, "No key topics were added.")}
        </div>

        <div className="student-summary-content-card difficulties">
          <div className="student-summary-section-heading">
            <span>03</span>

            <div>
              <h2>Common Difficulties</h2>
              <p>Areas where students needed additional clarification.</p>
            </div>
          </div>

          {renderList(
            commonDifficulties,
            "No common difficulties were identified."
          )}
        </div>

        <div className="student-summary-content-card explanations">
          <div className="student-summary-section-heading">
            <span>04</span>

            <div>
              <h2>Important Explanations</h2>
              <p>Key points reviewed and approved by the lecturer.</p>
            </div>
          </div>

          {renderList(
            importantExplanations,
            "No additional lecturer explanations were provided."
          )}
        </div>

        <div className="student-summary-content-card revision">
          <div className="student-summary-section-heading">
            <span>05</span>

            <div>
              <h2>Revision Points</h2>
              <p>Recommended concepts to review after the session.</p>
            </div>
          </div>

          {renderList(
            revisionPoints,
            "No specific revision points were provided."
          )}
        </div>
      </div>

      <div className="student-summary-notice">
        <strong>Approved learning material</strong>

        <p>
          This AI-generated summary was reviewed and published by your
          lecturer. Use it as revision support alongside your lecture notes and
          official course materials.
        </p>
      </div>
    </section>
  );
}

export default StudentSessionSummary;