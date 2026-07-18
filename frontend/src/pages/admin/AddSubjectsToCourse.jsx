import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import "./AddSubjectsToCourse.css";

const API_URL = "http://localhost:5000";

function AddSubjectsToCourse() {
  const [courses, setCourses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [selectedSubjectIds, setSelectedSubjectIds] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");

  const selectedCourse = useMemo(
    () =>
      courses.find((course) => course._id === selectedCourseId) ||
      null,
    [courses, selectedCourseId]
  );

  const assignedSubjectIds = useMemo(() => {
    if (!selectedCourse?.subjects) {
      return [];
    }

    return selectedCourse.subjects.map((subject) =>
      typeof subject === "string" ? subject : subject._id
    );
  }, [selectedCourse]);

  const availableSubjects = useMemo(
    () =>
      subjects.filter(
        (subject) => !assignedSubjectIds.includes(subject._id)
      ),
    [subjects, assignedSubjectIds]
  );
  const assignedSubjects = useMemo(() => subjects.filter((subject) => assignedSubjectIds.includes(subject._id)), [subjects, assignedSubjectIds]);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoadingData(true);
    setMessage("");

    try {
      const [coursesResponse, subjectsResponse] = await Promise.all([
        axios.get(`${API_URL}/api/courses`),
        axios.get(`${API_URL}/api/subjects`),
      ]);

      setCourses(coursesResponse.data);
      setSubjects(subjectsResponse.data);
    } catch (error) {
      console.error("Load course assignment data error:", error);

      setMessage(
        "Unable to load courses and subjects. Make sure the backend is running."
      );

      setMessageType("error");
    } finally {
      setLoadingData(false);
    }
  };

  const handleCourseChange = (event) => {
    setSelectedCourseId(event.target.value);
    setSelectedSubjectIds([]);
    setMessage("");
    setMessageType("");
  };

  const handleSubjectToggle = (subjectId) => {
    setSelectedSubjectIds((previousIds) => {
      if (previousIds.includes(subjectId)) {
        return previousIds.filter((id) => id !== subjectId);
      }

      return [...previousIds, subjectId];
    });

    setMessage("");
    setMessageType("");
  };

  const handleSelectAll = () => {
    if (
      selectedSubjectIds.length === availableSubjects.length &&
      availableSubjects.length > 0
    ) {
      setSelectedSubjectIds([]);
      return;
    }

    setSelectedSubjectIds(
      availableSubjects.map((subject) => subject._id)
    );
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!selectedCourseId) {
      setMessage("Please select a course.");
      setMessageType("error");
      return;
    }

    if (selectedSubjectIds.length === 0) {
      setMessage("Please select at least one subject.");
      setMessageType("error");
      return;
    }

    setSaving(true);
    setMessage("");
    setMessageType("");

    try {
      const response = await axios.put(
        `${API_URL}/api/courses/${selectedCourseId}/subjects`,
        {
          subjectIds: selectedSubjectIds,
        }
      );

      setMessage(
        response.data?.message ||
          "Subjects added to the course successfully."
      );

      setMessageType("success");
      setSelectedSubjectIds([]);

      await fetchInitialData();
    } catch (error) {
      console.error("Assign subjects error:", error);

      setMessage(
        error.response?.data?.message ||
          "Unable to add subjects to the course."
      );

      setMessageType("error");
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveSubject = async (subject) => {
    if (!window.confirm(`Remove ${subject.subjectName} from ${selectedCourse.courseName}?`)) return;
    setSaving(true); setMessage("");
    try {
      const response = await axios.delete(`${API_URL}/api/courses/${selectedCourseId}/subjects/${subject._id}`);
      await fetchInitialData();
      setMessage(response.data?.message || "Subject removed successfully."); setMessageType("success");
    } catch (error) {
      setMessage(error.response?.data?.message || "Unable to remove the subject."); setMessageType("error");
    } finally { setSaving(false); }
  };

  return (
    <main className="assign-subjects-page">
      <section className="assign-subjects-heading">
        <p className="assign-subjects-label">
          Course and Subject Management
        </p>

        <h2>Add Subjects to Course</h2>

        <p>
          Select a course and assign one or more available academic
          subjects.
        </p>
      </section>

      <form
        className="assign-subjects-card"
        onSubmit={handleSubmit}
      >
        {message && (
          <div
            className={`assign-subjects-message ${messageType}`}
            role="alert"
          >
            {message}
          </div>
        )}

        <section className="assign-course-section">
          <div className="assign-section-heading">
            <h3>Select Course</h3>
            <p>
              Subjects already assigned to the selected course will
              not appear in the available list.
            </p>
          </div>

          <div className="assign-course-field">
            <label htmlFor="courseId">
              Course <span>*</span>
            </label>

            <select
              id="courseId"
              value={selectedCourseId}
              onChange={handleCourseChange}
              disabled={loadingData || saving}
            >
              <option value="">Select a course</option>

              {courses.map((course) => (
                <option key={course._id} value={course._id}>
                  {course.courseCode} - {course.courseName}
                </option>
              ))}
            </select>
          </div>
        </section>

        {selectedCourse && (
          <section className="selected-course-summary">
            <div>
              <span>Selected Course</span>
              <strong>{selectedCourse.courseName}</strong>
              <p>{selectedCourse.courseCode}</p>
            </div>

            <div>
              <span>Department</span>
              <strong>{selectedCourse.department}</strong>
            </div>

            <div>
              <span>Assigned Subjects</span>
              <strong>{assignedSubjectIds.length}</strong>
            </div>
          </section>
        )}

        {selectedCourse && <section className="assigned-subjects-section">
          <div className="assign-section-heading"><h3>Assigned Subjects</h3><p>Review or remove subjects currently connected to this course.</p></div>
          {assignedSubjects.length === 0 ? <div className="assignment-empty-state">No subjects are assigned to this course.</div> :
            <div className="assigned-subjects-grid">{assignedSubjects.map((subject) => <article className="assigned-subject-card" key={subject._id}>
              <div><strong>{subject.subjectName}</strong><span>{subject.subjectCode} · Semester {subject.semester}</span></div>
              <button type="button" onClick={() => handleRemoveSubject(subject)} disabled={saving}>Remove</button>
            </article>)}</div>}
        </section>}

        <section className="available-subjects-section">
          <div className="available-subjects-header">
            <div>
              <h3>Available Subjects</h3>
              <p>
                Select the subjects that should belong to this
                course.
              </p>
            </div>

            {selectedCourseId && availableSubjects.length > 0 && (
              <button
                type="button"
                className="select-all-subjects-button"
                onClick={handleSelectAll}
                disabled={saving}
              >
                {selectedSubjectIds.length ===
                availableSubjects.length
                  ? "Clear Selection"
                  : "Select All"}
              </button>
            )}
          </div>

          {loadingData && (
            <div className="assignment-empty-state">
              Loading courses and subjects...
            </div>
          )}

          {!loadingData && !selectedCourseId && (
            <div className="assignment-empty-state">
              Select a course to view available subjects.
            </div>
          )}

          {!loadingData &&
            selectedCourseId &&
            availableSubjects.length === 0 && (
              <div className="assignment-empty-state">
                No unassigned subjects are available for this
                course.
              </div>
            )}

          {!loadingData &&
            selectedCourseId &&
            availableSubjects.length > 0 && (
              <div className="available-subjects-grid">
                {availableSubjects.map((subject) => {
                  const selected = selectedSubjectIds.includes(
                    subject._id
                  );

                  return (
                    <label
                      key={subject._id}
                      className={`available-subject-card ${
                        selected ? "selected" : ""
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() =>
                          handleSubjectToggle(subject._id)
                        }
                        disabled={saving}
                      />

                      <div className="available-subject-content">
                        <div className="available-subject-title">
                          <strong>{subject.subjectName}</strong>
                          <span>{subject.subjectCode}</span>
                        </div>

                        <p>{subject.department}</p>

                        <div className="available-subject-meta">
                          <span>{subject.credits} credits</span>
                          <span>
                            Semester {subject.semester}
                          </span>
                          <span>{subject.academicYear}</span>
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
        </section>

        <div className="assign-subjects-actions">
          <span>
            {selectedSubjectIds.length} subject(s) selected
          </span>

          <button
            type="submit"
            className="assign-subjects-submit"
            disabled={
              saving ||
              loadingData ||
              !selectedCourseId ||
              selectedSubjectIds.length === 0
            }
          >
            {saving
              ? "Adding Subjects..."
              : "Add Selected Subjects"}
          </button>
        </div>
      </form>
    </main>
  );
}

export default AddSubjectsToCourse;