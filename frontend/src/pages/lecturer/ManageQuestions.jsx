import "./ManageQuestions.css";

function ManageQuestions({ session, onBack }) {
  const sampleQuestions = [
    {
      id: 1,
      student: "Test Student",
      question: "Can you explain how the QR code joining works?",
      status: "Pending",
    },
    {
      id: 2,
      student: "Student Two",
      question: "What is the difference between JSX and JavaScript?",
      status: "Pending",
    },
  ];

  return (
    <section className="questions-page">
      <button className="questions-back-btn" onClick={onBack}>
        ← Back to Session Details
      </button>

      <div className="questions-header">
        <div>
          <h2>Manage Questions</h2>
          <p>{session?.title} • {session?.sessionCode}</p>
        </div>

        <span className="questions-count">
          {sampleQuestions.length} Questions
        </span>
      </div>

      <div className="questions-list">
        {sampleQuestions.map((item) => (
          <div className="question-item" key={item.id}>
            <div>
              <h3>{item.question}</h3>
              <p>Asked by: {item.student}</p>
              <span>{item.status}</span>
            </div>

            <div className="question-actions">
              <button>Mark Answered</button>
              <button>Pin</button>
              <button className="question-delete-btn">
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default ManageQuestions;