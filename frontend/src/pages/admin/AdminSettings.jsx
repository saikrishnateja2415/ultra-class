import { useEffect, useState } from "react";
import axios from "axios";
import {
  FiBookOpen,
  FiCheck,
  FiClock,
  FiEye,
  FiEyeOff,
  FiLock,
  FiSave,
  FiSettings,
  FiUser,
} from "react-icons/fi";

import "./AdminSettings.css";

const API_URL = "http://localhost:5000";

const defaultSettings = {
  academicDefaults: {
    academicYear: "2026-2027",
    department: "Computer Science",
    courseStatus: "active",
    subjectStatus: "active",
    semester: 1,
    studentYearOfStudy: 1,
  },

  attendance: {
    challengeDuration: 60,
    tokenExpiryDuration: 60,
    allowManualOverride: true,
    requireLiveCamera: true,
    allowLateAttendance: false,
    lateGracePeriod: 5,
    attendanceThreshold: 75,
  },

  systemPreferences: {
    confirmBeforeDelete: true,
    enableExcelExport: true,
    rowsPerPage: 20,
    displayDensity: "comfortable",
    dateFormat: "DD/MM/YYYY",
  },
};

function AdminSettings({ user }) {
  const [activeSection, setActiveSection] =
    useState("profile");

  const [profile, setProfile] = useState({
    name: user?.name || "",
    email: user?.email || "",
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [settings, setSettings] =
    useState(defaultSettings);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [showCurrentPassword, setShowCurrentPassword] =
    useState(false);

  const [showNewPassword, setShowNewPassword] =
    useState(false);

  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const [message, setMessage] = useState({
    type: "",
    text: "",
  });

  const adminId = user?.id;

  useEffect(() => {
    let active = true;

    const loadSettings = async () => {
      if (!adminId) {
        setMessage({
          type: "error",
          text: "Administrator information is unavailable.",
        });

        setLoading(false);
        return;
      }

      try {
        const response = await axios.get(
          `${API_URL}/api/admin/${adminId}/settings`
        );

        if (!active) return;

        setProfile({
          name: response.data?.profile?.name || "",
          email: response.data?.profile?.email || "",
        });

        setSettings({
          academicDefaults: {
            ...defaultSettings.academicDefaults,
            ...response.data?.settings?.academicDefaults,
          },

          attendance: {
            ...defaultSettings.attendance,
            ...response.data?.settings?.attendance,
          },

          systemPreferences: {
            ...defaultSettings.systemPreferences,
            ...response.data?.settings?.systemPreferences,
          },
        });
      } catch (error) {
        if (!active) return;

        setMessage({
          type: "error",
          text:
            error.response?.data?.message ||
            "Unable to load administrator settings.",
        });
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadSettings();

    return () => {
      active = false;
    };
  }, [adminId]);

  const showMessage = (type, text) => {
    setMessage({ type, text });
  };

  const updateNestedSetting = (
    section,
    field,
    value
  ) => {
    setSettings((previous) => ({
      ...previous,

      [section]: {
        ...previous[section],
        [field]: value,
      },
    }));
  };

  const saveProfile = async (event) => {
    event.preventDefault();

    if (!profile.name.trim() || !profile.email.trim()) {
      showMessage(
        "error",
        "Name and email are required."
      );
      return;
    }

    setSaving(true);
    setMessage({ type: "", text: "" });

    try {
      const response = await axios.put(
        `${API_URL}/api/admin/${adminId}/profile`,
        profile
      );

      setProfile({
        name: response.data.profile.name,
        email: response.data.profile.email,
      });

      showMessage(
        "success",
        response.data?.message ||
          "Profile updated successfully."
      );
    } catch (error) {
      showMessage(
        "error",
        error.response?.data?.message ||
          "Unable to update administrator profile."
      );
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async (event) => {
    event.preventDefault();

    if (
      !passwordForm.currentPassword ||
      !passwordForm.newPassword ||
      !passwordForm.confirmPassword
    ) {
      showMessage(
        "error",
        "Please complete all password fields."
      );
      return;
    }

    if (
      passwordForm.newPassword !==
      passwordForm.confirmPassword
    ) {
      showMessage(
        "error",
        "New password and confirmation do not match."
      );
      return;
    }

    setSaving(true);
    setMessage({ type: "", text: "" });

    try {
      const response = await axios.put(
        `${API_URL}/api/admin/${adminId}/password`,
        passwordForm
      );

      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });

      showMessage(
        "success",
        response.data?.message ||
          "Password changed successfully."
      );
    } catch (error) {
      showMessage(
        "error",
        error.response?.data?.message ||
          "Unable to change password."
      );
    } finally {
      setSaving(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    setMessage({ type: "", text: "" });

    try {
      const response = await axios.put(
        `${API_URL}/api/admin/${adminId}/settings`,
        settings
      );

      if (response.data?.settings) {
        setSettings({
          academicDefaults: {
            ...defaultSettings.academicDefaults,
            ...response.data.settings.academicDefaults,
          },

          attendance: {
            ...defaultSettings.attendance,
            ...response.data.settings.attendance,
          },

          systemPreferences: {
            ...defaultSettings.systemPreferences,
            ...response.data.settings.systemPreferences,
          },
        });
      }

      showMessage(
        "success",
        response.data?.message ||
          "Settings saved successfully."
      );
    } catch (error) {
      showMessage(
        "error",
        error.response?.data?.message ||
          "Unable to save administrator settings."
      );
    } finally {
      setSaving(false);
    }
  };

  const menuItems = [
    {
      key: "profile",
      label: "Admin Profile",
      icon: <FiUser />,
    },
    {
      key: "security",
      label: "Security",
      icon: <FiLock />,
    },
    {
      key: "academic",
      label: "Academic Defaults",
      icon: <FiBookOpen />,
    },
    {
      key: "attendance",
      label: "Attendance",
      icon: <FiClock />,
    },
    {
      key: "system",
      label: "System Preferences",
      icon: <FiSettings />,
    },
  ];

  if (loading) {
    return (
      <main className="admin-settings-page">
        <div className="admin-settings-empty">
          Loading administrator settings...
        </div>
      </main>
    );
  }

  return (
    <main className="admin-settings-page">
      <header className="admin-settings-heading">
        <p>System Configuration</p>
        <h2>Admin Settings</h2>

        <span>
          Manage your profile, security and Ultra Class defaults.
        </span>
      </header>

      {message.text && (
        <div
          className={`admin-settings-message ${message.type}`}
        >
          <span>{message.text}</span>

          <button
            type="button"
            onClick={() =>
              setMessage({ type: "", text: "" })
            }
          >
            ×
          </button>
        </div>
      )}

      <div className="admin-settings-layout">
        <aside className="admin-settings-menu">
          {menuItems.map((item) => (
            <button
              type="button"
              key={item.key}
              className={
                activeSection === item.key ? "active" : ""
              }
              onClick={() => {
                setActiveSection(item.key);
                setMessage({ type: "", text: "" });
              }}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </aside>

        <section className="admin-settings-content">
          {activeSection === "profile" && (
            <form
              className="admin-settings-form"
              onSubmit={saveProfile}
            >
              <div className="admin-setting-section-heading">
                <FiUser />

                <div>
                  <h3>Administrator Profile</h3>
                  <p>
                    Update the administrator name and email.
                  </p>
                </div>
              </div>

              <div className="admin-settings-grid">
                <label>
                  <span>Administrator Name</span>

                  <input
                    value={profile.name}
                    onChange={(event) =>
                      setProfile((previous) => ({
                        ...previous,
                        name: event.target.value,
                      }))
                    }
                    disabled={saving}
                    required
                  />
                </label>

                <label>
                  <span>Email Address</span>

                  <input
                    type="email"
                    value={profile.email}
                    onChange={(event) =>
                      setProfile((previous) => ({
                        ...previous,
                        email: event.target.value,
                      }))
                    }
                    disabled={saving}
                    required
                  />
                </label>

                <label>
                  <span>Account Role</span>

                  <input
                    value="Administrator"
                    disabled
                  />
                </label>
              </div>

              <div className="admin-settings-actions">
                <button
                  type="submit"
                  disabled={saving}
                >
                  <FiSave />

                  {saving
                    ? "Saving..."
                    : "Save Profile"}
                </button>
              </div>
            </form>
          )}

          {activeSection === "security" && (
            <form
              className="admin-settings-form"
              onSubmit={changePassword}
            >
              <div className="admin-setting-section-heading">
                <FiLock />

                <div>
                  <h3>Change Password</h3>
                  <p>
                    Verify your current password before setting a
                    new password.
                  </p>
                </div>
              </div>

              <div className="admin-password-fields">
                <label>
                  <span>Current Password</span>

                  <div className="admin-password-input">
                    <input
                      type={
                        showCurrentPassword
                          ? "text"
                          : "password"
                      }
                      value={passwordForm.currentPassword}
                      onChange={(event) =>
                        setPasswordForm((previous) => ({
                          ...previous,
                          currentPassword:
                            event.target.value,
                        }))
                      }
                      disabled={saving}
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowCurrentPassword(
                          (previous) => !previous
                        )
                      }
                    >
                      {showCurrentPassword ? (
                        <FiEyeOff />
                      ) : (
                        <FiEye />
                      )}
                    </button>
                  </div>
                </label>

                <label>
                  <span>New Password</span>

                  <div className="admin-password-input">
                    <input
                      type={
                        showNewPassword
                          ? "text"
                          : "password"
                      }
                      value={passwordForm.newPassword}
                      onChange={(event) =>
                        setPasswordForm((previous) => ({
                          ...previous,
                          newPassword: event.target.value,
                        }))
                      }
                      disabled={saving}
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowNewPassword(
                          (previous) => !previous
                        )
                      }
                    >
                      {showNewPassword ? (
                        <FiEyeOff />
                      ) : (
                        <FiEye />
                      )}
                    </button>
                  </div>
                </label>

                <label>
                  <span>Confirm New Password</span>

                  <div className="admin-password-input">
                    <input
                      type={
                        showConfirmPassword
                          ? "text"
                          : "password"
                      }
                      value={passwordForm.confirmPassword}
                      onChange={(event) =>
                        setPasswordForm((previous) => ({
                          ...previous,
                          confirmPassword:
                            event.target.value,
                        }))
                      }
                      disabled={saving}
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowConfirmPassword(
                          (previous) => !previous
                        )
                      }
                    >
                      {showConfirmPassword ? (
                        <FiEyeOff />
                      ) : (
                        <FiEye />
                      )}
                    </button>
                  </div>
                </label>
              </div>

              <div className="admin-password-note">
                Password must contain at least eight characters.
              </div>

              <div className="admin-settings-actions">
                <button
                  type="submit"
                  disabled={saving}
                >
                  <FiLock />

                  {saving
                    ? "Changing..."
                    : "Change Password"}
                </button>
              </div>
            </form>
          )}

          {activeSection === "academic" && (
            <div className="admin-settings-form">
              <div className="admin-setting-section-heading">
                <FiBookOpen />

                <div>
                  <h3>Academic Defaults</h3>
                  <p>
                    Default values for newly created academic
                    records.
                  </p>
                </div>
              </div>

              <div className="admin-settings-grid">
                <label>
                  <span>Academic Year</span>

                  <input
                    value={
                      settings.academicDefaults.academicYear
                    }
                    onChange={(event) =>
                      updateNestedSetting(
                        "academicDefaults",
                        "academicYear",
                        event.target.value
                      )
                    }
                  />
                </label>

                <label>
                  <span>Default Department</span>

                  <input
                    value={
                      settings.academicDefaults.department
                    }
                    onChange={(event) =>
                      updateNestedSetting(
                        "academicDefaults",
                        "department",
                        event.target.value
                      )
                    }
                  />
                </label>

                <label>
                  <span>Course Status</span>

                  <select
                    value={
                      settings.academicDefaults.courseStatus
                    }
                    onChange={(event) =>
                      updateNestedSetting(
                        "academicDefaults",
                        "courseStatus",
                        event.target.value
                      )
                    }
                  >
                    <option value="active">Active</option>
                    <option value="inactive">
                      Inactive
                    </option>
                    <option value="draft">Draft</option>
                  </select>
                </label>

                <label>
                  <span>Subject Status</span>

                  <select
                    value={
                      settings.academicDefaults.subjectStatus
                    }
                    onChange={(event) =>
                      updateNestedSetting(
                        "academicDefaults",
                        "subjectStatus",
                        event.target.value
                      )
                    }
                  >
                    <option value="active">Active</option>
                    <option value="inactive">
                      Inactive
                    </option>
                    <option value="draft">Draft</option>
                  </select>
                </label>

                <label>
                  <span>Default Semester</span>

                  <input
                    type="number"
                    min="1"
                    max="12"
                    value={
                      settings.academicDefaults.semester
                    }
                    onChange={(event) =>
                      updateNestedSetting(
                        "academicDefaults",
                        "semester",
                        Number(event.target.value)
                      )
                    }
                  />
                </label>

                <label>
                  <span>Student Year of Study</span>

                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={
                      settings.academicDefaults
                        .studentYearOfStudy
                    }
                    onChange={(event) =>
                      updateNestedSetting(
                        "academicDefaults",
                        "studentYearOfStudy",
                        Number(event.target.value)
                      )
                    }
                  />
                </label>
              </div>

              <div className="admin-settings-actions">
                <button
                  type="button"
                  onClick={saveSettings}
                  disabled={saving}
                >
                  <FiSave />
                  {saving ? "Saving..." : "Save Defaults"}
                </button>
              </div>
            </div>
          )}

          {activeSection === "attendance" && (
            <div className="admin-settings-form">
              <div className="admin-setting-section-heading">
                <FiClock />

                <div>
                  <h3>Attendance Configuration</h3>
                  <p>
                    Configure AIDV attendance challenge behaviour.
                  </p>
                </div>
              </div>

              <div className="admin-settings-grid">
                <label>
                  <span>Challenge Duration (seconds)</span>

                  <input
                    type="number"
                    min="15"
                    max="300"
                    value={
                      settings.attendance.challengeDuration
                    }
                    onChange={(event) =>
                      updateNestedSetting(
                        "attendance",
                        "challengeDuration",
                        Number(event.target.value)
                      )
                    }
                  />
                </label>

                <label>
                  <span>Token Expiry (seconds)</span>

                  <input
                    type="number"
                    min="15"
                    max="300"
                    value={
                      settings.attendance.tokenExpiryDuration
                    }
                    onChange={(event) =>
                      updateNestedSetting(
                        "attendance",
                        "tokenExpiryDuration",
                        Number(event.target.value)
                      )
                    }
                  />
                </label>

                <label>
                  <span>Late Grace Period (minutes)</span>

                  <input
                    type="number"
                    min="0"
                    max="60"
                    value={
                      settings.attendance.lateGracePeriod
                    }
                    onChange={(event) =>
                      updateNestedSetting(
                        "attendance",
                        "lateGracePeriod",
                        Number(event.target.value)
                      )
                    }
                  />
                </label>

                <label>
                  <span>Attendance Threshold (%)</span>

                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={
                      settings.attendance
                        .attendanceThreshold
                    }
                    onChange={(event) =>
                      updateNestedSetting(
                        "attendance",
                        "attendanceThreshold",
                        Number(event.target.value)
                      )
                    }
                  />
                </label>
              </div>

              <div className="admin-toggle-list">
                {[
                  [
                    "allowManualOverride",
                    "Allow Lecturer Manual Override",
                  ],
                  [
                    "requireLiveCamera",
                    "Require Live Camera Capture",
                  ],
                  [
                    "allowLateAttendance",
                    "Allow Late Attendance",
                  ],
                ].map(([field, label]) => (
                  <label key={field}>
                    <div>
                      <strong>{label}</strong>
                    </div>

                    <input
                      type="checkbox"
                      checked={
                        settings.attendance[field]
                      }
                      onChange={(event) =>
                        updateNestedSetting(
                          "attendance",
                          field,
                          event.target.checked
                        )
                      }
                    />

                    <span className="admin-toggle-control">
                      <FiCheck />
                    </span>
                  </label>
                ))}
              </div>

              <div className="admin-settings-actions">
                <button
                  type="button"
                  onClick={saveSettings}
                  disabled={saving}
                >
                  <FiSave />

                  {saving
                    ? "Saving..."
                    : "Save Attendance Settings"}
                </button>
              </div>
            </div>
          )}

          {activeSection === "system" && (
            <div className="admin-settings-form">
              <div className="admin-setting-section-heading">
                <FiSettings />

                <div>
                  <h3>System Preferences</h3>
                  <p>
                    Configure display, deletion and export
                    preferences.
                  </p>
                </div>
              </div>

              <div className="admin-settings-grid">
                <label>
                  <span>Rows Per Page</span>

                  <select
                    value={
                      settings.systemPreferences.rowsPerPage
                    }
                    onChange={(event) =>
                      updateNestedSetting(
                        "systemPreferences",
                        "rowsPerPage",
                        Number(event.target.value)
                      )
                    }
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </label>

                <label>
                  <span>Display Density</span>

                  <select
                    value={
                      settings.systemPreferences
                        .displayDensity
                    }
                    onChange={(event) =>
                      updateNestedSetting(
                        "systemPreferences",
                        "displayDensity",
                        event.target.value
                      )
                    }
                  >
                    <option value="comfortable">
                      Comfortable
                    </option>
                    <option value="compact">Compact</option>
                  </select>
                </label>

                <label>
                  <span>Date Format</span>

                  <select
                    value={
                      settings.systemPreferences.dateFormat
                    }
                    onChange={(event) =>
                      updateNestedSetting(
                        "systemPreferences",
                        "dateFormat",
                        event.target.value
                      )
                    }
                  >
                    <option value="DD/MM/YYYY">
                      DD/MM/YYYY
                    </option>
                    <option value="MM/DD/YYYY">
                      MM/DD/YYYY
                    </option>
                    <option value="YYYY-MM-DD">
                      YYYY-MM-DD
                    </option>
                  </select>
                </label>
              </div>

              <div className="admin-toggle-list">
                {[
                  [
                    "confirmBeforeDelete",
                    "Confirm Before Deleting Records",
                  ],
                  [
                    "enableExcelExport",
                    "Enable Excel Export",
                  ],
                ].map(([field, label]) => (
                  <label key={field}>
                    <div>
                      <strong>{label}</strong>
                    </div>

                    <input
                      type="checkbox"
                      checked={
                        settings.systemPreferences[field]
                      }
                      onChange={(event) =>
                        updateNestedSetting(
                          "systemPreferences",
                          field,
                          event.target.checked
                        )
                      }
                    />

                    <span className="admin-toggle-control">
                      <FiCheck />
                    </span>
                  </label>
                ))}
              </div>

              <div className="admin-settings-actions">
                <button
                  type="button"
                  onClick={saveSettings}
                  disabled={saving}
                >
                  <FiSave />

                  {saving
                    ? "Saving..."
                    : "Save System Preferences"}
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

export default AdminSettings;