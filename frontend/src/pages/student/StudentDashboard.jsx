import {
  useCallback,
  useEffect,
  useState,
} from "react";

import axios from "axios";

import Header from "../../components/Header";
import CurrentSession from "./CurrentSession";
import MyQuestions from "./MyQuestions";
import MyQuizzes from "./MyQuizzes";
import MySessions from "./MySessions";
import StudentSettings from "./StudentSettings";
import StudentSessionSummary from "./StudentSessionSummary";

import {
  recordEvaluationEvent,
} from "../../services/evaluationLogger";

import {
  API_URL,
} from "../../config/api";

import "./StudentDashboard.css";

function getStoredSession(storageKey) {
  if (!storageKey) {
    return null;
  }

  try {
    const savedSession =
      localStorage.getItem(storageKey);

    return savedSession
      ? JSON.parse(savedSession)
      : null;
  } catch (error) {
    console.warn(
      "Unable to restore current session:",
      error
    );

    localStorage.removeItem(storageKey);
    return null;
  }
}

function StudentDashboard({
  user,
  logout,
}) {
  const studentId =
    user?.id || user?._id;

  /*
    Different storage keys are used for each student.
    This prevents one student's saved session from
    appearing for another student.
  */

  const sessionStorageKey = studentId
    ? `ultraClassCurrentSession:${studentId}`
    : "";

  const tabStorageKey = studentId
    ? `ultraClassStudentTab:${studentId}`
    : "";

  const [activeTab, setActiveTab] =
    useState(() => {
      if (!tabStorageKey) {
        return "dashboard";
      }

      return (
        localStorage.getItem(
          tabStorageKey
        ) || "dashboard"
      );
    });

  const [sessionCode, setSessionCode] =
    useState("");

  const [
    joinedSession,
    setJoinedSession,
  ] = useState(() =>
    getStoredSession(
      sessionStorageKey
    )
  );

  const [
    joinedSessions,
    setJoinedSessions,
  ] = useState([]);

  const [
    joinedSessionsLoading,
    setJoinedSessionsLoading,
  ] = useState(false);

  const [
    selectedSummarySession,
    setSelectedSummarySession,
  ] = useState(null);

  const [
    myQuestions,
    setMyQuestions,
  ] = useState([]);

  const [
    joiningSession,
    setJoiningSession,
  ] = useState(false);

  const [
    restoringSession,
    setRestoringSession,
  ] = useState(false);


  useEffect(() => {
    const searchParameters =
      new URLSearchParams(
        window.location.search
      );

    const qrSessionCode =
      searchParameters.get(
        "sessionCode"
      );

    if (!qrSessionCode) {
      return;
    }

    setSessionCode(
      qrSessionCode
        .trim()
        .toUpperCase()
    );

    setActiveTab("join");

    /*
      Remove the session code from the address bar
      after it has been read.

      This prevents the QR code from being processed
      repeatedly when the page refreshes.
    */

    searchParameters.delete(
      "sessionCode"
    );

    const remainingQuery =
      searchParameters.toString();

    const cleanUrl =
      remainingQuery
        ? `${window.location.pathname}?${remainingQuery}`
        : window.location.pathname;

    window.history.replaceState(
      {},
      "",
      cleanUrl
    );
  }, []);

  /*
    Save the selected student navigation tab.
  */

  useEffect(() => {
    if (!tabStorageKey) {
      return;
    }

    localStorage.setItem(
      tabStorageKey,
      activeTab
    );
  }, [
    activeTab,
    tabStorageKey,
  ]);

  /*
    Save the selected session.

    This allows Current Session to survive a browser
    refresh.
  */

  useEffect(() => {
    if (!sessionStorageKey) {
      return;
    }

    if (joinedSession?._id) {
      localStorage.setItem(
        sessionStorageKey,
        JSON.stringify(
          joinedSession
        )
      );
    } else {
      localStorage.removeItem(
        sessionStorageKey
      );
    }
  }, [
    joinedSession,
    sessionStorageKey,
  ]);

  /*
    Restore the saved session when the logged-in
    student changes.
  */

  useEffect(() => {
    if (
      !studentId ||
      !sessionStorageKey
    ) {
      setJoinedSession(null);
      return;
    }

    const storedSession =
      getStoredSession(
        sessionStorageKey
      );

    setJoinedSession(
      storedSession
    );
  }, [
    studentId,
    sessionStorageKey,
  ]);

  /*
    Validate the restored session against the backend.

    The backend checks that:
    1. The token belongs to a student.
    2. The student previously joined the session.
    3. The session still exists.
  */

  useEffect(() => {
    let requestCancelled = false;

    const restoreCurrentSession =
      async () => {
        if (
          !joinedSession?._id ||
          !studentId
        ) {
          return;
        }

        try {
          setRestoringSession(true);

          const response =
            await axios.get(
              `${API_URL}/student/session/${joinedSession._id}/status`
            );

          if (requestCancelled) {
            return;
          }

          const latestSession =
            response.data.session;

          setJoinedSession(
            (currentSession) => ({
              ...currentSession,
              ...latestSession,
            })
          );
        } catch (error) {
          if (requestCancelled) {
            return;
          }

          console.log(
            "Restore current session error:",
            error
          );

          if (
            error.response?.status ===
              403 ||
            error.response?.status ===
              404
          ) {
            localStorage.removeItem(
              sessionStorageKey
            );

            setJoinedSession(null);

            setActiveTab(
              (currentTab) =>
                currentTab ===
                "current"
                  ? "join"
                  : currentTab
            );
          }
        } finally {
          if (!requestCancelled) {
            setRestoringSession(
              false
            );
          }
        }
      };

    restoreCurrentSession();

    return () => {
      requestCancelled = true;
    };
  }, [
    joinedSession?._id,
    studentId,
    sessionStorageKey,
  ]);

  /*
    Load all sessions joined by the logged-in student.
  */

  const fetchJoinedSessions =
    useCallback(async () => {
      if (!studentId) {
        return;
      }

      try {
        setJoinedSessionsLoading(
          true
        );

        const response =
          await axios.get(
            `${API_URL}/student/${studentId}/joined-sessions`
          );

        setJoinedSessions(
          response.data.sessions ||
            []
        );
      } catch (error) {
        console.log(
          "Load joined sessions error:",
          error
        );
      } finally {
        setJoinedSessionsLoading(
          false
        );
      }
    }, [studentId]);

  /*
    Load the questions asked by this student.
  */

  const fetchMyQuestions =
    useCallback(async () => {
      if (!studentId) {
        return;
      }

      try {
        const response =
          await axios.get(
            `${API_URL}/student/questions/${studentId}`
          );

        setMyQuestions(
          response.data.questions ||
            []
        );
      } catch (error) {
        console.log(
          "Load my questions error:",
          error
        );
      }
    }, [studentId]);

  /*
    Join a classroom session.
  */

  const joinSession = async () => {
    if (!sessionCode.trim()) {
      alert(
        "Please enter a session code"
      );

      return;
    }

    if (!studentId) {
      alert(
        "Student information is unavailable. Please log in again."
      );

      return;
    }

    try {
      setJoiningSession(true);

      /*
        The frontend sends only the session code.

        Student identity is obtained securely from
        the verified JWT token by the backend.
      */

      const response =
        await axios.post(
          `${API_URL}/student/join-session`,
          {
            sessionCode:
              sessionCode
                .trim()
                .toUpperCase(),
          }
        );

      const joinedSessionData =
        response.data.session;

      /*
        Use the backend result to prevent duplicate
        session_joined evaluation events.
      */

      const previouslyJoined =
        Boolean(
          response.data
            .alreadyJoined
        );

      setJoinedSession(
        joinedSessionData
      );

      setSessionCode("");
      setActiveTab("current");

      localStorage.setItem(
        sessionStorageKey,
        JSON.stringify(
          joinedSessionData
        )
      );

      localStorage.setItem(
        tabStorageKey,
        "current"
      );

      if (!previouslyJoined) {
        recordEvaluationEvent({
          actorId: studentId,
          eventType:
            "session_joined",
          sessionId:
            joinedSessionData._id,
          metrics: {
            success: true,
          },
        });
      }

      await Promise.all([
        fetchJoinedSessions(),
        fetchMyQuestions(),
      ]);

      alert(
        response.data.message ||
          "Session joined successfully"
      );
    } catch (error) {
      console.log(
        "Join session error:",
        error
      );

      alert(
        error.response?.data
          ?.message ||
          "Invalid session code or session is inactive"
      );
    } finally {
      setJoiningSession(false);
    }
  };

  /*
    Open a session from My Sessions.
  */

  const openJoinedSession = (
    session
  ) => {
    setJoinedSession(session);

    setSelectedSummarySession(
      null
    );

    setActiveTab("current");

    if (session?._id) {
      localStorage.setItem(
        sessionStorageKey,
        JSON.stringify(session)
      );

      localStorage.setItem(
        tabStorageKey,
        "current"
      );
    }
  };

  const openPublishedSummary = (
    session
  ) => {
    setSelectedSummarySession(
      session
    );

    setActiveTab("summary");
  };

  const openMySessions = () => {
    setSelectedSummarySession(
      null
    );

    setActiveTab("sessions");

    fetchJoinedSessions();
  };

  const openMyQuestions = () => {
    setActiveTab("questions");

    fetchMyQuestions();
  };

  /*
    Open a quiz from quiz history.
  */

  const openQuizFromHistory = (
    quiz
  ) => {
    const sessionFromQuiz = {
      _id: quiz.sessionId,
      title: quiz.title,
      moduleCode:
        quiz.moduleCode,
      subjectName:
        quiz.subjectName,
      sessionCode:
        quiz.sessionCode,
      lecturerName:
        quiz.lecturerName,
      status:
        quiz.sessionStatus,
    };

    setJoinedSession(
      sessionFromQuiz
    );

    setSelectedSummarySession(
      null
    );

    setActiveTab("current");

    localStorage.setItem(
      sessionStorageKey,
      JSON.stringify(
        sessionFromQuiz
      )
    );

    localStorage.setItem(
      tabStorageKey,
      "current"
    );
  };

  /*
    Receive status changes from CurrentSession.

    Merging preserves fields such as joinedAt and
    summaryAvailable.
  */

  const updateJoinedSession =
    useCallback(
      (latestSession) => {
        setJoinedSession(
          (currentSession) => {
            if (
              !currentSession
            ) {
              return latestSession;
            }

            return {
              ...currentSession,
              ...latestSession,
            };
          }
        );
      },
      []
    );

  /*
    Initial dashboard data loading.
  */

  useEffect(() => {
    if (studentId) {
      fetchJoinedSessions();
      fetchMyQuestions();
    }
  }, [
    studentId,
    fetchJoinedSessions,
    fetchMyQuestions,
  ]);

  const sessionEnded =
    joinedSession?.status ===
    "ended";

  const activeJoinedSessions =
    joinedSessions.filter(
      (session) =>
        session.status ===
        "active"
    );

  const publishedSummaryCount =
    joinedSessions.filter(
      (session) =>
        session.summaryAvailable
    ).length;

  const currentSessionText =
    joinedSession
      ? sessionEnded
        ? "Ended"
        : "Active"
      : activeJoinedSessions.length >
          0
        ? `${activeJoinedSessions.length} Active`
        : "None";

  const isSessionsNavigationActive =
    activeTab === "sessions" ||
    activeTab === "summary";

  return (
    <div className="student-page">
      <Header
        user={user}
        logout={logout}
      />

      <div className="student-shell">
        <aside className="student-sidebar">
          <button
            type="button"
            className={
              activeTab ===
              "dashboard"
                ? "student-nav-active"
                : ""
            }
            onClick={() =>
              setActiveTab(
                "dashboard"
              )
            }
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
            onClick={() =>
              setActiveTab("join")
            }
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
            onClick={
              openMySessions
            }
          >
            My Sessions
          </button>

          <button
            type="button"
            className={
              activeTab ===
              "quizzes"
                ? "student-nav-active"
                : ""
            }
            onClick={() =>
              setActiveTab(
                "quizzes"
              )
            }
          >
            My Quizzes
          </button>

          <button
            type="button"
            className={
              activeTab ===
              "current"
                ? "student-nav-active"
                : ""
            }
            onClick={() => {
              if (joinedSession) {
                setActiveTab(
                  "current"
                );
              } else {
                setActiveTab(
                  "join"
                );
              }
            }}
          >
            Current Session
          </button>

          <button
            type="button"
            className={
              activeTab ===
              "questions"
                ? "student-nav-active"
                : ""
            }
            onClick={
              openMyQuestions
            }
          >
            My Questions
          </button>

          <button
            type="button"
            className={
              activeTab ===
              "settings"
                ? "student-nav-active"
                : ""
            }
            onClick={() =>
              setActiveTab(
                "settings"
              )
            }
          >
            Settings
          </button>
        </aside>

        <main className="student-content">
          {activeTab ===
            "dashboard" && (
            <>
              <section className="student-welcome-card">
                <h1>
                  Welcome back,{" "}
                  {user?.name}
                </h1>

                <p>
                  Join classroom
                  sessions, ask
                  anonymous questions,
                  review lecturer
                  responses and access
                  approved AI session
                  summaries.
                </p>
              </section>

              <div className="student-stats-grid">
                <div className="student-stat-card">
                  <h3>
                    Joined Sessions
                  </h3>

                  <strong>
                    {
                      joinedSessions.length
                    }
                  </strong>
                </div>

                <div className="student-stat-card">
                  <h3>
                    Current Session
                  </h3>

                  <strong>
                    {
                      currentSessionText
                    }
                  </strong>
                </div>

                <div className="student-stat-card">
                  <h3>
                    Questions Asked
                  </h3>

                  <strong>
                    {
                      myQuestions.length
                    }
                  </strong>
                </div>

                <div className="student-stat-card">
                  <h3>
                    AI Summaries
                  </h3>

                  <strong>
                    {
                      publishedSummaryCount
                    }
                  </strong>
                </div>
              </div>

              <div className="student-quick-actions">
                <button
                  type="button"
                  onClick={() =>
                    setActiveTab(
                      "join"
                    )
                  }
                >
                  Join Session
                </button>

                <button
                  type="button"
                  onClick={
                    openMySessions
                  }
                >
                  My Sessions
                </button>

                <button
                  type="button"
                  onClick={
                    openMyQuestions
                  }
                >
                  My Questions
                </button>
              </div>
            </>
          )}

          {activeTab === "join" && (
            <section className="student-card">
              <h2>
                Join Class Session
              </h2>

              <p>
                Enter the session code
                shared by your lecturer.
                Only students
                registered for the
                subject can join.
              </p>

              <input
                type="text"
                placeholder="Enter Session Code e.g. UC-MT9AN"
                value={sessionCode}
                autoCapitalize="characters"
                autoCorrect="off"
                spellCheck={false}
                onChange={(
                  event
                ) =>
                  setSessionCode(
                    event.target
                      .value
                  )
                }
                onKeyDown={(
                  event
                ) => {
                  if (
                    event.key ===
                      "Enter" &&
                    !joiningSession
                  ) {
                    joinSession();
                  }
                }}
              />

              <button
                type="button"
                onClick={
                  joinSession
                }
                disabled={
                  joiningSession
                }
              >
                {joiningSession
                  ? "Joining..."
                  : "Join Session"}
              </button>
            </section>
          )}

          {activeTab ===
            "sessions" && (
            <MySessions
              user={user}
              sessions={
                joinedSessions
              }
              loading={
                joinedSessionsLoading
              }
              onRefresh={
                fetchJoinedSessions
              }
              onOpenSession={
                openJoinedSession
              }
              onViewSummary={
                openPublishedSummary
              }
            />
          )}

          {activeTab ===
            "summary" &&
            selectedSummarySession && (
              <StudentSessionSummary
                session={
                  selectedSummarySession
                }
                user={user}
                onBack={
                  openMySessions
                }
              />
            )}

          {activeTab ===
            "quizzes" && (
            <MyQuizzes
              user={user}
              onOpenQuiz={
                openQuizFromHistory
              }
            />
          )}

          {activeTab ===
            "current" && (
            <>
              {restoringSession &&
              !joinedSession ? (
                <section className="student-card">
                  <h2>
                    Restoring
                    Session...
                  </h2>

                  <p>
                    Please wait while
                    your session is
                    restored.
                  </p>
                </section>
              ) : (
                <CurrentSession
                  session={
                    joinedSession
                  }
                  user={user}
                  onSessionUpdate={
                    updateJoinedSession
                  }
                  onRefreshSessions={
                    fetchJoinedSessions
                  }
                  onRefreshMyQuestions={
                    fetchMyQuestions
                  }
                  onJoinSession={() =>
                    setActiveTab(
                      "join"
                    )
                  }
                  onViewSessions={
                    openMySessions
                  }
                  onViewQuestions={
                    openMyQuestions
                  }
                  onViewSummary={
                    openPublishedSummary
                  }
                />
              )}
            </>
          )}

          {activeTab ===
            "questions" && (
            <MyQuestions
              myQuestions={
                myQuestions
              }
            />
          )}

          {activeTab ===
            "settings" && (
            <StudentSettings
              user={user}
              logout={logout}
            />
          )}
        </main>
      </div>
    </div>
  );
}

export default StudentDashboard;