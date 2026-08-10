import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import axios from "axios";
import { recordEvaluationEvent } from "../../services/evaluationLogger";

import "./StudentMCQ.css";

const API_URL = "http://localhost:5000";

function StudentMCQ({ session, user }) {
  const [polls, setPolls] = useState([]);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [quizVisible, setQuizVisible] = useState(false);

  const quizSectionRef = useRef(null);
  const reviewLoggedRef = useRef(false);

  const studentId = user?.id || user?._id;

  /*
    Load all MCQs currently available to this student.

    The backend verifies that the student joined the session
    and removes correct-answer data until it can be revealed.
  */

  const fetchPolls = useCallback(
    async (showLoader = false) => {
      if (!session?._id || !studentId) {
        setPolls([]);
        setLoading(false);
        return;
      }

      try {
        if (showLoader) {
          setLoading(true);
        }

        const response = await axios.get(
          `${API_URL}/student/${studentId}/sessions/${session._id}/mcq-polls`,
          {
            timeout: 15000,
          }
        );

        const loadedPolls = response.data.polls || [];

        setPolls(loadedPolls);
        setLoadError("");

        /*
          Preserve answers currently selected by the student.
          Previously submitted answers come from the database.
        */

        setSelectedAnswers((currentAnswers) => {
          const updatedAnswers = { ...currentAnswers };
          const availablePollIds = new Set(
            loadedPolls.map((poll) => poll._id)
          );

          Object.keys(updatedAnswers).forEach((pollId) => {
            if (!availablePollIds.has(pollId)) {
              delete updatedAnswers[pollId];
            }
          });

          loadedPolls.forEach((poll) => {
            if (poll.response) {
              updatedAnswers[poll._id] =
                poll.response.selectedOptionIndex;
            }
          });

          return updatedAnswers;
        });
      } catch (error) {
        console.log("Load student MCQ polls error:", error);

        setLoadError(
          error.response?.data?.message ||
            "Unable to load the MCQ poll."
        );
      } finally {
        setLoading(false);
      }
    },
    [session?._id, studentId]
  );

  useEffect(() => {
    setPolls([]);
    setSelectedAnswers({});
    setLoadError("");
    setQuizVisible(false);
    reviewLoggedRef.current = false;

    fetchPolls(true);

    /*
      Poll every five seconds so lecturer-opened questions
      appear without requiring a page refresh.
    */

    const pollInterval = setInterval(() => {
      fetchPolls(false);
    }, 5000);

    return () => {
      clearInterval(pollInterval);
    };
  }, [fetchPolls]);

  /*
    When the compact launcher expands, move the quiz heading
    to the top of the scrollable student content area.
  */

  useEffect(() => {
    if (!quizVisible) {
      return;
    }

    const scrollTimer = setTimeout(() => {
      quizSectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 50);

    return () => {
      clearTimeout(scrollTimer);
    };
  }, [quizVisible]);

  const unansweredPolls = useMemo(() => {
    return polls.filter(
      (poll) => poll.status === "open" && !poll.hasSubmitted
    );
  }, [polls]);

  const selectedUnansweredCount = unansweredPolls.filter((poll) =>
    Number.isInteger(selectedAnswers[poll._id])
  ).length;

  const missingAnswerCount =
    unansweredPolls.length - selectedUnansweredCount;

  const attemptedPollCount = polls.filter(
    (poll) => poll.hasSubmitted
  ).length;

  const revealedAttemptedPolls = polls.filter(
    (poll) => poll.hasSubmitted && poll.resultAvailable
  );

  const correctAnswerCount = revealedAttemptedPolls.filter(
    (poll) => poll.response?.isCorrect
  ).length;

  const completeQuizSubmitted =
    polls.length > 0 && attemptedPollCount === polls.length;

  const completeScoreAvailable =
    completeQuizSubmitted &&
    revealedAttemptedPolls.length === attemptedPollCount;

  const incorrectAnswerCount = completeScoreAvailable
    ? attemptedPollCount - correctAnswerCount
    : 0;

  const scorePercentage = completeScoreAvailable
    ? Math.round((correctAnswerCount / attemptedPollCount) * 100)
    : null;

  const closedNotAttemptedCount = polls.filter(
    (poll) => poll.status === "closed" && !poll.hasSubmitted
  ).length;

  const canAttemptQuiz = unansweredPolls.length > 0;

  const canReviewQuiz =
    polls.length > 0 && !canAttemptQuiz;

  const quizActionLabel = canAttemptQuiz
    ? "Attempt Quiz"
    : canReviewQuiz
      ? "Review Poll"
      : "Quiz Not Available";

  const selectAnswer = (pollId, optionIndex) => {
    setSelectedAnswers((currentAnswers) => ({
      ...currentAnswers,
      [pollId]: optionIndex,
    }));
  };

  /*
    Record one anonymous review event per selected session.
    Repeated Back/Review clicks during the same visit are ignored.
  */

  const openQuiz = () => {
    setQuizVisible(true);

    if (canReviewQuiz && !reviewLoggedRef.current) {
      reviewLoggedRef.current = true;

      recordEvaluationEvent({
        actorId: studentId,
        eventType: "quiz_reviewed",
        sessionId: session._id,

        metrics: {
          questionCount: polls.length,
          answeredCount: attemptedPollCount,
          correctCount: completeScoreAvailable
            ? correctAnswerCount
            : undefined,
          scorePercentage: completeScoreAvailable
            ? scorePercentage
            : undefined,
          success: true,
        },
      });
    }
  };

  /*
    The student sees one final Submit Quiz button.

    Each answer is sent to the secure one-attempt endpoint.
    Promise.allSettled lets the page recover safely if one
    request fails while other answers have already succeeded.
  */

  const submitQuiz = async () => {
    if (unansweredPolls.length === 0) {
      alert("There are no unanswered poll questions.");
      return;
    }

    if (missingAnswerCount > 0) {
      alert(
        `Please answer every question before submitting. ${missingAnswerCount} question${
          missingAnswerCount === 1 ? " is" : "s are"
        } still unanswered.`
      );
      return;
    }

    const confirmed = window.confirm(
      `Submit your final answers for ${unansweredPolls.length} questions? You cannot change them afterwards.`
    );

    if (!confirmed) {
      return;
    }

    try {
      setSubmitting(true);

      const submissionResults = await Promise.allSettled(
        unansweredPolls.map((poll) =>
          axios.post(
            `${API_URL}/student/mcq-polls/${poll._id}/submit`,
            {
              studentId,
              selectedOptionIndex: selectedAnswers[poll._id],
            },
            {
              timeout: 15000,
            }
          )
        )
      );

      const successfulCount = submissionResults.filter(
        (result) => result.status === "fulfilled"
      ).length;

      const successfulResults = submissionResults.filter(
        (result) => result.status === "fulfilled"
      );

      const failedResults = submissionResults.filter(
        (result) => result.status === "rejected"
      );

      await fetchPolls(false);

      if (successfulCount > 0) {
        const everyResultImmediatelyAvailable =
          successfulResults.every(
            (result) => result.value?.data?.response?.resultAvailable
          );

        const immediateCorrectCount = successfulResults.filter(
          (result) => result.value?.data?.response?.isCorrect === true
        ).length;

        recordEvaluationEvent({
          actorId: studentId,
          eventType: "quiz_submitted",
          sessionId: session._id,

          metrics: {
            questionCount: unansweredPolls.length,
            responseCount: successfulCount,
            correctCount: everyResultImmediatelyAvailable
              ? immediateCorrectCount
              : undefined,
            scorePercentage: everyResultImmediatelyAvailable
              ? Math.round(
                  (immediateCorrectCount / successfulCount) * 100
                )
              : undefined,
            success: failedResults.length === 0,
          },
        });
      }

      if (failedResults.length === 0) {
        alert(
          `Quiz submitted successfully. ${successfulCount} answers were recorded.`
        );
      } else {
        const firstError = failedResults[0].reason;

        alert(
          `${successfulCount} answers were recorded, but ${failedResults.length} could not be submitted. ${
            firstError?.response?.data?.message ||
            "Please check the questions and try again."
          }`
        );
      }
    } catch (error) {
      console.log("Submit student MCQ quiz error:", error);

      alert("Unable to submit the quiz. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const getOptionClassName = (poll, optionIndex) => {
    const classNames = ["student-mcq-option"];
    const selectedOptionIndex = selectedAnswers[poll._id];

    if (selectedOptionIndex === optionIndex) {
      classNames.push("selected");
    }

    if (poll.resultAvailable) {
      if (poll.correctOptionIndex === optionIndex) {
        classNames.push("correct");
      } else if (
        selectedOptionIndex === optionIndex &&
        poll.correctOptionIndex !== optionIndex
      ) {
        classNames.push("incorrect");
      }
    }

    return classNames.join(" ");
  };

  if (!session) {
    return null;
  }

  /*
    Keep Current Session simple. Until the student chooses
    an action, display only one quiz launcher button.
  */

  if (!quizVisible) {
    return (
      <section className="student-mcq-launcher">
        <div>
          <span>SESSION QUIZ</span>
          <h2>MCQ Poll</h2>

          {loading ? (
            <p>Checking quiz availability...</p>
          ) : loadError ? (
            <p className="student-mcq-launcher-error">
              {loadError}
            </p>
          ) : canAttemptQuiz ? (
            <p>
              The poll is open. You have {unansweredPolls.length}{" "}
              question{unansweredPolls.length === 1 ? "" : "s"} to
              answer.
            </p>
          ) : canReviewQuiz ? (
            <p>
              The poll is available for review.
              {closedNotAttemptedCount > 0
                ? ` ${closedNotAttemptedCount} question${
                    closedNotAttemptedCount === 1 ? " was" : "s were"
                  } not attempted by you.`
                : " Your submitted answers are locked."}
            </p>
          ) : (
            <p>
              The lecturer has not opened an MCQ poll for this
              session.
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={openQuiz}
          disabled={
            loading ||
            Boolean(loadError) ||
            (!canAttemptQuiz && !canReviewQuiz)
          }
        >
          {loading ? "Checking Quiz..." : quizActionLabel}
        </button>
      </section>
    );
  }

  return (
    <section
      className="student-mcq-section"
      ref={quizSectionRef}
    >
      <button
        type="button"
        className="student-mcq-back-button"
        onClick={() => setQuizVisible(false)}
        disabled={submitting}
      >
        ← Back to Current Session
      </button>

      <div className="student-mcq-heading">
        <div>
          <span>LIVE MCQ POLL</span>
          <h2>Session Quiz</h2>
          <p>
            Answer every available question and submit the complete
            quiz once. Submitted answers cannot be changed.
          </p>
        </div>

        {polls.length > 0 && (
          <div className="student-mcq-progress">
            <strong>
              {attemptedPollCount}/{polls.length}
            </strong>
            <span>attempted</span>
          </div>
        )}
      </div>

      {loading ? (
        <div className="student-mcq-message">
          Loading MCQ poll...
        </div>
      ) : loadError ? (
        <div className="student-mcq-message error">
          <p>{loadError}</p>
          <button type="button" onClick={() => fetchPolls(true)}>
            Try Again
          </button>
        </div>
      ) : polls.length === 0 ? (
        <div className="student-mcq-message">
          The lecturer has not opened an MCQ poll for this session.
        </div>
      ) : (
        <>
          {completeQuizSubmitted && completeScoreAvailable && (
            <section className="student-mcq-score-summary">
              <div className="student-mcq-score-heading">
                <div>
                  <span>QUIZ RESULT</span>
                  <h3>Your Score</h3>
                  <p>
                    Your complete quiz has been submitted and graded.
                  </p>
                </div>

                <strong>{scorePercentage}%</strong>
              </div>

              <div className="student-mcq-score-grid">
                <div className="total">
                  <span>Total Questions</span>
                  <strong>{attemptedPollCount}</strong>
                </div>

                <div className="correct">
                  <span>Correct Answers</span>
                  <strong>{correctAnswerCount}</strong>
                </div>

                <div className="incorrect">
                  <span>Incorrect Answers</span>
                  <strong>{incorrectAnswerCount}</strong>
                </div>

                <div className="percentage">
                  <span>Score Percentage</span>
                  <strong>{scorePercentage}%</strong>
                </div>
              </div>
            </section>
          )}

          {completeQuizSubmitted && !completeScoreAvailable && (
            <section className="student-mcq-score-pending">
              <strong>Quiz submitted successfully</strong>
              <p>
                Your final score will become available after the
                lecturer closes the poll.
              </p>
            </section>
          )}

          <div className="student-mcq-question-list">
            {polls.map((poll, pollIndex) => (
              <article
                className="student-mcq-question-card"
                key={poll._id}
              >
                <div className="student-mcq-question-top">
                  <h3>
                    <span>Question {pollIndex + 1}</span>
                    {poll.question}
                  </h3>

                  <strong
                    className={`student-mcq-status ${poll.status}`}
                  >
                    {poll.hasSubmitted
                      ? "Submitted"
                      : poll.status === "open"
                        ? "Answer Required"
                        : "Not Attempted"}
                  </strong>
                </div>

                <div className="student-mcq-options">
                  {poll.options.map((option, optionIndex) => (
                    <label
                      className={getOptionClassName(
                        poll,
                        optionIndex
                      )}
                      key={`${poll._id}-${optionIndex}`}
                    >
                      <input
                        type="radio"
                        name={`poll-${poll._id}`}
                        checked={
                          selectedAnswers[poll._id] === optionIndex
                        }
                        onChange={() =>
                          selectAnswer(poll._id, optionIndex)
                        }
                        disabled={
                          poll.hasSubmitted ||
                          poll.status !== "open" ||
                          submitting
                        }
                      />

                      <span className="student-mcq-option-letter">
                        {String.fromCharCode(65 + optionIndex)}
                      </span>

                      <span>{option.text}</span>
                    </label>
                  ))}
                </div>

                {poll.hasSubmitted && poll.resultAvailable && (
                  <div
                    className={`student-mcq-result ${
                      poll.response?.isCorrect
                        ? "correct"
                        : "incorrect"
                    }`}
                  >
                    <strong>
                      {poll.response?.isCorrect
                        ? "Correct answer"
                        : "Incorrect answer"}
                    </strong>

                    <p>
                      <b>Correct option:</b>{" "}
                      {String.fromCharCode(
                        65 + poll.correctOptionIndex
                      )}
                      {" — "}
                      {poll.options[poll.correctOptionIndex]?.text}
                    </p>

                    <p>
                      <b>Explanation:</b> {poll.explanation}
                    </p>
                  </div>
                )}

                {poll.hasSubmitted && !poll.resultAvailable && (
                  <div className="student-mcq-result waiting">
                    <strong>Answer submitted</strong>
                    <p>
                      The correct answer and explanation will be
                      available after the lecturer closes this poll.
                    </p>
                  </div>
                )}

                {!poll.hasSubmitted &&
                  poll.status === "closed" &&
                  poll.resultAvailable && (
                    <div className="student-mcq-result not-attempted">
                      <strong>
                        This quiz was not attempted by you
                      </strong>

                      <p>
                        The poll has ended, so you can review the
                        correct answer but cannot submit a response.
                      </p>

                      <p>
                        <b>Correct option:</b>{" "}
                        {String.fromCharCode(
                          65 + poll.correctOptionIndex
                        )}
                        {" — "}
                        {poll.options[poll.correctOptionIndex]?.text}
                      </p>

                      <p>
                        <b>Explanation:</b> {poll.explanation}
                      </p>
                    </div>
                  )}
              </article>
            ))}
          </div>

          {unansweredPolls.length > 0 ? (
            <div className="student-mcq-submit-area">
              <div>
                <strong>
                  {selectedUnansweredCount} of {unansweredPolls.length}{" "}
                  unanswered questions completed
                </strong>

                <p>
                  Review carefully. Your selections are final after
                  submission.
                </p>
              </div>

              <button
                type="button"
                onClick={submitQuiz}
                disabled={submitting || missingAnswerCount > 0}
              >
                {submitting
                  ? "Submitting Quiz..."
                  : "Submit Complete Quiz"}
              </button>
            </div>
          ) : attemptedPollCount === polls.length ? (
            <div className="student-mcq-complete-message">
              All available poll questions have been submitted.
            </div>
          ) : (
            <div className="student-mcq-not-attempted-message">
              The poll has ended. Unanswered questions can only be
              reviewed and can no longer be attempted.
            </div>
          )}
        </>
      )}
    </section>
  );
}

export default StudentMCQ;