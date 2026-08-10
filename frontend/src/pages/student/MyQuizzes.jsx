import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";

import "./MyQuizzes.css";

const API_URL = "http://localhost:5000";

const formatDate = (value) => {
  if (!value) {
    return "Not available";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not available";
  }

  return date.toLocaleString();
};

const formatAttemptStatus = (status) => {
  if (status === "completed") {
    return "Completed";
  }

  if (status === "partially_attempted") {
    return "Partially Attempted";
  }

  return "Not Attempted";
};

function MyQuizzes({ user, onOpenQuiz }) {
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const studentId = user?.id || user?._id;

  const fetchQuizHistory = useCallback(async () => {
    if (!studentId) {
      setQuizzes([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const response = await axios.get(
        `${API_URL}/student/${studentId}/mcq-history`,
        {
          timeout: 15000,
        }
      );

      setQuizzes(response.data.quizzes || []);
      setError("");
    } catch (requestError) {
      console.log("Load student quiz history error:", requestError);

      setError(
        requestError.response?.data?.message ||
          "Unable to load your quiz history."
      );
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    fetchQuizHistory();
  }, [fetchQuizHistory]);

  const filteredQuizzes = useMemo(() => {
    if (statusFilter === "all") {
      return quizzes;
    }

    if (statusFilter === "open") {
      return quizzes.filter(
        (quiz) => quiz.quizStatus === "open"
      );
    }

    if (statusFilter === "completed") {
      return quizzes.filter(
        (quiz) => quiz.attemptStatus === "completed"
      );
    }

    return quizzes.filter(
      (quiz) => quiz.attemptStatus === "not_attempted"
    );
  }, [quizzes, statusFilter]);

  const completedCount = quizzes.filter(
    (quiz) => quiz.attemptStatus === "completed"
  ).length;

  const openCount = quizzes.filter(
    (quiz) => quiz.quizStatus === "open"
  ).length;

  const notAttemptedCount = quizzes.filter(
    (quiz) => quiz.attemptStatus === "not_attempted"
  ).length;

  return (
    <section className="my-quizzes-page">
      <div className="my-quizzes-header">
        <div>
          <span>STUDENT QUIZ HISTORY</span>
          <h1>My Quizzes</h1>
          <p>
            View quizzes from joined sessions, continue an open quiz
            or review answers after submission or closure.
          </p>
        </div>

        <button
          type="button"
          className="my-quizzes-refresh"
          onClick={fetchQuizHistory}
          disabled={loading}
        >
          {loading ? "Refreshing..." : "Refresh History"}
        </button>
      </div>

      <div className="my-quizzes-summary-grid">
        <div>
          <span>Total Quizzes</span>
          <strong>{quizzes.length}</strong>
        </div>

        <div>
          <span>Open</span>
          <strong>{openCount}</strong>
        </div>

        <div>
          <span>Completed</span>
          <strong>{completedCount}</strong>
        </div>

        <div>
          <span>Not Attempted</span>
          <strong>{notAttemptedCount}</strong>
        </div>
      </div>

      <div className="my-quizzes-toolbar">
        <button
          type="button"
          className={statusFilter === "all" ? "active" : ""}
          onClick={() => setStatusFilter("all")}
        >
          All
        </button>

        <button
          type="button"
          className={statusFilter === "open" ? "active" : ""}
          onClick={() => setStatusFilter("open")}
        >
          Open
        </button>

        <button
          type="button"
          className={statusFilter === "completed" ? "active" : ""}
          onClick={() => setStatusFilter("completed")}
        >
          Completed
        </button>

        <button
          type="button"
          className={
            statusFilter === "not_attempted" ? "active" : ""
          }
          onClick={() => setStatusFilter("not_attempted")}
        >
          Not Attempted
        </button>
      </div>

      {loading ? (
        <div className="my-quizzes-message">
          Loading your quiz history...
        </div>
      ) : error ? (
        <div className="my-quizzes-message error">
          <p>{error}</p>

          <button type="button" onClick={fetchQuizHistory}>
            Try Again
          </button>
        </div>
      ) : quizzes.length === 0 ? (
        <div className="my-quizzes-message">
          No quizzes are available from your joined sessions yet.
        </div>
      ) : filteredQuizzes.length === 0 ? (
        <div className="my-quizzes-message">
          No quizzes match the selected filter.
        </div>
      ) : (
        <div className="my-quizzes-list">
          {filteredQuizzes.map((quiz) => {
            const canAttempt =
              quiz.quizStatus === "open" &&
              quiz.attemptStatus !== "completed";

            return (
              <article
                className="my-quizzes-card"
                key={quiz.sessionId}
              >
                <div className="my-quizzes-card-top">
                  <div>
                    <span>{quiz.moduleCode}</span>
                    <h2>{quiz.title}</h2>
                    <p>{quiz.subjectName}</p>
                  </div>

                  <div className="my-quizzes-badges">
                    <strong className={`quiz ${quiz.quizStatus}`}>
                      {quiz.quizStatus}
                    </strong>

                    <strong
                      className={`attempt ${quiz.attemptStatus}`}
                    >
                      {formatAttemptStatus(quiz.attemptStatus)}
                    </strong>
                  </div>
                </div>

                <div className="my-quizzes-details-grid">
                  <div>
                    <span>Lecturer</span>
                    <strong>{quiz.lecturerName}</strong>
                  </div>

                  <div>
                    <span>Questions</span>
                    <strong>{quiz.totalQuestions}</strong>
                  </div>

                  <div>
                    <span>Attempted</span>
                    <strong>
                      {quiz.attemptedQuestions}/{quiz.totalQuestions}
                    </strong>
                  </div>

                  <div>
                    <span>Correct</span>
                    <strong>{quiz.correctAnswers}</strong>
                  </div>

                  <div>
                    <span>Score</span>
                    <strong>
                      {quiz.scorePercentage === null
                        ? "Not attempted"
                        : `${quiz.scorePercentage}%`}
                    </strong>
                  </div>

                  <div>
                    <span>
                      {quiz.submittedAt ? "Submitted" : "Opened"}
                    </span>
                    <strong>
                      {formatDate(quiz.submittedAt || quiz.openedAt)}
                    </strong>
                  </div>
                </div>

                <div className="my-quizzes-card-footer">
                  <p>
                    {quiz.quizStatus === "closed" &&
                    quiz.attemptStatus === "not_attempted"
                      ? "The poll ended without an attempt. You can review the correct answers."
                      : canAttempt
                        ? "This quiz is open and can still be attempted."
                        : "Your recorded answers are available for review."}
                  </p>

                  <button
                    type="button"
                    onClick={() => onOpenQuiz?.(quiz)}
                  >
                    {canAttempt ? "Attempt Quiz" : "Review Poll"}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

export default MyQuizzes;