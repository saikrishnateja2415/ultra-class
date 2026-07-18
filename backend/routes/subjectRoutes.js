const express = require("express");

const {
  createSubject,
  getSubjects,
  getSubjectById,
  updateSubject,
  deleteSubject,
  addStudentsToSubject,
  removeStudentFromSubject,
  addLecturersToSubject,
  removeLecturerFromSubject,
} = require("../controllers/subjectController");

const router = express.Router();

router.post("/api/subjects", createSubject);

router.get("/api/subjects", getSubjects);

router.get("/api/subjects/:subjectId", getSubjectById);

router.put("/api/subjects/:subjectId", updateSubject);

router.delete("/api/subjects/:subjectId", deleteSubject);

router.put(
  "/api/subjects/:subjectId/students",
  addStudentsToSubject
);

router.delete(
  "/api/subjects/:subjectId/students/:studentId",
  removeStudentFromSubject
);

router.put(
  "/api/subjects/:subjectId/lecturers",
  addLecturersToSubject
);

router.delete(
  "/api/subjects/:subjectId/lecturers/:lecturerId",
  removeLecturerFromSubject
);

module.exports = router;