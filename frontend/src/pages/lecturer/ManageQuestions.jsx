import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  API_URL,
} from "../../config/api";

import axios from "axios";
import { recordEvaluationEvent } from "../../services/evaluationLogger";

import "./ManageQuestions.css";

function ManageQuestions({ session, onBack }) {
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});

  const [activeFilter, setActiveFilter] =
    useState("all");

  const [loadingQuestions, setLoadingQuestions] =
    useState(true);

  const [questionClustering, setQuestionClustering] =
    useState(null);

  const [clusteringMetadata, setClusteringMetadata] =
    useState(null);

  const [loadingClusters, setLoadingClusters] =
    useState(true);

  const [generatingClusters, setGeneratingClusters] =
    useState(false);

  const [clusterError, setClusterError] =
    useState("");

  const [clusterMessage, setClusterMessage] =
    useState("");

  const [expandedClusters, setExpandedClusters] =
    useState({});

  const lecturerId =
    session?.lecturerId?._id ||
    session?.lecturerId;

  const fetchQuestions = useCallback(async () => {
    if (!session?._id) {
      setLoadingQuestions(false);
      return;
    }

    try {
      setLoadingQuestions(true);

      const response = await axios.get(
        `${API_URL}/questions/${session._id}`
      );

      setQuestions(
        response.data.questions || []
      );
    } catch (error) {
      console.error(
        "Load questions error:",
        error
      );

      alert(
        error.response?.data?.message ||
          "Error loading questions"
      );
    } finally {
      setLoadingQuestions(false);
    }
  }, [session?._id]);

  const fetchSavedClusters =
    useCallback(async () => {
      if (!session?._id || !lecturerId) {
        setLoadingClusters(false);
        return;
      }

      try {
        setLoadingClusters(true);
        setClusterError("");

        const response = await axios.get(
          `${API_URL}/ai/sessions/${session._id}/question-clusters`,
          {
            params: {
              lecturerId,
            },
          }
        );

        if (
          response.data.generated &&
          response.data.clustering
        ) {
          setQuestionClustering(
            response.data.clustering
          );

          setClusteringMetadata(
            response.data.metadata || null
          );
        } else {
          setQuestionClustering(null);
          setClusteringMetadata(null);
        }
      } catch (error) {
        console.error(
          "Load saved clusters error:",
          error
        );

        setClusterError(
          error.response?.data?.message ||
            "Unable to load saved question clusters"
        );
      } finally {
        setLoadingClusters(false);
      }
    }, [session?._id, lecturerId]);

  useEffect(() => {
    fetchQuestions();
    fetchSavedClusters();
  }, [fetchQuestions, fetchSavedClusters]);

  const generateQuestionClusters = async (
    forceRegenerate = false
  ) => {
    if (!session?._id || !lecturerId) {
      setClusterError(
        "Lecturer or session information is unavailable"
      );

      return;
    }

    if (questions.length < 2) {
      setClusterError(
        "At least two questions are required for meaningful AI clustering"
      );

      return;
    }

    try {
      setGeneratingClusters(true);
      setClusterError("");
      setClusterMessage("");

      const response = await axios.post(
        `${API_URL}/ai/sessions/${session._id}/question-clusters`,
        {
          lecturerId,
          forceRegenerate,
        }
      );

      setQuestionClustering(
        response.data.clustering
      );

      setClusteringMetadata(
        response.data.metadata || null
      );

      setExpandedClusters({});

      if (!response.data.cached) {
        recordEvaluationEvent({
          actorId: lecturerId,
          eventType: "ai_analysis_generated",
          sessionId: session._id,

          metrics: {
            questionCount: questions.length,
            success: true,
          },
        });
      }

      setClusterMessage(
        response.data.cached
          ? "Saved AI clusters loaded because the questions have not changed."
          : "Questions analysed and clustered successfully."
      );
    } catch (error) {
      console.error(
        "Generate question clusters error:",
        error
      );

      setClusterError(
        error.response?.data?.message ||
          error.response?.data?.error ||
          "Unable to analyse questions"
      );
    } finally {
      setGeneratingClusters(false);
    }
  };

  const markAnswered = async (id) => {
    try {
      await axios.put(
        `${API_URL}/questions/${id}/answer`
      );

      await fetchQuestions();
    } catch (error) {
      console.error(
        "Mark answered error:",
        error
      );

      alert(
        error.response?.data?.message ||
          "Error marking question as answered"
      );
    }
  };

  const togglePin = async (id) => {
    try {
      await axios.put(
        `${API_URL}/questions/${id}/pin`
      );

      await fetchQuestions();
    } catch (error) {
      console.error(
        "Update pin error:",
        error
      );

      alert(
        error.response?.data?.message ||
          "Error updating pin"
      );
    }
  };

  const deleteQuestion = async (id) => {
    const confirmed = window.confirm(
      "Delete this question?"
    );

    if (!confirmed) {
      return;
    }

    try {
      await axios.delete(
        `${API_URL}/questions/${id}`
      );

      await fetchQuestions();

      /*
        The existing clusters may contain the deleted
        question. Hide them until regenerated.
      */

      setQuestionClustering(null);
      setClusteringMetadata(null);

      setClusterMessage(
        "The question list changed. Run AI analysis again to generate updated clusters."
      );
    } catch (error) {
      console.error(
        "Delete question error:",
        error
      );

      alert(
        error.response?.data?.message ||
          "Error deleting question"
      );
    }
  };

  const submitAnswer = async (id) => {
    if (!answers[id]?.trim()) {
      alert("Please type an answer");
      return;
    }

    try {
      await axios.put(
        `${API_URL}/questions/${id}/respond`,
        {
          answer: answers[id].trim(),
        }
      );

      recordEvaluationEvent({
        actorId: lecturerId,
        eventType: "question_answered",
        sessionId: session._id,

        metrics: {
          answeredCount: 1,
          success: true,
        },
      });

      setAnswers((currentAnswers) => ({
        ...currentAnswers,
        [id]: "",
      }));

      await fetchQuestions();

      alert("Answer submitted successfully");
    } catch (error) {
      console.error(
        "Submit answer error:",
        error
      );

      alert(
        error.response?.data?.message ||
          "Error submitting answer"
      );
    }
  };

  const isAnswered = (question) => {
    return (
      question.status === "Answered" ||
      Boolean(question.answer?.trim())
    );
  };

  const totalAsked = questions.length;

  const answeredCount =
    questions.filter(isAnswered).length;

  const pendingCount = questions.filter(
    (question) => !isAnswered(question)
  ).length;

  const pinnedCount = questions.filter(
    (question) => question.pinned
  ).length;

  const filteredQuestions = questions.filter(
    (question) => {
      if (activeFilter === "all") {
        return true;
      }

      if (activeFilter === "pending") {
        return !isAnswered(question);
      }

      if (activeFilter === "answered") {
        return isAnswered(question);
      }

      if (activeFilter === "pinned") {
        return question.pinned;
      }

      return true;
    }
  );

  const toggleCluster = (clusterId) => {
    setExpandedClusters((currentState) => ({
      ...currentState,

      [clusterId]:
        !currentState[clusterId],
    }));
  };

  const formatGeneratedDate = (date) => {
    if (!date) {
      return "Not available";
    }

    return new Date(date).toLocaleString();
  };

  return (
    <section className="questions-page">
      <button
        type="button"
        className="questions-back-btn"
        onClick={onBack}
      >
        ← Back to Session Details
      </button>

      <div className="manage-journey-header">
        <div>
          <span className="manage-session-label">
            Session Question Management
          </span>

          <h1>Manage Questions</h1>

          <p>
            Review student questions, lecturer
            answers and AI-generated topic clusters.
          </p>
        </div>

        <div className="manage-session-details">
          <strong>{session?.title}</strong>

          <span>
            {session?.moduleCode}
            {" • "}
            {session?.sessionCode}
          </span>
        </div>
      </div>

      <div className="questions-stats-grid">
        <div className="questions-stat-card">
          <p>Total Asked</p>
          <h2>{totalAsked}</h2>
        </div>

        <div className="questions-stat-card">
          <p>Answered</p>
          <h2>{answeredCount}</h2>
        </div>

        <div className="questions-stat-card">
          <p>Pending</p>
          <h2>{pendingCount}</h2>
        </div>

        <div className="questions-stat-card">
          <p>Pinned</p>
          <h2>{pinnedCount}</h2>
        </div>
      </div>

      {/* AI QUESTION CLUSTERING */}

      <section className="ai-clustering-section">
        <div className="ai-clustering-header">
          <div>
            <span className="ai-feature-label">
              AI Feature 1
            </span>

            <h2>
              Intelligent Question Clustering
            </h2>

            <p>
              Group semantically similar anonymous
              questions into clear teaching topics.
            </p>
          </div>

          <div className="ai-clustering-actions">
            {!questionClustering ? (
              <button
                type="button"
                className="analyse-questions-btn"
                disabled={
                  generatingClusters ||
                  loadingClusters ||
                  questions.length < 2
                }
                onClick={() =>
                  generateQuestionClusters(false)
                }
              >
                {generatingClusters
                  ? "Analysing Questions..."
                  : "Analyse Questions with AI"}
              </button>
            ) : (
              <button
                type="button"
                className="regenerate-clusters-btn"
                disabled={generatingClusters}
                onClick={() =>
                  generateQuestionClusters(true)
                }
              >
                {generatingClusters
                  ? "Regenerating..."
                  : "Regenerate Clusters"}
              </button>
            )}
          </div>
        </div>

        {loadingClusters && (
          <div className="ai-cluster-loading">
            Loading saved AI analysis...
          </div>
        )}

        {questions.length < 2 &&
          !loadingQuestions && (
            <div className="ai-cluster-information">
              Add at least two questions to this
              session before running AI clustering.
            </div>
          )}

        {clusterError && (
          <div className="ai-cluster-error">
            {clusterError}
          </div>
        )}

        {clusterMessage && (
          <div className="ai-cluster-success">
            {clusterMessage}
          </div>
        )}

        {questionClustering && (
          <>
            <div className="ai-clustering-summary">
              <div>
                <span>Topics Detected</span>

                <strong>
                  {
                    questionClustering.clusters
                      ?.length
                  }
                </strong>
              </div>

              <div>
                <span>Questions Analysed</span>

                <strong>
                  {
                    questionClustering.totalQuestionsAnalysed
                  }
                </strong>
              </div>

              <div>
                <span>AI Model</span>

                <strong className="ai-model-name">
                  {clusteringMetadata?.model ||
                    "Gemini"}
                </strong>
              </div>

              <div>
                <span>Generated</span>

                <strong className="ai-generated-date">
                  {formatGeneratedDate(
                    questionClustering.generatedAt
                  )}
                </strong>
              </div>
            </div>

            <div className="ai-cluster-list">
              {questionClustering.clusters?.map(
                (cluster, clusterIndex) => {
                  const clusterKey =
                    cluster._id ||
                    `${cluster.clusterName}-${clusterIndex}`;

                  const expanded =
                    expandedClusters[clusterKey];

                  return (
                    <article
                      className="ai-cluster-card"
                      key={clusterKey}
                    >
                      <button
                        type="button"
                        className="ai-cluster-card-header"
                        onClick={() =>
                          toggleCluster(clusterKey)
                        }
                      >
                        <div>
                          <div className="ai-cluster-title-row">
                            <h3>
                              {cluster.clusterName}
                            </h3>

                            <span
                              className={`cluster-priority cluster-priority-${cluster.priority?.toLowerCase()}`}
                            >
                              {cluster.priority}
                            </span>
                          </div>

                          <p>
                            {cluster.description}
                          </p>
                        </div>

                        <div className="cluster-header-right">
                          <span className="cluster-question-count">
                            {cluster.questionCount}{" "}
                            {cluster.questionCount === 1
                              ? "Question"
                              : "Questions"}
                          </span>

                          <span className="cluster-expand-icon">
                            {expanded ? "−" : "+"}
                          </span>
                        </div>
                      </button>

                      {expanded && (
                        <div className="cluster-questions">
                          {cluster.questions?.map(
                            (
                              clusteredQuestion,
                              questionIndex
                            ) => (
                              <div
                                className="cluster-question-item"
                                key={
                                  clusteredQuestion.questionId ||
                                  questionIndex
                                }
                              >
                                <span>
                                  {questionIndex + 1}
                                </span>

                                <p>
                                  {
                                    clusteredQuestion.questionText
                                  }
                                </p>
                              </div>
                            )
                          )}
                        </div>
                      )}
                    </article>
                  );
                }
              )}
            </div>
          </>
        )}
      </section>

      {/* QUESTION FILTERS */}

      <div className="questions-filter-tabs">
        <button
          type="button"
          className={
            activeFilter === "all"
              ? "active"
              : ""
          }
          onClick={() =>
            setActiveFilter("all")
          }
        >
          All
        </button>

        <button
          type="button"
          className={
            activeFilter === "pending"
              ? "active"
              : ""
          }
          onClick={() =>
            setActiveFilter("pending")
          }
        >
          Pending
        </button>

        <button
          type="button"
          className={
            activeFilter === "answered"
              ? "active"
              : ""
          }
          onClick={() =>
            setActiveFilter("answered")
          }
        >
          Answered
        </button>

        <button
          type="button"
          className={
            activeFilter === "pinned"
              ? "active"
              : ""
          }
          onClick={() =>
            setActiveFilter("pinned")
          }
        >
          Pinned
        </button>
      </div>

      <div className="questions-header">
        <div>
          <h2>Session Questions</h2>

          <p>
            {session?.title}
            {" • "}
            {session?.sessionCode}
          </p>
        </div>

        <span className="questions-count">
          {filteredQuestions.length} Questions
        </span>
      </div>

      <div className="questions-list">
        {loadingQuestions ? (
          <p>Loading questions...</p>
        ) : filteredQuestions.length === 0 ? (
          <p>No questions found.</p>
        ) : (
          filteredQuestions.map((item) => (
            <div
              className={`question-item ${
                item.pinned
                  ? "pinned-question"
                  : ""
              }`}
              key={item._id}
            >
              <div className="question-main-content">
                <h3>{item.question}</h3>

                <p>
                  Asked by: {item.displayName}
                </p>

                <span>
                  {isAnswered(item)
                    ? "Answered"
                    : "Pending"}
                </span>

                {item.pinned && (
                  <strong className="pin-label">
                    Pinned
                  </strong>
                )}

                {item.answer?.trim() && (
                  <div className="answer-box">
                    <strong>
                      Lecturer Answer
                    </strong>

                    <p>{item.answer}</p>
                  </div>
                )}

                <textarea
                  className="answer-input"
                  placeholder="Type your answer..."
                  value={
                    answers[item._id] || ""
                  }
                  onChange={(event) =>
                    setAnswers(
                      (currentAnswers) => ({
                        ...currentAnswers,

                        [item._id]:
                          event.target.value,
                      })
                    )
                  }
                />
              </div>

              <div className="question-actions">
                <button
                  type="button"
                  onClick={() =>
                    markAnswered(item._id)
                  }
                >
                  Mark Answered
                </button>

                <button
                  type="button"
                  onClick={() =>
                    togglePin(item._id)
                  }
                >
                  {item.pinned
                    ? "Unpin"
                    : "Pin"}
                </button>

                <button
                  type="button"
                  onClick={() =>
                    submitAnswer(item._id)
                  }
                >
                  Submit Answer
                </button>

                <button
                  type="button"
                  className="question-delete-btn"
                  onClick={() =>
                    deleteQuestion(item._id)
                  }
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

export default ManageQuestions;