import { useCallback, useEffect, useState } from "react";
import axios from "axios";

import Header from "../../components/Header";
import MyQuestions from "./MyQuestions";
import MySessions from "./MySessions";
import StudentSessionSummary from "./StudentSessionSummary";

import "./StudentDashboard.css";

function StudentDashboard({ user, logout }) {
  const [activeTab, setActiveTab] = useState("dashboard");

  const [sessionCode, setSessionCode] = useState("");
  const [joinedSession, setJoinedSession] = useState(null);
  const [joinedSessions, setJoinedSessions] = useState([]);
  const [joinedSessionsLoading, setJoinedSessionsLoading] = useState(false);

  const [selectedSummarySession, setSelectedSummarySession] = useState(null);

  const [questionText, setQuestionText] = useState("");
  const [sessionQuestions, setSessionQuestions] = useState([]);
  const [myQuestions, setMyQuestions] = useState([]);

  const [joiningSession, setJoiningSession] = useState(false);
  const [submittingQuestion, setSubmittingQuestion] = useState(false);

  const studentId = user?.id || user?._id;

  const fetchJoinedSessions = useCallback(async () => {
    if (!studentId) {
      return;
    }

    try {
      setJoinedSessionsLoading(true);

      const response = await axios.get(
        `http://localhost:5000/student/${studentId}/joined-sessions`
      );

      setJoinedSessions(response.data.sessions || []);
    } catch (error) {
      console.log("Load joined sessions error:", error);
    } finally {
      setJoinedSessionsLoading(false);
    }
  }, [studentId]);

  const fetchMyQuestions = useCallback(async () => {
    if (!studentId) {
      return;
    }

    try {
      const response = await axios.get(
        `http://localhost:5000/student/questions/${studentId}`
      );

      setMyQuestions(response.data.questions || []);
    } catch (error) {
      console.log("Load my questions error:", error);
    }
  }, [studentId]);

  const fetchSessionQuestions = useCallback(async () => {
    if (!joinedSession?._id) {
      return;
    }

    try {
      const response = await axios.get(
        `http://localhost:5000/questions/${joinedSession._id}`
      );

      setSessionQuestions(response.data.questions || []);
    } catch (error) {
      console.log("Load session questions error:", error);
    }
  }, [joinedSession?._id]);

  const checkSessionStatus = useCallback(async () => {
    if (!joinedSession?._id) {
      return;
    }

    try {
      const response = await axios.get(
        `http://localhost:5000/student/session/${joinedSession._id}/status`
      );

      const latestSession = response.data.session;

      setJoinedSession((currentSession) => {
        if (!currentSession) {
          return currentSession;
        }

        return {
          ...currentSession,
          ...latestSession,
        };
      });

      if (latestSession?.status === "ended") {
        await fetchJoinedSessions();
      }
    } catch (error) {
      console.log("Check session status error:", error);
    }
  }, [joinedSession?._id, fetchJoinedSessions]);

  const joinSession = async () => {
    if (!sessionCode.trim()) {
      alert("Please enter a session code");
      return;
    }

    if (!studentId) {
      alert("Student information is unavailable. Please log in again.");
      return;
    }

    try {
      setJoiningSession(true);

      const response = await axios.post(
        "http://localhost:5000/student/join-session",
        {
          sessionCode: sessionCode.trim().toUpperCase(),
          studentId,
        }
      );

      const session = response.data.session;

      setJoinedSession(session);
      setSessionQuestions([]);
      setSessionCode("");
      setActiveTab("current");

      await Promise.all([
        fetchJoinedSessions(),
        fetchMyQuestions(),
      ]);

      alert("Session joined successfully");
    } catch (error) {
      console.log("Join session error:", error);

      alert(
        error.response?.data?.message ||
          "Invalid session code or session is inactive"
      );
    } finally {
      setJoiningSession(false);
    }
  };

  const submitQuestion = async () => {
    if (!joinedSession) {
      alert("Please join a session first");
      return;
    }

    if (joinedSession.status !== "active") {
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

      await axios.post("http://localhost:5000/questions", {
        sessionId: joinedSession._id,
        sessionCode: joinedSession.sessionCode,
        studentId,
        question: questionText.trim(),
      });

      setQuestionText("");

      await Promise.all([
        fetchSessionQuestions(),
        fetchMyQuestions(),
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

  const openJoinedSession = async (session) => {
    setJoinedSession(session);
    setSelectedSummarySession(null);
    setSessionQuestions([]);
    setActiveTab("current");
  };

  const openPublishedSummary = (session) => {
    setSelectedSummarySession(session);
    setActiveTab("summary");
  };

  const openMySessions = () => {
    setSelectedSummarySession(null);
    setActiveTab("sessions");
    fetchJoinedSessions();
  };

  useEffect(() => {
    if (studentId) {
      fetchJoinedSessions();
      fetchMyQuestions();
    }
  }, [studentId, fetchJoinedSessions, fetchMyQuestions]);

  useEffect(() => {
    if (joinedSession?._id) {
      fetchSessionQuestions();
    }
  }, [joinedSession?._id, fetchSessionQuestions]);

  useEffect(() => {
    if (
      !joinedSession?._id ||
      joinedSession.status === "ended"
    ) {
      return undefined;
    }

    checkSessionStatus();

    const statusInterval = setInterval(() => {
      checkSessionStatus();
    }, 5000);

    return () => {
      clearInterval(statusInterval);
    };
  }, [
    joinedSession?._id,
    joinedSession?.status,
    checkSessionStatus,
  ]);

  useEffect(() => {
    if (
      !joinedSession?._id ||
      joinedSession.status !== "active"
    ) {
      return undefined;
    }

    const questionsInterval = setInterval(() => {
      fetchSessionQuestions();
    }, 5000);

    return () => {
      clearInterval(questionsInterval);
    };
  }, [
    joinedSession?._id,
    joinedSession?.status,
    fetchSessionQuestions,
  ]);

  const sessionEnded = joinedSession?.status === "ended";

  const activeJoinedSessions = joinedSessions.filter(
    (session) => session.status === "active"
  );

  const publishedSummaryCount = joinedSessions.filter(
    (session) => session.summaryAvailable
  ).length;

  const currentSessionText = joinedSession
    ? sessionEnded
      ? "Ended"
      : "Active"
    : activeJoinedSessions.length > 0
      ? `${activeJoinedSessions.length} Active`
      : "None";

  const isSessionsNavigationActive =
    activeTab === "sessions" || activeTab === "summary";

  return (
    <div className="student-page">
      <Header user={user} logout={logout} />

      <div className="student-shell">
        <aside className="student-sidebar">
          <button
            type="button"
            className={
              activeTab === "dashboard"
                ? "student-nav-active"
                : ""
            }
            onClick={() => setActiveTab("dashboard")}
          >
            Dashboard
          </button>

          <button
            type="button"
            className={
              activeTab === "join"
                ? "student-nav-active"
                : ""
            }
            onClick={() => setActiveTab("join")}
          >
            Join New Session
          </button>

          <button
            type="button"
            className={
              isSessionsNavigationActive
                ? "student-nav-active"
                : ""
            }
            onClick={openMySessions}
          >
            My Sessions
          </button>

          <button
            type="button"
            className={
              activeTab === "current"
                ? "student-nav-active"
                : ""
            }
            onClick={() => {
              setActiveTab("current");

              if (joinedSession?._id) {
                checkSessionStatus();
                fetchSessionQuestions();
              }
            }}
          >
            Current Session
          </button>

          <button
            type="button"
            className={
              activeTab === "questions"
                ? "student-nav-active"
                : ""
            }
            onClick={() => {
              setActiveTab("questions");
              fetchMyQuestions();
            }}
          >
            My Questions
          </button>

          <button
            type="button"
            className={
              activeTab === "settings"
                ? "student-nav-active"
                : ""
            }
            onClick={() => setActiveTab("settings")}
          >
            Settings
          </button>
        </aside>

        <main className="student-content">
          {activeTab === "dashboard" && (
            <>
              <section className="student-welcome-card">
                <h1>Welcome back, {user?.name}</h1>

                <p>
                  Join classroom sessions, ask anonymous questions,
                  review lecturer responses and access approved AI
                  session summaries.
                </p>
              </section>

              <div className="student-stats-grid">
                <div className="student-stat-card">
                  <h3>Joined Sessions</h3>
                  <strong>{joinedSessions.length}</strong>
                </div>

                <div className="student-stat-card">
                  <h3>Current Session</h3>
                  <strong>{currentSessionText}</strong>
                </div>

                <div className="student-stat-card">
                  <h3>Questions Asked</h3>
                  <strong>{myQuestions.length}</strong>
                </div>

                <div className="student-stat-card">
                  <h3>AI Summaries</h3>
                  <strong>{publishedSummaryCount}</strong>
                </div>
              </div>

              <div className="student-quick-actions">
                <button
                  type="button"
                  onClick={() => setActiveTab("join")}
                >
                  Join Session
                </button>

                <button
                  type="button"
                  onClick={openMySessions}
                >
                  My Sessions
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("questions");
                    fetchMyQuestions();
                  }}
                >
                  My Questions
                </button>
              </div>
            </>
          )}

          {activeTab === "join" && (
            <section className="student-card">
              <h2>Join Class Session</h2>

              <p>
                Enter the session code shared by your lecturer. Only
                students registered for the subject can join.
              </p>

              <input
                type="text"
                placeholder="Enter Session Code e.g. UC-MT9AN"
                value={sessionCode}
                onChange={(event) =>
                  setSessionCode(event.target.value)
                }
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    joinSession();
                  }
                }}
              />

              <button
                type="button"
                onClick={joinSession}
                disabled={joiningSession}
              >
                {joiningSession
                  ? "Joining..."
                  : "Join Session"}
              </button>
            </section>
          )}

          {activeTab === "sessions" && (
            <MySessions
              sessions={joinedSessions}
              loading={joinedSessionsLoading}
              onRefresh={fetchJoinedSessions}
              onOpenSession={openJoinedSession}
              onViewSummary={openPublishedSummary}
            />
          )}

          {activeTab === "summary" &&
            selectedSummarySession && (
              <StudentSessionSummary
                session={selectedSummarySession}
                user={user}
                onBack={openMySessions}
              />
            )}

          {activeTab === "current" && (
            <section className="student-card">
              <h2>Current Session</h2>

              {!joinedSession ? (
                <div className="student-no-session">
                  <p>
                    Select a session from My Sessions or join a new
                    classroom session.
                  </p>

                  <div className="student-current-empty-actions">
                    <button
                      type="button"
                      onClick={() => setActiveTab("join")}
                    >
                      Join a Session
                    </button>

                    <button
                      type="button"
                      onClick={openMySessions}
                    >
                      View My Sessions
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="student-session-details">
                    <h3>{joinedSession.title}</h3>

                    {(joinedSession.subjectName ||
                      joinedSession.subject?.subjectName) && (
                      <p>
                        <strong>Subject:</strong>{" "}
                        {joinedSession.subjectName ||
                          joinedSession.subject?.subjectName}
                      </p>
                    )}

                    <p>
                      <strong>Module:</strong>{" "}
                      {joinedSession.moduleCode ||
                        joinedSession.subject?.subjectCode ||
                        "Not available"}
                    </p>

                    <p>
                      <strong>Session Code:</strong>{" "}
                      {joinedSession.sessionCode}
                    </p>

                    <p>
                      <strong>Lecturer:</strong>{" "}
                      {joinedSession.lecturerName ||
                        "Not available"}
                    </p>

                    <span
                      className={
                        sessionEnded
                          ? "student-session-ended-status"
                          : ""
                      }
                    >
                      {joinedSession.status}
                    </span>
                  </div>

                  {sessionEnded ? (
                    <div className="student-ended-session">
                      <h2>Session Ended</h2>

                      <p>
                        This session has ended. You cannot submit new
                        questions, but you can review your questions,
                        lecturer responses and any published AI summary.
                      </p>

                      <div className="student-ended-actions">
                        <button
                          type="button"
                          onClick={() => {
                            setActiveTab("questions");
                            fetchMyQuestions();
                          }}
                        >
                          View My Questions
                        </button>

                        {joinedSession.summaryAvailable && (
                          <button
                            type="button"
                            onClick={() =>
                              openPublishedSummary(joinedSession)
                            }
                          >
                            View AI Summary
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={openMySessions}
                        >
                          Back to My Sessions
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="ask-question-card">
                      <h2>Ask a Question</h2>

                      <p>
                        Your question will be shown anonymously to
                        the lecturer.
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

                    {sessionQuestions.length === 0 ? (
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
          )}

          {activeTab === "questions" && (
            <MyQuestions myQuestions={myQuestions} />
          )}

          {activeTab === "settings" && (
            <section className="student-card">
              <h2>Settings</h2>

              <p>
                Student profile and preferences will be added here.
              </p>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}

export default StudentDashboard;