const express = require("express");

const {
  createStudent,
  getStudents,
  getStudentById,
  updateStudent,
  deleteStudent,
} = require("../controllers/studentController");

const router = express.Router();

router.post("/api/students", createStudent);
router.get("/api/students", getStudents);
router.get("/api/students/:studentId", getStudentById);
router.put("/api/students/:studentId", updateStudent);
router.delete("/api/students/:studentId", deleteStudent);

module.exports = router;