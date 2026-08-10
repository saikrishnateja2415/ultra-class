const express = require("express");

const {
  createStudent,
  getStudents,
  getStudentById,
  updateStudent,
  deleteStudent,
} = require(
  "../controllers/studentController"
);

const {
  getStudentSettings,
  updateStudentSettingsProfile,
  changeStudentSettingsPassword,
} = require(
  "../controllers/studentSettingsController"
);

const {
  adminOnly,
  studentSelfOnly,
} = require(
  "../middleware/authMiddleware"
);

const router = express.Router();

/*
  Student Settings

  The URL contains the User account ID. The JWT must
  contain the same ID and the student role.
*/

router.get(
  "/student/settings/:userId",
  ...studentSelfOnly,
  getStudentSettings
);

router.put(
  "/student/settings/:userId/profile",
  ...studentSelfOnly,
  updateStudentSettingsProfile
);

router.put(
  "/student/settings/:userId/password",
  ...studentSelfOnly,
  changeStudentSettingsPassword
);

/*
  Admin student-management routes
*/

router.post(
  "/api/students",
  ...adminOnly,
  createStudent
);

router.get(
  "/api/students",
  ...adminOnly,
  getStudents
);

router.get(
  "/api/students/:studentId",
  ...adminOnly,
  getStudentById
);

router.put(
  "/api/students/:studentId",
  ...adminOnly,
  updateStudent
);

router.delete(
  "/api/students/:studentId",
  ...adminOnly,
  deleteStudent
);

module.exports = router;