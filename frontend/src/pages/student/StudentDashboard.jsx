import { useState } from "react";
import axios from "axios";
import "./StudentDashboard.css";
import Header from "../../components/Header";

function StudentDashboard({ user, logout }) {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [sessionCode, setSessionCode] = useState("");
  const [joinedSession, setJoinedSession] = useState(null);
  const [questionText, setQuestionText] = useState("");

  const joinSession = async () => {
    if (!sessionCode.trim()) {
      alert("Please enter a session code");
      return;
    }

    try {
      const res = await axios.post("http://localhost:5000/student/join-session", {
        sessionCode,
        studentId: user.id,
        studentName: user.name,
      });

      setJoinedSession(res.data.session);
      setSessionCode("");
      setActiveTab("current");
      alert("Session joined successfully");
    } catch (error) {
      console.log(error);
      alert("Invalid session code or session is inactive");
    }
  };

  const submitQuestion = async () => {
    if (!joinedSession) {
      alert("Please join a session first");
      return;
    }

    if (!questionText.trim()) {
      alert("Please type your question");
      return;
    }

    try {
      await axios.post("http://localhost:5000/questions", {
        sessionId: joinedSession._id,
        sessionCode: joinedSession.sessionCode,
        studentId: user.id,
        studentName: user.name,
        question: questionText,
      });

      setQuestionText("");
      alert("Question submitted anonymously");
    } catch (error) {
      console.log(error);
      alert("Error submitting question");
    }
  };

  return (
    <div className="student-page">
      <Header user={user} logout={logout} />

      <div className="student-shell">
        <aside className="student-sidebar">
          <button
            className={activeTab === "dashboard" ? "student-nav-active" : ""}
            onClick={() => setActiveTab("dashboard")}
          >
            Dashboard
          </button>

          <button
            className={activeTab === "join" ? "student-nav-active" : ""}
            onClick={() => setActiveTab("join")}
          >
            Join New Session
          </button>

          <button
            className={activeTab === "current" ? "student-nav-active" : ""}
            onClick={() => setActiveTab("current")}
          >
            Current Session
          </button>

          <button
            className={activeTab === "questions" ? "student-nav-active" : ""}
            onClick={() => setActiveTab("questions")}
          >
            My Questions
          </button>

          <button
            className={activeTab === "settings" ? "student-nav-active" : ""}
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
                <p>Join classroom sessions, ask anonymous questions, and follow live learning activities.</p>
              </section>

              <div className="student-stats-grid">
                <div className="student-stat-card">
                  <h3>Joined Sessions</h3>
                  <strong>{joinedSession ? 1 : 0}</strong>
                </div>

                <div className="student-stat-card">
                  <h3>Current Session</h3>
                  <strong>{joinedSession ? "Active" : "None"}</strong>
                </div>

                <div className="student-stat-card">
                  <h3>Questions Asked</h3>
                  <strong>0</strong>
                </div>
              </div>

              <div className="student-quick-actions">
                <button onClick={() => setActiveTab("join")}>
                  Join Session
                </button>

                <button onClick={() => setActiveTab("current")}>
                  Current Session
                </button>
              </div>
            </>
          )}

          {activeTab === "join" && (
            <section className="student-card">
              <h2>Join Class Session</h2>
              <p>Enter the session code shared by your lecturer.</p>

              <input
                type="text"
                placeholder="Enter Session Code e.g. UC-MT9AN"
                value={sessionCode}
                onChange={(e) => setSessionCode(e.target.value)}
              />

              <button onClick={joinSession}>Join Session</button>
            </section>
          )}

          {activeTab === "current" && (
            <section className="student-card">
              <h2>Current Session</h2>

              {!joinedSession ? (
                <p>You have not joined any session yet.</p>
              ) : (
                <>
                  <div className="student-session-details">
                    <h3>{joinedSession.title}</h3>
                    <p><strong>Module:</strong> {joinedSession.moduleCode}</p>
                    <p><strong>Session Code:</strong> {joinedSession.sessionCode}</p>
                    <p><strong>Lecturer:</strong> {joinedSession.lecturerName}</p>
                    <span>{joinedSession.status}</span>
                  </div>

                  <div className="ask-question-card">
                    <h2>Ask a Question</h2>
                    <p>Your question will be shown anonymously to the lecturer.</p>

                    <textarea
                      placeholder="Type your question here..."
                      value={questionText}
                      onChange={(e) => setQuestionText(e.target.value)}
                    />

                    <button onClick={submitQuestion}>
                      Submit Question
                    </button>
                  </div>
                </>
              )}
            </section>
          )}

          {activeTab === "questions" && (
            <section className="student-card">
              <h2>My Questions</h2>
              <p>Your submitted questions will appear here later.</p>
            </section>
          )}

          {activeTab === "settings" && (
            <section className="student-card">
              <h2>Settings</h2>
              <p>Student profile and preferences will be added here.</p>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}

export default StudentDashboard;