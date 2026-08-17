import {
  useEffect,
  useState,
} from "react";

import axios from "axios";


import {
  recordEvaluationEvent,
} from "../../services/evaluationLogger";

import {
  API_URL,
} from "../../config/api";

import "./CreateSession.css";

function CreateSession({
  user,
  onSessionCreated,
  onOpenSessions,
}) {
  const [title, setTitle] =
    useState("");

  const [subjectId, setSubjectId] =
    useState("");

  const [
    assignedSubjects,
    setAssignedSubjects,
  ] = useState([]);

  const [
    subjectsLoading,
    setSubjectsLoading,
  ] = useState(true);

  const [
    creatingSession,
    setCreatingSession,
  ] = useState(false);

  const [
    createdSession,
    setCreatedSession,
  ] = useState(null);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  const lecturerId =
    user?.id || user?._id;

  /*
    Load the subjects assigned to the authenticated
    lecturer.

    The backend verifies that the lecturer ID in the
    URL matches the ID contained in the JWT token.
  */

  useEffect(() => {
    if (!lecturerId) {
      setSubjectsLoading(false);

      setErrorMessage(
        "Lecturer account information is unavailable."
      );

      return undefined;
    }

    let requestCancelled = false;

    const loadAssignedSubjects =
      async () => {
        try {
          setSubjectsLoading(true);
          setErrorMessage("");

          const response =
            await axios.get(
              `${API_URL}/lecturer/${lecturerId}/subjects`
            );

          if (!requestCancelled) {
            setAssignedSubjects(
              response.data.subjects ||
                []
            );
          }
        } catch (error) {
          console.log(
            "Load assigned subjects error:",
            error
          );

          if (!requestCancelled) {
            setAssignedSubjects([]);

            setErrorMessage(
              error.response?.data
                ?.message ||
                "Unable to load your assigned subjects."
            );
          }
        } finally {
          if (!requestCancelled) {
            setSubjectsLoading(false);
          }
        }
      };

    loadAssignedSubjects();

    return () => {
      requestCancelled = true;
    };
  }, [lecturerId]);

  /*
    Create a new classroom session.

    lecturerId is deliberately not included in the
    request body. The backend obtains the lecturer's
    identity securely from the verified JWT token.
  */

  const createSession = async (
    event
  ) => {
    event.preventDefault();

    if (!subjectId) {
      setErrorMessage(
        "Please select an assigned subject."
      );

      return;
    }

    if (!title.trim()) {
      setErrorMessage(
        "Please enter the session title."
      );

      return;
    }

    try {
      setCreatingSession(true);
      setErrorMessage("");

      const response =
        await axios.post(
          `${API_URL}/lecturer/sessions`,
          {
            title: title.trim(),
            subjectId,
          }
        );

      const newSession =
        response.data.session;

      recordEvaluationEvent({
        actorId: lecturerId,
        eventType:
          "session_created",
        sessionId:
          newSession._id,
        metrics: {
          success: true,
        },
      });

      setCreatedSession(
        newSession
      );

      setTitle("");
      setSubjectId("");

      if (onSessionCreated) {
        await onSessionCreated(
          newSession
        );
      }
    } catch (error) {
      console.log(
        "Create session error:",
        error
      );

      setErrorMessage(
        error.response?.data
          ?.message ||
          "Unable to create the session."
      );
    } finally {
      setCreatingSession(false);
    }
  };

  const copySessionCode =
    async () => {
      if (
        !createdSession?.sessionCode
      ) {
        return;
      }

      try {
        await navigator.clipboard.writeText(
          createdSession.sessionCode
        );

        alert(
          "Session code copied successfully"
        );
      } catch (error) {
        console.log(
          "Copy session code error:",
          error
        );

        alert(
          `Session code: ${createdSession.sessionCode}`
        );
      }
    };

  if (createdSession) {
    return (
      <section className="create-session-page">
        <div className="created-session-card">
          <span className="created-session-badge">
            Session created successfully
          </span>

          <h2>
            {createdSession.title}
          </h2>

          <p className="created-subject">
            {createdSession.subjectName}{" "}
            ({createdSession.moduleCode})
          </p>

          <p className="code-label">
            Student access code
          </p>

          <strong className="created-session-code">
            {createdSession.sessionCode}
          </strong>

          <p className="access-message">
            Only students registered
            for this subject can use
            this session code.
          </p>

          <div className="created-session-actions">
            <button
              type="button"
              onClick={
                copySessionCode
              }
            >
              Copy Code
            </button>

            <button
              type="button"
              onClick={
                onOpenSessions
              }
            >
              Open Sessions
            </button>

            <button
              type="button"
              className="create-another-button"
              onClick={() =>
                setCreatedSession(
                  null
                )
              }
            >
              Create Another
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="create-session-page">
      <div className="create-session-header">
        <h2>
          Create New Class Session
        </h2>

        <p>
          Select one of your
          assigned subjects and
          enter the topic for this
          classroom session.
        </p>
      </div>

      <form
        className="create-session-form"
        onSubmit={createSession}
      >
        <div className="create-session-field">
          <label htmlFor="session-subject">
            Assigned Subject
          </label>

          <select
            id="session-subject"
            value={subjectId}
            onChange={(event) => {
              setSubjectId(
                event.target.value
              );

              setErrorMessage("");
            }}
            disabled={
              subjectsLoading ||
              assignedSubjects.length ===
                0
            }
          >
            <option value="">
              {subjectsLoading
                ? "Loading assigned subjects..."
                : "Select an assigned subject"}
            </option>

            {assignedSubjects.map(
              (subject) => (
                <option
                  key={subject._id}
                  value={subject._id}
                >
                  {
                    subject.subjectCode
                  }{" "}
                  -{" "}
                  {
                    subject.subjectName
                  }
                </option>
              )
            )}
          </select>
        </div>

        {!subjectsLoading &&
          assignedSubjects.length ===
            0 &&
          !errorMessage && (
            <div className="create-session-warning">
              No active subjects are
              assigned to your
              account. Please contact
              the administrator.
            </div>
          )}

        <div className="create-session-field">
          <label htmlFor="session-title">
            Session Title
          </label>

          <input
            id="session-title"
            type="text"
            placeholder="Enter the session topic or title"
            value={title}
            maxLength={150}
            onChange={(event) => {
              setTitle(
                event.target.value
              );

              setErrorMessage("");
            }}
          />
        </div>

        {errorMessage && (
          <div className="create-session-error">
            {errorMessage}
          </div>
        )}

        <button
          type="submit"
          className="create-session-submit"
          disabled={
            subjectsLoading ||
            assignedSubjects.length ===
              0 ||
            creatingSession
          }
        >
          {creatingSession
            ? "Creating Session..."
            : "Create Session"}
        </button>
      </form>
    </section>
  );
}

export default CreateSession;