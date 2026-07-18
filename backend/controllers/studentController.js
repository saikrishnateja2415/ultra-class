const bcrypt = require("bcryptjs");

const User = require("../models/User");
const Student = require("../models/Student");
const Course = require("../models/Course");
const Subject = require("../models/Subject");

const populateStudent = (studentQuery) => {
  return studentQuery
    .populate("userId", "name email role")
    .populate(
      "courseId",
      "courseName courseCode department academicYear subjects"
    )
    .populate(
      "subjects",
      "subjectName subjectCode credits semester"
    );
};

const createStudent = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      studentId,
      qualification,
      yearOfStudy,
      courseId,
      subjectIds,
      status,
    } = req.body;

    if (
      !name ||
      !email ||
      !password ||
      !studentId ||
      !courseId
    ) {
      return res.status(400).json({
        message:
          "Name, email, password, student ID, and course are required.",
      });
    }

    if (!Array.isArray(subjectIds)) {
      return res.status(400).json({
        message: "Subject IDs must be provided as an array.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedStudentId = studentId
      .trim()
      .toUpperCase();

    const existingUser = await User.findOne({
      email: normalizedEmail,
    });

    if (existingUser) {
      return res.status(409).json({
        message: "A user with this email already exists.",
      });
    }

    const existingStudent = await Student.findOne({
      studentId: normalizedStudentId,
    });

    if (existingStudent) {
      return res.status(409).json({
        message:
          "A student with this student ID already exists.",
      });
    }

    const course = await Course.findById(courseId);

    if (!course) {
      return res.status(404).json({
        message: "Selected course was not found.",
      });
    }

    const uniqueSubjectIds = [
      ...new Set(subjectIds.map((id) => String(id))),
    ];

    if (uniqueSubjectIds.length > 0) {
      const subjects = await Subject.find({
        _id: {
          $in: uniqueSubjectIds,
        },
      });

      if (subjects.length !== uniqueSubjectIds.length) {
        return res.status(400).json({
          message:
            "One or more selected subjects are invalid.",
        });
      }

      const courseSubjectIds = course.subjects.map((id) =>
        id.toString()
      );

      const invalidSubject = uniqueSubjectIds.some(
        (subjectIdValue) =>
          !courseSubjectIds.includes(subjectIdValue)
      );

      if (invalidSubject) {
        return res.status(400).json({
          message:
            "One or more selected subjects do not belong to the selected course.",
        });
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    let createdUser = null;
    let createdStudent = null;

    try {
      createdUser = await User.create({
        name: name.trim(),
        email: normalizedEmail,
        password: hashedPassword,
        role: "student",
      });

      createdStudent = await Student.create({
        userId: createdUser._id,
        studentId: normalizedStudentId,
        qualification: qualification?.trim() || "",
        yearOfStudy: Number(yearOfStudy) || 1,
        courseId: course._id,
        subjects: uniqueSubjectIds,
        status: status || "active",
      });

      await Course.findByIdAndUpdate(course._id, {
        $addToSet: {
          students: createdStudent._id,
        },
      });

      if (uniqueSubjectIds.length > 0) {
        await Subject.updateMany(
          {
            _id: {
              $in: uniqueSubjectIds,
            },
          },
          {
            $addToSet: {
              students: createdStudent._id,
            },
          }
        );
      }
    } catch (creationError) {
      if (createdStudent?._id) {
        await Student.findByIdAndDelete(
          createdStudent._id
        );
      }

      if (createdUser?._id) {
        await User.findByIdAndDelete(createdUser._id);
      }

      throw creationError;
    }

    const populatedStudent = await populateStudent(
      Student.findById(createdStudent._id)
    );

    return res.status(201).json({
      message: "Student created successfully.",
      student: populatedStudent,
    });
  } catch (error) {
    console.error("Create student error:", error);

    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map(
        (item) => item.message
      );

      return res.status(400).json({
        message: messages.join(", "),
      });
    }

    if (error.name === "CastError") {
      return res.status(400).json({
        message: "Invalid course or subject ID.",
      });
    }

    if (error.code === 11000) {
      return res.status(409).json({
        message:
          "A student with this email or student ID already exists.",
      });
    }

    return res.status(500).json({
      message: "Server error while creating the student.",
    });
  }
};

const getStudents = async (req, res) => {
  try {
    const students = await populateStudent(
      Student.find().sort({
        createdAt: -1,
      })
    );

    return res.status(200).json(students);
  } catch (error) {
    console.error("Get students error:", error);

    return res.status(500).json({
      message: "Server error while loading students.",
    });
  }
};

const getStudentById = async (req, res) => {
  try {
    const student = await populateStudent(
      Student.findById(req.params.studentId)
    );

    if (!student) {
      return res.status(404).json({
        message: "Student not found.",
      });
    }

    return res.status(200).json(student);
  } catch (error) {
    console.error("Get student error:", error);

    if (error.name === "CastError") {
      return res.status(400).json({
        message: "Invalid student ID.",
      });
    }

    return res.status(500).json({
      message: "Server error while loading the student.",
    });
  }
};

const updateStudent = async (req, res) => {
  try {
    const {
      name,
      email,
      studentId,
      qualification,
      yearOfStudy,
      courseId,
      subjectIds,
      status,
    } = req.body;

    if (
      !name ||
      !email ||
      !studentId ||
      !courseId
    ) {
      return res.status(400).json({
        message:
          "Name, email, student ID, and course are required.",
      });
    }

    if (!Array.isArray(subjectIds)) {
      return res.status(400).json({
        message: "Subject IDs must be provided as an array.",
      });
    }

    const student = await Student.findById(
      req.params.studentId
    );

    if (!student) {
      return res.status(404).json({
        message: "Student not found.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedStudentId = studentId
      .trim()
      .toUpperCase();

    const existingUser = await User.findOne({
      email: normalizedEmail,
      _id: {
        $ne: student.userId,
      },
    });

    if (existingUser) {
      return res.status(409).json({
        message:
          "Another account already uses this email.",
      });
    }

    const existingStudent = await Student.findOne({
      studentId: normalizedStudentId,
      _id: {
        $ne: student._id,
      },
    });

    if (existingStudent) {
      return res.status(409).json({
        message:
          "Another student already uses this student ID.",
      });
    }

    const newCourse = await Course.findById(courseId);

    if (!newCourse) {
      return res.status(404).json({
        message: "Selected course was not found.",
      });
    }

    const uniqueSubjectIds = [
      ...new Set(subjectIds.map((id) => String(id))),
    ];

    if (uniqueSubjectIds.length > 0) {
      const validSubjects = await Subject.find({
        _id: {
          $in: uniqueSubjectIds,
        },
      });

      if (
        validSubjects.length !== uniqueSubjectIds.length
      ) {
        return res.status(400).json({
          message:
            "One or more selected subjects are invalid.",
        });
      }

      const courseSubjectIds = newCourse.subjects.map((id) =>
        id.toString()
      );

      const invalidSubject = uniqueSubjectIds.some(
        (subjectIdValue) =>
          !courseSubjectIds.includes(subjectIdValue)
      );

      if (invalidSubject) {
        return res.status(400).json({
          message:
            "One or more selected subjects do not belong to the selected course.",
        });
      }
    }

    const oldCourseId = student.courseId
      ? student.courseId.toString()
      : null;

    const oldSubjectIds = student.subjects.map((id) =>
      id.toString()
    );

    await User.findByIdAndUpdate(
      student.userId,
      {
        name: name.trim(),
        email: normalizedEmail,
      },
      {
        runValidators: true,
      }
    );

    if (
      oldCourseId &&
      oldCourseId !== newCourse._id.toString()
    ) {
      await Course.findByIdAndUpdate(oldCourseId, {
        $pull: {
          students: student._id,
        },
      });
    }

    await Course.findByIdAndUpdate(newCourse._id, {
      $addToSet: {
        students: student._id,
      },
    });

    const removedSubjectIds = oldSubjectIds.filter(
      (oldSubjectId) =>
        !uniqueSubjectIds.includes(oldSubjectId)
    );

    if (removedSubjectIds.length > 0) {
      await Subject.updateMany(
        {
          _id: {
            $in: removedSubjectIds,
          },
        },
        {
          $pull: {
            students: student._id,
          },
        }
      );
    }

    if (uniqueSubjectIds.length > 0) {
      await Subject.updateMany(
        {
          _id: {
            $in: uniqueSubjectIds,
          },
        },
        {
          $addToSet: {
            students: student._id,
          },
        }
      );
    }

    student.studentId = normalizedStudentId;
    student.qualification =
      qualification?.trim() || "";
    student.yearOfStudy = Number(yearOfStudy) || 1;
    student.courseId = newCourse._id;
    student.subjects = uniqueSubjectIds;
    student.status = status || "active";

    await student.save();

    const updatedStudent = await populateStudent(
      Student.findById(student._id)
    );

    return res.status(200).json({
      message: "Student updated successfully.",
      student: updatedStudent,
    });
  } catch (error) {
    console.error("Update student error:", error);

    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map(
        (item) => item.message
      );

      return res.status(400).json({
        message: messages.join(", "),
      });
    }

    if (error.name === "CastError") {
      return res.status(400).json({
        message: "Invalid student, course, or subject ID.",
      });
    }

    if (error.code === 11000) {
      return res.status(409).json({
        message:
          "Another student already uses this email or student ID.",
      });
    }

    return res.status(500).json({
      message: "Server error while updating the student.",
    });
  }
};

const deleteStudent = async (req, res) => {
  try {
    const student = await Student.findById(
      req.params.studentId
    );

    if (!student) {
      return res.status(404).json({
        message: "Student not found.",
      });
    }

    await Course.updateMany(
      {
        students: student._id,
      },
      {
        $pull: {
          students: student._id,
        },
      }
    );

    await Subject.updateMany(
      {
        students: student._id,
      },
      {
        $pull: {
          students: student._id,
        },
      }
    );

    await Student.findByIdAndDelete(student._id);

    if (student.userId) {
      await User.findByIdAndDelete(student.userId);
    }

    return res.status(200).json({
      message: "Student deleted successfully.",
    });
  } catch (error) {
    console.error("Delete student error:", error);

    if (error.name === "CastError") {
      return res.status(400).json({
        message: "Invalid student ID.",
      });
    }

    return res.status(500).json({
      message: "Server error while deleting the student.",
    });
  }
};

module.exports = {
  createStudent,
  getStudents,
  getStudentById,
  updateStudent,
  deleteStudent,
};