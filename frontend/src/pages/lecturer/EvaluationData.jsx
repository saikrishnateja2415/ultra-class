import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";

import {
  API_URL,
} from "../../config/api";

import "./EvaluationData.css";


const EVENT_LABELS = {
  session_created: "Sessions Created",
  session_joined: "Session Joins",
  session_ended: "Sessions Ended",
  question_submitted: "Questions Submitted",
  question_answered: "Questions Answered",
  ai_analysis_generated: "AI Analyses Generated",
  ai_summary_published: "AI Summaries Published",
  quiz_opened: "Quizzes Opened",
  quiz_submitted: "Quizzes Submitted",
  quiz_closed: "Quizzes Closed",
  quiz_reviewed: "Quiz Reviews",
};

function EvaluationData({ user, sessions = [] }) {
  const [sessionCode, setSessionCode] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState("");
  const [error, setError] = useState("");

  const requesterId = user?.id || user?._id;

  const sortedSessions = useMemo(
    () =>
      [...sessions].sort(
        (first, second) =>
          new Date(second.createdAt || 0) -
          new Date(first.createdAt || 0)
      ),
    [sessions]
  );

  const buildParams = useCallback(() => {
    const params = { requesterId };

    if (sessionCode) params.sessionCode = sessionCode;
    if (fromDate) params.from = fromDate;
    if (toDate) params.to = toDate;

    return params;
  }, [requesterId, sessionCode, fromDate, toDate]);

  const loadSummary = useCallback(async () => {
    if (!requesterId) {
      setLoading(false);
      setError("Lecturer account information is unavailable.");
      return;
    }

    if (fromDate && toDate && fromDate > toDate) {
      setLoading(false);
      setError("The From date cannot be later than the To date.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await axios.get(
        `${API_URL}/evaluation/summary`,
        { params: buildParams() }
      );

      setSummary(response.data.summary || null);
    } catch (requestError) {
      console.error("Load evaluation summary error:", requestError);
      setSummary(null);
      setError(
        requestError.response?.data?.message ||
          "Unable to load the anonymous evaluation summary."
      );
    } finally {
      setLoading(false);
    }
  }, [requesterId, fromDate, toDate, buildParams]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  const downloadExport = async (format) => {
    if (fromDate && toDate && fromDate > toDate) {
      setError("The From date cannot be later than the To date.");
      return;
    }

    try {
      setDownloading(format);
      setError("");

      const response = await axios.get(
        `${API_URL}/evaluation/export.${format}`,
        {
          params: buildParams(),
          responseType: "blob",
        }
      );

      const contentType =
        format === "xlsx"
          ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          : "text/csv;charset=utf-8";

      const fileUrl = URL.createObjectURL(
        new Blob([response.data], { type: contentType })
      );

      const downloadLink = document.createElement("a");
      downloadLink.href = fileUrl;
      downloadLink.download = `ultra-class-anonymous-evaluation-${new Date()
        .toISOString()
        .slice(0, 10)}.${format}`;

      document.body.appendChild(downloadLink);
      downloadLink.click();
      downloadLink.remove();
      URL.revokeObjectURL(fileUrl);
    } catch (requestError) {
      console.error("Evaluation export error:", requestError);
      setError(
        requestError.response?.status === 403
          ? "You can export evaluation data only for your own sessions."
          : `Unable to download the ${format.toUpperCase()} export.`
      );
    } finally {
      setDownloading("");
    }
  };

  const resetFilters = () => {
    setSessionCode("");
    setFromDate("");
    setToDate("");
  };

  return (
    <section className="evaluation-data-page">
      <div className="evaluation-data-hero">
        <div>
          <span>RESEARCH DATA</span>
          <h1>Evaluation Data Export</h1>
          <p>
            Review and download pseudonymous feature-usage data from
            your classroom sessions.
          </p>
        </div>

        <div className="evaluation-privacy-badge">
          <strong>Anonymised Export</strong>
          <span>No names, emails or classroom text</span>
        </div>
      </div>

      <section className="evaluation-filter-card">
        <div className="evaluation-filter-field">
          <label htmlFor="evaluation-session">Session</label>
          <select
            id="evaluation-session"
            value={sessionCode}
            onChange={(event) => setSessionCode(event.target.value)}
          >
            <option value="">All My Sessions</option>

            {sortedSessions.map((item) => (
              <option key={item._id} value={item.sessionCode}>
                {item.sessionCode} — {item.moduleCode} — {item.title}
              </option>
            ))}
          </select>
        </div>

        <div className="evaluation-filter-field">
          <label htmlFor="evaluation-from">From</label>
          <input
            id="evaluation-from"
            type="date"
            value={fromDate}
            onChange={(event) => setFromDate(event.target.value)}
          />
        </div>

        <div className="evaluation-filter-field">
          <label htmlFor="evaluation-to">To</label>
          <input
            id="evaluation-to"
            type="date"
            value={toDate}
            onChange={(event) => setToDate(event.target.value)}
          />
        </div>

        <button type="button" onClick={resetFilters}>
          Clear Filters
        </button>
      </section>

      {error && <div className="evaluation-data-error">{error}</div>}

      {loading ? (
        <section className="evaluation-data-loading">
          Loading anonymous evaluation totals...
        </section>
      ) : (
        <>
          <div className="evaluation-summary-grid">
            <article>
              <span>Total Events</span>
              <strong>{summary?.totalEvents || 0}</strong>
            </article>

            <article>
              <span>Anonymous Participants</span>
              <strong>{summary?.anonymousParticipants || 0}</strong>
            </article>

            <article>
              <span>Event Categories Used</span>
              <strong>{summary?.eventCounts?.length || 0}</strong>
            </article>
          </div>

          <section className="evaluation-events-card">
            <div className="evaluation-section-heading">
              <div>
                <h2>Recorded Activities</h2>
                <p>Only aggregate event counts are shown here.</p>
              </div>

              <button type="button" onClick={loadSummary}>
                Refresh
              </button>
            </div>

            {!summary?.eventCounts?.length ? (
              <div className="evaluation-empty-state">
                No evaluation events match the selected filters yet.
              </div>
            ) : (
              <div className="evaluation-event-list">
                {summary.eventCounts.map((item) => (
                  <div key={item.eventType}>
                    <span>
                      {EVENT_LABELS[item.eventType] || item.eventType}
                    </span>
                    <strong>{item.count}</strong>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="evaluation-download-card">
            <div>
              <h2>Download Research Dataset</h2>
              <p>
                The selected filters are applied to both download
                formats. Participant codes are pseudonymous.
              </p>
            </div>

            <div className="evaluation-download-actions">
              <button
                type="button"
                className="evaluation-csv-button"
                onClick={() => downloadExport("csv")}
                disabled={Boolean(downloading)}
              >
                {downloading === "csv" ? "Preparing CSV..." : "Download CSV"}
              </button>

              <button
                type="button"
                className="evaluation-excel-button"
                onClick={() => downloadExport("xlsx")}
                disabled={Boolean(downloading)}
              >
                {downloading === "xlsx"
                  ? "Preparing Excel..."
                  : "Download Excel"}
              </button>
            </div>
          </section>

          <aside className="evaluation-data-notice">
            <strong>Privacy notice</strong>
            <p>
              Exports exclude names, emails, raw account IDs,
              questions, lecturer answers, quiz selections and AI
              content. Store downloaded research files only in the
              approved secure project location.
            </p>
          </aside>
        </>
      )}
    </section>
  );
}

export default EvaluationData;