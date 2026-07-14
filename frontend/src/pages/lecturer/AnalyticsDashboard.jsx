import "./AnalyticsDashboard.css";

function AnalyticsDashboard({
  sessions,
  allQuestions,
  totalQuestions,
  answeredQuestions,
  pendingQuestions,
  pinnedQuestions,
  engagementScore,
  answerRate,
  pendingRate,
  mostActiveSession,
  answeredDegree,
  pendingDegree,
}) {
  return (
    <section className="analytics-dashboard-page">
      <div className="analytics-hero">
        <div>
          <h1>Classroom Analytics</h1>
          <p>
            Track engagement, question activity, answer progress, and classroom intelligence.
          </p>
        </div>

        <div className="analytics-score-box">
          <span>Engagement Score</span>
          <strong>{engagementScore}%</strong>
        </div>
      </div>

      <div className="analytics-page-grid">
        <div className="analytics-card">
          <p>Total Questions</p>
          <h3>{totalQuestions}</h3>
        </div>

        <div className="analytics-card">
          <p>Answered Questions</p>
          <h3>{answeredQuestions}</h3>
        </div>

        <div className="analytics-card">
          <p>Pending Questions</p>
          <h3>{pendingQuestions}</h3>
        </div>

        <div className="analytics-card">
          <p>Pinned Questions</p>
          <h3>{pinnedQuestions}</h3>
        </div>
      </div>

      <div className="analytics-progress-section">
        <div className="progress-card">
          <div className="progress-top">
            <h3>Answer Rate</h3>
            <strong>{answerRate}%</strong>
          </div>

          <div className="progress-track">
            <div
              className="progress-fill"
              style={{ width: `${answerRate}%` }}
            ></div>
          </div>
        </div>

        <div className="progress-card">
          <div className="progress-top">
            <h3>Pending Rate</h3>
            <strong>{pendingRate}%</strong>
          </div>

          <div className="progress-track">
            <div
              className="progress-fill pending-fill"
              style={{ width: `${pendingRate}%` }}
            ></div>
          </div>
        </div>
      </div>

      <div className="analytics-insights-grid">
        <div className="insight-card">
          <span>Most Active Session</span>
          <h3>{mostActiveSession?.title || "No data yet"}</h3>
          <p>
            {mostActiveSession
              ? `${mostActiveSession.questionCount} questions asked`
              : "Create sessions to collect activity."}
          </p>
        </div>

        <div className="insight-card">
          <span>Answer Performance</span>
          <h3>{answerRate >= 70 ? "Strong" : "Needs Attention"}</h3>
          <p>{answerRate}% of questions are answered.</p>
        </div>

        <div className="insight-card">
          <span>Pending Load</span>
          <h3>{pendingRate <= 30 ? "Manageable" : "High"}</h3>
          <p>{pendingQuestions} questions still need attention.</p>
        </div>
      </div>

      <div className="analytics-two-column">
        <div className="analytics-panel">
          <h2>Question Status Distribution</h2>

          <div className="donut-chart-wrap">
            <div
              className="donut-chart"
              style={{
                background: `conic-gradient(#2563eb 0deg ${answeredDegree}deg, #f97316 ${answeredDegree}deg ${
                  answeredDegree + pendingDegree
                }deg, #e5e7eb ${answeredDegree + pendingDegree}deg 360deg)`,
              }}
            >
              <div className="donut-center">
                <strong>{totalQuestions}</strong>
                <span>Total</span>
              </div>
            </div>

            <div className="donut-legend">
              <p><span className="legend-blue"></span> Answered: {answeredQuestions}</p>
              <p><span className="legend-orange"></span> Pending: {pendingQuestions}</p>
              <p><span className="legend-gray"></span> Other: 0</p>
            </div>
          </div>

          <h2 className="session-activity-title">Session Activity</h2>

          {sessions.length === 0 ? (
            <p>No session data available.</p>
          ) : (
            sessions.map((session) => {
              const sessionQuestionCount = allQuestions.filter(
                (q) => q.sessionCode === session.sessionCode
              ).length;

              const width =
                totalQuestions === 0
                  ? 0
                  : Math.round((sessionQuestionCount / totalQuestions) * 100);

              return (
                <div className="session-activity-row" key={session._id}>
                  <div>
                    <h4>{session.title}</h4>
                    <p>{session.moduleCode} • {session.sessionCode}</p>
                  </div>

                  <div className="mini-bar-wrap">
                    <span>{sessionQuestionCount} questions</span>
                    <div className="mini-bar">
                      <div
                        className="mini-bar-fill"
                        style={{ width: `${width}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="analytics-panel ai-preview-panel">
          <h2>AI Classroom Intelligence</h2>

          <div className="ai-insight-card">
            <span>Current Insight</span>
            <h3>
              {totalQuestions === 0
                ? "No classroom activity yet"
                : pendingQuestions > answeredQuestions
                ? "Students need more lecturer response support"
                : "Classroom engagement is progressing well"}
            </h3>
            <p>
              This section will later use AI to detect confusing topics, repeated
              questions, engagement drops, and teaching recommendations.
            </p>
          </div>

          <div className="ai-insight-list">
            <p>Coming AI features:</p>
            <ul>
              <li>Question clustering</li>
              <li>Lecture summary</li>
              <li>Teaching recommendations</li>
              <li>Student revision support</li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

export default AnalyticsDashboard;