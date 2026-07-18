const express = require("express");

const {
  createCourse,
  getCourses,
  getCourseById,
  updateCourse,
  deleteCourse,
  addSubjectsToCourse,
  removeSubjectFromCourse,
} = require("../controllers/courseController");

const router = express.Router();

router.post("/api/courses", createCourse);

router.get("/api/courses", getCourses);

router.get("/api/courses/:courseId", getCourseById);

router.put("/api/courses/:courseId", updateCourse);

router.delete("/api/courses/:courseId", deleteCourse);

router.put(
  "/api/courses/:courseId/subjects",
  addSubjectsToCourse
);

router.delete(
  "/api/courses/:courseId/subjects/:subjectId",
  removeSubjectFromCourse
);

module.exports = router;