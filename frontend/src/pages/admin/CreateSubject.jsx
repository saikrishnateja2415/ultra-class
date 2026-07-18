import { useState } from "react";
import axios from "axios";
import "./CreateSubject.css";

const API_URL = "http://localhost:5000";

const initialFormData = {
  subjectName: "",
  subjectCode: "",
  department: "",
  credits: "",
  semester: "",
  academicYear: "",
  description: "",
  status: "active",
};

function CreateSubject() {
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
    const pattern = /^\d{4}-\d{4}$/;

    if (!pattern.test(academicYear)) {
      return false;
    }

    const [startYear, endYear] = academicYear
      .split("-")
      .map(Number);

    return endYear === startYear + 1;
  };

  const validateForm = () => {
    if (
      !formData.subjectName.trim() ||
      !formData.subjectCode.trim() ||
      !formData.department.trim() ||
      !formData.credits ||
      !formData.semester ||
      !formData.academicYear.trim()
    ) {
      setMessage("Please complete all required fields.");
      setMessageType("error");
      return false;
    }

    const credits = Number(formData.credits);
    const semester = Number(formData.semester);

    if (!Number.isInteger(credits) || credits < 1 || credits > 60) {
      setMessage("Credits must be a whole number between 1 and 60.");
      setMessageType("error");
      return false;
    }

    if (
      !Number.isInteger(semester) ||
      semester < 1 ||
      semester > 12
    ) {
      setMessage("Semester must be a whole number between 1 and 12.");
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
      setMessage("Description cannot exceed 1000 characters.");
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

    const subjectData = {
      subjectName: formData.subjectName.trim(),
      subjectCode: formData.subjectCode.trim().toUpperCase(),
      department: formData.department.trim(),
      credits: Number(formData.credits),
      semester: Number(formData.semester),
      academicYear: formData.academicYear.trim(),
      description: formData.description.trim(),
      status: formData.status,
    };

    try {
      const response = await axios.post(
        `${API_URL}/api/subjects`,
        subjectData
      );

      setMessage(
        response.data?.message || "Subject created successfully."
      );

      setMessageType("success");
      setFormData(initialFormData);
    } catch (error) {
      console.error("Create subject error:", error);

      if (!error.response) {
        setMessage(
          "Cannot connect to the backend server. Make sure it is running on port 5000."
        );
      } else {
        setMessage(
          error.response.data?.message ||
            "Unable to create the subject. Please try again."
        );
      }

      setMessageType("error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="create-subject-page">
      <section className="create-subject-heading">
        <p className="subject-page-label">Subject Management</p>

        <h2>Create Subject</h2>

        <p>
          Create a reusable academic subject before connecting it to
          courses, students, and lecturers.
        </p>
      </section>

      <form className="create-subject-card" onSubmit={handleSubmit}>
        {message && (
          <div
            className={`subject-form-message ${messageType}`}
            role="alert"
          >
            {message}
          </div>
        )}

        <section className="subject-form-section">
          <div className="subject-section-heading">
            <h3>Subject Information</h3>

            <p>Enter the main academic details for the subject.</p>
          </div>

          <div className="subject-form-grid">
            <div className="subject-form-group">
              <label htmlFor="subjectName">
                Subject Name <span>*</span>
              </label>

              <input
                id="subjectName"
                type="text"
                name="subjectName"
                value={formData.subjectName}
                onChange={handleChange}
                placeholder="Example: Artificial Intelligence"
                maxLength={150}
                disabled={loading}
              />
            </div>

            <div className="subject-form-group">
              <label htmlFor="subjectCode">
                Subject Code <span>*</span>
              </label>

              <input
                id="subjectCode"
                type="text"
                name="subjectCode"
                value={formData.subjectCode}
                onChange={handleChange}
                placeholder="Example: CS501"
                maxLength={30}
                disabled={loading}
              />
            </div>

            <div className="subject-form-group">
              <label htmlFor="department">
                Department <span>*</span>
              </label>

              <input
                id="department"
                type="text"
                name="department"
                value={formData.department}
                onChange={handleChange}
                placeholder="Example: Computer Science"
                maxLength={150}
                disabled={loading}
              />
            </div>

            <div className="subject-form-group">
              <label htmlFor="credits">
                Credits <span>*</span>
              </label>

              <input
                id="credits"
                type="number"
                name="credits"
                value={formData.credits}
                onChange={handleChange}
                placeholder="Example: 20"
                min="1"
                max="60"
                step="1"
                disabled={loading}
              />
            </div>

            <div className="subject-form-group">
              <label htmlFor="semester">
                Semester <span>*</span>
              </label>

              <select
                id="semester"
                name="semester"
                value={formData.semester}
                onChange={handleChange}
                disabled={loading}
              >
                <option value="">Select semester</option>

                {Array.from({ length: 12 }, (_, index) => {
                  const semesterNumber = index + 1;

                  return (
                    <option
                      key={semesterNumber}
                      value={semesterNumber}
                    >
                      Semester {semesterNumber}
                    </option>
                  );
                })}
              </select>
            </div>

            <div className="subject-form-group">
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

            <div className="subject-form-group">
              <label htmlFor="status">Subject Status</label>

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

        <section className="subject-form-section">
          <div className="subject-section-heading">
            <h3>Subject Description</h3>
            <p>Add a brief description of the subject.</p>
          </div>

          <div className="subject-form-group">
            <label htmlFor="description">Description</label>

            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={5}
              maxLength={1000}
              placeholder="Enter the purpose, syllabus focus, or learning outcomes"
              disabled={loading}
            />

            <small>
              {formData.description.length}/1000 characters
            </small>
          </div>
        </section>

        <div className="subject-form-actions">
          <button
            type="button"
            className="subject-clear-button"
            onClick={clearForm}
            disabled={loading}
          >
            Clear
          </button>

          <button
            type="submit"
            className="subject-submit-button"
            disabled={loading}
          >
            {loading ? "Creating Subject..." : "Create Subject"}
          </button>
        </div>
      </form>
    </main>
  );
}

export default CreateSubject;