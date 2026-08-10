import {
  useCallback,
  useEffect,
  useState,
} from "react";

import axios from "axios";

import "./MySessions.css";

function MySessions({
  user,
  sessions = [],
  loading = false,
  onRefresh,
  onOpenSession,
  onViewSummary,
}) {
  const [registeredSubjects, setRegisteredSubjects] =
    useState([]);

  const [
    selectedSubjectId,
    setSelectedSubjectId,
  ] = useState(null);

  const [subjectsLoading, setSubjectsLoading] =
    useState(false);

  const studentId = user?.id || user?._id;

  /*
    Load the subjects registered to the student.

    The same backend endpoint returns both registered
    subjects and the student's joined sessions.
  */

  const fetchRegisteredSubjects =
    useCallback(async () => {
      if (!studentId) {
        setRegisteredSubjects([]);
        return;
      }

      try {
        setSubjectsLoading(true);

        const response = await axios.get(
          `http://localhost:5000/student/${studentId}/joined-sessions`
        );

        setRegisteredSubjects(
          response.data.registeredSubjects || []
        );
      } catch (error) {
        console.log(
          "Load registered subjects error:",
          error
        );

        setRegisteredSubjects([]);
      } finally {
        setSubjectsLoading(false);
      }
    }, [studentId]);

  /*
    Load the registered subjects when the My Sessions
    page is opened.
  */

  useEffect(() => {
    fetchRegisteredSubjects();
  }, [fetchRegisteredSubjects]);

  /*
    Refresh both the session history and registered
    subject list.
  */

  const handleRefresh = async () => {
    await Promise.all([
      onRefresh?.(),
      fetchRegisteredSubjects(),
    ]);
  };

  /*
    Sort using joinedAt so the latest joined session
    appears first.
  */

  const sortedSessions = [...sessions].sort(
    (firstSession, secondSession) => {
      const firstJoinedTime =
        firstSession.joinedAt
          ? new Date(
              firstSession.joinedAt
            ).getTime()
          : 0;

      const secondJoinedTime =
        secondSession.joinedAt
          ? new Date(
              secondSession.joinedAt
            ).getTime()
          : 0;

      return (
        secondJoinedTime - firstJoinedTime
      );
    }
  );

  /*
    When no subject is selected, show all joined
    sessions. When a subject is selected, show only
    sessions joined for that subject.
  */

  const filteredSessions = selectedSubjectId
    ? sortedSessions.filter(
        (session) =>
          String(session.subjectId) ===
          String(selectedSubjectId)
      )
    : sortedSessions;

  const selectedSubject =
    registeredSubjects.find(
      (subject) =>
        String(subject._id) ===
        String(selectedSubjectId)
    );

  /*
    Statistics are calculated from all joined
    sessions, not only the filtered sessions.
  */

  const activeSessions = sessions.filter(
    (session) =>
      session.status === "active"
  );

  const endedSessions = sessions.filter(
    (session) =>
      session.status === "ended"
  );

  const availableSummaries = sessions.filter(
    (session) =>
      session.summaryAvailable
  );

  const formatDate = (date) => {
    if (!date) {
      return "Not available";
    }

    return new Date(date).toLocaleString();
  };

  return (
    <section className="my-sessions-page">
      {/* Page heading */}

      <div className="my-sessions-header">
        <div>
          <h1>My Sessions</h1>

          <p>
            Browse your joined sessions by subject,
            review questions and access
            lecturer-approved AI summaries.
          </p>
        </div>

        <button
          type="button"
          className="my-sessions-refresh-button"
          onClick={handleRefresh}
          disabled={
            loading || subjectsLoading
          }
        >
          {loading || subjectsLoading
            ? "Refreshing..."
            : "Refresh Sessions"}
        </button>
      </div>

      {/* Session statistics */}

      <div className="my-sessions-stats">
        <div className="my-session-stat-card">
          <span>Total Joined</span>
          <strong>{sessions.length}</strong>
        </div>

        <div className="my-session-stat-card">
          <span>Active</span>
          <strong>
            {activeSessions.length}
          </strong>
        </div>

        <div className="my-session-stat-card">
          <span>Ended</span>
          <strong>
            {endedSessions.length}
          </strong>
        </div>

        <div className="my-session-stat-card">
          <span>AI Summaries</span>
          <strong>
            {availableSummaries.length}
          </strong>
        </div>
      </div>

      {/* Registered-subject filter */}

      <section className="my-sessions-subject-section">
        <div className="my-sessions-subject-heading">
          <div>
            <h2>My Registered Subjects</h2>

            <p>
              Select a subject to view the sessions
              you joined for that subject.
            </p>
          </div>

          {selectedSubjectId && (
            <button
              type="button"
              className="my-sessions-clear-filter"
              onClick={() =>
                setSelectedSubjectId(null)
              }
            >
              Show All Sessions
            </button>
          )}
        </div>

        {subjectsLoading ? (
          <div className="my-subjects-message">
            Loading registered subjects...
          </div>
        ) : registeredSubjects.length === 0 ? (
          <div className="my-subjects-message">
            No active subjects are registered to
            this student account.
          </div>
        ) : (
          <div className="my-sessions-subject-grid">
            <button
              type="button"
              className={`my-sessions-subject-card ${
                selectedSubjectId === null
                  ? "selected"
                  : ""
              }`}
              onClick={() =>
                setSelectedSubjectId(null)
              }
            >
              <span>All Sessions</span>

              <small>
                {sessions.length}{" "}
                {sessions.length === 1
                  ? "session"
                  : "sessions"}
              </small>
            </button>

            {registeredSubjects.map(
              (subject) => {
                const isSelected =
                  String(selectedSubjectId) ===
                  String(subject._id);

                const sessionCount =
                  sessions.filter(
                    (session) =>
                      String(
                        session.subjectId
                      ) ===
                      String(subject._id)
                  ).length;

                return (
                  <button
                    type="button"
                    key={subject._id}
                    className={`my-sessions-subject-card ${
                      isSelected
                        ? "selected"
                        : ""
                    }`}
                    onClick={() =>
                      setSelectedSubjectId(
                        isSelected
                          ? null
                          : subject._id
                      )
                    }
                  >
                    <span>
                      {subject.subjectName}
                    </span>

                    <small>
                      {subject.subjectCode} ·{" "}
                      {sessionCount}{" "}
                      {sessionCount === 1
                        ? "session"
                        : "sessions"}
                    </small>
                  </button>
                );
              }
            )}
          </div>
        )}
      </section>

      {/* Filtered-session heading */}

      <div className="my-sessions-results-heading">
        <div>
          <h2>
            {selectedSubject
              ? `${selectedSubject.subjectName} Sessions`
              : "All Joined Sessions"}
          </h2>

          <p>
            {selectedSubject
              ? `Showing the sessions you joined for ${selectedSubject.subjectCode}.`
              : "Showing every classroom session you have joined."}
          </p>
        </div>

        <span>
          {filteredSessions.length}{" "}
          {filteredSessions.length === 1
            ? "result"
            : "results"}
        </span>
      </div>

      {/* Loading, empty state or session cards */}

      {loading && sessions.length === 0 ? (
        <div className="my-sessions-loading">
          Loading your classroom sessions...
        </div>
      ) : filteredSessions.length === 0 ? (
        <div className="my-sessions-empty">
          <h2>
            {selectedSubject
              ? "No joined sessions for this subject"
              : "No joined sessions yet"}
          </h2>

          <p>
            {selectedSubject
              ? "You are registered for this subject, but you have not joined one of its sessions yet."
              : "After joining a classroom session, it will appear here permanently for future revision."}
          </p>
        </div>
      ) : (
        <div className="my-sessions-grid">
          {filteredSessions.map(
            (session) => {
              const sessionEnded =
                session.status === "ended";

              const subjectName =
                session.subjectName ||
                session.subject
                  ?.subjectName ||
                "Subject unavailable";

              const moduleCode =
                session.moduleCode ||
                session.subject
                  ?.subjectCode ||
                "Not available";

              return (
                <article
                  className={`my-session-card ${
                    sessionEnded
                      ? "ended"
                      : ""
                  }`}
                  key={session._id}
                >
                  <div className="my-session-card-top">
                    <div>
                      <h2>
                        {session.title}
                      </h2>

                      <p className="my-session-subject">
                        {subjectName}
                      </p>
                    </div>

                    <span
                      className={`my-session-status ${
                        sessionEnded
                          ? "ended"
                          : ""
                      }`}
                    >
                      {session.status}
                    </span>
                  </div>

                  <div className="my-session-information">
                    <div>
                      <span>
                        Subject Code
                      </span>

                      <strong>
                        {moduleCode}
                      </strong>
                    </div>

                    <div>
                      <span>
                        Session Code
                      </span>

                      <strong>
                        {session.sessionCode}
                      </strong>
                    </div>

                    <div>
                      <span>Lecturer</span>

                      <strong>
                        {session.lecturerName ||
                          "Not available"}
                      </strong>
                    </div>

                    <div>
                      <span>Joined</span>

                      <strong>
                        {formatDate(
                          session.joinedAt
                        )}
                      </strong>
                    </div>

                    {sessionEnded && (
                      <div>
                        <span>Ended</span>

                        <strong>
                          {formatDate(
                            session.endedAt
                          )}
                        </strong>
                      </div>
                    )}
                  </div>

                  {session.summaryAvailable ? (
                    <div className="my-session-summary-status available">
                      AI summary available —
                      reviewed and published by
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
                      onClick={() =>
                        onOpenSession(session)
                      }
                    >
                      {sessionEnded
                        ? "Review Questions"
                        : "Open Current Session"}
                    </button>

                    <button
                      type="button"
                      className="my-session-action-button"
                      onClick={() =>
                        onViewSummary(session)
                      }
                      disabled={
                        !session.summaryAvailable
                      }
                    >
                      {session.summaryAvailable
                        ? "View AI Summary"
                        : "Summary Unavailable"}
                    </button>
                  </div>
                </article>
              );
            }
          )}
        </div>
      )}
    </section>
  );
}

export default MySessions;