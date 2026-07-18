import { useState } from "react";
import axios from "axios";
import "./AddStaff.css";

function AddStaff() {
  const initialForm = {
    name: "",
    email: "",
    password: "",
    staffId: "",
    department: "",
    qualification: "",
    designation: "Lecturer",
    status: "active",
  };

  const [formData, setFormData] = useState(initialForm);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previousData) => ({
      ...previousData,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setMessage("");
    setMessageType("");

    if (
      !formData.name.trim() ||
      !formData.email.trim() ||
      !formData.password ||
      !formData.staffId.trim() ||
      !formData.department.trim()
    ) {
      setMessage("Please complete all required fields.");
      setMessageType("error");
      return;
    }

    try {
      setLoading(true);

      const response = await axios.post(
        "http://localhost:5000/staff",
        formData
      );

      setMessage(
        response.data.message ||
          "Staff member created successfully."
      );

      setMessageType("success");
      setFormData(initialForm);
    } catch (error) {
      setMessage(
        error.response?.data?.message ||
          "Unable to create staff member."
      );

      setMessageType("error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="add-staff-page">
      <section className="add-staff-header">
        <p className="add-staff-page-label">Staff Management</p>

        <h2>Add Staff</h2>

        <p>
          Create a lecturer login account and academic staff
          profile.
        </p>
      </section>

      <form className="add-staff-card" onSubmit={handleSubmit}>
        <section className="add-staff-section-header">
          <h3>Login and Professional Information</h3>

          <p>
            These details will be used to create the staff login
            account and academic profile.
          </p>
        </section>

        <div className="add-staff-form-grid">
          <div className="add-staff-form-group">
            <label htmlFor="name">
              Full Name <span className="add-staff-required">*</span>
            </label>

            <input
              id="name"
              name="name"
              type="text"
              value={formData.name}
              onChange={handleChange}
              placeholder="Enter staff full name"
            />
          </div>

          <div className="add-staff-form-group">
            <label htmlFor="staffId">
              Staff ID <span className="add-staff-required">*</span>
            </label>

            <input
              id="staffId"
              name="staffId"
              type="text"
              value={formData.staffId}
              onChange={handleChange}
              placeholder="Example: STF001"
            />
          </div>

          <div className="add-staff-form-group">
            <label htmlFor="email">
              Email Address <span className="add-staff-required">*</span>
            </label>

            <input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="lecturer@university.ac.uk"
            />
          </div>

          <div className="add-staff-form-group">
            <label htmlFor="password">
              Temporary Password{" "}
              <span className="add-staff-required">*</span>
            </label>

            <input
              id="password"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Enter temporary password"
            />
          </div>

          <div className="add-staff-form-group">
            <label htmlFor="department">
              Department <span className="add-staff-required">*</span>
            </label>

            <input
              id="department"
              name="department"
              type="text"
              value={formData.department}
              onChange={handleChange}
              placeholder="Computer and Information Sciences"
            />
          </div>

          <div className="add-staff-form-group">
            <label htmlFor="qualification">Qualification</label>

            <input
              id="qualification"
              name="qualification"
              type="text"
              value={formData.qualification}
              onChange={handleChange}
              placeholder="Example: PhD Computer Science"
            />
          </div>

          <div className="add-staff-form-group">
            <label htmlFor="designation">Designation</label>

            <select
              id="designation"
              name="designation"
              value={formData.designation}
              onChange={handleChange}
            >
              <option value="Lecturer">Lecturer</option>
              <option value="Senior Lecturer">
                Senior Lecturer
              </option>
              <option value="Professor">Professor</option>
              <option value="Teaching Assistant">
                Teaching Assistant
              </option>
              <option value="Administrator">
                Administrator
              </option>
            </select>
          </div>

          <div className="add-staff-form-group">
            <label htmlFor="status">Status</label>

            <select
              id="status"
              name="status"
              value={formData.status}
              onChange={handleChange}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>

        {message && (
          <div
            className={`add-staff-message ${messageType}`}
          >
            {message}
          </div>
        )}

        <div className="add-staff-actions">
          <button
            className="add-staff-submit-button"
            type="submit"
            disabled={loading}
          >
            {loading ? "Creating Staff..." : "Create Staff"}
          </button>
        </div>
      </form>
    </main>
  );
}

export default AddStaff;