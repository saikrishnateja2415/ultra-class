import { useEffect, useState } from "react";
import axios from "axios";
import QRCode from "react-qr-code";
import Header from "../../components/Header";
import "./LecturerDashboard.css";
import SessionDetails from "./SessionDetails";
import ManageQuestions from "./ManageQuestions";
import AnalyticsDashboard from "./AnalyticsDashboard";
import Attendance from "./Attendance";

function LecturerDashboard({ user, logout }) {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [title, setTitle] = useState("");
  const [moduleCode, setModuleCode] = useState("");
  const [sessions, setSessions] = useState([]);
  const [allQuestions, setAllQuestions] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);

  const fetchSessions = async () => {
    try {
      const lecturerId = user?.id || user?._id;
      if (!lecturerId) return;

      const res = await axios.get(
        `http://localhost:5000/lecturer/sessions/${lecturerId}`
      );

      const lecturerSessions = res.data.sessions || [];
      setSessions(lecturerSessions);
      fetchAllQuestions(lecturerSessions);
    } catch (error) {
      console.log(error);
      alert("Error loading sessions");
    }
  };

  const fetchAllQuestions = async (lecturerSessions) => {
    try {
      let questionData = [];

      for (const session of lecturerSessions) {
        const res = await axios.get(
          `http://localhost:5000/questions/${session._id}`
        );

        const sessionQuestions = (res.data.questions || []).map((q) => ({
          ...q,
          sessionTitle: session.title,
          moduleCode: session.moduleCode,
          sessionCode: session.sessionCode,
        }));

        questionData = [...questionData, ...sessionQuestions];
      }

      setAllQuestions(questionData);
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    const loadSessions = async () => {
      if (user?.id || user?._id) {
        await fetchSessions();
      }
    };

    loadSessions();
  }, [user]);

  const createSession = async () => {
    if (!title || !moduleCode) {
      alert("Please enter session title and module code");
      return;
    }

    try {
      await axios.post("http://localhost:5000/lecturer/sessions", {
        title,
        moduleCode,
        lecturerId: user.id || user._id,
        lecturerName: user.name,
      });

      setTitle("");
      setModuleCode("");
      setActiveTab("sessions");
      fetchSessions();
      alert("Session created successfully");
    } catch (error) {
      console.log(error);
      alert("Error creating session");
    }
  };

  const deleteSession = async (id) => {
    if (!window.confirm("Are you sure you want to delete this session?")) return;

    try {
      await axios.delete(`http://localhost:5000/delete-session/${id}`);
      setSelectedSession(null);
      fetchSessions();
      alert("Session deleted successfully");
    } catch (error) {
      console.log(error);
      alert("Error deleting session");
    }
  };

  const isAnswered = (q) => {
    return q.status === "Answered" || (q.answer && q.answer.trim() !== "");
  };

  const totalSessions = sessions.length;
  const activeSessions = sessions.filter((s) => s.status === "active").length;
  const totalQuestions = allQuestions.length;
  const answeredQuestions = allQuestions.filter(isAnswered).length;
  const pendingQuestions = allQuestions.filter((q) => !isAnswered(q)).length;
  const pinnedQuestions = allQuestions.filter((q) => q.pinned).length;

  const engagementScore =
    totalSessions === 0
      ? 0
      : Math.min(
        100,
        Math.round(
          ((totalQuestions * 5 + answeredQuestions * 3 + pinnedQuestions * 2) /
            totalSessions)
        )
      );

  const recentSessions = sessions.slice(0, 3);

  const answerRate =
    totalQuestions === 0 ? 0 : Math.round((answeredQuestions / totalQuestions) * 100);

  const pendingRate =
    totalQuestions === 0 ? 0 : Math.round((pendingQuestions / totalQuestions) * 100);

  const mostActiveSession = sessions
    .map((session) => ({
      ...session,
      questionCount: allQuestions.filter(
        (q) => q.sessionCode === session.sessionCode
      ).length,
    }))
    .sort((a, b) => b.questionCount - a.questionCount)[0];

  const answeredDegree = totalQuestions === 0 ? 0 : Math.round((answeredQuestions / totalQuestions) * 360);
  const pendingDegree = totalQuestions === 0 ? 0 : Math.round((pendingQuestions / totalQuestions) * 360);

  return (
    <div className="lecturer-page">
      <Header user={user} logout={logout} />

      <div className="lecturer-shell">
        <aside className="lecturer-sidebar">
          <button
            className={activeTab === "dashboard" ? "nav-active" : ""}
            onClick={() => {
              setActiveTab("dashboard");
              setSelectedSession(null);
            }}
          >
            Dashboard
          </button>

          <button
            className={activeTab === "sessions" ? "nav-active" : ""}
            onClick={() => {
              setActiveTab("sessions");
              setSelectedSession(null);
            }}
          >
            Sessions
          </button>

          <button
            className={activeTab === "create" ? "nav-active" : ""}
            onClick={() => {
              setActiveTab("create");
              setSelectedSession(null);
            }}
          >
            Create Session
          </button>

          <button
            className={activeTab === "participants" ? "nav-active" : ""}
            onClick={() => setActiveTab("participants")}
          >
            Participants
          </button>

          <button
            className={activeTab === "attendance" ? "nav-active" : ""}
            onClick={() => setActiveTab("attendance")}
          >
            Attendance
          </button>

          <button
            className={activeTab === "analytics" ? "nav-active" : ""}
            onClick={() => setActiveTab("analytics")}
          >
            Analytics
          </button>

          <button
            className={activeTab === "settings" ? "nav-active" : ""}
            onClick={() => setActiveTab("settings")}
          >
            Settings
          </button>
        </aside>

        <main className="lecturer-content">
          {activeTab === "dashboard" && (
            <>
              <div className="welcome-card">
                <h1>Welcome back, {user?.name}</h1>
                <p>
                  Manage sessions, student questions, classroom activity, and engagement analytics.
                </p>
              </div>

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
                  <h3>Total Questions</h3>
                  <strong>{totalQuestions}</strong>
                </div>

                <div className="stat-card">
                  <h3>Answered</h3>
                  <strong>{answeredQuestions}</strong>
                </div>

                <div className="stat-card">
                  <h3>Pending</h3>
                  <strong>{pendingQuestions}</strong>
                </div>

                <div className="stat-card">
                  <h3>Pinned</h3>
                  <strong>{pinnedQuestions}</strong>
                </div>

                <div className="stat-card engagement-card">
                  <h3>Engagement Score</h3>
                  <strong>{engagementScore}%</strong>
                </div>

                <div className="stat-card">
                  <h3>QR Enabled</h3>
                  <strong>{totalSessions}</strong>
                </div>
              </div>

              <div className="dashboard-two-column">
                <section className="dashboard-panel">
                  <div className="panel-header">
                    <h2>Recent Sessions</h2>
                    <button onClick={() => setActiveTab("sessions")}>View All</button>
                  </div>

                  {recentSessions.length === 0 ? (
                    <p>No sessions created yet.</p>
                  ) : (
                    recentSessions.map((session) => (
                      <div className="recent-session-row" key={session._id}>
                        <div>
                          <h3>{session.title}</h3>
                          <p>
                            {session.moduleCode} • {session.sessionCode}
                          </p>
                        </div>
                        <span>{session.status}</span>
                      </div>
                    ))
                  )}
                </section>

                <section className="dashboard-panel">
                  <div className="panel-header">
                    <h2>Analytics Preview</h2>
                    <button onClick={() => setActiveTab("analytics")}>Open</button>
                  </div>

                  <div className="analytics-preview-box">
                    <p>Answer Rate</p>
                    <h3>
                      {totalQuestions === 0
                        ? 0
                        : Math.round((answeredQuestions / totalQuestions) * 100)}
                      %
                    </h3>
                  </div>

                  <div className="analytics-preview-box">
                    <p>Pending Rate</p>
                    <h3>
                      {totalQuestions === 0
                        ? 0
                        : Math.round((pendingQuestions / totalQuestions) * 100)}
                      %
                    </h3>
                  </div>
                </section>
              </div>

              <div className="quick-actions">
                <button onClick={() => setActiveTab("create")}>
                  Create New Session
                </button>
                <button onClick={() => setActiveTab("sessions")}>
                  View Sessions
                </button>
                <button onClick={() => setActiveTab("analytics")}>
                  View Analytics
                </button>
              </div>
            </>
          )}

          {activeTab === "create" && (
            <section className="main-card">
              <h2>Create New Class Session</h2>

              <input
                type="text"
                placeholder="Session Title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />

              <input
                type="text"
                placeholder="Module Code e.g. CS957"
                value={moduleCode}
                onChange={(e) => setModuleCode(e.target.value)}
              />

              <button onClick={createSession}>Create Session</button>
            </section>
          )}

          {activeTab === "sessions" && !selectedSession && (
            <section className="sessions-page">
              <div className="section-header">
                <h2>My Sessions</h2>
                <button onClick={() => setActiveTab("create")}>+ New Session</button>
              </div>

              <div className="session-grid">
                {sessions.length === 0 ? (
                  <p>No sessions created yet.</p>
                ) : (
                  sessions.map((session) => (
                    <div
                      className="modern-session-card"
                      key={session._id}
                      onClick={() => setSelectedSession(session)}
                    >
                      <h3>{session.title}</h3>
                      <p>{session.moduleCode}</p>
                      <strong>{session.sessionCode}</strong>

                      <div className="small-qr">
                        <QRCode
                          value={`http://localhost:5173/join/${session.sessionCode}`}
                          size={90}
                        />
                      </div>

                      <span>{session.status}</span>
                    </div>
                  ))
                )}
              </div>
            </section>
          )}

          {activeTab === "sessions" && selectedSession && (
            <SessionDetails
              session={selectedSession}
              onBack={() => setSelectedSession(null)}
              onDelete={deleteSession}
              onManageQuestions={() => setActiveTab("questions")}
            />
          )}

          {activeTab === "participants" && (
            <section className="main-card">
              <h2>Participants</h2>
              <p>Student participation tracking will be added here.</p>
            </section>
          )}

          {activeTab === "questions" && (
            <ManageQuestions
              session={selectedSession}
              onBack={() => {
                setActiveTab("sessions");
              }}
            />
          )}

          {activeTab === "analytics" && (
            <AnalyticsDashboard
              sessions={sessions}
              allQuestions={allQuestions}
              totalQuestions={totalQuestions}
              answeredQuestions={answeredQuestions}
              pendingQuestions={pendingQuestions}
              pinnedQuestions={pinnedQuestions}
              engagementScore={engagementScore}
              answerRate={answerRate}
              pendingRate={pendingRate}
              mostActiveSession={mostActiveSession}
              answeredDegree={answeredDegree}
              pendingDegree={pendingDegree}
            />
          )}

          {activeTab === "attendance" && <Attendance />}

          {activeTab === "settings" && (
            <section className="main-card">
              <h2>Settings</h2>
              <p>Lecturer profile and session settings will be added here.</p>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}

export default LecturerDashboard;