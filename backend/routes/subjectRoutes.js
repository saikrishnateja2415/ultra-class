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
} = require(
  "../controllers/subjectController"
);

const {
  adminOnly,
} = require(
  "../middleware/authMiddleware"
);

const router = express.Router();

router.post(
  "/api/subjects",
  ...adminOnly,
  createSubject
);

router.get(
  "/api/subjects",
  ...adminOnly,
  getSubjects
);

router.get(
  "/api/subjects/:subjectId",
  ...adminOnly,
  getSubjectById
);

router.put(
  "/api/subjects/:subjectId",
  ...adminOnly,
  updateSubject
);

router.delete(
  "/api/subjects/:subjectId",
  ...adminOnly,
  deleteSubject
);

router.put(
  "/api/subjects/:subjectId/students",
  ...adminOnly,
  addStudentsToSubject
);

router.delete(
  "/api/subjects/:subjectId/students/:studentId",
  ...adminOnly,
  removeStudentFromSubject
);

router.put(
  "/api/subjects/:subjectId/lecturers",
  ...adminOnly,
  addLecturersToSubject
);

router.delete(
  "/api/subjects/:subjectId/lecturers/:lecturerId",
  ...adminOnly,
  removeLecturerFromSubject
);

module.exports = router;