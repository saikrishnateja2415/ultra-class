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

import "./SessionSummary.css";

function SessionSummary({ session, onBack, onEndSession }) {
    const [sessionSummary, setSessionSummary] =
        useState(null);

    const [metadata, setMetadata] =
        useState(null);

    const [loadingSummary, setLoadingSummary] =
        useState(true);

    const [generatingSummary, setGeneratingSummary] =
        useState(false);

    const [savingDraft, setSavingDraft] =
        useState(false);

    const [changingPublishStatus, setChangingPublishStatus] =
        useState(false);

    const [isEditing, setIsEditing] =
        useState(false);

    const [endingSession, setEndingSession] =
        useState(false);

    const [editForm, setEditForm] = useState({
        summary: "",
        keyTopics: "",
        commonDifficulties: "",
        importantExplanations: "",
        revisionPoints: "",
    });

    const [error, setError] = useState("");
    const [message, setMessage] = useState("");

    const lecturerId =
        session?.lecturerId?._id ||
        session?.lecturerId;

    const sessionEnded =
        session?.status === "ended";


    const fetchSavedSummary =
        useCallback(async () => {
            if (!session?._id || !lecturerId) {
                setLoadingSummary(false);
                return;
            }

            try {
                setLoadingSummary(true);
                setError("");

                const response = await axios.get(
                    `${API_URL}/ai/sessions/${session._id}/summary`,
                    {
                        params: {
                            lecturerId,
                        },
                    }
                );

                if (
                    response.data.generated &&
                    response.data.sessionSummary
                ) {
                    setSessionSummary(
                        response.data.sessionSummary
                    );

                    setMetadata(
                        response.data.metadata || null
                    );
                } else {
                    setSessionSummary(null);
                    setMetadata(null);
                }
            } catch (requestError) {
                console.error(
                    "Load saved summary error:",
                    requestError
                );

                setError(
                    requestError.response?.data?.message ||
                    "Unable to load the saved session summary"
                );
            } finally {
                setLoadingSummary(false);
            }
        }, [session?._id, lecturerId]);

    useEffect(() => {
        fetchSavedSummary();
    }, [fetchSavedSummary]);

    const generateSummary = async (
        forceRegenerate = false
    ) => {
        if (!session?._id || !lecturerId) {
            setError(
                "Lecturer or session information is unavailable"
            );

            return;
        }

        if (forceRegenerate) {
            const warning =
                sessionSummary?.isPublished
                    ? "Regenerating will replace and unpublish the current summary. Continue?"
                    : "Regenerate this summary? The current draft will be replaced.";

            if (!window.confirm(warning)) {
                return;
            }
        }

        try {
            setGeneratingSummary(true);
            setError("");
            setMessage("");
            setIsEditing(false);

            const response = await axios.post(
                `${API_URL}/ai/sessions/${session._id}/summary`,
                {
                    lecturerId,
                    forceRegenerate,
                }
            );

            setSessionSummary(
                response.data.sessionSummary
            );

            setMetadata(
                response.data.metadata || null
            );

            if (!response.data.cached) {
                recordEvaluationEvent({
                    actorId: lecturerId,
                    eventType: "ai_analysis_generated",
                    sessionId: session._id,

                    metrics: {
                        success: true,
                    },
                });
            }

            setMessage(
                response.data.cached
                    ? "The saved summary was loaded because the session content has not changed."
                    : "AI session summary generated successfully. Review it carefully before publishing."
            );
        } catch (requestError) {
            console.error(
                "Generate summary error:",
                requestError
            );

            setError(
                requestError.response?.data?.message ||
                requestError.response?.data?.error ||
                "Unable to generate the session summary"
            );
        } finally {
            setGeneratingSummary(false);
        }
    };

    const startEditing = () => {
        if (!sessionSummary) {
            return;
        }

        setEditForm({
            summary:
                sessionSummary.summary || "",

            keyTopics:
                (sessionSummary.keyTopics || []).join(
                    "\n"
                ),

            commonDifficulties:
                (
                    sessionSummary.commonDifficulties || []
                ).join("\n"),

            importantExplanations:
                (
                    sessionSummary.importantExplanations ||
                    []
                ).join("\n"),

            revisionPoints:
                (
                    sessionSummary.revisionPoints || []
                ).join("\n"),
        });

        setError("");
        setMessage("");
        setIsEditing(true);
    };

    const cancelEditing = () => {
        setIsEditing(false);
        setError("");
    };

    const updateEditField = (
        fieldName,
        value
    ) => {
        setEditForm((currentForm) => ({
            ...currentForm,
            [fieldName]: value,
        }));
    };

    const convertLinesToArray = (value) => {
        return value
            .split("\n")
            .map((item) => item.trim())
            .filter(Boolean);
    };

    const saveEditedDraft = async () => {
        if (!editForm.summary.trim()) {
            setError(
                "The session overview cannot be empty"
            );

            return;
        }

        try {
            setSavingDraft(true);
            setError("");
            setMessage("");

            const response = await axios.put(
                `${API_URL}/ai/sessions/${session._id}/summary`,
                {
                    lecturerId,

                    summary:
                        editForm.summary.trim(),

                    keyTopics:
                        convertLinesToArray(
                            editForm.keyTopics
                        ),

                    commonDifficulties:
                        convertLinesToArray(
                            editForm.commonDifficulties
                        ),

                    importantExplanations:
                        convertLinesToArray(
                            editForm.importantExplanations
                        ),

                    revisionPoints:
                        convertLinesToArray(
                            editForm.revisionPoints
                        ),
                }
            );

            setSessionSummary(
                response.data.sessionSummary
            );

            setMetadata(
                response.data.metadata || metadata
            );

            setIsEditing(false);

            setMessage(
                "Summary draft saved successfully. Review the corrected content before publishing."
            );
        } catch (requestError) {
            console.error(
                "Save summary draft error:",
                requestError
            );

            setError(
                requestError.response?.data?.message ||
                "Unable to save the summary draft"
            );
        } finally {
            setSavingDraft(false);
        }
    };

    const publishSummary = async () => {
        if (!sessionEnded) {
            setError(
                "End the session before publishing its summary"
            );

            return;
        }

        const confirmed = window.confirm(
            "Publish this reviewed summary to students?"
        );

        if (!confirmed) {
            return;
        }

        try {
            setChangingPublishStatus(true);
            setError("");
            setMessage("");

            const response = await axios.put(
                `${API_URL}/ai/sessions/${session._id}/summary/publish`,
                {
                    lecturerId,
                }
            );

            setSessionSummary(
                response.data.sessionSummary
            );

            recordEvaluationEvent({
                actorId: lecturerId,
                eventType: "ai_summary_published",
                sessionId: session._id,

                metrics: {
                    success: true,
                },
            });

            setMessage(
                "Session summary published successfully."
            );
        } catch (requestError) {
            console.error(
                "Publish summary error:",
                requestError
            );

            setError(
                requestError.response?.data?.message ||
                "Unable to publish the session summary"
            );
        } finally {
            setChangingPublishStatus(false);
        }
    };

    const endSessionFromSummary = async () => {
        if (sessionEnded || endingSession) {
            return;
        }

        const confirmed = window.confirm(
            "End this session? Students will no longer be able to join or submit questions."
        );

        if (!confirmed) {
            return;
        }

        try {
            setEndingSession(true);
            setError("");
            setMessage("");

            await onEndSession(session._id);

            recordEvaluationEvent({
                actorId: lecturerId,
                eventType: "session_ended",
                sessionId: session._id,

                metrics: {
                    success: true,
                },
            });

            setMessage(
                "Session ended successfully. You can now approve and publish the reviewed summary."
            );
        } catch (requestError) {
            console.error(
                "End session from summary error:",
                requestError
            );

            setError(
                requestError.response?.data?.message ||
                "Unable to end the session"
            );
        } finally {
            setEndingSession(false);
        }
    };

    const unpublishSummary = async () => {
        const confirmed = window.confirm(
            "Unpublish this summary? Students will no longer be able to access it."
        );

        if (!confirmed) {
            return;
        }

        try {
            setChangingPublishStatus(true);
            setError("");
            setMessage("");

            const response = await axios.put(
                `${API_URL}/ai/sessions/${session._id}/summary/unpublish`,
                {
                    lecturerId,
                }
            );

            setSessionSummary(
                response.data.sessionSummary
            );

            setMessage(
                "Session summary is now private."
            );
        } catch (requestError) {
            console.error(
                "Unpublish summary error:",
                requestError
            );

            setError(
                requestError.response?.data?.message ||
                "Unable to unpublish the summary"
            );
        } finally {
            setChangingPublishStatus(false);
        }
    };

    const formatDate = (date) => {
        if (!date) {
            return "Not available";
        }

        return new Date(date).toLocaleString();
    };

    const renderListSection = ({
        title,
        description,
        items,
        icon,
        emptyMessage,
        className,
    }) => (
        <section
            className={`summary-content-card ${className}`}
        >
            <div className="summary-card-heading">
                <span>{icon}</span>

                <div>
                    <h2>{title}</h2>
                    <p>{description}</p>
                </div>
            </div>

            {!items || items.length === 0 ? (
                <div className="summary-empty-list">
                    {emptyMessage}
                </div>
            ) : (
                <ul className="summary-point-list">
                    {items.map((item, index) => (
                        <li key={`${title}-${index}`}>
                            <span>{index + 1}</span>
                            <p>{item}</p>
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );

    if (!session) {
        return (
            <section className="session-summary-page">
                <div className="session-summary-empty">
                    <h2>No Session Selected</h2>

                    <button
                        type="button"
                        onClick={onBack}
                    >
                        Back to Sessions
                    </button>
                </div>
            </section>
        );
    }

    return (
        <section className="session-summary-page">
            <button
                type="button"
                className="session-summary-back-btn"
                onClick={onBack}
            >
                ← Back to Session Details
            </button>

            <div className="session-summary-hero">
                <div>
                    <span className="session-summary-label">
                        AI Feature 2
                    </span>

                    <h1>AI Session Summary</h1>

                    <p>
                        Generate, correct, review and publish an
                        AI-assisted classroom summary.
                    </p>
                </div>

                <div className="summary-session-information">
                    <strong>{session.title}</strong>

                    <span>
                        {session.subjectName ||
                            session.subjectId?.subjectName ||
                            "Subject unavailable"}
                    </span>

                    <span>
                        {session.moduleCode}
                        {" • "}
                        {session.sessionCode}
                    </span>

                    <small
                        className={
                            sessionEnded
                                ? "summary-status-ended"
                                : "summary-status-active"
                        }
                    >
                        {session.status}
                    </small>
                </div>
            </div>

            {error && (
                <div className="session-summary-error">
                    {error}
                </div>
            )}

            {message && (
                <div className="session-summary-success">
                    {message}
                </div>
            )}

            {loadingSummary ? (
                <div className="session-summary-loading">
                    Loading saved session summary...
                </div>
            ) : !sessionSummary ? (
                <section className="summary-generation-card">
                    <div className="summary-generation-icon">
                        AI
                    </div>

                    <h2>
                        Generate a Summary for This Session
                    </h2>

                    <p>
                        Gemini will analyse anonymous questions,
                        lecturer answers and previously detected
                        question topics.
                    </p>

                    <div className="summary-generation-notice">
                        <strong>
                            Lecturer review required
                        </strong>

                        <span>
                            The output remains private until it is
                            reviewed and published.
                        </span>
                    </div>

                    <button
                        type="button"
                        className="generate-summary-btn"
                        disabled={generatingSummary}
                        onClick={() =>
                            generateSummary(false)
                        }
                    >
                        {generatingSummary
                            ? "Generating Summary..."
                            : "Generate AI Session Summary"}
                    </button>
                </section>
            ) : (
                <>
                    <div className="summary-review-toolbar">
                        <div>
                            <span
                                className={
                                    sessionSummary.isPublished
                                        ? "summary-published-badge"
                                        : "summary-draft-badge"
                                }
                            >
                                {sessionSummary.isPublished
                                    ? "Published"
                                    : "Private Draft"}
                            </span>

                            <h2>
                                {sessionSummary.isPublished
                                    ? "Published Session Summary"
                                    : "Review Generated Summary"}
                            </h2>

                            <p>
                                Correct any inaccurate AI-generated
                                content before publishing.
                            </p>
                        </div>

                        <div className="summary-toolbar-actions">
                            <button
                                type="button"
                                className="edit-summary-btn"
                                disabled={
                                    isEditing ||
                                    generatingSummary
                                }
                                onClick={startEditing}
                            >
                                Edit Summary
                            </button>

                            <button
                                type="button"
                                className="regenerate-summary-btn"
                                disabled={
                                    isEditing ||
                                    generatingSummary
                                }
                                onClick={() =>
                                    generateSummary(true)
                                }
                            >
                                {generatingSummary
                                    ? "Regenerating..."
                                    : "Regenerate"}
                            </button>
                        </div>
                    </div>

                    <div className="summary-metadata-grid">
                        <div>
                            <span>AI Provider</span>
                            <strong>
                                {metadata?.provider ||
                                    "Google Gemini"}
                            </strong>
                        </div>

                        <div>
                            <span>AI Model</span>
                            <strong>
                                {metadata?.model || "Gemini"}
                            </strong>
                        </div>

                        <div>
                            <span>Generated</span>

                            <strong>
                                {formatDate(
                                    sessionSummary.generatedAt
                                )}
                            </strong>
                        </div>

                        <div>
                            <span>Publishing Status</span>

                            <strong>
                                {sessionSummary.isPublished
                                    ? "Published"
                                    : "Private Draft"}
                            </strong>
                        </div>
                    </div>

                    {isEditing ? (
                        <section className="summary-editor">
                            <div className="summary-editor-heading">
                                <div>
                                    <span>Lecturer Review</span>

                                    <h2>Edit Session Summary</h2>

                                    <p>
                                        Enter one list item per line.
                                    </p>
                                </div>
                            </div>

                            <label>
                                Session Overview
                                <textarea
                                    className="summary-overview-editor"
                                    value={editForm.summary}
                                    onChange={(event) =>
                                        updateEditField(
                                            "summary",
                                            event.target.value
                                        )
                                    }
                                />
                            </label>

                            <div className="summary-editor-grid">
                                <label>
                                    Key Topics
                                    <textarea
                                        value={editForm.keyTopics}
                                        onChange={(event) =>
                                            updateEditField(
                                                "keyTopics",
                                                event.target.value
                                            )
                                        }
                                    />
                                </label>

                                <label>
                                    Common Difficulties
                                    <textarea
                                        value={
                                            editForm.commonDifficulties
                                        }
                                        onChange={(event) =>
                                            updateEditField(
                                                "commonDifficulties",
                                                event.target.value
                                            )
                                        }
                                    />
                                </label>

                                <label>
                                    Important Explanations
                                    <textarea
                                        value={
                                            editForm.importantExplanations
                                        }
                                        onChange={(event) =>
                                            updateEditField(
                                                "importantExplanations",
                                                event.target.value
                                            )
                                        }
                                    />
                                </label>

                                <label>
                                    Revision Points
                                    <textarea
                                        value={
                                            editForm.revisionPoints
                                        }
                                        onChange={(event) =>
                                            updateEditField(
                                                "revisionPoints",
                                                event.target.value
                                            )
                                        }
                                    />
                                </label>
                            </div>

                            <div className="summary-editor-actions">
                                <button
                                    type="button"
                                    className="save-summary-btn"
                                    disabled={savingDraft}
                                    onClick={saveEditedDraft}
                                >
                                    {savingDraft
                                        ? "Saving Draft..."
                                        : "Save Corrected Draft"}
                                </button>

                                <button
                                    type="button"
                                    className="cancel-summary-edit-btn"
                                    disabled={savingDraft}
                                    onClick={cancelEditing}
                                >
                                    Cancel
                                </button>
                            </div>
                        </section>
                    ) : (
                        <>
                            <section className="summary-overview-card">
                                <div className="summary-card-heading">
                                    <span>01</span>

                                    <div>
                                        <h2>Session Overview</h2>

                                        <p>
                                            Reviewed overview of classroom
                                            activity.
                                        </p>
                                    </div>
                                </div>

                                <div className="summary-overview-text">
                                    {sessionSummary.summary}
                                </div>
                            </section>

                            <div className="summary-content-grid">
                                {renderListSection({
                                    title: "Key Topics",
                                    description:
                                        "Main concepts discussed through student questions.",
                                    items:
                                        sessionSummary.keyTopics,
                                    icon: "02",
                                    emptyMessage:
                                        "No key topics identified.",
                                    className:
                                        "summary-topics-card",
                                })}

                                {renderListSection({
                                    title: "Common Difficulties",
                                    description:
                                        "Areas where students indicated uncertainty.",
                                    items:
                                        sessionSummary.commonDifficulties,
                                    icon: "03",
                                    emptyMessage:
                                        "No common difficulties identified.",
                                    className:
                                        "summary-difficulties-card",
                                })}

                                {renderListSection({
                                    title:
                                        "Important Explanations",
                                    description:
                                        "Points supported by lecturer answers.",
                                    items:
                                        sessionSummary.importantExplanations,
                                    icon: "04",
                                    emptyMessage:
                                        "No lecturer explanations available.",
                                    className:
                                        "summary-explanations-card",
                                })}

                                {renderListSection({
                                    title: "Revision Points",
                                    description:
                                        "Suggested areas for student revision.",
                                    items:
                                        sessionSummary.revisionPoints,
                                    icon: "05",
                                    emptyMessage:
                                        "No revision points generated.",
                                    className:
                                        "summary-revision-card",
                                })}
                            </div>

                            <section className="summary-publishing-panel">
                                <div>
                                    <span>
                                        Lecturer Approval
                                    </span>

                                    <h2>
                                        {sessionSummary.isPublished
                                            ? "Summary Available to Students"
                                            : "Publish Reviewed Summary"}
                                    </h2>

                                    <p>
                                        {sessionSummary.isPublished
                                            ? `Published ${formatDate(
                                                sessionSummary.publishedAt
                                            )}`
                                            : sessionEnded
                                                ? "Publish after confirming that all generated content is accurate."
                                                : "End this session before publishing the summary."}
                                    </p>
                                </div>

                                {sessionSummary.isPublished ? (
                                    <button
                                        type="button"
                                        className="unpublish-summary-btn"
                                        disabled={changingPublishStatus}
                                        onClick={unpublishSummary}
                                    >
                                        {changingPublishStatus
                                            ? "Unpublishing..."
                                            : "Unpublish Summary"}
                                    </button>
                                ) : !sessionEnded ? (
                                    <button
                                        type="button"
                                        className="end-session-summary-btn"
                                        disabled={endingSession}
                                        onClick={endSessionFromSummary}
                                    >
                                        {endingSession
                                            ? "Ending Session..."
                                            : "End Session"}
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        className="publish-summary-btn"
                                        disabled={changingPublishStatus}
                                        onClick={publishSummary}
                                    >
                                        {changingPublishStatus
                                            ? "Publishing..."
                                            : "Approve and Publish"}
                                    </button>
                                )}
                            </section>
                        </>
                    )}
                </>
            )}
        </section>
    );
}

export default SessionSummary;