import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import * as XLSX from "xlsx";
import {
  FiAlertCircle,
  FiCheckCircle,
  FiDownload,
  FiFileText,
  FiUpload,
  FiUsers,
  FiUserCheck,
  FiX,
} from "react-icons/fi";

import "./BulkUpload.css";

const API_URL = "http://localhost:5000";

const STUDENT_COLUMNS = [
  "name",
  "email",
  "password",
  "studentId",
  "qualification",
  "yearOfStudy",
  "courseCode",
  "subjectCodes",
  "status",
];

const LECTURER_COLUMNS = [
  "name",
  "email",
  "password",
  "staffId",
  "department",
  "qualification",
  "designation",
  "courseCodes",
  "subjectCodes",
  "status",
];

const VALID_STUDENT_STATUSES = [
  "active",
  "inactive",
  "suspended",
];

const VALID_STAFF_STATUSES = ["active", "inactive"];

const VALID_DESIGNATIONS = [
  "Lecturer",
  "Senior Lecturer",
  "Professor",
  "Teaching Assistant",
];

const normaliseCode = (value) =>
  String(value || "").trim().toUpperCase();

const normaliseEmail = (value) =>
  String(value || "").trim().toLowerCase();

const splitCodes = (value) =>
  String(value || "")
    .split(",")
    .map((code) => normaliseCode(code))
    .filter(Boolean);

const isValidEmail = (email) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

