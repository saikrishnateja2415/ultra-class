import "./MySessions.css";

function MySessions({
  sessions = [],
  loading = false,
  onRefresh,
  onOpenSession,
  onViewSummary,
}) {
  const activeSessions = sessions.filter(
    (session) => session.status === "active"
  );

  const endedSessions = sessions.filter(
    (session) => session.status === "ended"
  );

  const availableSummaries = sessions.filter(
    (session) => session.summaryAvailable
  );

  const formatDate = (date) => {
    if (!date) {
      return "Not available";
    }

    return new Date(date).toLocaleString();
  };

  return (
    <section className="my-sessions-page">
      <div className="my-sessions-header">
        <div>
          <h1>My Sessions</h1>

          <p>
            Review your joined classroom sessions, questions and
            lecturer-approved AI summaries.
          </p>
        </div>

        <button
          type="button"
          className="my-sessions-refresh-button"
          onClick={onRefresh}
          disabled={loading}
        >
          {loading ? "Refreshing..." : "Refresh Sessions"}
        </button>
      </div>

      <div className="my-sessions-stats">
        <div className="my-session-stat-card">
          <span>Total Joined</span>
          <strong>{sessions.length}</strong>
        </div>

        <div className="my-session-stat-card">
          <span>Active</span>
          <strong>{activeSessions.length}</strong>
        </div>

        <div className="my-session-stat-card">
          <span>Ended</span>
          <strong>{endedSessions.length}</strong>
        </div>

        <div className="my-session-stat-card">
          <span>AI Summaries</span>
          <strong>{availableSummaries.length}</strong>
        </div>
      </div>

      {loading && sessions.length === 0 ? (
        <div className="my-sessions-loading">
          Loading your classroom sessions...
        </div>
      ) : sessions.length === 0 ? (
        <div className="my-sessions-empty">
          <h2>No joined sessions yet</h2>

          <p>
            After joining a classroom session, it will appear here
            permanently for future revision.
          </p>
        </div>
      ) : (
        <div className="my-sessions-grid">
          {sessions.map((session) => {
            const sessionEnded = session.status === "ended";

            const subjectName =
              session.subjectName ||
              session.subject?.subjectName ||
              "Subject unavailable";

            const moduleCode =
              session.moduleCode ||
              session.subject?.subjectCode ||
              "Not available";

            return (
              <article
                className={`my-session-card ${
                  sessionEnded ? "ended" : ""
                }`}
                key={session._id}
              >
                <div className="my-session-card-top">
                  <div>
                    <h2>{session.title}</h2>
                    <p className="my-session-subject">
                      {subjectName}
                    </p>
                  </div>

                  <span
                    className={`my-session-status ${
                      sessionEnded ? "ended" : ""
                    }`}
                  >
                    {session.status}
                  </span>
                </div>

                <div className="my-session-information">
                  <div>
                    <span>Subject Code</span>
                    <strong>{moduleCode}</strong>
                  </div>

                  <div>
                    <span>Session Code</span>
                    <strong>{session.sessionCode}</strong>
                  </div>

                  <div>
                    <span>Lecturer</span>
                    <strong>
                      {session.lecturerName || "Not available"}
                    </strong>
                  </div>

                  <div>
                    <span>Joined</span>
                    <strong>{formatDate(session.joinedAt)}</strong>
                  </div>

                  {sessionEnded && (
                    <div>
                      <span>Ended</span>
                      <strong>{formatDate(session.endedAt)}</strong>
                    </div>
                  )}
                </div>

                {session.summaryAvailable ? (
                  <div className="my-session-summary-status available">
                    AI summary available — reviewed and published by
                    your lecturer.
                  </div>
                ) : (
                  <div className="my-session-summary-status">
                    {sessionEnded
                      ? "The lecturer has not published an AI summary yet."
                      : "The AI summary will become available after the session ends and the lecturer publishes it."}
                  </div>
                )}

                <div className="my-session-actions">
                  <button
                    type="button"
                    className="my-session-action-button secondary"
                    onClick={() => onOpenSession(session)}
                  >
                    {sessionEnded
                      ? "Review Questions"
                      : "Open Current Session"}
                  </button>

                  <button
                    type="button"
                    className="my-session-action-button"
                    onClick={() => onViewSummary(session)}
                    disabled={!session.summaryAvailable}
                  >
                    {session.summaryAvailable
                      ? "View AI Summary"
                      : "Summary Unavailable"}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

export default MySessions;