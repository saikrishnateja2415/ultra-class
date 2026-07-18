import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import * as XLSX from "xlsx";
import {
  FiDownload,
  FiSearch,
  FiTrash2,
  FiUserCheck,
  FiUsers,
} from "react-icons/fi";

import "./AssignLecturer.css";

const API_URL = "http://localhost:5000";

function AssignLecturer() {
  const [courses, setCourses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [staff, setStaff] = useState([]);

  const [selectedCourseId, setSelectedCourseId] =
    useState("");
  const [selectedSubjectId, setSelectedSubjectId] =
    useState("");
  const [selectedLecturerIds, setSelectedLecturerIds] =
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
        staffResponse,
      ] = await Promise.all([
        axios.get(`${API_URL}/api/courses`),
        axios.get(`${API_URL}/api/subjects`),
        axios.get(`${API_URL}/staff`),
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

      setStaff(
        Array.isArray(staffResponse.data)
          ? staffResponse.data
          : []
      );
    } catch (error) {
      console.error(
        "Load lecturer assignment data:",
        error
      );

      setMessage({
        type: "error",
        text:
          error.response?.data?.message ||
          "Unable to load courses, subjects and staff.",
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
          staffResponse,
        ] = await Promise.all([
          axios.get(`${API_URL}/api/courses`),
          axios.get(`${API_URL}/api/subjects`),
          axios.get(`${API_URL}/staff`),
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

        setStaff(
          Array.isArray(staffResponse.data)
            ? staffResponse.data
            : []
        );
      } catch (error) {
        if (!active) return;

        setMessage({
          type: "error",
          text:
            error.response?.data?.message ||
            "Unable to load lecturer assignment data.",
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

  const assignedLecturerIds = useMemo(() => {
    if (!selectedSubject) return [];

    return (selectedSubject.lecturers || []).map(
      (lecturer) =>
        typeof lecturer === "string"
          ? lecturer
          : lecturer._id
    );
  }, [selectedSubject]);

  const assignedLecturers = useMemo(() => {
    if (!selectedSubject) return [];

    return staff.filter((member) =>
      assignedLecturerIds.includes(member._id)
    );
  }, [staff, assignedLecturerIds, selectedSubject]);

  const availableLecturers = useMemo(() => {
    if (!selectedSubjectId) return [];

    const searchValue = searchText.trim().toLowerCase();

    return staff.filter((member) => {
      const isTeachingStaff =
        member.status === "active" &&
        member.designation !== "Administrator";

      const isAlreadyAssigned =
        assignedLecturerIds.includes(member._id);

      const matchesSearch =
        !searchValue ||
        member.staffId
          ?.toLowerCase()
          .includes(searchValue) ||
        member.name
          ?.toLowerCase()
          .includes(searchValue) ||
        member.email
          ?.toLowerCase()
          .includes(searchValue) ||
        member.department
          ?.toLowerCase()
          .includes(searchValue) ||
        member.designation
          ?.toLowerCase()
          .includes(searchValue);

      return (
        isTeachingStaff &&
        !isAlreadyAssigned &&
        matchesSearch
      );
    });
  }, [
    staff,
    selectedSubjectId,
    assignedLecturerIds,
    searchText,
  ]);

  const handleCourseChange = (event) => {
    setSelectedCourseId(event.target.value);
    setSelectedSubjectId("");
    setSelectedLecturerIds([]);
    setSearchText("");
    setMessage({ type: "", text: "" });
  };

  const handleSubjectChange = (event) => {
    setSelectedSubjectId(event.target.value);
    setSelectedLecturerIds([]);
    setSearchText("");
    setMessage({ type: "", text: "" });
  };

  const toggleLecturer = (lecturerId) => {
    setSelectedLecturerIds((previousIds) =>
      previousIds.includes(lecturerId)
        ? previousIds.filter(
            (existingId) => existingId !== lecturerId
          )
        : [...previousIds, lecturerId]
    );
  };

  const toggleAllLecturers = () => {
    const availableIds = availableLecturers.map(
      (member) => member._id
    );

    const allSelected =
      availableIds.length > 0 &&
      availableIds.every((id) =>
        selectedLecturerIds.includes(id)
      );

    setSelectedLecturerIds(
      allSelected ? [] : availableIds
    );
  };

  const addLecturers = async () => {
    if (!selectedSubjectId) {
      setMessage({
        type: "error",
        text: "Please select a subject.",
      });
      return;
    }

    if (selectedLecturerIds.length === 0) {
      setMessage({
        type: "error",
        text: "Please select at least one lecturer.",
      });
      return;
    }

    setWorking(true);
    setMessage({ type: "", text: "" });

    try {
      const response = await axios.put(
        `${API_URL}/api/subjects/${selectedSubjectId}/lecturers`,
        {
          lecturerIds: selectedLecturerIds,
        }
      );

      await loadData();
      setSelectedLecturerIds([]);

      setMessage({
        type: "success",
        text:
          response.data?.message ||
          "Lecturers assigned successfully.",
      });
    } catch (error) {
      console.error(
        "Assign lecturers to subject:",
        error
      );

      setMessage({
        type: "error",
        text:
          error.response?.data?.message ||
          "Unable to assign lecturers.",
      });
    } finally {
      setWorking(false);
    }
  };

  const removeLecturer = async (lecturer) => {
    const confirmed = window.confirm(
      `Remove ${lecturer.name} from ${selectedSubject.subjectName}?`
    );

    if (!confirmed) return;

    setWorking(true);
    setMessage({ type: "", text: "" });

    try {
      const response = await axios.delete(
        `${API_URL}/api/subjects/${selectedSubjectId}/lecturers/${lecturer._id}`
      );

      await loadData();

      setMessage({
        type: "success",
        text:
          response.data?.message ||
          "Lecturer removed successfully.",
      });
    } catch (error) {
      console.error("Remove lecturer:", error);

      setMessage({
        type: "error",
        text:
          error.response?.data?.message ||
          "Unable to remove the lecturer.",
      });
    } finally {
      setWorking(false);
    }
  };

  const downloadExcel = () => {
    if (
      !selectedSubject ||
      assignedLecturers.length === 0
    ) {
      return;
    }

    const rows = assignedLecturers.map(
      (lecturer, index) => ({
        "S.No": index + 1,
        "Staff ID": lecturer.staffId || "",
        Name: lecturer.name || "",
        Email: lecturer.email || "",
        Department: lecturer.department || "",
        Designation: lecturer.designation || "",
        Course: selectedCourse?.courseName || "",
        Subject: selectedSubject.subjectName || "",
        "Subject Code": selectedSubject.subjectCode || "",
      })
    );

    const worksheet = XLSX.utils.json_to_sheet(rows);

    worksheet["!cols"] = [
      { wch: 8 },
      { wch: 16 },
      { wch: 28 },
      { wch: 34 },
      { wch: 24 },
      { wch: 22 },
      { wch: 32 },
      { wch: 32 },
      { wch: 16 },
    ];

    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      "Lecturers"
    );

    XLSX.writeFile(
      workbook,
      `${selectedSubject.subjectCode}_Lecturer_List.xlsx`
    );
  };

  return (
    <main className="assign-lecturer-page">
      <header className="assign-lecturer-heading">
        <p>Teaching Assignment</p>
        <h2>Assign Lecturer to Subject</h2>

        <span>
          Select a course and subject, then assign eligible
          teaching staff.
        </span>
      </header>

      {message.text && (
        <div
          className={`assign-lecturer-message ${message.type}`}
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

      <section className="assign-lecturer-card">
        <div className="assign-lecturer-selectors">
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
          <div className="lecturer-assignment-summary">
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
              <span>Assigned Lecturers</span>
              <strong>{assignedLecturers.length}</strong>
            </div>
          </div>
        )}

        {selectedSubject && (
          <>
            <section className="assigned-lecturers-section">
              <div className="lecturer-section-heading">
                <div>
                  <h3>Assigned Lecturers</h3>
                  <p>
                    Teaching staff currently assigned to this
                    subject.
                  </p>
                </div>

                <button
                  type="button"
                  className="download-lecturers-button"
                  onClick={downloadExcel}
                  disabled={assignedLecturers.length === 0}
                >
                  <FiDownload />
                  Download Excel
                </button>
              </div>

              {assignedLecturers.length === 0 ? (
                <div className="assign-lecturer-empty">
                  No lecturers are assigned to this subject.
                </div>
              ) : (
                <div className="assigned-lecturers-table-wrapper">
                  <table className="assigned-lecturers-table">
                    <thead>
                      <tr>
                        <th>Staff ID</th>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Designation</th>
                        <th>Action</th>
                      </tr>
                    </thead>

                    <tbody>
                      {assignedLecturers.map(
                        (lecturer) => (
                          <tr key={lecturer._id}>
                            <td>{lecturer.staffId}</td>
                            <td>{lecturer.name}</td>
                            <td>{lecturer.email}</td>
                            <td>{lecturer.designation}</td>

                            <td>
                              <button
                                type="button"
                                className="remove-lecturer-button"
                                onClick={() =>
                                  removeLecturer(lecturer)
                                }
                                disabled={working}
                              >
                                <FiTrash2 />
                                Remove
                              </button>
                            </td>
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section className="available-lecturers-section">
              <div className="lecturer-section-heading">
                <div>
                  <h3>Available Lecturers</h3>

                  <p>
                    Active teaching staff available for assignment.
                  </p>
                </div>

                {availableLecturers.length > 0 && (
                  <button
                    type="button"
                    className="select-all-lecturers-button"
                    onClick={toggleAllLecturers}
                    disabled={working}
                  >
                    Select All
                  </button>
                )}
              </div>

              <div className="lecturer-search">
                <FiSearch />

                <input
                  value={searchText}
                  onChange={(event) =>
                    setSearchText(event.target.value)
                  }
                  placeholder="Search ID, name, email or designation"
                />
              </div>

              {availableLecturers.length === 0 ? (
                <div className="assign-lecturer-empty">
                  {searchText
                    ? "No lecturers match your search."
                    : "No eligible unassigned lecturers are available."}
                </div>
              ) : (
                <div className="available-lecturers-grid">
                  {availableLecturers.map((lecturer) => {
                    const selected =
                      selectedLecturerIds.includes(
                        lecturer._id
                      );

                    return (
                      <label
                        className={`available-lecturer-card ${
                          selected ? "selected" : ""
                        }`}
                        key={lecturer._id}
                      >
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() =>
                            toggleLecturer(lecturer._id)
                          }
                          disabled={working}
                        />

                        <div>
                          <strong>{lecturer.name}</strong>

                          <span>
                            {lecturer.staffId} ·{" "}
                            {lecturer.designation}
                          </span>

                          <small>{lecturer.email}</small>
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}

              <div className="assign-lecturer-actions">
                <span>
                  {selectedLecturerIds.length} lecturer(s)
                  selected
                </span>

                <button
                  type="button"
                  onClick={addLecturers}
                  disabled={
                    working ||
                    selectedLecturerIds.length === 0
                  }
                >
                  <FiUserCheck />

                  {working
                    ? "Assigning Lecturers..."
                    : "Assign Selected Lecturers"}
                </button>
              </div>
            </section>
          </>
        )}

        {!loading && !selectedCourseId && (
          <div className="assign-lecturer-empty main">
            <FiUsers />
            Select a course to begin.
          </div>
        )}
      </section>
    </main>
  );
}

export default AssignLecturer;