function BulkUpload() {
  const [uploadType, setUploadType] = useState("");
  const [courses, setCourses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [existingStudents, setExistingStudents] = useState([]);
  const [existingStaff, setExistingStaff] = useState([]);

  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState([]);
  const [validRows, setValidRows] = useState([]);
  const [invalidRows, setInvalidRows] = useState([]);

  const [loadingData, setLoadingData] = useState(true);
  const [validating, setValidating] = useState(false);
  const [importing, setImporting] = useState(false);

  const [result, setResult] = useState(null);
  const [message, setMessage] = useState({
    type: "",
    text: "",
  });

  useEffect(() => {
    let active = true;

    const loadReferenceData = async () => {
      setLoadingData(true);

      try {
        const [
          coursesResponse,
          subjectsResponse,
          studentsResponse,
          staffResponse,
        ] = await Promise.all([
          axios.get(`${API_URL}/api/courses`),
          axios.get(`${API_URL}/api/subjects`),
          axios.get(`${API_URL}/api/students`),
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

        setExistingStudents(
          Array.isArray(studentsResponse.data)
            ? studentsResponse.data
            : []
        );

        setExistingStaff(
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
            "Unable to load database reference data.",
        });
      } finally {
        if (active) {
          setLoadingData(false);
        }
      }
    };

    loadReferenceData();

    return () => {
      active = false;
    };
  }, []);

  const courseByCode = useMemo(() => {
    const map = new Map();

    courses.forEach((course) => {
      map.set(normaliseCode(course.courseCode), course);
    });

    return map;
  }, [courses]);

  const subjectByCode = useMemo(() => {
    const map = new Map();

    subjects.forEach((subject) => {
      map.set(normaliseCode(subject.subjectCode), subject);
    });

    return map;
  }, [subjects]);

  const resetFileData = () => {
    setFileName("");
    setRows([]);
    setValidRows([]);
    setInvalidRows([]);
    setResult(null);
    setMessage({ type: "", text: "" });
  };

  const handleTypeChange = (type) => {
    setUploadType(type);
    resetFileData();
  };

  const downloadTemplate = () => {
    if (!uploadType) return;

    const templateRows =
      uploadType === "student"
        ? [
            {
              name: "Example Student",
              email: "student@example.com",
              password: "Temp@1234",
              studentId: "STU2026001",
              qualification:
                "MSc Advanced Computer Science",
              yearOfStudy: 1,
              courseCode: "MSC-ACSAI",
              subjectCodes: "",
              status: "active",
            },
          ]
        : [
            {
              name: "Example Lecturer",
              email: "lecturer@example.com",
              password: "Temp@1234",
              staffId: "STF2026001",
              department: "Computer Science",
              qualification: "PhD",
              designation: "Lecturer",
              courseCodes: "",
              subjectCodes: "",
              status: "active",
            },
          ];

    const worksheet =
      XLSX.utils.json_to_sheet(templateRows);

    worksheet["!cols"] = (
      uploadType === "student"
        ? STUDENT_COLUMNS
        : LECTURER_COLUMNS
    ).map(() => ({ wch: 24 }));

    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      uploadType === "student"
        ? "Students"
        : "Lecturers"
    );

    XLSX.writeFile(
      workbook,
      uploadType === "student"
        ? "Ultra_Class_Student_Template.xlsx"
        : "Ultra_Class_Lecturer_Template.xlsx"
    );
  };

  const readExcelFile = async (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    resetFileData();
    setFileName(file.name);

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer);
      const firstSheet = workbook.Sheets[
        workbook.SheetNames[0]
      ];

      const parsedRows = XLSX.utils.sheet_to_json(
        firstSheet,
        {
          defval: "",
          raw: false,
        }
      );

      if (parsedRows.length === 0) {
        setMessage({
          type: "error",
          text: "The selected Excel file contains no data rows.",
        });
        return;
      }

      setRows(
        parsedRows.map((row, index) => ({
          ...row,
          excelRow: index + 2,
        }))
      );

      setMessage({
        type: "success",
        text: `${parsedRows.length} row(s) loaded. Click Validate Data.`,
      });
    } catch (error) {
      console.error("Read Excel file error:", error);

      setMessage({
        type: "error",
        text:
          "Unable to read the Excel file. Use the downloaded template.",
      });
    } finally {
      event.target.value = "";
    }
  };

  const validateStudentRow = (
    row,
    fileEmails,
    fileStudentIds
  ) => {
    const errors = [];

    const name = String(row.name || "").trim();
    const email = normaliseEmail(row.email);
    const password = String(row.password || "");
    const studentId = normaliseCode(row.studentId);
    const courseCode = normaliseCode(row.courseCode);
    const subjectCodes = splitCodes(row.subjectCodes);
    const status = String(
      row.status || "active"
    ).toLowerCase();

    if (!name) errors.push("Name is required.");
    if (!email) errors.push("Email is required.");
    if (email && !isValidEmail(email)) {
      errors.push("Email format is invalid.");
    }

    if (!password || password.length < 8) {
      errors.push(
        "Password must contain at least 8 characters."
      );
    }

    if (!studentId) {
      errors.push("Student ID is required.");
    }

    const year = Number(row.yearOfStudy);

    if (!Number.isInteger(year) || year < 1 || year > 10) {
      errors.push(
        "Year of study must be between 1 and 10."
      );
    }

    if (!courseCode) {
      errors.push("Course code is required.");
    }

    const course = courseByCode.get(courseCode);

    if (courseCode && !course) {
      errors.push(
        `Course code ${courseCode} does not exist.`
      );
    }

    subjectCodes.forEach((code) => {
      const subject = subjectByCode.get(code);

      if (!subject) {
        errors.push(`Subject code ${code} does not exist.`);
        return;
      }

      if (course) {
        const belongsToCourse = (
          subject.courses || []
        ).some(
          (subjectCourse) =>
            normaliseCode(subjectCourse.courseCode) ===
            courseCode
        );

        if (!belongsToCourse) {
          errors.push(
            `Subject ${code} is not assigned to course ${courseCode}.`
          );
        }
      }
    });

    if (!VALID_STUDENT_STATUSES.includes(status)) {
      errors.push(
        "Status must be active, inactive or suspended."
      );
    }

    const emailAlreadyExists = existingStudents.some(
      (student) =>
        normaliseEmail(student.userId?.email) === email
    );

    const idAlreadyExists = existingStudents.some(
      (student) =>
        normaliseCode(student.studentId) === studentId
    );

    if (emailAlreadyExists) {
      errors.push("Email already exists in the database.");
    }

    if (idAlreadyExists) {
      errors.push(
        "Student ID already exists in the database."
      );
    }

    if (fileEmails.has(email)) {
      errors.push("Duplicate email exists in this file.");
    }

    if (fileStudentIds.has(studentId)) {
      errors.push(
        "Duplicate Student ID exists in this file."
      );
    }

    fileEmails.add(email);
    fileStudentIds.add(studentId);

    return {
      ...row,
      name,
      email,
      password,
      studentId,
      qualification: String(
        row.qualification || ""
      ).trim(),
      yearOfStudy: year,
      courseCode,
      courseId: course?._id || "",
      subjectCodes,
      subjectIds: subjectCodes
        .map((code) => subjectByCode.get(code)?._id)
        .filter(Boolean),
      status,
      errors,
    };
  };

  const validateLecturerRow = (
    row,
    fileEmails,
    fileStaffIds
  ) => {
    const errors = [];

    const name = String(row.name || "").trim();
    const email = normaliseEmail(row.email);
    const password = String(row.password || "");
    const staffId = normaliseCode(row.staffId);
    const department = String(
      row.department || ""
    ).trim();

    const designation = String(
      row.designation || ""
    ).trim();

    const courseCodes = splitCodes(row.courseCodes);
    const subjectCodes = splitCodes(row.subjectCodes);
    const status = String(
      row.status || "active"
    ).toLowerCase();

    if (!name) errors.push("Name is required.");
    if (!email) errors.push("Email is required.");
    if (email && !isValidEmail(email)) {
      errors.push("Email format is invalid.");
    }

    if (!password || password.length < 8) {
      errors.push(
        "Password must contain at least 8 characters."
      );
    }

    if (!staffId) errors.push("Staff ID is required.");
    if (!department) {
      errors.push("Department is required.");
    }

    if (!VALID_DESIGNATIONS.includes(designation)) {
      errors.push("Designation is invalid.");
    }

    if (!VALID_STAFF_STATUSES.includes(status)) {
      errors.push("Status must be active or inactive.");
    }

    courseCodes.forEach((code) => {
      if (!courseByCode.has(code)) {
        errors.push(
          `Course code ${code} does not exist.`
        );
      }
    });

    subjectCodes.forEach((code) => {
      const subject = subjectByCode.get(code);

      if (!subject) {
        errors.push(`Subject code ${code} does not exist.`);
        return;
      }

      const belongsToSelectedCourse = (
        subject.courses || []
      ).some((subjectCourse) =>
        courseCodes.includes(
          normaliseCode(subjectCourse.courseCode)
        )
      );

      if (
        courseCodes.length > 0 &&
        !belongsToSelectedCourse
      ) {
        errors.push(
          `Subject ${code} does not belong to the supplied courses.`
        );
      }
    });

    const emailAlreadyExists = existingStaff.some(
      (member) => normaliseEmail(member.email) === email
    );

    const idAlreadyExists = existingStaff.some(
      (member) =>
        normaliseCode(member.staffId) === staffId
    );

    if (emailAlreadyExists) {
      errors.push("Email already exists in the database.");
    }

    if (idAlreadyExists) {
      errors.push(
        "Staff ID already exists in the database."
      );
    }

    if (fileEmails.has(email)) {
      errors.push("Duplicate email exists in this file.");
    }

    if (fileStaffIds.has(staffId)) {
      errors.push(
        "Duplicate Staff ID exists in this file."
      );
    }

    fileEmails.add(email);
    fileStaffIds.add(staffId);

    return {
      ...row,
      name,
      email,
      password,
      staffId,
      department,
      qualification: String(
        row.qualification || ""
      ).trim(),
      designation,
      courseCodes,
      subjectCodes,
      status,
      errors,
    };
  };

  const validateData = () => {
    if (!uploadType || rows.length === 0) {
      setMessage({
        type: "error",
        text: "Select an upload type and Excel file first.",
      });
      return;
    }

    setValidating(true);
    setResult(null);

    const fileEmails = new Set();
    const fileIds = new Set();

    const checkedRows = rows.map((row) =>
      uploadType === "student"
        ? validateStudentRow(
            row,
            fileEmails,
            fileIds
          )
        : validateLecturerRow(
            row,
            fileEmails,
            fileIds
          )
    );

    const valid = checkedRows.filter(
      (row) => row.errors.length === 0
    );

    const invalid = checkedRows.filter(
      (row) => row.errors.length > 0
    );

    setValidRows(valid);
    setInvalidRows(invalid);

    setMessage({
      type: invalid.length > 0 ? "error" : "success",
      text: `${valid.length} valid row(s) and ${invalid.length} invalid row(s) found.`,
    });

    setValidating(false);
  };

  const importStudent = async (row) => {
    await axios.post(`${API_URL}/api/students`, {
      name: row.name,
      email: row.email,
      password: row.password,
      studentId: row.studentId,
      qualification: row.qualification,
      yearOfStudy: row.yearOfStudy,
      courseId: row.courseId,
      subjectIds: row.subjectIds,
      status: row.status,
    });
  };

  const importLecturer = async (row) => {
    const response = await axios.post(
      `${API_URL}/staff`,
      {
        name: row.name,
        email: row.email,
        password: row.password,
        staffId: row.staffId,
        department: row.department,
        qualification: row.qualification,
        designation: row.designation,
        status: row.status,
      }
    );

    const lecturerId = response.data?.staff?._id;

    if (!lecturerId) {
      throw new Error(
        "Lecturer account was created but its ID was not returned."
      );
    }

    for (const subjectCode of row.subjectCodes) {
      const subject = subjectByCode.get(subjectCode);

      await axios.put(
        `${API_URL}/api/subjects/${subject._id}/lecturers`,
        {
          lecturerIds: [lecturerId],
        }
      );
    }
  };

  const importValidRows = async () => {
    if (validRows.length === 0) return;

    setImporting(true);
    setResult(null);

    const successful = [];
    const failed = [];

    for (const row of validRows) {
      try {
        if (uploadType === "student") {
          await importStudent(row);
        } else {
          await importLecturer(row);
        }

        successful.push(row);
      } catch (error) {
        failed.push({
          ...row,
          errors: [
            error.response?.data?.message ||
              error.message ||
              "Import failed.",
          ],
        });
      }
    }

    setResult({
      successful: successful.length,
      failed: failed.length,
    });

    setInvalidRows((previous) => [
      ...previous,
      ...failed,
    ]);

    setValidRows([]);

    setMessage({
      type: failed.length > 0 ? "error" : "success",
      text: `${successful.length} row(s) imported and ${failed.length} row(s) failed.`,
    });

    setImporting(false);
  };

  const downloadErrorReport = () => {
    if (invalidRows.length === 0) return;

    const errorRows = invalidRows.map((row) => ({
      "Excel Row": row.excelRow,
      ID:
        uploadType === "student"
          ? row.studentId
          : row.staffId,
      Email: row.email,
      Errors: row.errors.join(" | "),
    }));

    const worksheet =
      XLSX.utils.json_to_sheet(errorRows);

    worksheet["!cols"] = [
      { wch: 12 },
      { wch: 20 },
      { wch: 32 },
      { wch: 80 },
    ];

    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      "Errors"
    );

    XLSX.writeFile(
      workbook,
      `${uploadType}_Bulk_Upload_Errors.xlsx`
    );
  };

  return (
    <main className="bulk-upload-page">
      <header className="bulk-upload-heading">
        <p>Data Management</p>
        <h2>Bulk Upload</h2>

        <span>
          Download a template, upload completed data and
          validate every row before importing.
        </span>
      </header>

      {message.text && (
        <div className={`bulk-message ${message.type}`}>
          <span>{message.text}</span>

          <button
            type="button"
            onClick={() =>
              setMessage({ type: "", text: "" })
            }
          >
            <FiX />
          </button>
        </div>
      )}

      <section className="bulk-upload-card">
        <div className="bulk-type-section">
          <h3>1. Select Upload Type</h3>

          <div className="bulk-type-grid">
            <button
              type="button"
              className={
                uploadType === "student" ? "selected" : ""
              }
              onClick={() => handleTypeChange("student")}
            >
              <FiUsers />
              <strong>Students</strong>
              <span>Upload student accounts and assignments</span>
            </button>

            <button
              type="button"
              className={
                uploadType === "lecturer" ? "selected" : ""
              }
              onClick={() => handleTypeChange("lecturer")}
            >
              <FiUserCheck />
              <strong>Lecturers</strong>
              <span>Upload teaching staff and assignments</span>
            </button>
          </div>
        </div>

        <div className="bulk-template-section">
          <div>
            <h3>2. Download Template</h3>
            <p>
              Use the latest template and do not rename its
              columns.
            </p>
          </div>

          <button
            type="button"
            onClick={downloadTemplate}
            disabled={!uploadType}
          >
            <FiDownload />
            Download{" "}
            {uploadType === "student"
              ? "Student"
              : uploadType === "lecturer"
                ? "Lecturer"
                : ""}{" "}
            Template
          </button>
        </div>

        <div className="bulk-file-section">
          <div>
            <h3>3. Upload Completed Excel File</h3>
            <p>
              Supported formats: .xlsx and .xls
            </p>
          </div>

          <label
            className={`bulk-file-picker ${
              !uploadType ? "disabled" : ""
            }`}
          >
            <FiUpload />

            <span>
              {fileName || "Choose Excel File"}
            </span>

            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={readExcelFile}
              disabled={!uploadType || loadingData}
            />
          </label>
        </div>

        {rows.length > 0 && (
          <div className="bulk-validation-section">
            <div>
              <h3>4. Validate Data</h3>
              <p>{rows.length} Excel row(s) loaded</p>
            </div>

            <button
              type="button"
              onClick={validateData}
              disabled={validating || importing}
            >
              <FiFileText />
              {validating
                ? "Validating..."
                : "Validate Data"}
            </button>
          </div>
        )}

        {(validRows.length > 0 ||
          invalidRows.length > 0) && (
          <section className="bulk-results">
            <div className="bulk-result-cards">
              <article className="valid">
                <FiCheckCircle />
                <strong>{validRows.length}</strong>
                <span>Valid Rows</span>
              </article>

              <article className="invalid">
                <FiAlertCircle />
                <strong>{invalidRows.length}</strong>
                <span>Invalid Rows</span>
              </article>
            </div>

            {invalidRows.length > 0 && (
              <div className="bulk-error-table-wrapper">
                <table className="bulk-error-table">
                  <thead>
                    <tr>
                      <th>Excel Row</th>
                      <th>ID</th>
                      <th>Email</th>
                      <th>Error</th>
                    </tr>
                  </thead>

                  <tbody>
                    {invalidRows.map((row, index) => (
                      <tr
                        key={`${row.excelRow}-${index}`}
                      >
                        <td>{row.excelRow}</td>

                        <td>
                          {uploadType === "student"
                            ? row.studentId
                            : row.staffId}
                        </td>

                        <td>{row.email}</td>

                        <td>{row.errors.join(" | ")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="bulk-result-actions">
              <button
                type="button"
                className="error-download"
                onClick={downloadErrorReport}
                disabled={invalidRows.length === 0}
              >
                <FiDownload />
                Download Error Report
              </button>

              <button
                type="button"
                className="import-button"
                onClick={importValidRows}
                disabled={
                  validRows.length === 0 || importing
                }
              >
                <FiUpload />

                {importing
                  ? "Importing..."
                  : `Import ${validRows.length} Valid Row(s)`}
              </button>
            </div>
          </section>
        )}

        {result && (
          <div className="bulk-final-result">
            <strong>Import completed</strong>
            <span>
              {result.successful} successful · {result.failed}{" "}
              failed
            </span>
          </div>
        )}
      </section>
    </main>
  );
}

export default BulkUpload;