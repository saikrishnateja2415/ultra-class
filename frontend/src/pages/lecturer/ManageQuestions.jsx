import { useEffect, useState } from "react";
import axios from "axios";
import "./ManageQuestions.css";

function ManageQuestions({ session, onBack }) {
    const [questions, setQuestions] = useState([]);
    const [answers, setAnswers] = useState({});
    const [activeFilter, setActiveFilter] = useState("all");

    const fetchQuestions = async () => {
        if (!session?._id) return;

        try {
            const res = await axios.get(
                `http://localhost:5000/questions/${session._id}`
            );

            setQuestions(res.data.questions || []);
        } catch (error) {
            console.log(error);
            alert("Error loading questions");
        }
    };

    useEffect(() => {
    const loadQuestions = async () => {
        if (session?._id) {
            await fetchQuestions();
        }
    };

    loadQuestions();
}, [session?._id]);

    const markAnswered = async (id) => {
        try {
            await axios.put(`http://localhost:5000/questions/${id}/answer`);
            fetchQuestions();
        } catch (error) {
            console.log(error);
            alert("Error marking question as answered");
        }
    };

    const togglePin = async (id) => {
        try {
            await axios.put(`http://localhost:5000/questions/${id}/pin`);
            fetchQuestions();
        } catch (error) {
            console.log(error);
            alert("Error updating pin");
        }
    };

    const deleteQuestion = async (id) => {
        if (!window.confirm("Delete this question?")) return;

        try {
            await axios.delete(`http://localhost:5000/questions/${id}`);
            fetchQuestions();
        } catch (error) {
            console.log(error);
            alert("Error deleting question");
        }
    };

    const submitAnswer = async (id) => {
        if (!answers[id] || !answers[id].trim()) {
            alert("Please type an answer");
            return;
        }

        try {
            await axios.put(
                `http://localhost:5000/questions/${id}/respond`,
                {
                    answer: answers[id],
                }
            );

            setAnswers({
                ...answers,
                [id]: "",
            });

            fetchQuestions();
            alert("Answer submitted successfully");
        } catch (error) {
            console.log(error);
            alert("Error submitting answer");
        }
    };

    const totalAsked = questions.length;

    const isAnswered = (q) => {
        return q.status === "Answered" ||
            (q.answer && q.answer.trim() !== "");
    };

    const answeredCount = questions.filter(isAnswered).length;

    const pendingCount = questions.filter(
        (q) => !isAnswered(q)
    ).length;

    const pinnedCount = questions.filter(
        (q) => q.pinned
    ).length;

    const filteredQuestions = questions.filter((q) => {
        if (activeFilter === "all") return true;

        if (activeFilter === "pending") {
            return !isAnswered(q);
        }

        if (activeFilter === "answered") {
            return isAnswered(q);
        }

        if (activeFilter === "pinned") {
            return q.pinned;
        }

        return true;
    });

    return (
        <section className="questions-page">
            <button className="questions-back-btn" onClick={onBack}>
                ← Back to Session Details
            </button>

            <div className="manage-journey-header">
                <h1>Manage Questions</h1>
                <p>Review student questions, lecturer answers, and session progress.</p>
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

            <div className="questions-filter-tabs">
                <button
                    className={activeFilter === "all" ? "active" : ""}
                    onClick={() => setActiveFilter("all")}
                >
                    All
                </button>

                <button
                    className={activeFilter === "pending" ? "active" : ""}
                    onClick={() => setActiveFilter("pending")}
                >
                    Pending
                </button>

                <button
                    className={activeFilter === "answered" ? "active" : ""}
                    onClick={() => setActiveFilter("answered")}
                >
                    Answered
                </button>

                <button
                    className={activeFilter === "pinned" ? "active" : ""}
                    onClick={() => setActiveFilter("pinned")}
                >
                    Pinned
                </button>
            </div>

            <div className="questions-header">
                <div>
                    <h2>Session Questions</h2>
                    <p>
                        {session?.title} • {session?.sessionCode}
                    </p>
                </div>

                <span className="questions-count">
                    {filteredQuestions.length} Questions
                </span>
            </div>

            <div className="questions-list">
                {filteredQuestions.length === 0 ? (
                    <p>No questions found.</p>
                ) : (
                    filteredQuestions.map((item) => (
                        <div
                            className={`question-item ${item.pinned ? "pinned-question" : ""
                                }`}
                            key={item._id}
                        >
                            <div>
                                <h3>{item.question}</h3>

                                <p>Asked by: {item.displayName}</p>

                                <span>
                                    {isAnswered(item) ? "Answered" : "Pending"}
                                </span>

                                {item.answer && item.answer.trim() !== "" && (
                                    <div className="answer-box">
                                        <strong>Lecturer Answer</strong>
                                        <p>{item.answer}</p>
                                    </div>
                                )}

                                <textarea
                                    className="answer-input"
                                    placeholder="Type your answer..."
                                    value={answers[item._id] || ""}
                                    onChange={(e) =>
                                        setAnswers({
                                            ...answers,
                                            [item._id]: e.target.value,
                                        })
                                    }
                                />

                                {item.pinned && (
                                    <strong className="pin-label">Pinned</strong>
                                )}
                            </div>

                            <div className="question-actions">
                                <button onClick={() => markAnswered(item._id)}>
                                    Mark Answered
                                </button>

                                <button onClick={() => togglePin(item._id)}>
                                    {item.pinned ? "Unpin" : "Pin"}
                                </button>

                                <button onClick={() => submitAnswer(item._id)}>
                                    Submit Answer
                                </button>

                                <button
                                    className="question-delete-btn"
                                    onClick={() => deleteQuestion(item._id)}
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