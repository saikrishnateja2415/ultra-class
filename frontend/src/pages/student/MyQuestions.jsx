import { useState } from "react";
import "./MyQuestions.css";

function MyQuestions({ myQuestions }) {
  const [filter, setFilter] = useState("all");

  const answeredCount = myQuestions.filter(
    (q) => q.status === "Answered"
  ).length;

  const pendingCount = myQuestions.filter(
    (q) => q.status !== "Answered"
  ).length;

  const pinnedCount = myQuestions.filter((q) => q.pinned).length;

  const filteredQuestions = myQuestions.filter((q) => {
    if (filter === "answered") return q.status === "Answered";
    if (filter === "pending") return q.status !== "Answered";
    if (filter === "pinned") return q.pinned;
    return true;
  });

  return (
    <section className="student-card myq-page">
      <div className="myq-header">
        <div>
          <h2>My Learning Journey</h2>
          <p>Review your questions, lecturer answers, and progress.</p>
        </div>
      </div>

      <div className="myq-stats">
        <div>
          <span>Total Asked</span>
          <strong>{myQuestions.length}</strong>
        </div>

        <div>
          <span>Answered</span>
          <strong>{answeredCount}</strong>
        </div>

        <div>
          <span>Pending</span>
          <strong>{pendingCount}</strong>
        </div>

        <div>
          <span>Pinned</span>
          <strong>{pinnedCount}</strong>
        </div>
      </div>

      <div className="myq-tabs">
        <button
          className={filter === "all" ? "myq-active" : ""}
          onClick={() => setFilter("all")}
        >
          All
        </button>

        <button
          className={filter === "pending" ? "myq-active" : ""}
          onClick={() => setFilter("pending")}
        >
          Pending
        </button>

        <button
          className={filter === "answered" ? "myq-active" : ""}
          onClick={() => setFilter("answered")}
        >
          Answered
        </button>

        <button
          className={filter === "pinned" ? "myq-active" : ""}
          onClick={() => setFilter("pinned")}
        >
          Pinned
        </button>
      </div>

      {filteredQuestions.length === 0 ? (
        <p className="myq-empty">No questions found for this filter.</p>
      ) : (
        <div className="myq-list">
          {filteredQuestions.map((item) => (
            <div className="myq-card" key={item._id}>
              <div className="myq-card-top">
                <div>
                  <h3>{item.sessionTitle || "Session"}</h3>
                  <p>{item.moduleCode || "Module"}</p>
                </div>

                <span
                  className={
                    item.status === "Answered"
                      ? "myq-status-answered"
                      : "myq-status-pending"
                  }
                >
                  {item.status === "Answered" ? "Answered" : "Pending"}
                </span>
              </div>

              {item.pinned && (
                <div className="myq-pinned">
                  ⭐ Pinned by lecturer
                </div>
              )}

              <div className="myq-question">
                <small>Your Question</small>
                <p>{item.question}</p>
              </div>

              <div className="myq-answer">
                <small>Lecturer Response</small>

                {item.answer ? (
                  <p>{item.answer}</p>
                ) : (
                  <p className="myq-waiting">
                    Waiting for lecturer response...
                  </p>
                )}
              </div>

              <div className="myq-footer">
                <span>Lecturer: {item.lecturerName || "Unknown Lecturer"}</span>
                <span>
                  {item.createdAt
                    ? new Date(item.createdAt).toLocaleString()
                    : ""}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export default MyQuestions;