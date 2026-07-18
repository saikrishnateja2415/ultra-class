import { useState } from "react";
import axios from "axios";
import "./CreateCourse.css";

const API_URL = "http://localhost:5000";

const initialFormData = {
  courseName: "",
  courseCode: "",
  department: "",
  qualificationLevel: "",
  duration: "",
  academicYear: "",
  description: "",
  status: "active",
};

function CreateCourse() {
  const [formData, setFormData] = useState(initialFormData);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previousData) => ({
      ...previousData,
      [name]: value,
    }));

    setMessage("");
    setMessageType("");
  };

  const validateAcademicYear = (academicYear) => {
    const academicYearPattern = /^\d{4}-\d{4}$/;

    if (!academicYearPattern.test(academicYear)) {
      return false;
    }

    const [startYear, endYear] = academicYear
      .split("-")
      .map(Number);

    return endYear === startYear + 1;
  };

  const validateForm = () => {
    if (
      !formData.courseName.trim() ||
      !formData.courseCode.trim() ||
      !formData.department.trim() ||
      !formData.qualificationLevel ||
      !formData.duration ||
      !formData.academicYear.trim()
    ) {
      setMessage("Please complete all required fields.");
      setMessageType("error");
      return false;
    }

    if (!validateAcademicYear(formData.academicYear.trim())) {
      setMessage(
        "Enter the academic year in a valid format, for example 2026-2027."
      );
      setMessageType("error");
      return false;
    }

    if (formData.description.length > 1000) {
      setMessage(
        "Course description cannot exceed 1000 characters."
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

    setLoading(true);
    setMessage("");
    setMessageType("");

    const courseData = {
      courseName: formData.courseName.trim(),
      courseCode: formData.courseCode.trim().toUpperCase(),
      department: formData.department.trim(),
      qualificationLevel: formData.qualificationLevel,
      duration: formData.duration,
      academicYear: formData.academicYear.trim(),
      description: formData.description.trim(),
      status: formData.status,
    };

    try {
      const response = await axios.post(
        `${API_URL}/api/courses`,
        courseData
      );

      setMessage(
        response.data?.message || "Course created successfully."
      );
      setMessageType("success");
      setFormData(initialFormData);
    } catch (error) {
      console.error("Create course error:", error);

      if (!error.response) {
        setMessage(
          "Cannot connect to the backend server. Make sure it is running on port 5000."
        );
      } else {
        setMessage(
          error.response.data?.message ||
            "Unable to create the course. Please try again."
        );
      }

      setMessageType("error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="create-course-page">
      <section className="create-course-heading">
        <p className="course-page-label">Course Management</p>

        <h2>Create Course</h2>

        <p>
          Add a new academic course before connecting subjects,
          students, and lecturers.
        </p>
      </section>

      <form className="create-course-card" onSubmit={handleSubmit}>
        {message && (
          <div
            className={`course-form-message ${messageType}`}
            role="alert"
          >
            {message}
          </div>
        )}

        <section className="course-form-section">
          <div className="course-section-heading">
            <h3>Course Information</h3>

            <p>
              Enter the main identification details for the course.
            </p>
          </div>

          <div className="course-form-grid">
            <div className="course-form-group">
              <label htmlFor="courseName">
                Course Name <span>*</span>
              </label>

              <input
                id="courseName"
                type="text"
                name="courseName"
                value={formData.courseName}
                onChange={handleChange}
                placeholder="Example: MSc Advanced Computer Science"
                maxLength={150}
                disabled={loading}
              />
            </div>

            <div className="course-form-group">
              <label htmlFor="courseCode">
                Course Code <span>*</span>
              </label>

              <input
                id="courseCode"
                type="text"
                name="courseCode"
                value={formData.courseCode}
                onChange={handleChange}
                placeholder="Example: MSC-ACS"
                maxLength={30}
                disabled={loading}
              />
            </div>

            <div className="course-form-group">
              <label htmlFor="department">
                Department <span>*</span>
              </label>

              <input
                id="department"
                type="text"
                name="department"
                value={formData.department}
                onChange={handleChange}
                placeholder="Example: Computer and Information Sciences"
                maxLength={150}
                disabled={loading}
              />
            </div>

            <div className="course-form-group">
              <label htmlFor="qualificationLevel">
                Qualification Level <span>*</span>
              </label>

              <select
                id="qualificationLevel"
                name="qualificationLevel"
                value={formData.qualificationLevel}
                onChange={handleChange}
                disabled={loading}
              >
                <option value="">Select qualification</option>
                <option value="undergraduate">
                  Undergraduate
                </option>
                <option value="postgraduate">
                  Postgraduate
                </option>
                <option value="masters">Master&apos;s</option>
                <option value="phd">PhD</option>
                <option value="diploma">Diploma</option>
                <option value="certificate">Certificate</option>
              </select>
            </div>

            <div className="course-form-group">
              <label htmlFor="duration">
                Duration <span>*</span>
              </label>

              <select
                id="duration"
                name="duration"
                value={formData.duration}
                onChange={handleChange}
                disabled={loading}
              >
                <option value="">Select duration</option>
                <option value="1-year">1 Year</option>
                <option value="2-years">2 Years</option>
                <option value="3-years">3 Years</option>
                <option value="4-years">4 Years</option>
                <option value="5-years">5 Years</option>
              </select>
            </div>

            <div className="course-form-group">
              <label htmlFor="academicYear">
                Academic Year <span>*</span>
              </label>

              <input
                id="academicYear"
                type="text"
                name="academicYear"
                value={formData.academicYear}
                onChange={handleChange}
                placeholder="Example: 2026-2027"
                maxLength={9}
                disabled={loading}
              />
            </div>

            <div className="course-form-group">
              <label htmlFor="status">Course Status</label>

              <select
                id="status"
                name="status"
                value={formData.status}
                onChange={handleChange}
                disabled={loading}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="draft">Draft</option>
              </select>
            </div>
          </div>
        </section>

        <section className="course-form-section">
          <div className="course-section-heading">
            <h3>Course Description</h3>

            <p>Add a brief description of the course.</p>
          </div>

          <div className="course-form-group">
            <label htmlFor="description">Description</label>

            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={5}
              maxLength={1000}
              placeholder="Enter the purpose, content, or academic focus of the course"
              disabled={loading}
            />

            <small>
              {formData.description.length}/1000 characters
            </small>
          </div>
        </section>

        <div className="course-form-actions">
          <button
            type="button"
            className="course-clear-button"
            onClick={clearForm}
            disabled={loading}
          >
            Clear
          </button>

          <button
            type="submit"
            className="course-submit-button"
            disabled={loading}
          >
            {loading ? "Creating Course..." : "Create Course"}
          </button>
        </div>
      </form>
    </main>
  );
}

export default CreateCourse;