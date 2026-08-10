import { useCallback, useEffect, useState } from "react";
import axios from "axios";

import StudentMCQ from "./StudentMCQ";

import "./CurrentSession.css";

const API_URL = "http://localhost:5000";

function CurrentSession({
  session,
  user,
  onSessionUpdate,
  onRefreshSessions,
  onRefreshMyQuestions,
  onJoinSession,
  onViewSessions,
  onViewQuestions,
  onViewSummary,
}) {
  const [questionText, setQuestionText] = useState("");
  const [sessionQuestions, setSessionQuestions] = useState([]);
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [submittingQuestion, setSubmittingQuestion] = useState(false);

  const studentId = user?.id || user?._id;
  const sessionEnded = session?.status === "ended";

  /*
    Load the anonymous questions belonging to this session.
  */

  const fetchSessionQuestions = useCallback(async () => {
    if (!session?._id) {
      setSessionQuestions([]);
      return;
    }

    try {
      setQuestionsLoading(true);

      const response = await axios.get(
        `${API_URL}/questions/${session._id}`
      );

      setSessionQuestions(response.data.questions || []);
    } catch (error) {
      console.log("Load session questions error:", error);
    } finally {
      setQuestionsLoading(false);
    }
  }, [session?._id]);

  /*
    Check whether the lecturer ended the classroom session.
  */

  const checkSessionStatus = useCallback(async () => {
    if (!session?._id) {
      return;
    }

    try {
      const response = await axios.get(
        `${API_URL}/student/session/${session._id}/status`
      );

      const latestSession = response.data.session;

      if (latestSession) {
        onSessionUpdate?.(latestSession);
      }

      if (latestSession?.status === "ended") {
        await onRefreshSessions?.();
      }
    } catch (error) {
      console.log("Check session status error:", error);
    }
  }, [session?._id, onSessionUpdate, onRefreshSessions]);

  /*
    Submit an anonymous classroom question.
  */

  const submitQuestion = async () => {
    if (!session) {
      alert("Please join a session first");
      return;
    }

    if (session.status !== "active") {
      alert(
        "This session has ended. You cannot submit a new question."
      );
      return;
    }

    if (!questionText.trim()) {
      alert("Please type your question");
      return;
    }

    try {
      setSubmittingQuestion(true);

      await axios.post(`${API_URL}/questions`, {
        sessionId: session._id,
        sessionCode: session.sessionCode,
        studentId,
        question: questionText.trim(),
      });

      setQuestionText("");

      await Promise.all([
        fetchSessionQuestions(),
        onRefreshMyQuestions?.(),
      ]);

      alert("Question submitted anonymously");
    } catch (error) {
      console.log("Submit question error:", error);

      if (error.response?.status === 403) {
        await checkSessionStatus();
      }

      alert(
        error.response?.data?.message ||
          "Error submitting question"
      );
    } finally {
      setSubmittingQuestion(false);
    }
  };

  /*
    Reset and load questions when the selected session changes.
  */

  useEffect(() => {
    setQuestionText("");
    setSessionQuestions([]);

    if (session?._id) {
      fetchSessionQuestions();
    }
  }, [session?._id, fetchSessionQuestions]);

  /*
    Check session status every five seconds.
  */

  useEffect(() => {
    if (!session?._id || session.status === "ended") {
      return undefined;
    }

    checkSessionStatus();

    const statusInterval = setInterval(() => {
      checkSessionStatus();
    }, 5000);

    return () => {
      clearInterval(statusInterval);
    };
  }, [session?._id, session?.status, checkSessionStatus]);

  /*
    Refresh classroom questions every five seconds.
  */

  useEffect(() => {
    if (!session?._id || session.status !== "active") {
      return undefined;
    }

    const questionsInterval = setInterval(() => {
      fetchSessionQuestions();
    }, 5000);

    return () => {
      clearInterval(questionsInterval);
    };
  }, [
    session?._id,
    session?.status,
    fetchSessionQuestions,
  ]);

  return (
    <section className="student-card current-session-page">
      <h2>Current Session</h2>

      {!session ? (
        <div className="student-no-session">
          <p>
            Select a session from My Sessions or join a new classroom
            session.
          </p>

          <div className="student-current-empty-actions">
            <button type="button" onClick={onJoinSession}>
              Join a Session
            </button>

            <button type="button" onClick={onViewSessions}>
              View My Sessions
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="student-session-details">
            <h3>{session.title}</h3>

            {(session.subjectName ||
              session.subject?.subjectName) && (
              <p>
                <strong>Subject:</strong>{" "}
                {session.subjectName ||
                  session.subject?.subjectName}
              </p>
            )}

            <p>
              <strong>Module:</strong>{" "}
              {session.moduleCode ||
                session.subject?.subjectCode ||
                "Not available"}
            </p>

            <p>
              <strong>Session Code:</strong>{" "}
              {session.sessionCode}
            </p>

            <p>
              <strong>Lecturer:</strong>{" "}
              {session.lecturerName || "Not available"}
            </p>

            <span
              className={
                sessionEnded
                  ? "student-session-ended-status"
                  : ""
              }
            >
              {session.status}
            </span>
          </div>

          {/*
            MCQ polling is independent of the classroom status.

            Therefore this component remains visible even when
            the lecturer ends the classroom session.
          */}

          <StudentMCQ session={session} user={user} />

          {sessionEnded ? (
            <div className="student-ended-session">
              <h2>Session Ended</h2>

              <p>
                This session has ended. You cannot submit new
                questions, but you can review your questions,
                lecturer responses, MCQ results and any published
                AI summary.
              </p>

              <div className="student-ended-actions">
                <button
                  type="button"
                  onClick={onViewQuestions}
                >
                  View My Questions
                </button>

                {session.summaryAvailable && (
                  <button
                    type="button"
                    onClick={() =>
                      onViewSummary?.(session)
                    }
                  >
                    View AI Summary
                  </button>
                )}

                <button
                  type="button"
                  onClick={onViewSessions}
                >
                  Back to My Sessions
                </button>
              </div>
            </div>
          ) : (
            <div className="ask-question-card">
              <h2>Ask a Question</h2>

              <p>
                Your question will be shown anonymously to the
                lecturer.
              </p>

              <textarea
                placeholder="Type your question here..."
                value={questionText}
                onChange={(event) =>
                  setQuestionText(event.target.value)
                }
                disabled={submittingQuestion}
              />

              <button
                type="button"
                onClick={submitQuestion}
                disabled={submittingQuestion}
              >
                {submittingQuestion
                  ? "Submitting..."
                  : "Submit Question"}
              </button>
            </div>
          )}

          <div className="student-questions-card">
            <h2>Session Questions & Answers</h2>

            {questionsLoading &&
            sessionQuestions.length === 0 ? (
              <p>Loading session questions...</p>
            ) : sessionQuestions.length === 0 ? (
              <p>No questions submitted yet.</p>
            ) : (
              sessionQuestions.map((item) => (
                <div
                  className="student-question-item"
                  key={item._id}
                >
                  <h3>{item.question}</h3>

                  <span>{item.status}</span>

                  {item.answer ? (
                    <div className="student-answer-box">
                      <strong>Lecturer Answer:</strong>

                      <p>{item.answer}</p>
                    </div>
                  ) : (
                    <p className="no-answer-text">
                      Waiting for lecturer answer...
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        </>
      )}
    </section>
  );
}

export default CurrentSession;