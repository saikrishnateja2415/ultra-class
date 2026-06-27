import { useEffect, useState } from "react";
import axios from "axios";
import QRCode from "react-qr-code";
import Header from "../../components/Header";
import "./LecturerDashboard.css";
import SessionDetails from "./SessionDetails";
import ManageQuestions from "./ManageQuestions";

function LecturerDashboard({ user, logout }) {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [title, setTitle] = useState("");
  const [moduleCode, setModuleCode] = useState("");
  const [sessions, setSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);

  const fetchSessions = async () => {
    try {
      const lecturerId = user?.id || user?._id;

      if (!lecturerId) {
        console.log("Lecturer ID not ready yet");
        return;
      }

      const res = await axios.get(
        `http://localhost:5000/lecturer/sessions/${lecturerId}`
      );

      setSessions(res.data.sessions || []);
    } catch (error) {
      console.log(error);
      alert("Error loading sessions");
    }
  };

  useEffect(() => {
    if (user?.id || user?._id) {
      fetchSessions();
    }
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

  const totalSessions = sessions.length;
  const activeSessions = sessions.filter((s) => s.status === "active").length;

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

          <button onClick={() => setActiveTab("participants")}>
            Participants
          </button>

          <button onClick={() => setActiveTab("analytics")}>
            Analytics
          </button>

          <button onClick={() => setActiveTab("settings")}>
            Settings
          </button>
        </aside>

        <main className="lecturer-content">
          {activeTab === "dashboard" && (
            <>
              <div className="welcome-card">
                <h1>Welcome back, {user?.name}</h1>
                <p>Manage sessions, QR access, students, and classroom activity.</p>
              </div>

              <div className="stats-grid">
                <div className="stat-card">
                  <h3>Total Sessions</h3>
                  <strong>{totalSessions}</strong>
                </div>

                <div className="stat-card">
                  <h3>Active Sessions</h3>
                  <strong>{activeSessions}</strong>
                </div>

                <div className="stat-card">
                  <h3>QR Enabled</h3>
                  <strong>{totalSessions}</strong>
                </div>

                <div className="stat-card">
                  <h3>Students Joined</h3>
                  <strong>0</strong>
                </div>
              </div>

              <div className="quick-actions">
                <button onClick={() => setActiveTab("create")}>
                  Create New Session
                </button>
                <button onClick={() => setActiveTab("sessions")}>
                  View Sessions
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
            <section className="main-card">
              <h2>Analytics</h2>
              <p>Attendance, questions, polls, and engagement reports will be shown here.</p>
            </section>
          )}

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