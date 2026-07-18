import { useState } from "react";

import {
  FiHome,
  FiUsers,
  FiUpload,
  FiBookOpen,
  FiFileText,
  FiSettings,
  FiChevronDown,
  FiChevronRight,
  FiUserPlus,
  FiUserCheck,
  FiLayers,
  FiLink,
  FiClipboard,
  FiList,
} from "react-icons/fi";

import "./AdminSidebar.css";

function AdminSidebar({
  activePage,
  setActivePage,
  isOpen,
  closeSidebar,
}) {
  const [usersOpen, setUsersOpen] = useState(true);
  const [coursesOpen, setCoursesOpen] = useState(false);
  const [subjectsOpen, setSubjectsOpen] = useState(false);

  const navigateTo = (pageName) => {
    setActivePage(pageName);

    if (window.innerWidth <= 900) {
      closeSidebar();
    }
  };

  const pageButtonClass = (pageName, isSubmenu = false) => {
    const baseClass = isSubmenu
      ? "admin-nav-sublink"
      : "admin-nav-link";

    return `${baseClass} ${
      activePage === pageName ? "active" : ""
    }`;
  };

  return (
    <>
      {isOpen && (
        <button
          type="button"
          className="admin-sidebar-overlay"
          onClick={closeSidebar}
          aria-label="Close sidebar"
        />
      )}

      <aside className={`admin-sidebar ${isOpen ? "open" : ""}`}>
        <div className="admin-sidebar-brand">
          <div className="admin-brand-logo">UC</div>

          <div>
            <h2>Ultra Class</h2>
            <span>Admin Portal</span>
          </div>
        </div>

        <nav className="admin-navigation">
          <button
            type="button"
            className={pageButtonClass("dashboard")}
            onClick={() => navigateTo("dashboard")}
          >
            <FiHome />
            <span>Dashboard</span>
          </button>

          <button
            type="button"
            className="admin-nav-parent"
            onClick={() =>
              setUsersOpen((previous) => !previous)
            }
          >
            <div className="admin-nav-parent-content">
              <FiUsers />
              <span>Users</span>
            </div>

            {usersOpen ? (
              <FiChevronDown />
            ) : (
              <FiChevronRight />
            )}
          </button>

          {usersOpen && (
            <div className="admin-nav-submenu">
              <button
                type="button"
                className={pageButtonClass(
                  "add-student",
                  true
                )}
                onClick={() => navigateTo("add-student")}
              >
                <FiUserPlus />
                <span>Add Student</span>
              </button>

              <button
                type="button"
                className={pageButtonClass(
                  "student-list",
                  true
                )}
                onClick={() => navigateTo("student-list")}
              >
                <FiList />
                <span>Student List</span>
              </button>

              <button
                type="button"
                className={pageButtonClass(
                  "add-staff",
                  true
                )}
                onClick={() => navigateTo("add-staff")}
              >
                <FiUserCheck />
                <span>Add Staff</span>
              </button>

              <button
                type="button"
                className={pageButtonClass(
                  "staff-list",
                  true
                )}
                onClick={() => navigateTo("staff-list")}
              >
                <FiList />
                <span>Staff List</span>
              </button>

              <button
                type="button"
                className={pageButtonClass(
                  "bulk-upload",
                  true
                )}
                onClick={() => navigateTo("bulk-upload")}
              >
                <FiUpload />
                <span>Bulk Upload</span>
              </button>
            </div>
          )}

          <button
            type="button"
            className="admin-nav-parent"
            onClick={() =>
              setCoursesOpen((previous) => !previous)
            }
          >
            <div className="admin-nav-parent-content">
              <FiBookOpen />
              <span>Courses</span>
            </div>

            {coursesOpen ? (
              <FiChevronDown />
            ) : (
              <FiChevronRight />
            )}
          </button>

          {coursesOpen && (
            <div className="admin-nav-submenu">
              <button
                type="button"
                className={pageButtonClass(
                  "create-course",
                  true
                )}
                onClick={() => navigateTo("create-course")}
              >
                <FiFileText />
                <span>Create Course</span>
              </button>

              <button
                type="button"
                className={pageButtonClass(
                  "add-students-to-course",
                  true
                )}
                onClick={() =>
                  navigateTo("add-students-to-course")
                }
              >
                <FiUsers />
                <span>Add Students to Course</span>
              </button>
            </div>
          )}

          <button
            type="button"
            className="admin-nav-parent"
            onClick={() =>
              setSubjectsOpen((previous) => !previous)
            }
          >
            <div className="admin-nav-parent-content">
              <FiLayers />
              <span>Subjects</span>
            </div>

            {subjectsOpen ? (
              <FiChevronDown />
            ) : (
              <FiChevronRight />
            )}
          </button>

          {subjectsOpen && (
            <div className="admin-nav-submenu">
              <button
                type="button"
                className={pageButtonClass("subject-list", true)}
                onClick={() => navigateTo("subject-list")}
              >
                <FiList />
                <span>Subject List</span>
              </button>

              <button
                type="button"
                className={pageButtonClass(
                  "create-subject",
                  true
                )}
                onClick={() => navigateTo("create-subject")}
              >
                <FiFileText />
                <span>Create Subject</span>
              </button>

              <button
                type="button"
                className={pageButtonClass(
                  "add-subjects-to-course",
                  true
                )}
                onClick={() =>
                  navigateTo("add-subjects-to-course")
                }
              >
                <FiLink />
                <span>Add Subjects to Course</span>
              </button>

              <button
                type="button"
                className={pageButtonClass(
                  "add-students-to-subject",
                  true
                )}
                onClick={() =>
                  navigateTo("add-students-to-subject")
                }
              >
                <FiUsers />
                <span>Add Students to Subject</span>
              </button>

              <button
                type="button"
                className={pageButtonClass(
                  "assign-lecturer",
                  true
                )}
                onClick={() =>
                  navigateTo("assign-lecturer")
                }
              >
                <FiUserCheck />
                <span>Assign Lecturer</span>
              </button>
            </div>
          )}

          <button
            type="button"
            className={pageButtonClass("curriculum")}
            onClick={() => navigateTo("curriculum")}
          >
            <FiClipboard />
            <span>Curriculum</span>
          </button>

          <button
            type="button"
            className={pageButtonClass("settings")}
            onClick={() => navigateTo("settings")}
          >
            <FiSettings />
            <span>Settings</span>
          </button>
        </nav>
      </aside>
    </>
  );
}

export default AdminSidebar;