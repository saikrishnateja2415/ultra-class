import QRCode from "react-qr-code";
import "./SessionDetails.css";

function SessionDetails({ session, onBack, onDelete, onManageQuestions }) {
  if (!session) return null;

  return (
    <section className="session-details-page">
      <button className="details-back-btn" onClick={onBack}>
        ← Back to Sessions
      </button>

      <div className="details-header">
        <h2>{session.title}</h2>
        <span className="details-status">{session.status}</span>
      </div>

      <div className="details-grid">
        <div className="details-info-card">
          <h3>Session Information</h3>

          <p>
            <strong>Module Code:</strong> {session.moduleCode}
          </p>

          <p>
            <strong>Session Code:</strong> {session.sessionCode}
          </p>

          <p>
            <strong>Lecturer:</strong> {session.lecturerName}
          </p>
        </div>

        <div className="details-qr-card">
          <h3>Student Access QR</h3>

          <div className="details-qr-box">
            <QRCode
              value={`http://localhost:5173/join/${session.sessionCode}`}
              size={180}
            />
          </div>

          <p>Students can scan this QR code to join the session.</p>
        </div>
      </div>

      <div className="details-actions">
        <button>View Participants</button>

        <button onClick={onManageQuestions}>
          Manage Questions
        </button>

        <button>View Analytics</button>

        <button className="details-end-btn">
          End Session
        </button>

        <button
          className="details-delete-btn"
          onClick={() => onDelete(session._id)}
        >
          Delete Session
        </button>
      </div>
    </section>
  );
}

export default SessionDetails;