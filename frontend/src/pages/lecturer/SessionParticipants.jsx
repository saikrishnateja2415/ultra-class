import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  API_URL,
} from "../../config/api";

import axios from "axios";

import "./SessionParticipants.css";

function SessionParticipants({
  session,
  onBack,
}) {
  const [participants, setParticipants] =
    useState([]);

  const [subject, setSubject] =
    useState(null);

  const [
    registeredCount,
    setRegisteredCount,
  ] = useState(0);

  const [joinedCount, setJoinedCount] =
    useState(0);

  const [
    notJoinedCount,
    setNotJoinedCount,
  ] = useState(0);

  const [searchText, setSearchText] =
    useState("");

  const [
    attendanceFilter,
    setAttendanceFilter,
  ] = useState("all");

  const [loading, setLoading] =
    useState(true);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  const fetchParticipants = useCallback(
    async () => {
      if (!session?._id) {
        setParticipants([]);
        setSubject(null);
        setRegisteredCount(0);
        setJoinedCount(0);
        setNotJoinedCount(0);

        setErrorMessage(
          "Session information is unavailable."
        );

        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setErrorMessage("");

        const response = await axios.get(
          `${API_URL}/lecturer/session/${session._id}/participants`
        );

        setParticipants(
          response.data.participants || []
        );

        setSubject(
          response.data.subject || null
        );

        setRegisteredCount(
          response.data.registeredCount || 0
        );

        setJoinedCount(
          response.data.joinedCount || 0
        );

        setNotJoinedCount(
          response.data.notJoinedCount || 0
        );
      } catch (error) {
        console.error(
          "Load session participants error:",
          error
        );

        setParticipants([]);
        setSubject(null);
        setRegisteredCount(0);
        setJoinedCount(0);
        setNotJoinedCount(0);

        setErrorMessage(
          error.response?.data?.message ||
            "Unable to load session participants."
        );
      } finally {
        setLoading(false);
      }
    },
    [session?._id]
  );

  useEffect(() => {
    fetchParticipants();
  }, [fetchParticipants]);

  const filteredParticipants = useMemo(
    () => {
      const searchValue = searchText
        .trim()
        .toLowerCase();

      return participants.filter(
        (student) => {
          const matchesAttendance =
            attendanceFilter === "all" ||
            (attendanceFilter ===
              "joined" &&
              student.joined) ||
            (attendanceFilter ===
              "notJoined" &&
              !student.joined);

          if (!matchesAttendance) {
            return false;
          }

          if (!searchValue) {
            return true;
          }

          const studentId = String(
            student.studentId || ""
          ).toLowerCase();

          const name = String(
            student.name || ""
          ).toLowerCase();

          const email = String(
            student.email || ""
          ).toLowerCase();

          return (
            studentId.includes(
              searchValue
            ) ||
            name.includes(searchValue) ||
            email.includes(searchValue)
          );
        }
      );
    },
    [
      participants,
      searchText,
      attendanceFilter,
    ]
  );

  const formatJoinedTime = (
    joinedAt
  ) => {
    if (!joinedAt) {
      return "—";
    }

    const date = new Date(joinedAt);

    if (Number.isNaN(date.getTime())) {
      return "—";
    }

    return date.toLocaleString(
      "en-GB",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }
    );
  };

  if (loading) {
    return (
      <section className="participants-page">
        <button
          type="button"
          className="participants-back-button"
          onClick={onBack}
        >
          ← Back to Session
        </button>

        <div className="participants-loading">
          <div className="participants-spinner" />

          <p>
            Loading session participants...
          </p>
        </div>
      </section>
    );
  }

  if (errorMessage) {
    return (
      <section className="participants-page">
        <button
          type="button"
          className="participants-back-button"
          onClick={onBack}
        >
          ← Back to Session
        </button>

        <div className="participants-error">
          <h2>
            Unable to Load Participants
          </h2>

          <p>{errorMessage}</p>

          <button
            type="button"
            onClick={fetchParticipants}
          >
            Try Again
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="participants-page">
      <button
        type="button"
        className="participants-back-button"
        onClick={onBack}
      >
        ← Back to Session
      </button>

      <div className="participants-header">
        <div>
          <h2>Session Participants</h2>

          <p>
            Compare registered students with
            students who actually joined this
            session.
          </p>
        </div>

        <button
          type="button"
          className="participants-refresh-button"
          onClick={fetchParticipants}
        >
          Refresh List
        </button>
      </div>

      <div className="participants-session-card">
        <div>
          <span>Session</span>

          <strong>
            {session?.title ||
              "Not available"}
          </strong>
        </div>

        <div>
          <span>Session Code</span>

          <strong>
            {session?.sessionCode ||
              "Not available"}
          </strong>
        </div>

        <div>
          <span>Subject</span>

          <strong>
            {subject
              ? `${subject.subjectCode} - ${subject.subjectName}`
              : "Not available"}
          </strong>
        </div>

        <div>
          <span>Session Status</span>

          <strong>
            {session?.status ||
              "Not available"}
          </strong>
        </div>
      </div>

      <div className="participant-count-grid">
        <button
          type="button"
          className={
            attendanceFilter === "all"
              ? "participant-count-card count-card-active"
              : "participant-count-card"
          }
          onClick={() =>
            setAttendanceFilter("all")
          }
        >
          <span>Registered</span>
          <strong>{registeredCount}</strong>
        </button>

        <button
          type="button"
          className={
            attendanceFilter === "joined"
              ? "participant-count-card joined-count-card count-card-active"
              : "participant-count-card joined-count-card"
          }
          onClick={() =>
            setAttendanceFilter("joined")
          }
        >
          <span>Joined Session</span>
          <strong>{joinedCount}</strong>
        </button>

        <button
          type="button"
          className={
            attendanceFilter ===
            "notJoined"
              ? "participant-count-card not-joined-count-card count-card-active"
              : "participant-count-card not-joined-count-card"
          }
          onClick={() =>
            setAttendanceFilter(
              "notJoined"
            )
          }
        >
          <span>Not Joined</span>
          <strong>{notJoinedCount}</strong>
        </button>
      </div>

      <div className="participants-toolbar">
        <div className="participants-search">
          <label htmlFor="participant-search">
            Search Students
          </label>

          <input
            id="participant-search"
            type="text"
            placeholder="Search by ID, name or email"
            value={searchText}
            onChange={(event) =>
              setSearchText(
                event.target.value
              )
            }
          />
        </div>

        <div className="participants-result-count">
          Showing{" "}
          {filteredParticipants.length}{" "}
          of {participants.length}
        </div>
      </div>

      {participants.length === 0 ? (
        <div className="participants-empty">
          <h3>No Students Assigned</h3>

          <p>
            No active students are currently
            assigned to this subject.
          </p>
        </div>
      ) : filteredParticipants.length ===
        0 ? (
        <div className="participants-empty">
          <h3>No Matching Students</h3>

          <p>
            No student matches the selected
            filter and search.
          </p>
        </div>
      ) : (
        <div className="participants-table-wrapper">
          <table className="participants-table">
            <thead>
              <tr>
                <th>No.</th>
                <th>Student ID</th>
                <th>Student Name</th>
                <th>Email Address</th>
                <th>Year</th>
                <th>Participation</th>
                <th>Joined Time</th>
              </tr>
            </thead>

            <tbody>
              {filteredParticipants.map(
                (student, index) => (
                  <tr
                    key={
                      student._id ||
                      student.studentId
                    }
                  >
                    <td>{index + 1}</td>

                    <td>
                      <strong>
                        {student.studentId ||
                          "—"}
                      </strong>
                    </td>

                    <td>
                      {student.name || "—"}
                    </td>

                    <td>
                      {student.email || "—"}
                    </td>

                    <td>
                      {student.yearOfStudy
                        ? `Year ${student.yearOfStudy}`
                        : "—"}
                    </td>

                    <td>
                      <span
                        className={
                          student.joined
                            ? "participant-joined"
                            : "participant-not-joined"
                        }
                      >
                        {student.joined
                          ? "Joined"
                          : "Not Joined"}
                      </span>
                    </td>

                    <td>
                      {formatJoinedTime(
                        student.joinedAt
                      )}
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
      )}

      <div className="participants-note">
        <strong>Registered:</strong>{" "}
        Students assigned to the subject.{" "}
        <strong>Joined:</strong> Students
        who entered this specific classroom
        session.
      </div>
    </section>
  );
}

export default SessionParticipants;