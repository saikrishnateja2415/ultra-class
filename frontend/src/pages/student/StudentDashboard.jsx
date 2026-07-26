import { useEffect, useState } from "react";
import axios from "axios";

import Header from "../../components/Header";
import MyQuestions from "./MyQuestions";

import "./StudentDashboard.css";

function StudentDashboard({ user, logout }) {
  const [activeTab, setActiveTab] =
    useState("dashboard");

  const [sessionCode, setSessionCode] =
    useState("");

  const [joinedSession, setJoinedSession] =
    useState(null);

  const [questionText, setQuestionText] =
    useState("");

  const [
    sessionQuestions,
    setSessionQuestions,
  ] = useState([]);

  const [myQuestions, setMyQuestions] =
    useState([]);

  const [joiningSession, setJoiningSession] =
    useState(false);

  const [
    submittingQuestion,
    setSubmittingQuestion,
  ] = useState(false);

  const joinSession = async () => {
    if (!sessionCode.trim()) {
      alert("Please enter a session code");
      return;
    }

    try {
      setJoiningSession(true);

      const response = await axios.post(
        "http://localhost:5000/student/join-session",
        {
          sessionCode: sessionCode
            .trim()
            .toUpperCase(),

          studentId: user?.id || user?._id,
        }
      );

      setJoinedSession(response.data.session);
      setSessionCode("");
      setActiveTab("current");

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

  const checkSessionStatus = async () => {
    if (!joinedSession?._id) {
      return;
    }

    try {
      const response = await axios.get(
        `http://localhost:5000/student/session/${joinedSession._id}/status`
      );

      const latestSession =
        response.data.session;

      setJoinedSession((currentSession) => {
        if (!currentSession) {
          return currentSession;
        }

        return {
          ...currentSession,
          ...latestSession,
        };
      });
    } catch (error) {
      console.log(
        "Check session status error:",
        error
      );
    }
  };

  const fetchSessionQuestions = async () => {
    if (!joinedSession?._id) {
      return;
    }

    try {
      const response = await axios.get(
        `http://localhost:5000/questions/${joinedSession._id}`
      );

      setSessionQuestions(
        response.data.questions || []
      );
    } catch (error) {
      console.log(
        "Load session questions error:",
        error
      );
    }
  };

  const fetchMyQuestions = async () => {
    try {
      const studentId =
        user?.id || user?._id;

      if (!studentId) {
        return;
      }

      const response = await axios.get(
        `http://localhost:5000/student/questions/${studentId}`
      );

      setMyQuestions(
        response.data.questions || []
      );
    } catch (error) {
      console.log(
        "Load my questions error:",
        error
      );

      alert("Error loading my questions");
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

      await axios.post(
        "http://localhost:5000/questions",
        {
          sessionId: joinedSession._id,

          sessionCode:
            joinedSession.sessionCode,

          studentId:
            user?.id || user?._id,

          question: questionText.trim(),
        }
      );

      setQuestionText("");

      await Promise.all([
        fetchSessionQuestions(),
        fetchMyQuestions(),
      ]);

      alert(
        "Question submitted anonymously"
      );
    } catch (error) {
      console.log(
        "Submit question error:",
        error
      );

      /*
        If the lecturer ended the session just before
        submission, update the session status.
      */

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

  useEffect(() => {
    if (!joinedSession?._id) {
      return;
    }

    fetchSessionQuestions();
  }, [joinedSession?._id]);

  useEffect(() => {
    if (user?.id || user?._id) {
      fetchMyQuestions();
    }
  }, [user?.id, user?._id]);

  useEffect(() => {
    if (
      !joinedSession?._id ||
      joinedSession.status === "ended"
    ) {
      return;
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
  ]);

  useEffect(() => {
    if (
      !joinedSession?._id ||
      joinedSession.status !== "active"
    ) {
      return;
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
  ]);

  const sessionEnded =
    joinedSession?.status === "ended";

  return (
    <div className="student-page">
      <Header user={user} logout={logout} />

      <div className="student-shell">
        <aside className="student-sidebar">
          <button
            className={
              activeTab === "dashboard"
                ? "student-nav-active"
                : ""
            }
            onClick={() =>
              setActiveTab("dashboard")
            }
          >
            Dashboard
          </button>

          <button
            className={
              activeTab === "join"
                ? "student-nav-active"
                : ""
            }
            onClick={() =>
              setActiveTab("join")
            }
          >
            Join New Session
          </button>

          <button
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
            className={
              activeTab === "settings"
                ? "student-nav-active"
                : ""
            }
            onClick={() =>
              setActiveTab("settings")
            }
          >
            Settings
          </button>
        </aside>

        <main className="student-content">
          {/* DASHBOARD */}

          {activeTab === "dashboard" && (
            <>
              <section className="student-welcome-card">
                <h1>
                  Welcome back, {user?.name}
                </h1>

                <p>
                  Join classroom sessions, ask
                  anonymous questions and follow live
                  learning activities.
                </p>
              </section>

              <div className="student-stats-grid">
                <div className="student-stat-card">
                  <h3>Joined Sessions</h3>

                  <strong>
                    {joinedSession ? 1 : 0}
                  </strong>
                </div>

                <div className="student-stat-card">
                  <h3>Current Session</h3>

                  <strong>
                    {!joinedSession
                      ? "None"
                      : sessionEnded
                        ? "Ended"
                        : "Active"}
                  </strong>
                </div>

                <div className="student-stat-card">
                  <h3>Questions Asked</h3>

                  <strong>
                    {myQuestions.length}
                  </strong>
                </div>
              </div>

              <div className="student-quick-actions">
                <button
                  onClick={() =>
                    setActiveTab("join")
                  }
                >
                  Join Session
                </button>

                <button
                  onClick={() =>
                    setActiveTab("current")
                  }
                >
                  Current Session
                </button>

                <button
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

          {/* JOIN SESSION */}

          {activeTab === "join" && (
            <section className="student-card">
              <h2>Join Class Session</h2>

              <p>
                Enter the session code shared by your
                lecturer.
              </p>

              <input
                type="text"
                placeholder="Enter Session Code e.g. UC-MT9AN"
                value={sessionCode}
                onChange={(event) =>
                  setSessionCode(
                    event.target.value
                  )
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

          {/* CURRENT SESSION */}

          {activeTab === "current" && (
            <section className="student-card">
              <h2>Current Session</h2>

              {!joinedSession ? (
                <div className="student-no-session">
                  <p>
                    You have not joined a session yet.
                  </p>

                  <button
                    type="button"
                    onClick={() =>
                      setActiveTab("join")
                    }
                  >
                    Join a Session
                  </button>
                </div>
              ) : (
                <>
                  <div className="student-session-details">
                    <h3>
                      {joinedSession.title}
                    </h3>

                    {joinedSession.subjectName && (
                      <p>
                        <strong>Subject:</strong>{" "}
                        {
                          joinedSession.subjectName
                        }
                      </p>
                    )}

                    <p>
                      <strong>Module:</strong>{" "}
                      {joinedSession.moduleCode}
                    </p>

                    <p>
                      <strong>
                        Session Code:
                      </strong>{" "}
                      {joinedSession.sessionCode}
                    </p>

                    <p>
                      <strong>Lecturer:</strong>{" "}
                      {joinedSession.lecturerName}
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
                        This session has ended. You
                        cannot submit new questions,
                        but you can still review your
                        questions and lecturer
                        responses.
                      </p>

                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab(
                            "questions"
                          );

                          fetchMyQuestions();
                        }}
                      >
                        View My Questions
                      </button>
                    </div>
                  ) : (
                    <div className="ask-question-card">
                      <h2>Ask a Question</h2>

                      <p>
                        Your question will be shown
                        anonymously to the lecturer.
                      </p>

                      <textarea
                        placeholder="Type your question here..."
                        value={questionText}
                        onChange={(event) =>
                          setQuestionText(
                            event.target.value
                          )
                        }
                        disabled={
                          submittingQuestion
                        }
                      />

                      <button
                        type="button"
                        onClick={submitQuestion}
                        disabled={
                          submittingQuestion
                        }
                      >
                        {submittingQuestion
                          ? "Submitting..."
                          : "Submit Question"}
                      </button>
                    </div>
                  )}

                  <div className="student-questions-card">
                    <h2>
                      Session Questions & Answers
                    </h2>

                    {sessionQuestions.length ===
                    0 ? (
                      <p>
                        No questions submitted yet.
                      </p>
                    ) : (
                      sessionQuestions.map(
                        (item) => (
                          <div
                            className="student-question-item"
                            key={item._id}
                          >
                            <h3>
                              {item.question}
                            </h3>

                            <span>
                              {item.status}
                            </span>

                            {item.answer ? (
                              <div className="student-answer-box">
                                <strong>
                                  Lecturer Answer:
                                </strong>

                                <p>
                                  {item.answer}
                                </p>
                              </div>
                            ) : (
                              <p className="no-answer-text">
                                Waiting for lecturer
                                answer...
                              </p>
                            )}
                          </div>
                        )
                      )
                    )}
                  </div>
                </>
              )}
            </section>
          )}

          {/* MY QUESTIONS */}

          {activeTab === "questions" && (
            <MyQuestions
              myQuestions={myQuestions}
            />
          )}

          {/* SETTINGS */}

          {activeTab === "settings" && (
            <section className="student-card">
              <h2>Settings</h2>

              <p>
                Student profile and preferences will
                be added here.
              </p>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}

export default StudentDashboard;