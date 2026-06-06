import { useEffect, useState } from "react";
import axios from "axios";
import logo from "../assets/logo.png";
import "./LecturerDashboard.css";

function LecturerDashboard({ user, logout }) {
  const [title, setTitle] = useState("");
  const [moduleCode, setModuleCode] = useState("");
  const [sessions, setSessions] = useState([]);
  const [showProfile, setShowProfile] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  useEffect(() => {
    const loadSessions = async () => {
      if (!user?.id) return;

      try {
        const res = await axios.get(
          `http://localhost:5000/lecturer/sessions/${user.id}`
        );

        setSessions(res.data.sessions);
      } catch (error) {
        console.log(error);
        alert("Error loading sessions");
      }
    };

    loadSessions();
  }, [user?.id]);

  const fetchSessions = async () => {
    if (!user?.id) return;

    try {
      const res = await axios.get(
        `http://localhost:5000/lecturer/sessions/${user.id}`
      );

      setSessions(res.data.sessions);
    } catch (error) {
      console.log(error);
      alert("Error fetching sessions");
    }
  };

  const createSession = async () => {
    if (!title || !moduleCode) {
      alert("Please enter session title and module code");
      return;
    }

    try {
      await axios.post("http://localhost:5000/lecturer/sessions", {
        title,
        moduleCode,
        lecturerId: user.id,
        lecturerName: user.name,
      });

      setTitle("");
      setModuleCode("");

      fetchSessions();

      alert("Session created successfully");
    } catch (error) {
      console.log(error);
      alert("Error creating session");
    }
  };

  const deleteSession = async (id) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this session?"
    );

    if (!confirmDelete) return;

    try {
      await axios.delete(
        `http://localhost:5000/delete-session/${id}`
      );

      fetchSessions();

      alert("Session deleted successfully");
    } catch (error) {
      console.log(error);
      alert("Error deleting session");
    }
  };

  return (
    <div className="lecturer-page">
      <header className="lecturer-header">
        <div className="header-left">
          <button
            className="menu-btn"
            onClick={() => setShowMenu(!showMenu)}
          >
            ☰
          </button>

          <img
            src={logo}
            alt="Ultra Class"
            className="header-logo"
          />
        </div>

        <div className="header-right">
          <span>Welcome, {user?.name}</span>

          <button
            className="profile-btn"
            onClick={() => setShowProfile(!showProfile)}
          >
            {user?.name?.charAt(0).toUpperCase()}
          </button>

          {showProfile && (
            <div className="profile-menu">
              <button>My Profile</button>
              <button onClick={logout}>Logout</button>
            </div>
          )}
        </div>
      </header>

      {showMenu && (
        <div
          className="menu-overlay"
          onClick={() => setShowMenu(false)}
        ></div>
      )}

      <div className="lecturer-layout">
        <aside className={`lecturer-sidebar ${showMenu ? "open" : ""}`}>
          <button onClick={() => setShowMenu(false)}>Dashboard</button>
          <button onClick={() => setShowMenu(false)}>Active Sessions</button>
          <button onClick={() => setShowMenu(false)}>Create Session</button>
          <button onClick={() => setShowMenu(false)}>Edit Sessions</button>
          <button onClick={() => setShowMenu(false)}>Analytics</button>
          <button onClick={() => setShowMenu(false)}>Settings</button>
        </aside>

        <main className="lecturer-main">
          <section className="create-card">
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

            <button onClick={createSession}>
              Create Session
            </button>
          </section>
        </main>

        <aside className="lecturer-right">
          <h2>My Sessions</h2>

          {sessions.length === 0 ? (
            <p>No sessions created yet.</p>
          ) : (
            sessions.map((session) => (
              <div className="session-card" key={session._id}>
                <h3>{session.title}</h3>

                <p>{session.moduleCode}</p>

                <strong>{session.sessionCode}</strong>

                <span>{session.status}</span>

                <button
                  className="delete-btn"
                  onClick={() => deleteSession(session._id)}
                >
                  Delete
                </button>
              </div>
            ))
          )}
        </aside>
      </div>
    </div>
  );
}

export default LecturerDashboard;