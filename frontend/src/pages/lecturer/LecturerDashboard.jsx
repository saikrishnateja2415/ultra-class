import { useEffect, useState } from "react";
import axios from "axios";

import Header from "../../components/Header";
import SessionDetails from "./SessionDetails";
import ManageQuestions from "./ManageQuestions";
import AnalyticsDashboard from "./AnalyticsDashboard";
import SessionSummary from "./SessionSummary";
import Attendance from "./Attendance";
import CreateSession from "./CreateSession";
import SessionParticipants from "./SessionParticipants";
import SessionList from "./SessionList";

import "./LecturerDashboard.css";

function LecturerDashboard({ user, logout }) {
  const [activeTab, setActiveTab] =
    useState("dashboard");

  const [sessions, setSessions] = useState([]);
  const [allQuestions, setAllQuestions] =
    useState([]);

  const [selectedSession, setSelectedSession] =
    useState(null);

  const [loadingSessions, setLoadingSessions] =
    useState(true);

  const fetchAllQuestions = async (
    lecturerSessions
  ) => {
    try {
      const questionRequests =
        lecturerSessions.map(async (session) => {
          try {
            const response = await axios.get(
              `http://localhost:5000/questions/${session._id}`
            );

            return (
              response.data.questions || []
            ).map((question) => ({
              ...question,

              sessionTitle: session.title,
              moduleCode: session.moduleCode,
              sessionCode: session.sessionCode,

              sessionId:
                question.sessionId || session._id,
            }));
          } catch (requestError) {
            console.error(
              `Questions could not be loaded for ${session.title}:`,
              requestError
            );

            return [];
          }
        });

      const questionGroups =
        await Promise.all(questionRequests);

      const questionData = questionGroups.flat();

      setAllQuestions(questionData);
    } catch (error) {
      console.error(
        "Load lecturer questions error:",
        error
      );

      setAllQuestions([]);
    }
  };

  const fetchSessions = async () => {
    try {
      const lecturerId = user?.id || user?._id;

      if (!lecturerId) {
        return;
      }

      setLoadingSessions(true);

      const response = await axios.get(
        `http://localhost:5000/lecturer/sessions/${lecturerId}`
      );

      const lecturerSessions =
        response.data.sessions || [];

      setSessions(lecturerSessions);

      /*
        If a session is currently selected, refresh
        it using the latest server data.
      */

      setSelectedSession((currentSession) => {
        if (!currentSession) {
          return null;
        }

        return (
          lecturerSessions.find(
            (session) =>
              session._id === currentSession._id
          ) || currentSession
        );
      });

      await fetchAllQuestions(lecturerSessions);
    } catch (error) {
      console.error(
        "Load lecturer sessions error:",
        error
      );

      alert(
        error.response?.data?.message ||
        "Error loading sessions"
      );
    } finally {
      setLoadingSessions(false);
    }
  };

  useEffect(() => {
    if (user?.id || user?._id) {
      fetchSessions();
    }
  }, [user?.id, user?._id]);

  const deleteSession = async (sessionId) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this session?"
    );

    if (!confirmed) {
      return;
    }

    try {
      await axios.delete(
        `http://localhost:5000/delete-session/${sessionId}`
      );

      setSelectedSession(null);
      setActiveTab("sessions");

      await fetchSessions();

      alert("Session deleted successfully");
    } catch (error) {
      console.error("Delete session error:", error);

      alert(
        error.response?.data?.message ||
        "Error deleting session"
      );
    }
  };

  const endSession = async (sessionId) => {
    try {
      const lecturerId = user?.id || user?._id;

      if (!lecturerId) {
        alert("Lecturer account is unavailable");
        return;
      }

      const response = await axios.put(
        `http://localhost:5000/lecturer/sessions/${sessionId}/end`,
        {
          lecturerId,
        }
      );

      /*
        Update the selected session immediately.
      */

      setSelectedSession((currentSession) => {
        if (!currentSession) {
          return currentSession;
        }

        return {
          ...currentSession,
          ...response.data.session,
        };
      });

      /*
        Refresh dashboard statistics and lists.
      */

      await fetchSessions();

      alert("Session ended successfully");
    } catch (error) {
      console.error("End session error:", error);

      alert(
        error.response?.data?.message ||
        "Unable to end the session"
      );

      throw error;
    }
  };

  const isAnswered = (question) => {
    return (
      question.status === "Answered" ||
      Boolean(question.answer?.trim())
    );
  };

  const totalSessions = sessions.length;

  const activeSessions = sessions.filter(
    (session) => session.status === "active"
  ).length;

  const completedSessions = sessions.filter(
    (session) => session.status === "ended"
  ).length;

  const totalQuestions = allQuestions.length;

  const answeredQuestions = allQuestions.filter(
    isAnswered
  ).length;

  const pendingQuestions =
    totalQuestions - answeredQuestions;

  const pinnedQuestions = allQuestions.filter(
    (question) => question.pinned
  ).length;

  const totalStudentJoins = sessions.reduce(
    (total, session) =>
      total +
      (session.participantCount ||
        session.participants?.length ||
        0),
    0
  );

  const answerRate =
    totalQuestions === 0
      ? 0
      : Math.round(
        (answeredQuestions / totalQuestions) * 100
      );

  const pendingRate =
    totalQuestions === 0
      ? 0
      : Math.round(
        (pendingQuestions / totalQuestions) * 100
      );

  /*
    This is an overall dashboard indicator only.
    Session Analytics uses a more detailed score.
  */

  const overallEngagementScore =
    totalSessions === 0
      ? 0
      : Math.min(
        100,
        Math.round(
          (totalQuestions * 4 +
            answeredQuestions * 3 +
            totalStudentJoins * 2) /
          totalSessions
        )
      );

  const recentSessions = sessions.slice(0, 3);

  const sessionsWithQuestionCounts = sessions.map(
    (session) => ({
      ...session,

      questionCount: allQuestions.filter(
        (question) => {
          const questionSessionId =
            typeof question.sessionId === "object"
              ? question.sessionId?._id
              : question.sessionId;

          return (
            questionSessionId?.toString() ===
            session._id?.toString() ||
            question.sessionCode ===
            session.sessionCode
          );
        }
      ).length,
    })
  );

  const mostActiveSession =
    sessionsWithQuestionCounts.length === 0
      ? null
      : [...sessionsWithQuestionCounts].sort(
        (firstSession, secondSession) =>
          secondSession.questionCount -
          firstSession.questionCount
      )[0];


  const openSessions = () => {
    setSelectedSession(null);
    setActiveTab("sessions");
  };

  const openSelectedSession = (session) => {
    setSelectedSession(session);
    setActiveTab("sessions");
  };

  const returnToSelectedSession = () => {
    if (selectedSession) {
      setActiveTab("sessions");
    } else {
      openSessions();
    }
  };

  const sessionsNavigationActive = [
    "sessions",
    "questions",
    "analytics",
    "summary",
  ].includes(activeTab);

  return (
    <div className="lecturer-page">
      <Header user={user} logout={logout} />

      <div className="lecturer-shell">
        <aside className="lecturer-sidebar">
          <button
            className={
              activeTab === "dashboard"
                ? "nav-active"
                : ""
            }
            onClick={() => {
              setActiveTab("dashboard");
              setSelectedSession(null);
            }}
          >
            Dashboard
          </button>

          <button
            className={
              sessionsNavigationActive
                ? "nav-active"
                : ""
            }
            onClick={openSessions}
          >
            Sessions
          </button>

          <button
            className={
              activeTab === "create"
                ? "nav-active"
                : ""
            }
            onClick={() => {
              setActiveTab("create");
              setSelectedSession(null);
            }}
          >
            Create Session
          </button>

          <button
            className={
              activeTab === "participants"
                ? "nav-active"
                : ""
            }
            onClick={() => {
              setActiveTab("participants");
              setSelectedSession(null);
            }}
          >
            Participants
          </button>

          <button
            className={
              activeTab === "attendance"
                ? "nav-active"
                : ""
            }
            onClick={() => {
              setActiveTab("attendance");
              setSelectedSession(null);
            }}
          >
            Attendance
          </button>

          <button
            className={
              activeTab === "settings"
                ? "nav-active"
                : ""
            }
            onClick={() => {
              setActiveTab("settings");
              setSelectedSession(null);
            }}
          >
            Settings
          </button>
        </aside>

        <main className="lecturer-content">
          {/* DASHBOARD */}

          {activeTab === "dashboard" && (
            <>
              <div className="welcome-card">
                <h1>
                  Welcome back, {user?.name}
                </h1>

                <p>
                  Manage sessions, student questions,
                  classroom activity and engagement
                  analytics.
                </p>
              </div>

              {loadingSessions ? (
                <section className="main-card">
                  <h2>Loading dashboard...</h2>
                </section>
              ) : (
                <>
                  <div className="stats-grid analytics-stats-grid">
                    <div className="stat-card">
                      <h3>Total Sessions</h3>
                      <strong>{totalSessions}</strong>
                    </div>

                    <div className="stat-card">
                      <h3>Active Sessions</h3>
                      <strong>{activeSessions}</strong>
                    </div>

                    <div className="stat-card">
                      <h3>Completed Sessions</h3>
                      <strong>
                        {completedSessions}
                      </strong>
                    </div>

                    <div className="stat-card">
                      <h3>Student Joins</h3>
                      <strong>
                        {totalStudentJoins}
                      </strong>
                    </div>

                    <div className="stat-card">
                      <h3>Total Questions</h3>
                      <strong>{totalQuestions}</strong>
                    </div>

                    <div className="stat-card">
                      <h3>Answered</h3>
                      <strong>
                        {answeredQuestions}
                      </strong>
                    </div>

                    <div className="stat-card">
                      <h3>Pending</h3>
                      <strong>
                        {pendingQuestions}
                      </strong>
                    </div>

                    <div className="stat-card">
                      <h3>Pinned</h3>
                      <strong>
                        {pinnedQuestions}
                      </strong>
                    </div>

                    <div className="stat-card engagement-card">
                      <h3>
                        Overall Engagement
                      </h3>

                      <strong>
                        {overallEngagementScore}%
                      </strong>
                    </div>
                  </div>

                  <div className="dashboard-two-column">
                    <section className="dashboard-panel">
                      <div className="panel-header">
                        <h2>Recent Sessions</h2>

                        <button
                          type="button"
                          onClick={openSessions}
                        >
                          View All
                        </button>
                      </div>

                      {recentSessions.length === 0 ? (
                        <p>
                          No sessions created yet.
                        </p>
                      ) : (
                        recentSessions.map(
                          (session) => (
                            <button
                              type="button"
                              className="recent-session-row"
                              key={session._id}
                              onClick={() =>
                                openSelectedSession(
                                  session
                                )
                              }
                            >
                              <div>
                                <h3>
                                  {session.title}
                                </h3>

                                <p>
                                  {session.moduleCode}
                                  {" • "}
                                  {
                                    session.sessionCode
                                  }
                                </p>
                              </div>

                              <span>
                                {session.status}
                              </span>
                            </button>
                          )
                        )
                      )}
                    </section>

                    <section className="dashboard-panel">
                      <div className="panel-header">
                        <h2>
                          Overall Analytics
                        </h2>
                      </div>

                      <div className="analytics-preview-box">
                        <p>Answer Rate</p>
                        <h3>{answerRate}%</h3>
                      </div>

                      <div className="analytics-preview-box">
                        <p>Pending Rate</p>
                        <h3>{pendingRate}%</h3>
                      </div>

                      <div className="analytics-preview-box">
                        <p>
                          Most Active Session
                        </p>

                        <h3>
                          {mostActiveSession?.title ||
                            "No data yet"}
                        </h3>

                        {mostActiveSession && (
                          <p>
                            {
                              mostActiveSession.questionCount
                            }{" "}
                            questions
                          </p>
                        )}
                      </div>

                      <p className="dashboard-analytics-note">
                        Open a session to view its
                        detailed analytics.
                      </p>
                    </section>
                  </div>

                  <div className="quick-actions">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedSession(null);
                        setActiveTab("create");
                      }}
                    >
                      Create New Session
                    </button>

                    <button
                      type="button"
                      onClick={openSessions}
                    >
                      View Sessions
                    </button>
                  </div>
                </>
              )}
            </>
          )}

          {/* CREATE SESSION */}

          {activeTab === "create" && (
            <CreateSession
              user={user}
              onSessionCreated={async () => {
                await fetchSessions();
              }}
              onOpenSessions={openSessions}
            />
          )}

          {/* SESSION LIST */}

          {activeTab === "sessions" &&
            !selectedSession && (
              <SessionList
                sessions={sessions}
                onCreateSession={() => {
                  setSelectedSession(null);
                  setActiveTab("create");
                }}
                onSelectSession={
                  openSelectedSession
                }
              />
            )}

          {/* SESSION DETAILS */}

          {activeTab === "sessions" &&
            selectedSession && (
              <SessionDetails
                session={selectedSession}
                onBack={openSessions}
                onDelete={deleteSession}
                onEndSession={endSession}
                onManageQuestions={() => {
                  setActiveTab("questions");
                }}
                onViewParticipants={() => {
                  setActiveTab("participants");
                }}
                onViewAnalytics={() => {
                  setActiveTab("analytics");
                }}
                onViewSummary={() => {
                  setActiveTab("summary");
                }}
              />
            )}

          {/* SELECTED SESSION PARTICIPANTS */}

          {activeTab === "participants" &&
            selectedSession && (
              <SessionParticipants
                session={selectedSession}
                onBack={
                  returnToSelectedSession
                }
              />
            )}

          {/* PARTICIPANTS WITHOUT SESSION */}

          {activeTab === "participants" &&
            !selectedSession && (
              <section className="main-card">
                <h2>Subject Participants</h2>

                <p>
                  Select a session to view the
                  students registered for its
                  subject.
                </p>

                <button
                  type="button"
                  onClick={openSessions}
                >
                  Select a Session
                </button>
              </section>
            )}

          {/* QUESTION MANAGEMENT */}

          {activeTab === "questions" &&
            selectedSession && (
              <ManageQuestions
                session={selectedSession}
                onBack={
                  returnToSelectedSession
                }
              />
            )}

          {/* SESSION-SPECIFIC ANALYTICS */}

          {/* AI SESSION SUMMARY */}

          {activeTab === "summary" &&
            selectedSession && (
              <SessionSummary
                session={selectedSession}
                onBack={returnToSelectedSession}
                onEndSession={endSession}
              />
            )}

          {activeTab === "analytics" &&
            selectedSession && (
              <AnalyticsDashboard
                session={selectedSession}
                allQuestions={allQuestions}
                onBack={
                  returnToSelectedSession
                }
              />
            )}

          {/* SAFETY MESSAGE */}

          {(activeTab === "questions" ||
            activeTab === "analytics" ||
            activeTab === "summary") &&
            !selectedSession && (
              <section className="main-card">
                <h2>No Session Selected</h2>

                <p>
                  Select a session before opening
                  this feature.
                </p>

                <button
                  type="button"
                  onClick={openSessions}
                >
                  Select a Session
                </button>
              </section>
            )}

          {/* ATTENDANCE */}

          {activeTab === "attendance" && (
            <Attendance />
          )}

          {/* SETTINGS */}

          {activeTab === "settings" && (
            <section className="main-card">
              <h2>Settings</h2>

              <p>
                Lecturer profile and session
                settings will be added here.
              </p>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}

export default LecturerDashboard;