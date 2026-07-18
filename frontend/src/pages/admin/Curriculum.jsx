import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import * as XLSX from "xlsx";
import {
  FiBookOpen,
  FiChevronDown,
  FiChevronUp,
  FiDownload,
  FiEdit2,
  FiSearch,
  FiTrash2,
  FiUsers,
  FiX,
} from "react-icons/fi";
import "./Curriculum.css";

const API_URL = "http://localhost:5000";

const emptyForm = {
  courseName: "",
  courseCode: "",
  department: "",
  qualificationLevel: "",
  duration: "",
  academicYear: "",
  description: "",
  status: "active",
};

function Curriculum() {
  const [courses, setCourses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [expandedIds, setExpandedIds] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  const [editCourse, setEditCourse] = useState(null);
  const [editForm, setEditForm] = useState(emptyForm);

  const [studentCourse, setStudentCourse] = useState(null);

  const loadData = async () => {
    try {
      const [courseResponse, subjectResponse] = await Promise.all([
        axios.get(`${API_URL}/api/courses`),
        axios.get(`${API_URL}/api/subjects`),
      ]);

      setCourses(
        Array.isArray(courseResponse.data)
          ? courseResponse.data
          : []
      );

      setSubjects(
        Array.isArray(subjectResponse.data)
          ? subjectResponse.data
          : []
      );
    } catch (error) {
      console.error("Load curriculum error:", error);

      setMessage({
        type: "error",
        text:
          error.response?.data?.message ||
          "Unable to load course management data.",
      });
    }
  };

  useEffect(() => {
    let active = true;

    const initialise = async () => {
      setLoading(true);

      try {
        const [courseResponse, subjectResponse] =
          await Promise.all([
            axios.get(`${API_URL}/api/courses`),
            axios.get(`${API_URL}/api/subjects`),
          ]);

        if (!active) return;

        setCourses(
          Array.isArray(courseResponse.data)
            ? courseResponse.data
            : []
        );

        setSubjects(
          Array.isArray(subjectResponse.data)
            ? subjectResponse.data
            : []
        );
      } catch (error) {
        if (!active) return;

        setMessage({
          type: "error",
          text:
            error.response?.data?.message ||
            "Unable to load course management data.",
        });
      } finally {
        if (active) setLoading(false);
      }
    };

    initialise();

    return () => {
      active = false;
    };
  }, []);

  const filteredCourses = useMemo(() => {
    const value = searchText.trim().toLowerCase();

    if (!value) return courses;

    return courses.filter((course) => {
      const courseMatch = [
        course.courseName,
        course.courseCode,
        course.department,
        course.academicYear,
      ].some((item) =>
        String(item || "").toLowerCase().includes(value)
      );

      const subjectMatch = (course.subjects || []).some(
        (subject) =>
          subject.subjectName?.toLowerCase().includes(value) ||
          subject.subjectCode?.toLowerCase().includes(value)
      );

      return courseMatch || subjectMatch;
    });
  }, [courses, searchText]);

  const toggleCourse = (courseId) => {
    setExpandedIds((previous) =>
      previous.includes(courseId)
        ? previous.filter((id) => id !== courseId)
        : [...previous, courseId]
    );
  };

  const openEdit = (course) => {
    setEditCourse(course);

    setEditForm({
      courseName: course.courseName || "",
      courseCode: course.courseCode || "",
      department: course.department || "",
      qualificationLevel: course.qualificationLevel || "",
      duration: course.duration || "",
      academicYear: course.academicYear || "",
      description: course.description || "",
      status: course.status || "active",
    });

    setMessage({ type: "", text: "" });
  };

  const handleEditChange = (event) => {
    const { name, value } = event.target;

    setEditForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const saveCourse = async (event) => {
    event.preventDefault();

    if (
      !editForm.courseName.trim() ||
      !editForm.courseCode.trim() ||
      !editForm.department.trim() ||
      !editForm.qualificationLevel.trim() ||
      !editForm.duration.trim() ||
      !editForm.academicYear.trim()
    ) {
      setMessage({
        type: "error",
        text: "Please complete all required fields.",
      });
      return;
    }

    setWorking(true);

    try {
      const response = await axios.put(
        `${API_URL}/api/courses/${editCourse._id}`,
        editForm
      );

      await loadData();
      setEditCourse(null);

      setMessage({
        type: "success",
        text:
          response.data?.message ||
          "Course updated successfully.",
      });
    } catch (error) {
      setMessage({
        type: "error",
        text:
          error.response?.data?.message ||
          "Unable to update the course.",
      });
    } finally {
      setWorking(false);
    }
  };

  const deleteCourse = async (course) => {
    const assignedSubjects = course.subjects?.length || 0;
    const assignedStudents = course.students?.length || 0;

    if (assignedSubjects > 0 || assignedStudents > 0) {
      setMessage({
        type: "error",
        text:
          "Remove all assigned students and subjects before deleting this course.",
      });
      return;
    }

    const confirmed = window.confirm(
      `Delete ${course.courseName}? This cannot be undone.`
    );

    if (!confirmed) return;

    setWorking(true);

    try {
      const response = await axios.delete(
        `${API_URL}/api/courses/${course._id}`
      );

      setCourses((previous) =>
        previous.filter((item) => item._id !== course._id)
      );

      setMessage({
        type: "success",
        text:
          response.data?.message ||
          "Course deleted successfully.",
      });
    } catch (error) {
      setMessage({
        type: "error",
        text:
          error.response?.data?.message ||
          "Unable to delete the course.",
      });
    } finally {
      setWorking(false);
    }
  };

  const downloadStudents = (course) => {
    const rows = (course.students || []).map((student, index) => ({
      "S.No": index + 1,
      "Student ID": student.studentId || "",
      "Student Name": student.userId?.name || "",
      Email: student.userId?.email || "",
    }));
    if (!rows.length) return;
    const sheet = XLSX.utils.json_to_sheet(rows);
    sheet["!cols"] = [{ wch: 8 }, { wch: 18 }, { wch: 30 }, { wch: 35 }];
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, "Students");
    XLSX.writeFile(book, `${course.courseCode}_Student_List.xlsx`);
  };

  return (
    <main className="curriculum-page">
      <header className="curriculum-heading">
        <div>
          <p className="curriculum-label">Academic Structure</p>
          <h2>Course Management</h2>
          <p>
            Manage courses and their assigned subjects from one page.
          </p>
        </div>

        <div className="curriculum-stats">
          <span>
            <strong>{courses.length}</strong> Courses
          </span>

          <span>
            <strong>{subjects.length}</strong> Subjects
          </span>
        </div>
      </header>

      <section className="curriculum-toolbar">
        <div className="curriculum-search">
          <FiSearch />

          <input
            value={searchText}
            onChange={(event) =>
              setSearchText(event.target.value)
            }
            placeholder="Search courses or subjects"
          />
        </div>

        <div className="curriculum-toolbar-actions">
          <button
            type="button"
            onClick={() =>
              setExpandedIds(
                filteredCourses.map((course) => course._id)
              )
            }
          >
            Expand All
          </button>

          <button
            type="button"
            onClick={() => setExpandedIds([])}
          >
            Collapse All
          </button>
        </div>
      </section>

      {message.text && (
        <div className={`curriculum-message ${message.type}`}>
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

      {loading ? (
        <div className="curriculum-empty">Loading courses...</div>
      ) : filteredCourses.length === 0 ? (
        <div className="curriculum-empty">
          No matching courses found.
        </div>
      ) : (
        <section className="curriculum-list">
          {filteredCourses.map((course) => {
            const courseSubjects = course.subjects || [];
            const expanded = expandedIds.includes(course._id);

            return (
              <article
                className="curriculum-card"
                key={course._id}
              >
                <div className="curriculum-card-header">
                  <button
                    type="button"
                    className="curriculum-card-summary"
                    onClick={() => toggleCourse(course._id)}
                  >
                    <span className="curriculum-icon">
                      <FiBookOpen />
                    </span>

                    <span className="curriculum-main">
                      <span className="curriculum-title">
                        <strong>{course.courseName}</strong>

                        <small className={course.status}>
                          {course.status}
                        </small>
                      </span>

                      <span className="curriculum-meta">
                        <small>{course.courseCode}</small>
                        <small>{course.department}</small>
                        <small>{course.academicYear}</small>
                        <small>
                          {courseSubjects.length} subjects
                        </small>
                      </span>
                    </span>

                    {expanded ? (
                      <FiChevronUp />
                    ) : (
                      <FiChevronDown />
                    )}
                  </button>

                  <div className="curriculum-actions">
                    <button
                      type="button"
                      className="students"
                      onClick={() => setStudentCourse(course)}
                    >
                      <FiUsers /> Student List
                    </button>

                    <button
                      type="button"
                      onClick={() => openEdit(course)}
                    >
                      <FiEdit2 /> Edit
                    </button>

                    <button
                      type="button"
                      className="delete"
                      disabled={working}
                      onClick={() => deleteCourse(course)}
                    >
                      <FiTrash2 /> Delete
                    </button>
                  </div>
                </div>

                {expanded && (
                  <div className="curriculum-content">
                    <div className="curriculum-details">
                      <div>
                        <span>Qualification</span>
                        <strong>
                          {course.qualificationLevel}
                        </strong>
                      </div>

                      <div>
                        <span>Duration</span>
                        <strong>{course.duration}</strong>
                      </div>

                      <div>
                        <span>Academic Year</span>
                        <strong>{course.academicYear}</strong>
                      </div>

                      <div>
                        <span>Total Subjects</span>
                        <strong>{courseSubjects.length}</strong>
                      </div>
                    </div>

                    {course.description && (
                      <p className="curriculum-description">
                        {course.description}
                      </p>
                    )}

                    <h4>Assigned Subjects</h4>

                    {courseSubjects.length === 0 ? (
                      <div className="curriculum-empty small">
                        No subjects assigned.
                      </div>
                    ) : (
                      <div className="curriculum-subject-grid">
                        {courseSubjects.map((subject) => (
                          <div
                            className="curriculum-subject"
                            key={subject._id}
                          >
                            <div>
                              <strong>
                                {subject.subjectName}
                              </strong>

                              <span>
                                {subject.subjectCode} · Semester{" "}
                                {subject.semester}
                              </span>
                            </div>

                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </section>
      )}

      {editCourse && (
        <div className="curriculum-modal-backdrop">
          <section className="curriculum-modal">
            <div className="curriculum-modal-header">
              <div>
                <small>Edit Course</small>
                <h3>{editCourse.courseName}</h3>
              </div>

              <button
                type="button"
                onClick={() => setEditCourse(null)}
                disabled={working}
              >
                <FiX />
              </button>
            </div>

            <form onSubmit={saveCourse}>
              <div className="curriculum-form-grid">
                {[
                  ["courseName", "Course Name"],
                  ["courseCode", "Course Code"],
                  ["department", "Department"],
                  ["qualificationLevel", "Qualification"],
                  ["duration", "Duration"],
                  ["academicYear", "Academic Year"],
                ].map(([name, label]) => (
                  <label key={name}>
                    <span>{label} *</span>

                    <input
                      name={name}
                      value={editForm[name]}
                      onChange={handleEditChange}
                      disabled={working}
                    />
                  </label>
                ))}

                <label>
                  <span>Status</span>

                  <select
                    name="status"
                    value={editForm.status}
                    onChange={handleEditChange}
                    disabled={working}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="draft">Draft</option>
                  </select>
                </label>
              </div>

              <label className="curriculum-textarea">
                <span>Description</span>

                <textarea
                  name="description"
                  value={editForm.description}
                  onChange={handleEditChange}
                  rows="4"
                  disabled={working}
                />
              </label>

              <div className="curriculum-modal-footer">
                <button
                  type="button"
                  onClick={() => setEditCourse(null)}
                  disabled={working}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="primary"
                  disabled={working}
                >
                  {working ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {studentCourse && (
        <div className="curriculum-modal-backdrop">
          <section className="curriculum-modal curriculum-student-modal">
            <div className="curriculum-modal-header">
              <div>
                <small>Course Students</small>
                <h3>{studentCourse.courseName}</h3>
              </div>

              <button
                type="button"
                onClick={() => setStudentCourse(null)}
              >
                <FiX />
              </button>
            </div>

            <div className="curriculum-modal-body">
              {(studentCourse.students || []).length === 0 ? (
                <div className="curriculum-empty small">
                  No students are assigned to this course.
                </div>
              ) : (
                <div className="curriculum-student-table-wrapper">
                  <table className="curriculum-student-table">
                    <thead><tr><th>Student ID</th><th>Student Name</th><th>Email</th></tr></thead>
                    <tbody>
                      {studentCourse.students.map((student) => (
                        <tr key={student._id}>
                          <td>{student.studentId}</td>
                          <td>{student.userId?.name || "Unavailable"}</td>
                          <td>{student.userId?.email || "Unavailable"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="curriculum-modal-footer">
                <button
                  type="button"
                  onClick={() => setStudentCourse(null)}
                >
                  Close
                </button>

                <button
                  type="button"
                  className="primary"
                  onClick={() => downloadStudents(studentCourse)}
                  disabled={(studentCourse.students || []).length === 0}
                >
                  <FiDownload /> Download Excel
                </button>
              </div>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

export default Curriculum;