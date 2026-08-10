import { useEffect, useMemo, useState } from "react";
import axios from "axios";

import {
  FiBookOpen,
  FiEdit2,
  FiSearch,
  FiTrash2,
  FiUser,
  FiX,
} from "react-icons/fi";

import "./StudentList.css";

const API_URL = "http://localhost:5000";

function StudentList() {
  const [students, setStudents] = useState([]);
  const [courses, setCourses] = useState([]);

  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingCourses, setLoadingCourses] = useState(false);

  const [deletingId, setDeletingId] = useState("");
  const [updating, setUpdating] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");

  useEffect(() => {
    fetchStudents();
    fetchCourses();
  }, []);

  const safeString = (value) => {
    if (value === null || value === undefined) {
      return "";
    }

    return String(value);
  };

  const fetchStudents = async () => {
    try {
      setLoading(true);
      setMessage("");
      setMessageType("");

      const response = await axios.get(
        `${API_URL}/api/students`
      );

      const studentData = Array.isArray(response.data)
        ? response.data
        : Array.isArray(response.data?.students)
          ? response.data.students
          : [];

      setStudents(studentData);
    } catch (error) {
      console.error("Load students error:", error);

      setStudents([]);

      setMessage(
        error.response?.data?.message ||
        "Unable to load students."
      );

      setMessageType("error");
    } finally {
      setLoading(false);
    }
  };

  const fetchCourses = async () => {
    try {
      setLoadingCourses(true);

      const response = await axios.get(
        `${API_URL}/api/courses`
      );

      const courseData = Array.isArray(response.data)
        ? response.data
        : Array.isArray(response.data?.courses)
          ? response.data.courses
          : [];

      setCourses(courseData);
    } catch (error) {
      console.error("Load courses error:", error);
      setCourses([]);
    } finally {
      setLoadingCourses(false);
    }
  };

  const getStudentName = (student) => {
    return (
      safeString(student?.userId?.name) ||
      safeString(student?.name) ||
      "Unknown Student"
    );
  };

  const getStudentEmail = (student) => {
    return (
      safeString(student?.userId?.email) ||
      safeString(student?.email) ||
      "No email"
    );
  };

  const getCourseName = (student) => {
    return (
      safeString(student?.courseId?.courseName) ||
      safeString(student?.courseId?.name) ||
      "Not Assigned"
    );
  };

  const getCourseCode = (student) => {
    return (
      safeString(student?.courseId?.courseCode) ||
      safeString(student?.courseId?.code)
    );
  };

  const getStudentSubjects = (student) => {
    return Array.isArray(student?.subjects)
      ? student.subjects
      : [];
  };

  const filteredStudents = (() => {
    const search = safeString(searchTerm)
      .trim()
      .toLowerCase();

    if (!search) {
      return students;
    }

    return students.filter((student) => {
      const searchableValues = [
        getStudentName(student),
        getStudentEmail(student),
        student?.studentId,
        student?.qualification,
        student?.status,
        student?.yearOfStudy,
        getCourseName(student),
        getCourseCode(student),
      ];

      return searchableValues.some((value) =>
        safeString(value)
          .toLowerCase()
          .includes(search)
      );
    });
  })();

  const selectedEditCourse = useMemo(() => {
    if (!editingStudent?.courseId) {
      return null;
    }

    return (
      courses.find(
        (course) =>
          safeString(course?._id) ===
          safeString(editingStudent.courseId)
      ) || null
    );
  }, [courses, editingStudent?.courseId]);

  const availableEditSubjects = useMemo(() => {
    if (!selectedEditCourse) {
      return [];
    }

    return Array.isArray(selectedEditCourse.subjects)
      ? selectedEditCourse.subjects
      : [];
  }, [selectedEditCourse]);

  const openEditModal = (student) => {
    setMessage("");
    setMessageType("");

    const currentSubjects = getStudentSubjects(student);

    setEditingStudent({
      _id: safeString(student?._id),
      name: getStudentName(student),
      email:
        getStudentEmail(student) === "No email"
          ? ""
          : getStudentEmail(student),
      studentId: safeString(student?.studentId),
      qualification: safeString(student?.qualification),
      yearOfStudy: safeString(
        student?.yearOfStudy || 1
      ),
      courseId: safeString(
        student?.courseId?._id || student?.courseId
      ),
      subjectIds: currentSubjects
        .map((subject) => {
          if (typeof subject === "string") {
            return subject;
          }

          return safeString(subject?._id);
        })
        .filter(Boolean),
      status: safeString(student?.status) || "active",
    });
  };

  const closeEditModal = () => {
    if (!updating) {
      setEditingStudent(null);
    }
  };

  const handleEditChange = (event) => {
    const { name, value } = event.target;

    setEditingStudent((currentStudent) => {
      if (!currentStudent) {
        return currentStudent;
      }

      return {
        ...currentStudent,
        [name]: value,
      };
    });

    setMessage("");
    setMessageType("");
  };

  const handleCourseChange = (event) => {
    const courseId = event.target.value;

    setEditingStudent((currentStudent) => {
      if (!currentStudent) {
        return currentStudent;
      }

      return {
        ...currentStudent,
        courseId,
        subjectIds: [],
      };
    });

    setMessage("");
    setMessageType("");
  };

  const handleSubjectToggle = (subjectId) => {
    const safeSubjectId = safeString(subjectId);

    setEditingStudent((currentStudent) => {
      if (!currentStudent) {
        return currentStudent;
      }

      const currentSubjectIds = Array.isArray(
        currentStudent.subjectIds
      )
        ? currentStudent.subjectIds
        : [];

      const alreadySelected =
        currentSubjectIds.includes(safeSubjectId);

      return {
        ...currentStudent,
        subjectIds: alreadySelected
          ? currentSubjectIds.filter(
            (id) => id !== safeSubjectId
          )
          : [...currentSubjectIds, safeSubjectId],
      };
    });

    setMessage("");
    setMessageType("");
  };

  const validateEditForm = () => {
    if (!editingStudent) {
      return false;
    }

    if (
      !safeString(editingStudent.name).trim() ||
      !safeString(editingStudent.email).trim() ||
      !safeString(editingStudent.studentId).trim() ||
      !safeString(editingStudent.courseId)
    ) {
      setMessage(
        "Name, email, student ID, and course are required."
      );
      setMessageType("error");
      return false;
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (
      !emailPattern.test(
        safeString(editingStudent.email).trim()
      )
    ) {
      setMessage("Enter a valid email address.");
      setMessageType("error");
      return false;
    }

    const yearOfStudy = Number(
      editingStudent.yearOfStudy
    );

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

  const handleUpdate = async (event) => {
    event.preventDefault();

    if (!editingStudent || !validateEditForm()) {
      return;
    }

    try {
      setUpdating(true);
      setMessage("");
      setMessageType("");

      const response = await axios.put(
        `${API_URL}/api/students/${editingStudent._id}`,
        {
          name: safeString(editingStudent.name).trim(),
          email: safeString(editingStudent.email)
            .trim()
            .toLowerCase(),
          studentId: safeString(editingStudent.studentId)
            .trim()
            .toUpperCase(),
          qualification: safeString(
            editingStudent.qualification
          ).trim(),
          yearOfStudy: Number(
            editingStudent.yearOfStudy
          ),
          courseId: safeString(
            editingStudent.courseId
          ),
          subjectIds: Array.isArray(
            editingStudent.subjectIds
          )
            ? editingStudent.subjectIds
            : [],
          status:
            safeString(editingStudent.status) ||
            "active",
        }
      );

      const updatedStudent =
        response.data?.student || response.data?.data;

      if (updatedStudent?._id) {
        setStudents((currentStudents) =>
          currentStudents.map((student) =>
            safeString(student?._id) ===
              safeString(editingStudent._id)
              ? updatedStudent
              : student
          )
        );
      } else {
        await fetchStudents();
      }

      setMessage(
        response.data?.message ||
        "Student updated successfully."
      );
      setMessageType("success");
      setEditingStudent(null);
    } catch (error) {
      console.error("Update student error:", error);

      setMessage(
        error.response?.data?.message ||
        "Unable to update the student."
      );
      setMessageType("error");
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = async (student) => {
    const studentName = getStudentName(student);
    const studentDatabaseId = safeString(student?._id);

    if (!studentDatabaseId) {
      setMessage("Student ID is missing.");
      setMessageType("error");
      return;
    }

    const confirmed = window.confirm(
      `Delete ${studentName}?\n\nThis will remove the student profile, login account, course enrollment, and subject enrollments.`
    );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingId(studentDatabaseId);
      setMessage("");
      setMessageType("");

      const response = await axios.delete(
        `${API_URL}/api/students/${studentDatabaseId}`
      );

      setStudents((currentStudents) =>
        currentStudents.filter(
          (currentStudent) =>
            safeString(currentStudent?._id) !==
            studentDatabaseId
        )
      );

      setMessage(
        response.data?.message ||
        "Student deleted successfully."
      );
      setMessageType("success");
    } catch (error) {
      console.error("Delete student error:", error);

      setMessage(
        error.response?.data?.message ||
        "Unable to delete the student."
      );
      setMessageType("error");
    } finally {
      setDeletingId("");
    }
  };

  return (
    <main className="student-list-page">
      <section className="student-list-header">
        <div>
          <p className="student-list-label">
            Student Management
          </p>

          <h2>Student List</h2>

          <p>
            View, search, edit and manage student
            accounts and academic assignments.
          </p>
        </div>

        <div className="student-total-badge">
          <FiUser />

          <span>
            {students.length}{" "}
            {students.length === 1
              ? "Student"
              : "Students"}
          </span>
        </div>
      </section>

      <section className="student-list-card">
        <div className="student-list-toolbar">
          <div className="student-search-box">
            <FiSearch />

            <input
              type="search"
              value={searchTerm}
              onChange={(event) =>
                setSearchTerm(event.target.value)
              }
              placeholder="Search by name, ID, email or course"
            />
          </div>
        </div>

        {message && (
          <div
            className={`student-list-message ${messageType}`}
            role="alert"
          >
            {message}
          </div>
        )}

        {loading ? (
          <div className="student-list-state">
            Loading students...
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="student-list-state">
            {searchTerm
              ? "No students match your search."
              : "No students have been created yet."}
          </div>
        ) : (
          <div className="student-table-wrapper">
            <table className="student-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Student ID</th>
                  <th>Course</th>
                  <th>Year</th>
                  <th>Subjects</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredStudents.map(
                  (student, index) => {
                    const studentName =
                      getStudentName(student);

                    const subjects =
                      getStudentSubjects(student);

                    const rowKey =
                      safeString(student?._id) ||
                      `${safeString(
                        student?.studentId
                      )}-${index}`;

                    return (
                      <tr key={rowKey}>
                        <td>
                          <div className="student-person-cell">
                            <div className="student-avatar">
                              {safeString(studentName)
                                .charAt(0)
                                .toUpperCase() || "S"}
                            </div>

                            <div>
                              <strong>
                                {studentName}
                              </strong>

                              <span>
                                {getStudentEmail(
                                  student
                                )}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td>
                          {safeString(
                            student?.studentId
                          ) || "Not Available"}
                        </td>

                        <td>
                          <div className="student-course-cell">
                            <strong>
                              {getCourseName(student)}
                            </strong>

                            {getCourseCode(student) && (
                              <span>
                                {getCourseCode(student)}
                              </span>
                            )}
                          </div>
                        </td>

                        <td>
                          Year{" "}
                          {safeString(
                            student?.yearOfStudy
                          ) || "1"}
                        </td>

                        <td>
                          <div className="student-subject-count">
                            <FiBookOpen />

                            <span>
                              {subjects.length}{" "}
                              {subjects.length === 1
                                ? "subject"
                                : "subjects"}
                            </span>
                          </div>
                        </td>

                        <td>
                          <span
                            className={`student-status-badge ${safeString(
                              student?.status
                            ) || "active"
                              }`}
                          >
                            {safeString(
                              student?.status
                            ) || "active"}
                          </span>
                        </td>

                        <td>
                          <div className="student-action-buttons">
                            <button
                              type="button"
                              className="student-action-button edit"
                              title="Edit student"
                              onClick={() =>
                                openEditModal(student)
                              }
                            >
                              <FiEdit2 size={19} aria-hidden="true" />
                            </button>

                            <button
                              type="button"
                              className="student-action-button delete"
                              title="Delete student"
                              disabled={
                                deletingId ===
                                safeString(student?._id)
                              }
                              onClick={() =>
                                handleDelete(student)
                              }
                            >
                              <FiTrash2 />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  }
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {editingStudent && (
        <div
          className="student-edit-overlay"
          onMouseDown={closeEditModal}
        >
          <form
            className="student-edit-modal"
            onSubmit={handleUpdate}
            onMouseDown={(event) =>
              event.stopPropagation()
            }
          >
            <div className="student-edit-modal-header">
              <div>
                <p className="student-edit-label">
                  Student Management
                </p>

                <h3>Edit Student</h3>

                <span>
                  Update the student's account and
                  academic information.
                </span>
              </div>

              <button
                type="button"
                className="student-edit-close"
                onClick={closeEditModal}
                disabled={updating}
                aria-label="Close edit student form"
              >
                <FiX />
              </button>
            </div>

            <div className="student-edit-grid">
              <div className="student-edit-group">
                <label htmlFor="edit-student-name">
                  Full Name <span>*</span>
                </label>

                <input
                  id="edit-student-name"
                  name="name"
                  type="text"
                  value={editingStudent.name}
                  onChange={handleEditChange}
                  placeholder="Enter student name"
                  disabled={updating}
                />
              </div>

              <div className="student-edit-group">
                <label htmlFor="edit-student-id">
                  Student ID <span>*</span>
                </label>

                <input
                  id="edit-student-id"
                  name="studentId"
                  type="text"
                  value={editingStudent.studentId}
                  onChange={handleEditChange}
                  placeholder="Example: STU2026001"
                  disabled={updating}
                />
              </div>

              <div className="student-edit-group">
                <label htmlFor="edit-student-email">
                  Email Address <span>*</span>
                </label>

                <input
                  id="edit-student-email"
                  name="email"
                  type="email"
                  value={editingStudent.email}
                  onChange={handleEditChange}
                  placeholder="student@example.com"
                  disabled={updating}
                />
              </div>

              <div className="student-edit-group">
                <label htmlFor="edit-qualification">
                  Previous Qualification
                </label>

                <input
                  id="edit-qualification"
                  name="qualification"
                  type="text"
                  value={
                    editingStudent.qualification
                  }
                  onChange={handleEditChange}
                  placeholder="Example: BTech Computer Science"
                  disabled={updating}
                />
              </div>

              <div className="student-edit-group">
                <label htmlFor="edit-year">
                  Year of Study
                </label>

                <select
                  id="edit-year"
                  name="yearOfStudy"
                  value={editingStudent.yearOfStudy}
                  onChange={handleEditChange}
                  disabled={updating}
                >
                  {Array.from(
                    { length: 10 },
                    (_, index) => {
                      const year = index + 1;

                      return (
                        <option
                          key={year}
                          value={year}
                        >
                          Year {year}
                        </option>
                      );
                    }
                  )}
                </select>
              </div>

              <div className="student-edit-group">
                <label htmlFor="edit-status">
                  Student Status
                </label>

                <select
                  id="edit-status"
                  name="status"
                  value={editingStudent.status}
                  onChange={handleEditChange}
                  disabled={updating}
                >
                  <option value="active">
                    Active
                  </option>

                  <option value="inactive">
                    Inactive
                  </option>

                  <option value="suspended">
                    Suspended
                  </option>
                </select>
              </div>

              <div className="student-edit-group student-edit-full-width">
                <label htmlFor="edit-course">
                  Course <span>*</span>
                </label>

                <select
                  id="edit-course"
                  name="courseId"
                  value={editingStudent.courseId}
                  onChange={handleCourseChange}
                  disabled={
                    updating || loadingCourses
                  }
                >
                  <option value="">
                    {loadingCourses
                      ? "Loading courses..."
                      : "Select a course"}
                  </option>

                  {courses.map((course, index) => {
                    const courseId =
                      safeString(course?._id);

                    return (
                      <option
                        key={
                          courseId ||
                          `course-${index}`
                        }
                        value={courseId}
                      >
                        {safeString(
                          course?.courseCode
                        ) || "No Code"}{" "}
                        —{" "}
                        {safeString(
                          course?.courseName
                        ) || "Unnamed Course"}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="student-edit-group student-edit-full-width">
                <div className="student-edit-subject-heading">
                  <div>
                    <label>Assigned Subjects</label>

                    <p>
                      Select subjects belonging to the
                      selected course.
                    </p>
                  </div>

                  {availableEditSubjects.length >
                    0 && (
                      <span>
                        {editingStudent.subjectIds
                          ?.length || 0}{" "}
                        selected
                      </span>
                    )}
                </div>

                {!editingStudent.courseId ? (
                  <div className="student-edit-subject-state">
                    Select a course to view its
                    subjects.
                  </div>
                ) : availableEditSubjects.length ===
                  0 ? (
                  <div className="student-edit-subject-state">
                    No subjects are assigned to this
                    course.
                  </div>
                ) : (
                  <div className="student-edit-subject-list">
                    {availableEditSubjects.map(
                      (subject, index) => {
                        const subjectId =
                          typeof subject ===
                            "string"
                            ? subject
                            : safeString(
                              subject?._id
                            );

                        const subjectCode =
                          typeof subject ===
                            "string"
                            ? ""
                            : safeString(
                              subject?.subjectCode
                            );

                        const subjectName =
                          typeof subject ===
                            "string"
                            ? "Subject"
                            : safeString(
                              subject?.subjectName
                            ) || "Unnamed Subject";

                        return (
                          <label
                            key={
                              subjectId ||
                              `subject-${index}`
                            }
                            className="student-edit-subject-option"
                          >
                            <input
                              type="checkbox"
                              checked={(
                                editingStudent.subjectIds ||
                                []
                              ).includes(subjectId)}
                              onChange={() =>
                                handleSubjectToggle(
                                  subjectId
                                )
                              }
                              disabled={
                                updating ||
                                !subjectId
                              }
                            />

                            <span>
                              {subjectCode && (
                                <strong>
                                  {subjectCode}
                                </strong>
                              )}

                              {subjectName}
                            </span>
                          </label>
                        );
                      }
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="student-edit-actions">
              <button
                type="button"
                className="student-edit-cancel"
                onClick={closeEditModal}
                disabled={updating}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="student-edit-save"
                disabled={updating}
              >
                {updating
                  ? "Saving Changes..."
                  : "Save Changes"}
              </button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}

export default StudentList;