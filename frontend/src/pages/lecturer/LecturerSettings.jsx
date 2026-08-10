import {
  useCallback,
  useEffect,
  useState,
} from "react";

import "./LecturerSettings.css";

const API_URL = "http://localhost:5000";

const readResponse = async (response) => {
  const contentType =
    response.headers.get("content-type") || "";

  if (!contentType.includes("application/json")) {
    const responseText = await response.text();

    console.error(
      "Expected JSON but received:",
      responseText
    );

    throw new Error(
      "The server returned an invalid response. Check that the backend is running."
    );
  }

  return response.json();
};

const getAuthenticationHeaders = () => {
  const token =
    localStorage.getItem("authToken");

  return {
    "Content-Type": "application/json",

    ...(token
      ? {
          Authorization: `Bearer ${token}`,
        }
      : {}),
  };
};

function LecturerSettings({ user, logout }) {
  const userId =
    user?._id ||
    user?.id ||
    localStorage.getItem("userId");

  const [lecturer, setLecturer] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [loadError, setLoadError] =
    useState("");

  const [profileForm, setProfileForm] =
    useState({
      name: "",
      email: "",
      qualification: "",
    });

  const [profileMessage, setProfileMessage] =
    useState("");

  const [profileError, setProfileError] =
    useState("");

  const [savingProfile, setSavingProfile] =
    useState(false);

  const [passwordForm, setPasswordForm] =
    useState({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });

  const [passwordMessage, setPasswordMessage] =
    useState("");

  const [passwordError, setPasswordError] =
    useState("");

  const [
    changingPassword,
    setChangingPassword,
  ] = useState(false);

  /*
    Load the logged-in lecturer's profile, subjects
    and courses.
  */

  const loadLecturerSettings = useCallback(
    async () => {
      if (!userId) {
        setLoadError(
          "Lecturer account information is missing. Please log in again."
        );

        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setLoadError("");

        const response = await fetch(
          `${API_URL}/lecturer/settings/${userId}`,
          {
            headers:
              getAuthenticationHeaders(),
          }
        );

        const data =
          await readResponse(response);

        if (!response.ok || !data.success) {
          throw new Error(
            data.message ||
              "Unable to load lecturer settings"
          );
        }

        const lecturerData =
          data.lecturer ||
          data.staff ||
          data.profile;

        if (!lecturerData) {
          throw new Error(
            "Lecturer profile was not returned by the server"
          );
        }

        setLecturer(lecturerData);

        setProfileForm({
          name: lecturerData.name || "",
          email: lecturerData.email || "",
          qualification:
            lecturerData.qualification || "",
        });
      } catch (error) {
        console.error(
          "Load lecturer settings error:",
          error
        );

        setLoadError(
          error.message ||
            "Unable to load lecturer settings"
        );
      } finally {
        setLoading(false);
      }
    },
    [userId]
  );

  useEffect(() => {
    loadLecturerSettings();
  }, [loadLecturerSettings]);

  const handleProfileChange = (event) => {
    const { name, value } = event.target;

    setProfileForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }));

    setProfileMessage("");
    setProfileError("");
  };

  const handleProfileSubmit = async (
    event
  ) => {
    event.preventDefault();

    const name =
      profileForm.name.trim();

    const email = profileForm.email
      .trim()
      .toLowerCase();

    if (!name) {
      setProfileError(
        "Lecturer name is required."
      );
      return;
    }

    if (!email) {
      setProfileError(
        "Email address is required."
      );
      return;
    }

    try {
      setSavingProfile(true);
      setProfileMessage("");
      setProfileError("");

      const response = await fetch(
        `${API_URL}/lecturer/settings/${userId}/profile`,
        {
          method: "PUT",

          headers:
            getAuthenticationHeaders(),

          body: JSON.stringify({
            name,
            email,
            qualification:
              profileForm.qualification.trim(),
          }),
        }
      );

      const data =
        await readResponse(response);

      if (!response.ok || !data.success) {
        throw new Error(
          data.message ||
            "Unable to update lecturer profile"
        );
      }

      const updatedLecturer =
        data.lecturer ||
        data.staff ||
        data.profile;

      if (updatedLecturer) {
        setLecturer(
          (currentLecturer) => ({
            ...currentLecturer,
            ...updatedLecturer,
          })
        );

        setProfileForm({
          name:
            updatedLecturer.name || name,

          email:
            updatedLecturer.email || email,

          qualification:
            updatedLecturer.qualification ||
            profileForm.qualification,
        });
      } else {
        setLecturer(
          (currentLecturer) => ({
            ...currentLecturer,
            name,
            email,
            qualification:
              profileForm.qualification.trim(),
          })
        );
      }

      /*
        Update stored user information so the new name
        remains available after a browser refresh.
      */

      const savedUser =
        localStorage.getItem(
          "ultraClassUser"
        );

      if (savedUser) {
        try {
          const parsedUser =
            JSON.parse(savedUser);

          localStorage.setItem(
            "ultraClassUser",
            JSON.stringify({
              ...parsedUser,
              name,
              email,
            })
          );
        } catch (storageError) {
          console.error(
            "Update saved user error:",
            storageError
          );
        }
      }

      setProfileMessage(
        data.message ||
          "Profile updated successfully."
      );
    } catch (error) {
      console.error(
        "Update lecturer profile error:",
        error
      );

      setProfileError(
        error.message ||
          "Unable to update lecturer profile"
      );
    } finally {
      setSavingProfile(false);
    }
  };

  const resetProfileForm = () => {
    if (!lecturer) {
      return;
    }

    setProfileForm({
      name: lecturer.name || "",
      email: lecturer.email || "",
      qualification:
        lecturer.qualification || "",
    });

    setProfileMessage("");
    setProfileError("");
  };

  const handlePasswordChange = (
    event
  ) => {
    const { name, value } = event.target;

    setPasswordForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }));

    setPasswordMessage("");
    setPasswordError("");
  };

  const handlePasswordSubmit = async (
    event
  ) => {
    event.preventDefault();

    if (!passwordForm.currentPassword) {
      setPasswordError(
        "Enter your current password."
      );
      return;
    }

    if (
      passwordForm.newPassword.length < 8
    ) {
      setPasswordError(
        "The new password must contain at least 8 characters."
      );
      return;
    }

    if (
      passwordForm.newPassword !==
      passwordForm.confirmPassword
    ) {
      setPasswordError(
        "The new password and confirmation do not match."
      );
      return;
    }

    if (
      passwordForm.currentPassword ===
      passwordForm.newPassword
    ) {
      setPasswordError(
        "Your new password must be different from your current password."
      );
      return;
    }

    try {
      setChangingPassword(true);
      setPasswordMessage("");
      setPasswordError("");

      const response = await fetch(
        `${API_URL}/lecturer/settings/${userId}/password`,
        {
          method: "PUT",

          headers:
            getAuthenticationHeaders(),

          body: JSON.stringify(
            passwordForm
          ),
        }
      );

      const data =
        await readResponse(response);

      if (!response.ok || !data.success) {
        throw new Error(
          data.message ||
            "Unable to change your password"
        );
      }

      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });

      setPasswordMessage(
        data.message ||
          "Password changed successfully."
      );

      window.alert(
        "Password changed successfully. Please log in again using your new password."
      );

      if (typeof logout === "function") {
        logout();
      }
    } catch (error) {
      console.error(
        "Change lecturer password error:",
        error
      );

      setPasswordError(
        error.message ||
          "Unable to change your password"
      );
    } finally {
      setChangingPassword(false);
    }
  };

  if (loading) {
    return (
      <section className="lecturer-settings-page">
        <div className="settings-state-card">
          <div className="settings-loader" />

          <h2>Loading Settings</h2>

          <p>
            Retrieving your lecturer profile
            and academic assignments.
          </p>
        </div>
      </section>
    );
  }

  if (loadError) {
    return (
      <section className="lecturer-settings-page">
        <div className="settings-state-card settings-error-state">
          <span className="settings-state-icon">
            !
          </span>

          <h2>
            Unable to Load Settings
          </h2>

          <p>{loadError}</p>

          <button
            type="button"
            onClick={loadLecturerSettings}
          >
            Try Again
          </button>
        </div>
      </section>
    );
  }

  const subjects = Array.isArray(
    lecturer?.subjects
  )
    ? lecturer.subjects
    : [];

  const courses = Array.isArray(
    lecturer?.courses
  )
    ? lecturer.courses
    : [];

  const status =
    lecturer?.status || "Not available";

  return (
    <section className="lecturer-settings-page">
      <div className="settings-hero">
        <div>
          <span className="settings-page-label">
            Lecturer Account
          </span>

          <h1>Profile & Settings</h1>

          <p>
            Review your academic information,
            update your profile and manage
            your password.
          </p>
        </div>

        <div
          className={`settings-status-badge ${
            status.toLowerCase() ===
            "active"
              ? "settings-status-active"
              : "settings-status-inactive"
          }`}
        >
          <span>Account Status</span>
          <strong>{status}</strong>
        </div>
      </div>

      <div className="settings-summary-grid">
        <div className="settings-summary-card">
          <span>Staff ID</span>

          <strong>
            {lecturer?.staffId ||
              "Not available"}
          </strong>
        </div>

        <div className="settings-summary-card">
          <span>Department</span>

          <strong>
            {lecturer?.department ||
              "Not available"}
          </strong>
        </div>

        <div className="settings-summary-card">
          <span>Designation</span>

          <strong>
            {lecturer?.designation ||
              "Not available"}
          </strong>
        </div>

        <div className="settings-summary-card">
          <span>Assigned Subjects</span>

          <strong>
            {subjects.length}
          </strong>
        </div>
      </div>

      <div className="settings-content-grid">
        <div className="settings-panel">
          <div className="settings-panel-heading">
            <div>
              <span>
                Personal Information
              </span>

              <h2>Edit Profile</h2>
            </div>

            <div className="settings-heading-icon">
              P
            </div>
          </div>

          <form
            className="settings-form"
            onSubmit={
              handleProfileSubmit
            }
          >
            <div className="settings-form-group">
              <label htmlFor="lecturer-name">
                Full Name
              </label>

              <input
                id="lecturer-name"
                type="text"
                name="name"
                value={profileForm.name}
                onChange={
                  handleProfileChange
                }
                placeholder="Enter your full name"
                autoComplete="name"
              />
            </div>

            <div className="settings-form-group">
              <label htmlFor="lecturer-email">
                Email Address
              </label>

              <input
                id="lecturer-email"
                type="email"
                name="email"
                value={profileForm.email}
                onChange={
                  handleProfileChange
                }
                placeholder="Enter your email address"
                autoComplete="email"
              />
            </div>

            <div className="settings-form-group">
              <label htmlFor="lecturer-qualification">
                Qualification
              </label>

              <input
                id="lecturer-qualification"
                type="text"
                name="qualification"
                value={
                  profileForm.qualification
                }
                onChange={
                  handleProfileChange
                }
                placeholder="For example: PhD, MSc, MTech"
              />
            </div>

            {profileError && (
              <div className="settings-message settings-message-error">
                {profileError}
              </div>
            )}

            {profileMessage && (
              <div className="settings-message settings-message-success">
                {profileMessage}
              </div>
            )}

            <div className="settings-form-actions">
              <button
                type="button"
                className="settings-secondary-btn"
                onClick={
                  resetProfileForm
                }
                disabled={savingProfile}
              >
                Reset
              </button>

              <button
                type="submit"
                className="settings-primary-btn"
                disabled={savingProfile}
              >
                {savingProfile
                  ? "Saving Profile..."
                  : "Save Changes"}
              </button>
            </div>
          </form>
        </div>

        <div className="settings-panel">
          <div className="settings-panel-heading">
            <div>
              <span>
                Account Security
              </span>

              <h2>Change Password</h2>
            </div>

            <div className="settings-heading-icon">
              S
            </div>
          </div>

          <form
            className="settings-form"
            onSubmit={
              handlePasswordSubmit
            }
          >
            <div className="settings-form-group">
              <label htmlFor="current-password">
                Current Password
              </label>

              <input
                id="current-password"
                type="password"
                name="currentPassword"
                value={
                  passwordForm.currentPassword
                }
                onChange={
                  handlePasswordChange
                }
                placeholder="Enter current password"
                autoComplete="current-password"
              />
            </div>

            <div className="settings-form-group">
              <label htmlFor="new-password">
                New Password
              </label>

              <input
                id="new-password"
                type="password"
                name="newPassword"
                value={
                  passwordForm.newPassword
                }
                onChange={
                  handlePasswordChange
                }
                placeholder="Minimum 8 characters"
                autoComplete="new-password"
              />
            </div>

            <div className="settings-form-group">
              <label htmlFor="confirm-password">
                Confirm New Password
              </label>

              <input
                id="confirm-password"
                type="password"
                name="confirmPassword"
                value={
                  passwordForm.confirmPassword
                }
                onChange={
                  handlePasswordChange
                }
                placeholder="Re-enter new password"
                autoComplete="new-password"
              />
            </div>

            <div className="settings-password-note">
              <strong>
                Password requirements
              </strong>

              <p>
                Use at least 8 characters and
                choose a password different
                from your current password.
              </p>
            </div>

            {passwordError && (
              <div className="settings-message settings-message-error">
                {passwordError}
              </div>
            )}

            {passwordMessage && (
              <div className="settings-message settings-message-success">
                {passwordMessage}
              </div>
            )}

            <div className="settings-form-actions settings-password-action">
              <button
                type="submit"
                className="settings-primary-btn"
                disabled={
                  changingPassword
                }
              >
                {changingPassword
                  ? "Changing Password..."
                  : "Change Password"}
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="settings-academic-grid">
        <div className="settings-panel">
          <div className="settings-panel-heading">
            <div>
              <span>
                Teaching Allocation
              </span>

              <h2>Assigned Subjects</h2>
            </div>

            <div className="settings-count">
              {subjects.length}
            </div>
          </div>

          {subjects.length === 0 ? (
            <div className="settings-empty-list">
              <h3>
                No subjects assigned
              </h3>

              <p>
                Subject assignments are
                managed by the administrator.
              </p>
            </div>
          ) : (
            <div className="settings-assignment-list">
              {subjects.map(
                (subject, index) => (
                  <div
                    className="settings-assignment-item"
                    key={
                      subject._id || index
                    }
                  >
                    <div className="settings-assignment-number">
                      {index + 1}
                    </div>

                    <div>
                      <h3>
                        {subject.subjectName ||
                          subject.name ||
                          "Unnamed subject"}
                      </h3>

                      <p>
                        {subject.subjectCode ||
                          subject.moduleCode ||
                          "Code unavailable"}
                      </p>
                    </div>
                  </div>
                )
              )}
            </div>
          )}
        </div>

        <div className="settings-panel">
          <div className="settings-panel-heading">
            <div>
              <span>
                Academic Allocation
              </span>

              <h2>Assigned Courses</h2>
            </div>

            <div className="settings-count">
              {courses.length}
            </div>
          </div>

          {courses.length === 0 ? (
            <div className="settings-empty-list">
              <h3>
                No courses assigned
              </h3>

              <p>
                Course assignments are
                managed by the administrator.
              </p>
            </div>
          ) : (
            <div className="settings-assignment-list">
              {courses.map(
                (course, index) => (
                  <div
                    className="settings-assignment-item"
                    key={
                      course._id || index
                    }
                  >
                    <div className="settings-assignment-number">
                      {index + 1}
                    </div>

                    <div>
                      <h3>
                        {course.courseName ||
                          course.name ||
                          "Unnamed course"}
                      </h3>

                      <p>
                        {course.courseCode ||
                          course.code ||
                          "Code unavailable"}
                      </p>
                    </div>
                  </div>
                )
              )}
            </div>
          )}
        </div>
      </div>

      <div className="settings-security-warning">
        <div className="settings-warning-icon">
          i
        </div>

        <div>
          <h3>Account Security</h3>

          <p>
            Never share your password or API
            credentials. Password changes
            require your existing password and
            will sign you out after a successful
            update.
          </p>
        </div>
      </div>
    </section>
  );
}

export default LecturerSettings;