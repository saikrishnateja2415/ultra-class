import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import "./AddStudent.css";

const API_URL = "http://localhost:5000";

const initialFormData = {
  name: "",
  email: "",
  password: "",
  studentId: "",
  qualification: "",
  yearOfStudy: "1",
  courseId: "",
  subjectIds: [],
  status: "active",
};

function AddStudent() {
  const [formData, setFormData] = useState(initialFormData);
  const [courses, setCourses] = useState([]);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    setLoadingCourses(true);

    try {
      const response = await axios.get(`${API_URL}/api/courses`);

      setCourses(
        Array.isArray(response.data) ? response.data : []
      );
    } catch (error) {
      console.error("Load courses error:", error);

      setMessage(
        error.response?.data?.message ||
          "Unable to load courses. Make sure the backend is running."
      );

      setMessageType("error");
    } finally {
      setLoadingCourses(false);
    }
  };

  const selectedCourse = useMemo(() => {
    return (
      courses.find(
        (course) => course._id === formData.courseId
      ) || null
    );
  }, [courses, formData.courseId]);

  const availableSubjects = useMemo(() => {
    if (!selectedCourse) {
      return [];
    }

    return Array.isArray(selectedCourse.subjects)
      ? selectedCourse.subjects
      : [];
  }, [selectedCourse]);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previousData) => ({
      ...previousData,
      [name]: value,
    }));

    setMessage("");
    setMessageType("");
  };

  const handleCourseChange = (event) => {
    const courseId = event.target.value;

    setFormData((previousData) => ({
      ...previousData,
      courseId,
      subjectIds: [],
    }));

    setMessage("");
    setMessageType("");
  };

  const handleSubjectToggle = (subjectId) => {
    setFormData((previousData) => {
      const alreadySelected =
        previousData.subjectIds.includes(subjectId);

      return {
        ...previousData,
        subjectIds: alreadySelected
          ? previousData.subjectIds.filter(
              (id) => id !== subjectId
            )
          : [...previousData.subjectIds, subjectId],
      };
    });

    setMessage("");
    setMessageType("");
  };

  const handleSelectAllSubjects = () => {
    if (
      availableSubjects.length > 0 &&
      formData.subjectIds.length === availableSubjects.length
    ) {
      setFormData((previousData) => ({
        ...previousData,
        subjectIds: [],
      }));

      return;
    }

    setFormData((previousData) => ({
      ...previousData,
      subjectIds: availableSubjects.map(
        (subject) => subject._id
      ),
    }));
  };

  const validateForm = () => {
    if (
      !formData.name.trim() ||
      !formData.email.trim() ||
      !formData.password ||
      !formData.studentId.trim() ||
      !formData.courseId
    ) {
      setMessage(
        "Name, email, password, student ID, and course are required."
      );

      setMessageType("error");
      return false;
    }

    if (formData.password.length < 6) {
      setMessage(
        "The temporary password must contain at least 6 characters."
      );

      setMessageType("error");
      return false;
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(formData.email.trim())) {
      setMessage("Enter a valid email address.");
      setMessageType("error");
      return false;
    }

    const yearOfStudy = Number(formData.yearOfStudy);

    if (
      !Number.isInteger(yearOfStudy) ||
      yearOfStudy < 1 ||
      yearOfStudy > 10
    ) {
      setMessage(
        "Year of study must be between 1 and 10."
      );

      setMessageType("error");
      return false;
    }

    return true;
  };

  const clearForm = () => {
    setFormData(initialFormData);
    setMessage("");
    setMessageType("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!validateForm()) {
      return;
    }

    setSubmitting(true);
    setMessage("");
    setMessageType("");

    const studentData = {
      name: formData.name.trim(),
      email: formData.email.trim().toLowerCase(),
      password: formData.password,
      studentId: formData.studentId
        .trim()
        .toUpperCase(),
      qualification: formData.qualification.trim(),
      yearOfStudy: Number(formData.yearOfStudy),
      courseId: formData.courseId,
      subjectIds: formData.subjectIds,
      status: formData.status,
    };

    try {
      const response = await axios.post(
        `${API_URL}/api/students`,
        studentData
      );

      setMessage(
        response.data?.message ||
          "Student created successfully."
      );

      setMessageType("success");
      setFormData(initialFormData);
    } catch (error) {
      console.error("Create student error:", error);

      if (!error.response) {
        setMessage(
          "Cannot connect to the backend server. Make sure it is running on port 5000."
        );
      } else {
        setMessage(
          error.response.data?.message ||
            "Unable to create the student."
        );
      }

      setMessageType("error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="add-student-page">
      <section className="add-student-heading">
        <p className="add-student-page-label">
          Student Management
        </p>

        <h2>Add Student</h2>

        <p>
          Create a student login account and connect the student to
          a course and its assigned subjects.
        </p>
      </section>

      <form
        className="add-student-card"
        onSubmit={handleSubmit}
      >
        {message && (
          <div
            className={`add-student-message ${messageType}`}
            role="alert"
          >
            {message}
          </div>
        )}

        <section className="add-student-section">
          <div className="add-student-section-heading">
            <h3>Login and Personal Information</h3>

            <p>
              These details will be used to create the student login
              account.
            </p>
          </div>

          <div className="add-student-form-grid">
            <div className="add-student-form-group">
              <label htmlFor="name">
                Full Name <span>*</span>
              </label>

              <input
                id="name"
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Enter the student name"
                maxLength={150}
                disabled={submitting}
              />
            </div>

            <div className="add-student-form-group">
              <label htmlFor="studentId">
                Student ID <span>*</span>
              </label>

              <input
                id="studentId"
                type="text"
                name="studentId"
                value={formData.studentId}
                onChange={handleChange}
                placeholder="Example: STU2026001"
                maxLength={40}
                disabled={submitting}
              />
            </div>

            <div className="add-student-form-group">
              <label htmlFor="email">
                Email Address <span>*</span>
              </label>

              <input
                id="email"
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="student@example.com"
                maxLength={150}
                disabled={submitting}
              />
            </div>

            <div className="add-student-form-group">
              <label htmlFor="password">
                Temporary Password <span>*</span>
              </label>

              <input
                id="password"
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Minimum 6 characters"
                disabled={submitting}
              />
            </div>

            <div className="add-student-form-group">
              <label htmlFor="qualification">
                Previous Qualification
              </label>

              <input
                id="qualification"
                type="text"
                name="qualification"
                value={formData.qualification}
                onChange={handleChange}
                placeholder="Example: BTech Computer Science"
                maxLength={150}
                disabled={submitting}
              />
            </div>

            <div className="add-student-form-group">
              <label htmlFor="yearOfStudy">
                Year of Study
              </label>

              <select
                id="yearOfStudy"
                name="yearOfStudy"
                value={formData.yearOfStudy}
                onChange={handleChange}
                disabled={submitting}
              >
                {Array.from({ length: 10 }, (_, index) => {
                  const year = index + 1;

                  return (
                    <option key={year} value={year}>
                      Year {year}
                    </option>
                  );
                })}
              </select>
            </div>

            <div className="add-student-form-group">
              <label htmlFor="status">
                Student Status
              </label>

              <select
                id="status"
                name="status"
                value={formData.status}
                onChange={handleChange}
                disabled={submitting}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>
          </div>
        </section>

        <section className="add-student-section">
          <div className="add-student-section-heading">
            <h3>Course Enrolment</h3>

            <p>
              Select the student’s main course. Its assigned subjects
              will then appear below.
            </p>
          </div>

          <div className="add-student-form-group course-selection">
            <label htmlFor="courseId">
              Course <span>*</span>
            </label>

            <select
              id="courseId"
              name="courseId"
              value={formData.courseId}
              onChange={handleCourseChange}
              disabled={loadingCourses || submitting}
            >
              <option value="">
                {loadingCourses
                  ? "Loading courses..."
                  : "Select a course"}
              </option>

              {courses.map((course) => (
                <option key={course._id} value={course._id}>
                  {course.courseCode} - {course.courseName}
                </option>
              ))}
            </select>
          </div>

          {selectedCourse && (
            <div className="selected-student-course">
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
                <span>Academic Year</span>
                <strong>{selectedCourse.academicYear}</strong>
              </div>

              <div>
                <span>Available Subjects</span>
                <strong>{availableSubjects.length}</strong>
              </div>
            </div>
          )}
        </section>

        <section className="add-student-section">
          <div className="student-subjects-header">
            <div>
              <h3>Subject Enrolment</h3>

              <p>
                Select subjects assigned to the selected course.
              </p>
            </div>

            {availableSubjects.length > 0 && (
              <button
                type="button"
                className="student-select-all-button"
                onClick={handleSelectAllSubjects}
                disabled={submitting}
              >
                {formData.subjectIds.length ===
                availableSubjects.length
                  ? "Clear Selection"
                  : "Select All"}
              </button>
            )}
          </div>

          {!formData.courseId && (
            <div className="student-subject-empty-state">
              Select a course to view its subjects.
            </div>
          )}

          {formData.courseId &&
            availableSubjects.length === 0 && (
              <div className="student-subject-empty-state">
                No subjects have been assigned to this course yet.
              </div>
            )}

          {availableSubjects.length > 0 && (
            <div className="student-subject-grid">
              {availableSubjects.map((subject) => {
                const selected =
                  formData.subjectIds.includes(subject._id);

                return (
                  <label
                    key={subject._id}
                    className={`student-subject-card ${
                      selected ? "selected" : ""
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() =>
                        handleSubjectToggle(subject._id)
                      }
                      disabled={submitting}
                    />

                    <div className="student-subject-content">
                      <div className="student-subject-title">
                        <strong>{subject.subjectName}</strong>
                        <span>{subject.subjectCode}</span>
                      </div>

                      <p>{subject.department}</p>

                      <div className="student-subject-meta">
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

        <div className="add-student-actions">
          <div>
            {formData.subjectIds.length} subject(s) selected
          </div>

          <div className="add-student-action-buttons">
            <button
              type="button"
              className="add-student-clear-button"
              onClick={clearForm}
              disabled={submitting}
            >
              Clear
            </button>

            <button
              type="submit"
              className="add-student-submit-button"
              disabled={submitting || loadingCourses}
            >
              {submitting
                ? "Creating Student..."
                : "Create Student"}
            </button>
          </div>
        </div>
      </form>
    </main>
  );
}

export default AddStudent;