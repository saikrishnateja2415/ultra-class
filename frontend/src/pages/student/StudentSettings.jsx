import { useCallback, useEffect, useState } from "react";
import axios from "axios";

import "./StudentSettings.css";

import {
  API_URL,
} from "../../config/api";


const formatDate = (value) => {
  if (!value) {
    return "Not available";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not available";
  }

  return date.toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

function StudentSettings({ user, logout }) {
  const userId =
    user?.id ||
    user?._id ||
    localStorage.getItem("userId");

  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [profileForm, setProfileForm] = useState({
    qualification: "",
    yearOfStudy: "1",
  });

  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState("");
  const [profileError, setProfileError] = useState("");

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordError, setPasswordError] = useState("");

  /*
    Load student account, course and subject information.
  */

  const loadStudentSettings = useCallback(async () => {
    if (!userId) {
      setLoadError(
        "Student account information is missing. Please log in again."
      );
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setLoadError("");

      const response = await axios.get(
        `${API_URL}/student/settings/${userId}`,
        {
          timeout: 15000,
        }
      );

      const studentData = response.data.student;

      if (!studentData) {
        throw new Error(
          "Student profile was not returned by the server."
        );
      }

      setStudent(studentData);

      setProfileForm({
        qualification: studentData.qualification || "",
        yearOfStudy: String(studentData.yearOfStudy || 1),
      });
    } catch (error) {
      console.log("Load student settings error:", error);

      setLoadError(
        error.response?.data?.message ||
          error.message ||
          "Unable to load student settings."
      );
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadStudentSettings();
  }, [loadStudentSettings]);

  const updateProfileField = (event) => {
    const { name, value } = event.target;

    setProfileForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }));

    setProfileMessage("");
    setProfileError("");
  };

  const saveProfile = async (event) => {
    event.preventDefault();

    const qualification = profileForm.qualification.trim();
    const yearOfStudy = Number(profileForm.yearOfStudy);

    if (qualification.length > 150) {
      setProfileError(
        "Qualification cannot exceed 150 characters."
      );
      return;
    }

    if (
      !Number.isInteger(yearOfStudy) ||
      yearOfStudy < 1 ||
      yearOfStudy > 10
    ) {
      setProfileError(
        "Year of study must be between 1 and 10."
      );
      return;
    }

    try {
      setSavingProfile(true);
      setProfileMessage("");
      setProfileError("");

      const response = await axios.put(
        `${API_URL}/student/settings/${userId}/profile`,
        {
          qualification,
          yearOfStudy,
        },
        {
          timeout: 15000,
        }
      );

      const updatedStudent = response.data.student;

      if (updatedStudent) {
        setStudent(updatedStudent);

        setProfileForm({
          qualification: updatedStudent.qualification || "",
          yearOfStudy: String(updatedStudent.yearOfStudy || 1),
        });
      }

      setProfileMessage(
        response.data.message ||
          "Student profile updated successfully."
      );
    } catch (error) {
      console.log("Update student profile error:", error);

      setProfileError(
        error.response?.data?.message ||
          "Unable to update your student profile."
      );
    } finally {
      setSavingProfile(false);
    }
  };

  const resetProfile = () => {
    if (!student) {
      return;
    }

    setProfileForm({
      qualification: student.qualification || "",
      yearOfStudy: String(student.yearOfStudy || 1),
    });

    setProfileMessage("");
    setProfileError("");
  };

  const updatePasswordField = (event) => {
    const { name, value } = event.target;

    setPasswordForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }));

    setPasswordMessage("");
    setPasswordError("");
  };

  const changePassword = async (event) => {
    event.preventDefault();

    if (!passwordForm.currentPassword) {
      setPasswordError("Enter your current password.");
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      setPasswordError(
        "New password must contain at least 8 characters."
      );
      return;
    }

    if (
      passwordForm.newPassword !==
      passwordForm.confirmPassword
    ) {
      setPasswordError(
        "New password and confirmation do not match."
      );
      return;
    }

    if (
      passwordForm.currentPassword ===
      passwordForm.newPassword
    ) {
      setPasswordError(
        "New password must be different from the current password."
      );
      return;
    }

    try {
      setChangingPassword(true);
      setPasswordMessage("");
      setPasswordError("");

      const response = await axios.put(
        `${API_URL}/student/settings/${userId}/password`,
        passwordForm,
        {
          timeout: 15000,
        }
      );

      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });

      setPasswordMessage(
        response.data.message ||
          "Password changed successfully. Please log in again."
      );

      if (logout) {
        setTimeout(() => {
          logout();
        }, 1800);
      }
    } catch (error) {
      console.log("Change student password error:", error);

      setPasswordError(
        error.response?.data?.message ||
          "Unable to change your password."
      );
    } finally {
      setChangingPassword(false);
    }
  };

  if (loading) {
    return (
      <section className="student-settings-page">
        <div className="student-settings-state">
          Loading student settings...
        </div>
      </section>
    );
  }

  if (loadError) {
    return (
      <section className="student-settings-page">
        <div className="student-settings-state error">
          <p>{loadError}</p>

          <button type="button" onClick={loadStudentSettings}>
            Try Again
          </button>
        </div>
      </section>
    );
  }

  if (!student) {
    return null;
  }

  return (
    <section className="student-settings-page">
      <div className="student-settings-header">
        <div>
          <span>STUDENT ACCOUNT</span>
          <h1>Settings</h1>
          <p>
            Review your academic profile and manage your account
            password securely.
          </p>
        </div>

        <div className="student-settings-status">
          <strong>{student.status}</strong>
          <span>Account status</span>
        </div>
      </div>

      <div className="student-settings-layout">
        <div className="student-settings-main">
          <form
            className="student-settings-card"
            onSubmit={saveProfile}
          >
            <div className="student-settings-card-heading">
              <div>
                <span>ACADEMIC PROFILE</span>
                <h2>Profile Information</h2>
              </div>

              <p>
                Identity and enrolment fields are controlled by the
                administrator.
              </p>
            </div>

            <div className="student-settings-form-grid">
              <label>
                <span>Full Name</span>
                <input type="text" value={student.name} disabled />
              </label>

              <label>
                <span>University Email</span>
                <input type="email" value={student.email} disabled />
              </label>

              <label>
                <span>Student ID</span>
                <input
                  type="text"
                  value={student.studentId}
                  disabled
                />
              </label>

              <label>
                <span>Course</span>
                <input
                  type="text"
                  value={
                    student.course
                      ? `${student.course.courseCode || ""} — ${
                          student.course.courseName || ""
                        }`
                      : "Not assigned"
                  }
                  disabled
                />
              </label>

              <label>
                <span>Qualification</span>
                <input
                  type="text"
                  name="qualification"
                  value={profileForm.qualification}
                  onChange={updateProfileField}
                  placeholder="Enter your qualification"
                  maxLength={150}
                  disabled={savingProfile}
                />
              </label>

              <label>
                <span>Year of Study</span>
                <select
                  name="yearOfStudy"
                  value={profileForm.yearOfStudy}
                  onChange={updateProfileField}
                  disabled={savingProfile}
                >
                  {Array.from({ length: 10 }, (_, index) => (
                    <option value={index + 1} key={index + 1}>
                      Year {index + 1}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {profileMessage && (
              <div className="student-settings-feedback success">
                {profileMessage}
              </div>
            )}

            {profileError && (
              <div className="student-settings-feedback error">
                {profileError}
              </div>
            )}

            <div className="student-settings-actions">
              <button
                type="button"
                className="secondary"
                onClick={resetProfile}
                disabled={savingProfile}
              >
                Reset
              </button>

              <button type="submit" disabled={savingProfile}>
                {savingProfile ? "Saving..." : "Save Profile"}
              </button>
            </div>
          </form>

          <form
            className="student-settings-card"
            onSubmit={changePassword}
          >
            <div className="student-settings-card-heading">
              <div>
                <span>ACCOUNT SECURITY</span>
                <h2>Change Password</h2>
              </div>

              <p>
                You will be logged out after a successful password
                change.
              </p>
            </div>

            <div className="student-settings-password-grid">
              <label>
                <span>Current Password</span>
                <input
                  type="password"
                  name="currentPassword"
                  value={passwordForm.currentPassword}
                  onChange={updatePasswordField}
                  autoComplete="current-password"
                  disabled={changingPassword}
                />
              </label>

              <label>
                <span>New Password</span>
                <input
                  type="password"
                  name="newPassword"
                  value={passwordForm.newPassword}
                  onChange={updatePasswordField}
                  autoComplete="new-password"
                  minLength={8}
                  disabled={changingPassword}
                />
              </label>

              <label>
                <span>Confirm New Password</span>
                <input
                  type="password"
                  name="confirmPassword"
                  value={passwordForm.confirmPassword}
                  onChange={updatePasswordField}
                  autoComplete="new-password"
                  minLength={8}
                  disabled={changingPassword}
                />
              </label>
            </div>

            <p className="student-settings-password-help">
              Use at least eight characters and do not reuse your
              current password.
            </p>

            {passwordMessage && (
              <div className="student-settings-feedback success">
                {passwordMessage}
              </div>
            )}

            {passwordError && (
              <div className="student-settings-feedback error">
                {passwordError}
              </div>
            )}

            <div className="student-settings-actions">
              <button type="submit" disabled={changingPassword}>
                {changingPassword
                  ? "Changing Password..."
                  : "Change Password"}
              </button>
            </div>
          </form>
        </div>

        <aside className="student-settings-side">
          <div className="student-settings-card compact">
            <span>REGISTERED SUBJECTS</span>
            <h2>{student.subjects.length}</h2>

            {student.subjects.length === 0 ? (
              <p>No subjects are currently assigned.</p>
            ) : (
              <div className="student-settings-subjects">
                {student.subjects.map((subject) => (
                  <div key={subject._id}>
                    <strong>{subject.subjectName}</strong>
                    <span>{subject.subjectCode}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="student-settings-card compact">
            <span>ACCOUNT INFORMATION</span>

            <div className="student-settings-account-list">
              <div>
                <span>Role</span>
                <strong>{student.role}</strong>
              </div>

              <div>
                <span>Account Created</span>
                <strong>{formatDate(student.accountCreatedAt)}</strong>
              </div>

              <div>
                <span>Profile Updated</span>
                <strong>{formatDate(student.profileUpdatedAt)}</strong>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}

export default StudentSettings;