const express = require("express");

const {
  createCourse,
  getCourses,
  getCourseById,
  updateCourse,
  deleteCourse,
  addSubjectsToCourse,
  removeSubjectFromCourse,
} = require(
  "../controllers/courseController"
);

const {
  adminOnly,
} = require(
  "../middleware/authMiddleware"
);

const router = express.Router();

router.post(
  "/api/courses",
  ...adminOnly,
  createCourse
);

router.get(
  "/api/courses",
  ...adminOnly,
  getCourses
);

router.get(
  "/api/courses/:courseId",
  ...adminOnly,
  getCourseById
);

router.put(
  "/api/courses/:courseId",
  ...adminOnly,
  updateCourse
);

router.delete(
  "/api/courses/:courseId",
  ...adminOnly,
  deleteCourse
);

router.put(
  "/api/courses/:courseId/subjects",
  ...adminOnly,
  addSubjectsToCourse
);

router.delete(
  "/api/courses/:courseId/subjects/:subjectId",
  ...adminOnly,
  removeSubjectFromCourse
);

module.exports = router;