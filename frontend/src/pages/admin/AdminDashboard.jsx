import { useEffect, useState } from "react";
import axios from "axios";

import {
  FiBookOpen,
  FiLayers,
  FiUserCheck,
  FiUsers,
} from "react-icons/fi";

import AdminLayout from "../../components/AdminLayout";
import "./AdminDashboard.css";

import CreateCourse from "./CreateCourse";
import CreateSubject from "./CreateSubject";
import AddSubjectsToCourse from "./AddSubjectsToCourse";
import Curriculum from "./Curriculum";
import AddStudent from "./AddStudent";
import StudentList from "./StudentList";
import AddStaff from "./AddStaff";
import StaffList from "./StaffList";
import SubjectList from "./SubjectList";
import AddStudentsToSubject from "./AddStudentsToSubject";
import AssignLecturer from "./AssignLecturer";
import BulkUpload from "./BulkUpload";
import AdminSettings from "./AdminSettings";

const API_URL = "http://localhost:5000";

function DashboardHome() {
  const [counts, setCounts] = useState({
    students: 0,
    staff: 0,
    courses: 0,
    subjects: 0,
  });

  const [loadingCounts, setLoadingCounts] = useState(true);
  const [countError, setCountError] = useState("");

  useEffect(() => {
    let active = true;

    const loadDashboardCounts = async () => {
      setLoadingCounts(true);
      setCountError("");

      try {
        const [
          studentsResponse,
          staffResponse,
          coursesResponse,
          subjectsResponse,
        ] = await Promise.all([
          axios.get(`${API_URL}/api/students`),
          axios.get(`${API_URL}/staff`),
          axios.get(`${API_URL}/api/courses`),
          axios.get(`${API_URL}/api/subjects`),
        ]);

        if (!active) return;

        const students = Array.isArray(
          studentsResponse.data
        )
          ? studentsResponse.data
          : [];

        const staff = Array.isArray(staffResponse.data)
          ? staffResponse.data
          : [];

        const courses = Array.isArray(
          coursesResponse.data
        )
          ? coursesResponse.data
          : [];

        const subjects = Array.isArray(
          subjectsResponse.data
        )
          ? subjectsResponse.data
          : [];

        setCounts({
          students: students.length,
          staff: staff.length,
          courses: courses.length,
          subjects: subjects.length,
        });
      } catch (error) {
        if (!active) return;

        console.error(
          "Load admin dashboard counts error:",
          error
        );

        setCountError(
          error.response?.data?.message ||
          "Unable to load dashboard statistics."
        );
      } finally {
        if (active) {
          setLoadingCounts(false);
        }
      }
    };

    loadDashboardCounts();

    return () => {
      active = false;
    };
  }, []);

  const cards = [
    {
      title: "Total Students",
      value: counts.students,
      description: "Registered student accounts",
      icon: <FiUsers />,
    },
    {
      title: "Total Staff",
      value: counts.staff,
      description: "Lecturers and administrative staff",
      icon: <FiUserCheck />,
    },
    {
      title: "Total Courses",
      value: counts.courses,
      description: "University courses",
      icon: <FiBookOpen />,
    },
    {
      title: "Total Subjects",
      value: counts.subjects,
      description: "Subjects available across courses",
      icon: <FiLayers />,
    },
  ];

  return (
    <main className="new-admin-dashboard">
      <section className="admin-welcome-section">
        <p className="admin-page-label">Overview</p>

        <h2>Welcome to Ultra Class Administration</h2>

        <p>
          Manage students, staff, courses, subjects and teaching
          assignments from one central system.
        </p>
      </section>

      {countError && (
        <div
          className="admin-dashboard-count-error"
          role="alert"
        >
          {countError}
        </div>
      )}

      <section className="admin-stat-grid">
        {cards.map((card) => (
          <article
            className="admin-stat-card"
            key={card.title}
          >
            <div className="admin-stat-icon">
              {card.icon}
            </div>

            <div>
              <p>{card.title}</p>

              <h3>
                {loadingCounts ? (
                  <span className="admin-count-loading">
                    ...
                  </span>
                ) : (
                  card.value
                )}
              </h3>

              <span>{card.description}</span>
            </div>
          </article>
        ))}
      </section>

      <section className="admin-dashboard-panel">
        <h3>Academic Management Setup</h3>

        <p>
          Create courses and subjects before enrolling students or
          assigning lecturers.
        </p>

        <div className="admin-setup-steps">
          <span>1. Create courses</span>
          <span>2. Create subjects</span>
          <span>3. Connect subjects to courses</span>
          <span>4. Add students and staff</span>
          <span>5. Complete academic assignments</span>
        </div>
      </section>
    </main>
  );
}

function TemporaryPage({ title, description }) {
  return (
    <main className="temporary-admin-page">
      <h2>{title}</h2>
      <p>{description}</p>
    </main>
  );
}

function AdminDashboard({ user, logout }) {
  const [activePage, setActivePage] =
    useState("dashboard");

  const renderAdminPage = () => {
    switch (activePage) {
      case "dashboard":
        return <DashboardHome />;

      case "add-student":
        return <AddStudent />;

      case "student-list":
        return <StudentList />;

      case "add-staff":
        return <AddStaff />;

      case "staff-list":
        return <StaffList />;

      case "bulk-upload":
        return <BulkUpload />;

      case "create-course":
        return <CreateCourse />;

      case "add-students-to-course":
        return (
          <TemporaryPage
            title="Add Students to Course"
            description="Assign one or more registered students to a course."
          />
        );

      case "create-subject":
        return <CreateSubject />;

      case "subject-list":
        return <SubjectList />;

      case "add-subjects-to-course":
        return <AddSubjectsToCourse />;

      case "add-students-to-subject":
        return <AddStudentsToSubject />;

      case "assign-lecturer":
        return <AssignLecturer />;

      case "curriculum":
        return <Curriculum />;

      case "settings":
        return <AdminSettings user={user} />;

      default:
        return <DashboardHome />;
    }
  };

  return (
    <AdminLayout
      user={user}
      logout={logout}
      activePage={activePage}
      setActivePage={setActivePage}
    >
      {renderAdminPage()}
    </AdminLayout>
  );
}

export default AdminDashboard;