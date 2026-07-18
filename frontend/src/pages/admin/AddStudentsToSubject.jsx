import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import * as XLSX from "xlsx";
import {
  FiDownload,
  FiSearch,
  FiTrash2,
  FiUserPlus,
  FiUsers,
} from "react-icons/fi";

import "./AddStudentsToSubject.css";

const API_URL = "http://localhost:5000";

function AddStudentsToSubject() {
  const [courses, setCourses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [students, setStudents] = useState([]);

  const [selectedCourseId, setSelectedCourseId] =
    useState("");
  const [selectedSubjectId, setSelectedSubjectId] =
    useState("");
  const [selectedStudentIds, setSelectedStudentIds] =
    useState([]);

  const [searchText, setSearchText] = useState("");
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);

  const [message, setMessage] = useState({
    type: "",
    text: "",
  });

  const loadData = async () => {
    try {
      const [
        coursesResponse,
        subjectsResponse,
        studentsResponse,
      ] = await Promise.all([
        axios.get(`${API_URL}/api/courses`),
        axios.get(`${API_URL}/api/subjects`),
        axios.get(`${API_URL}/api/students`),
      ]);

      setCourses(
        Array.isArray(coursesResponse.data)
          ? coursesResponse.data
          : []
      );

      setSubjects(
        Array.isArray(subjectsResponse.data)
          ? subjectsResponse.data
          : []
      );

      setStudents(
        Array.isArray(studentsResponse.data)
          ? studentsResponse.data
          : []
      );
    } catch (error) {
      console.error(
        "Load student subject assignment data:",
        error
      );

      setMessage({
        type: "error",
        text:
          error.response?.data?.message ||
          "Unable to load courses, subjects and students.",
      });
    }
  };

  useEffect(() => {
    let active = true;

    const initialise = async () => {
      setLoading(true);

      try {
        const [
          coursesResponse,
          subjectsResponse,
          studentsResponse,
        ] = await Promise.all([
          axios.get(`${API_URL}/api/courses`),
          axios.get(`${API_URL}/api/subjects`),
          axios.get(`${API_URL}/api/students`),
        ]);

        if (!active) return;

        setCourses(
          Array.isArray(coursesResponse.data)
            ? coursesResponse.data
            : []
        );

        setSubjects(
          Array.isArray(subjectsResponse.data)
            ? subjectsResponse.data
            : []
        );

        setStudents(
          Array.isArray(studentsResponse.data)
            ? studentsResponse.data
            : []
        );
      } catch (error) {
        if (!active) return;

        setMessage({
          type: "error",
          text:
            error.response?.data?.message ||
            "Unable to load assignment data.",
        });
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    initialise();

    return () => {
      active = false;
    };
  }, []);

  const selectedCourse = useMemo(
    () =>
      courses.find(
        (course) => course._id === selectedCourseId
      ) || null,
    [courses, selectedCourseId]
  );

  const courseSubjects = useMemo(() => {
    if (!selectedCourseId) return [];

    return subjects.filter((subject) =>
      (subject.courses || []).some(
        (course) =>
          (typeof course === "string"
            ? course
            : course._id) === selectedCourseId
      )
    );
  }, [subjects, selectedCourseId]);

  const selectedSubject = useMemo(
    () =>
      subjects.find(
        (subject) => subject._id === selectedSubjectId
      ) || null,
    [subjects, selectedSubjectId]
  );

  const assignedStudentIds = useMemo(() => {
    if (!selectedSubject) return [];

    return (selectedSubject.students || []).map(
      (student) =>
        typeof student === "string"
          ? student
          : student._id
    );
  }, [selectedSubject]);

  const assignedStudents = useMemo(() => {
    if (!selectedSubject) return [];

    return students.filter((student) =>
      assignedStudentIds.includes(student._id)
    );
  }, [students, assignedStudentIds, selectedSubject]);

  const eligibleStudents = useMemo(() => {
    if (!selectedCourseId || !selectedSubjectId) {
      return [];
    }

    const searchValue = searchText.trim().toLowerCase();

    return students.filter((student) => {
      const studentCourseId =
        typeof student.courseId === "string"
          ? student.courseId
          : student.courseId?._id;

      const belongsToCourse =
        studentCourseId === selectedCourseId;

      const isAlreadyAssigned =
        assignedStudentIds.includes(student._id);

      const matchesSearch =
        !searchValue ||
        student.studentId
          ?.toLowerCase()
          .includes(searchValue) ||
        student.userId?.name
          ?.toLowerCase()
          .includes(searchValue) ||
        student.userId?.email
          ?.toLowerCase()
          .includes(searchValue);

      return (
        belongsToCourse &&
        !isAlreadyAssigned &&
        matchesSearch
      );
    });
  }, [
    students,
    selectedCourseId,
    selectedSubjectId,
    assignedStudentIds,
    searchText,
  ]);

  const handleCourseChange = (event) => {
    setSelectedCourseId(event.target.value);
    setSelectedSubjectId("");
    setSelectedStudentIds([]);
    setSearchText("");
    setMessage({ type: "", text: "" });
  };

  const handleSubjectChange = (event) => {
    setSelectedSubjectId(event.target.value);
    setSelectedStudentIds([]);
    setSearchText("");
    setMessage({ type: "", text: "" });
  };

  const toggleStudent = (studentId) => {
    setSelectedStudentIds((previousIds) =>
      previousIds.includes(studentId)
        ? previousIds.filter(
            (existingId) => existingId !== studentId
          )
        : [...previousIds, studentId]
    );
  };

  const toggleAllStudents = () => {
    const availableIds = eligibleStudents.map(
      (student) => student._id
    );

    const allSelected =
      availableIds.length > 0 &&
      availableIds.every((id) =>
        selectedStudentIds.includes(id)
      );

    setSelectedStudentIds(
      allSelected ? [] : availableIds
    );
  };

  const addStudents = async () => {
    if (!selectedSubjectId) {
      setMessage({
        type: "error",
        text: "Please select a subject.",
      });
      return;
    }

    if (selectedStudentIds.length === 0) {
      setMessage({
        type: "error",
        text: "Please select at least one student.",
      });
      return;
    }

    setWorking(true);
    setMessage({ type: "", text: "" });

    try {
      const response = await axios.put(
        `${API_URL}/api/subjects/${selectedSubjectId}/students`,
        {
          studentIds: selectedStudentIds,
        }
      );

      await loadData();
      setSelectedStudentIds([]);

      setMessage({
        type: "success",
        text:
          response.data?.message ||
          "Students added successfully.",
      });
    } catch (error) {
      console.error("Add students to subject:", error);

      setMessage({
        type: "error",
        text:
          error.response?.data?.message ||
          "Unable to add students to the subject.",
      });
    } finally {
      setWorking(false);
    }
  };

  const removeStudent = async (student) => {
    const studentName =
      student.userId?.name || student.studentId;

    const confirmed = window.confirm(
      `Remove ${studentName} from ${selectedSubject.subjectName}?`
    );

    if (!confirmed) return;

    setWorking(true);
    setMessage({ type: "", text: "" });

    try {
      const response = await axios.delete(
        `${API_URL}/api/subjects/${selectedSubjectId}/students/${student._id}`
      );

      await loadData();

      setMessage({
        type: "success",
        text:
          response.data?.message ||
          "Student removed successfully.",
      });
    } catch (error) {
      console.error(
        "Remove student from subject:",
        error
      );

      setMessage({
        type: "error",
        text:
          error.response?.data?.message ||
          "Unable to remove the student.",
      });
    } finally {
      setWorking(false);
    }
  };

  const downloadExcel = () => {
    if (!selectedSubject || assignedStudents.length === 0) {
      return;
    }

    const rows = assignedStudents.map(
      (student, index) => ({
        "S.No": index + 1,
        "Student ID": student.studentId || "",
        "Student Name": student.userId?.name || "",
        Email: student.userId?.email || "",
        Course: selectedCourse?.courseName || "",
        Subject: selectedSubject.subjectName || "",
        "Subject Code": selectedSubject.subjectCode || "",
      })
    );

    const worksheet = XLSX.utils.json_to_sheet(rows);

    worksheet["!cols"] = [
      { wch: 8 },
      { wch: 18 },
      { wch: 28 },
      { wch: 34 },
      { wch: 32 },
      { wch: 32 },
      { wch: 16 },
    ];

    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      "Students"
    );

    XLSX.writeFile(
      workbook,
      `${selectedSubject.subjectCode}_Student_List.xlsx`
    );
  };

  return (
    <main className="subject-students-page">
      <header className="subject-students-heading">
        <p>Subject Assignment</p>
        <h2>Add Students to Subject</h2>

        <span>
          Select a course and subject, then assign eligible
          students.
        </span>
      </header>

      {message.text && (
        <div
          className={`subject-students-message ${message.type}`}
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

      <section className="subject-students-card">
        <div className="subject-students-selectors">
          <label>
            <span>Course *</span>

            <select
              value={selectedCourseId}
              onChange={handleCourseChange}
              disabled={loading || working}
            >
              <option value="">Select a course</option>

              {courses.map((course) => (
                <option
                  key={course._id}
                  value={course._id}
                >
                  {course.courseCode} - {course.courseName}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>Subject *</span>

            <select
              value={selectedSubjectId}
              onChange={handleSubjectChange}
              disabled={
                loading ||
                working ||
                !selectedCourseId
              }
            >
              <option value="">Select a subject</option>

              {courseSubjects.map((subject) => (
                <option
                  key={subject._id}
                  value={subject._id}
                >
                  {subject.subjectCode} -{" "}
                  {subject.subjectName}
                </option>
              ))}
            </select>
          </label>
        </div>

        {selectedCourse && selectedSubject && (
          <div className="subject-assignment-summary">
            <div>
              <span>Course</span>
              <strong>{selectedCourse.courseName}</strong>
              <small>{selectedCourse.courseCode}</small>
            </div>

            <div>
              <span>Subject</span>
              <strong>{selectedSubject.subjectName}</strong>
              <small>{selectedSubject.subjectCode}</small>
            </div>

            <div>
              <span>Assigned Students</span>
              <strong>{assignedStudents.length}</strong>
            </div>
          </div>
        )}

        {selectedSubject && (
          <>
            <section className="assigned-students-section">
              <div className="subject-section-heading">
                <div>
                  <h3>Assigned Students</h3>
                  <p>
                    Students currently connected to this subject.
                  </p>
                </div>

                <button
                  type="button"
                  className="download-students-button"
                  onClick={downloadExcel}
                  disabled={assignedStudents.length === 0}
                >
                  <FiDownload />
                  Download Excel
                </button>
              </div>

              {assignedStudents.length === 0 ? (
                <div className="subject-students-empty">
                  No students are assigned to this subject.
                </div>
              ) : (
                <div className="assigned-students-table-wrapper">
                  <table className="assigned-students-table">
                    <thead>
                      <tr>
                        <th>Student ID</th>
                        <th>Student Name</th>
                        <th>Email</th>
                        <th>Action</th>
                      </tr>
                    </thead>

                    <tbody>
                      {assignedStudents.map((student) => (
                        <tr key={student._id}>
                          <td>{student.studentId}</td>

                          <td>
                            {student.userId?.name ||
                              "Unavailable"}
                          </td>

                          <td>
                            {student.userId?.email ||
                              "Unavailable"}
                          </td>

                          <td>
                            <button
                              type="button"
                              className="remove-student-button"
                              onClick={() =>
                                removeStudent(student)
                              }
                              disabled={working}
                            >
                              <FiTrash2 />
                              Remove
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section className="available-students-section">
              <div className="subject-section-heading">
                <div>
                  <h3>Available Students</h3>
                  <p>
                    Eligible students from the selected course.
                  </p>
                </div>

                {eligibleStudents.length > 0 && (
                  <button
                    type="button"
                    className="select-all-students-button"
                    onClick={toggleAllStudents}
                    disabled={working}
                  >
                    Select All
                  </button>
                )}
              </div>

              <div className="subject-student-search">
                <FiSearch />

                <input
                  value={searchText}
                  onChange={(event) =>
                    setSearchText(event.target.value)
                  }
                  placeholder="Search student ID, name or email"
                />
              </div>

              {eligibleStudents.length === 0 ? (
                <div className="subject-students-empty">
                  {searchText
                    ? "No students match your search."
                    : "No eligible unassigned students are available."}
                </div>
              ) : (
                <div className="available-students-grid">
                  {eligibleStudents.map((student) => {
                    const selected =
                      selectedStudentIds.includes(
                        student._id
                      );

                    return (
                      <label
                        className={`available-student-card ${
                          selected ? "selected" : ""
                        }`}
                        key={student._id}
                      >
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() =>
                            toggleStudent(student._id)
                          }
                          disabled={working}
                        />

                        <div>
                          <strong>
                            {student.userId?.name ||
                              "Unavailable"}
                          </strong>

                          <span>{student.studentId}</span>

                          <small>
                            {student.userId?.email ||
                              "Unavailable"}
                          </small>
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}

              <div className="subject-students-actions">
                <span>
                  {selectedStudentIds.length} student(s)
                  selected
                </span>

                <button
                  type="button"
                  onClick={addStudents}
                  disabled={
                    working ||
                    selectedStudentIds.length === 0
                  }
                >
                  <FiUserPlus />

                  {working
                    ? "Adding Students..."
                    : "Add Selected Students"}
                </button>
              </div>
            </section>
          </>
        )}

        {!loading && !selectedCourseId && (
          <div className="subject-students-empty main">
            <FiUsers />
            Select a course to begin.
          </div>
        )}
      </section>
    </main>
  );
}

export default AddStudentsToSubject;