import { useMemo, useState } from "react";
import QRCode from "react-qr-code";

import "./SessionList.css";

function SessionList({
  sessions,
  onSelectSession,
  onCreateSession,
}) {
  const [searchInput, setSearchInput] =
    useState("");

  const [appliedSearch, setAppliedSearch] =
    useState("");

  const handleSearch = (event) => {
    event.preventDefault();

    setAppliedSearch(
      searchInput.trim().toLowerCase()
    );
  };


  const clearSearch = () => {
    setSearchInput("");
    setAppliedSearch("");
  };


  const filteredSessions = useMemo(() => {
    if (!appliedSearch) {
      return sessions;
    }

    return sessions.filter((session) => {
      const sessionCourses =
        session.subjectId?.courses || [];

      const courseSearchText = sessionCourses
        .map(
          (course) =>
            `${course?.courseName || ""} ${
              course?.courseCode || ""
            }`
        )
        .join(" ");

      const searchableText = [
        session.title,
        session.subjectName,
        session.moduleCode,
        session.sessionCode,
        session.lecturerName,
        session.status,
        session.subjectId?.subjectName,
        session.subjectId?.subjectCode,
        courseSearchText,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchableText.includes(
        appliedSearch
      );
    });
  }, [sessions, appliedSearch]);

  return (
    <section className="session-list-page">
      <div className="session-list-header">
        <div>
          <h2>My Sessions</h2>

          <p>
            Search your classroom sessions using the
            title, subject or session code.
          </p>
        </div>

        <button
          type="button"
          className="new-session-button"
          onClick={onCreateSession}
        >
          + New Session
        </button>
      </div>

      <div className="session-filter-bar session-search-only">
        <form
          className="session-search-form"
          onSubmit={handleSearch}
        >
          <label htmlFor="session-search">
            Search Sessions
          </label>

          <div className="session-search-controls">
            <input
              id="session-search"
              type="text"
              placeholder="Search title, subject or session code"
              value={searchInput}
              onChange={(event) =>
                setSearchInput(
                  event.target.value
                )
              }
            />

            <button
              type="submit"
              className="session-search-button"
            >
              Search
            </button>

            <button
              type="button"
              className="clear-session-filters"
              onClick={clearSearch}
              disabled={
                !searchInput && !appliedSearch
              }
            >
              Clear
            </button>
          </div>
        </form>
      </div>

      <div className="session-filter-summary">
        <span>
          Showing{" "}
          <strong>
            {filteredSessions.length}
          </strong>{" "}
          of <strong>{sessions.length}</strong>{" "}
          sessions
        </span>

        {appliedSearch && (
          <span>
            Search:{" "}
            <strong>{appliedSearch}</strong>
          </span>
        )}
      </div>

      {sessions.length === 0 ? (
        <div className="session-list-empty">
          <h3>No Sessions Created</h3>

          <p>
            Create your first classroom session to
            begin.
          </p>

          <button
            type="button"
            onClick={onCreateSession}
          >
            Create Session
          </button>
        </div>
      ) : filteredSessions.length === 0 ? (
        <div className="session-list-empty">
          <h3>No Matching Sessions</h3>

          <p>
            No session matches your search.
          </p>

          <button
            type="button"
            onClick={clearSearch}
          >
            Clear Search
          </button>
        </div>
      ) : (
        <div className="session-list-grid">
          {filteredSessions.map((session) => {
            const sessionCourses =
              session.subjectId?.courses || [];

            const courseNames = sessionCourses
              .map((course) => {
                if (course.courseCode) {
                  return `${course.courseCode} - ${course.courseName}`;
                }

                return course.courseName;
              })
              .filter(Boolean)
              .join(", ");

            return (
              <article
                className="filtered-session-card"
                key={session._id}
                onClick={() =>
                  onSelectSession(session)
                }
              >
                <div className="session-card-heading">
                  <div>
                    <h3>{session.title}</h3>

                    <p className="session-card-subject">
                      {session.subjectName ||
                        session.subjectId
                          ?.subjectName ||
                        "Subject unavailable"}
                    </p>
                  </div>

                  <span
                    className={`session-card-status ${
                      session.status === "active"
                        ? "session-status-active"
                        : "session-status-ended"
                    }`}
                  >
                    {session.status}
                  </span>
                </div>

                <div className="session-card-course">
                  <span>Course</span>

                  <strong>
                    {courseNames ||
                      "Course unavailable"}
                  </strong>
                </div>

                <div className="session-card-information">
                  <div>
                    <span>Subject Code</span>

                    <strong>
                      {session.moduleCode}
                    </strong>
                  </div>

                  <div>
                    <span>Session Code</span>

                    <strong className="session-code-value">
                      {session.sessionCode}
                    </strong>
                  </div>
                </div>

                <div className="session-card-bottom">
                  <div className="session-list-qr">
                    <QRCode
                      value={`http://localhost:5173/join/${session.sessionCode}`}
                      size={82}
                    />
                  </div>

                  <div className="session-card-open">
                    View Session →
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

export default SessionList;