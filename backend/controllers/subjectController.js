const Subject = require("../models/Subject");
const Student = require("../models/Student");
const Staff = require("../models/Staff");

const populateSubject = (query) =>
  query
    .populate(
      "courses",
      "courseName courseCode department academicYear status"
    )
    .populate({
      path: "students",
      select: "studentId userId status",
      populate: {
        path: "userId",
        select: "name email",
      },
    })
    .populate(
      "lecturers",
      "staffId name email department designation status"
    );

const sendValidationError = (error, res) => {
  const messages = Object.values(error.errors).map(
    (item) => item.message
  );

  return res.status(400).json({
    message: messages.join(", "),
  });
};

// Create subject
const createSubject = async (req, res) => {
  try {
    const {
      subjectName,
      subjectCode,
      department,
      credits,
      semester,
      academicYear,
      description,
      status,
    } = req.body;

    if (
      !subjectName ||
      !subjectCode ||
      !department ||
      credits === undefined ||
      semester === undefined ||
      !academicYear
    ) {
      return res.status(400).json({
        message:
          "Please complete all required subject fields.",
      });
    }

    const formattedCode = subjectCode.trim().toUpperCase();

    const existingSubject = await Subject.findOne({
      subjectCode: formattedCode,
    });

    if (existingSubject) {
      return res.status(409).json({
        message:
          "A subject with this subject code already exists.",
      });
    }

    const subject = await Subject.create({
      subjectName: subjectName.trim(),
      subjectCode: formattedCode,
      department: department.trim(),
      credits: Number(credits),
      semester: Number(semester),
      academicYear: academicYear.trim(),
      description: description?.trim() || "",
      status: status || "active",
    });

    return res.status(201).json({
      message: "Subject created successfully.",
      subject,
    });
  } catch (error) {
    console.error("Create subject error:", error);

    if (error.name === "ValidationError") {
      return sendValidationError(error, res);
    }

    if (error.code === 11000) {
      return res.status(409).json({
        message:
          "A subject with this subject code already exists.",
      });
    }

    return res.status(500).json({
      message: "Server error while creating the subject.",
    });
  }
};

// Get all subjects
const getSubjects = async (req, res) => {
  try {
    const subjects = await populateSubject(
      Subject.find().sort({ createdAt: -1 })
    );

    return res.status(200).json(subjects);
  } catch (error) {
    console.error("Get subjects error:", error);

    return res.status(500).json({
      message: "Server error while loading subjects.",
    });
  }
};

// Get one subject
const getSubjectById = async (req, res) => {
  try {
    const subject = await populateSubject(
      Subject.findById(req.params.subjectId)
    );

    if (!subject) {
      return res.status(404).json({
        message: "Subject not found.",
      });
    }

    return res.status(200).json(subject);
  } catch (error) {
    console.error("Get subject error:", error);

    if (error.name === "CastError") {
      return res.status(400).json({
        message: "Invalid subject ID.",
      });
    }

    return res.status(500).json({
      message: "Server error while loading the subject.",
    });
  }
};

// Update subject
const updateSubject = async (req, res) => {
  try {
    const subject = await Subject.findById(
      req.params.subjectId
    );

    if (!subject) {
      return res.status(404).json({
        message: "Subject not found.",
      });
    }

    const {
      subjectName,
      subjectCode,
      department,
      credits,
      semester,
      academicYear,
      description,
      status,
    } = req.body;

    if (subjectCode !== undefined) {
      const formattedCode = subjectCode
        .trim()
        .toUpperCase();

      const duplicate = await Subject.findOne({
        subjectCode: formattedCode,
        _id: { $ne: subject._id },
      });

      if (duplicate) {
        return res.status(409).json({
          message:
            "Another subject already uses this subject code.",
        });
      }

      subject.subjectCode = formattedCode;
    }

    if (subjectName !== undefined) {
      subject.subjectName = subjectName.trim();
    }

    if (department !== undefined) {
      subject.department = department.trim();
    }

    if (credits !== undefined) {
      subject.credits = Number(credits);
    }

    if (semester !== undefined) {
      subject.semester = Number(semester);
    }

    if (academicYear !== undefined) {
      subject.academicYear = academicYear.trim();
    }

    if (description !== undefined) {
      subject.description = description.trim();
    }

    if (status !== undefined) {
      subject.status = status;
    }

    await subject.save();

    const updatedSubject = await populateSubject(
      Subject.findById(subject._id)
    );

    return res.status(200).json({
      message: "Subject updated successfully.",
      subject: updatedSubject,
    });
  } catch (error) {
    console.error("Update subject error:", error);

    if (error.name === "ValidationError") {
      return sendValidationError(error, res);
    }

    if (error.name === "CastError") {
      return res.status(400).json({
        message: "Invalid subject ID.",
      });
    }

    if (error.code === 11000) {
      return res.status(409).json({
        message:
          "Another subject already uses this subject code.",
      });
    }

    return res.status(500).json({
      message: "Server error while updating the subject.",
    });
  }
};

// Delete subject
const deleteSubject = async (req, res) => {
  try {
    const subject = await Subject.findById(
      req.params.subjectId
    );

    if (!subject) {
      return res.status(404).json({
        message: "Subject not found.",
      });
    }

    if (
      subject.courses.length > 0 ||
      subject.students.length > 0 ||
      subject.lecturers.length > 0
    ) {
      return res.status(400).json({
        message:
          "This subject cannot be deleted while courses, students, or lecturers are assigned to it.",
      });
    }

    await subject.deleteOne();

    return res.status(200).json({
      message: "Subject deleted successfully.",
    });
  } catch (error) {
    console.error("Delete subject error:", error);

    if (error.name === "CastError") {
      return res.status(400).json({
        message: "Invalid subject ID.",
      });
    }

    return res.status(500).json({
      message: "Server error while deleting the subject.",
    });
  }
};

// Add students to subject
const addStudentsToSubject = async (req, res) => {
  try {
    const { subjectId } = req.params;
    const { studentIds } = req.body;

    if (
      !Array.isArray(studentIds) ||
      studentIds.length === 0
    ) {
      return res.status(400).json({
        message: "Please select at least one student.",
      });
    }

    const subject = await Subject.findById(subjectId);

    if (!subject) {
      return res.status(404).json({
        message: "Subject not found.",
      });
    }

    if (subject.courses.length === 0) {
      return res.status(400).json({
        message:
          "Assign this subject to a course before adding students.",
      });
    }

    const uniqueIds = [
      ...new Set(studentIds.map((id) => String(id))),
    ];

    const students = await Student.find({
      _id: { $in: uniqueIds },
    });

    if (students.length !== uniqueIds.length) {
      return res.status(400).json({
        message:
          "One or more selected students are invalid.",
      });
    }

    const subjectCourseIds = subject.courses.map((id) =>
      id.toString()
    );

    const ineligibleStudent = students.find(
      (student) =>
        !student.courseId ||
        !subjectCourseIds.includes(
          student.courseId.toString()
        )
    );

    if (ineligibleStudent) {
      return res.status(400).json({
        message:
          "Every selected student must belong to a course assigned to this subject.",
      });
    }

    const assignedIds = subject.students.map((id) =>
      id.toString()
    );

    const newStudentIds = uniqueIds.filter(
      (id) => !assignedIds.includes(id)
    );

    if (newStudentIds.length === 0) {
      return res.status(409).json({
        message:
          "All selected students are already assigned to this subject.",
      });
    }

    subject.students.push(...newStudentIds);
    await subject.save();

    await Student.updateMany(
      { _id: { $in: newStudentIds } },
      {
        $addToSet: {
          subjects: subject._id,
        },
      }
    );

    return res.status(200).json({
      message: `${newStudentIds.length} student(s) added to the subject successfully.`,
    });
  } catch (error) {
    console.error("Add students to subject error:", error);

    if (error.name === "CastError") {
      return res.status(400).json({
        message: "Invalid subject or student ID.",
      });
    }

    return res.status(500).json({
      message:
        "Server error while assigning students to the subject.",
    });
  }
};

// Remove student from subject
const removeStudentFromSubject = async (req, res) => {
  try {
    const { subjectId, studentId } = req.params;

    const subject = await Subject.findById(subjectId);

    if (!subject) {
      return res.status(404).json({
        message: "Subject not found.",
      });
    }

    const isAssigned = subject.students.some(
      (id) => id.toString() === studentId
    );

    if (!isAssigned) {
      return res.status(400).json({
        message:
          "This student is not assigned to the subject.",
      });
    }

    subject.students = subject.students.filter(
      (id) => id.toString() !== studentId
    );

    await subject.save();

    await Student.findByIdAndUpdate(studentId, {
      $pull: {
        subjects: subject._id,
      },
    });

    return res.status(200).json({
      message:
        "Student removed from the subject successfully.",
    });
  } catch (error) {
    console.error(
      "Remove student from subject error:",
      error
    );

    if (error.name === "CastError") {
      return res.status(400).json({
        message: "Invalid subject or student ID.",
      });
    }

    return res.status(500).json({
      message:
        "Server error while removing the student from the subject.",
    });
  }
};

// Add lecturers to subject
const addLecturersToSubject = async (req, res) => {
  try {
    const { subjectId } = req.params;
    const { lecturerIds } = req.body;

    if (
      !Array.isArray(lecturerIds) ||
      lecturerIds.length === 0
    ) {
      return res.status(400).json({
        message: "Please select at least one lecturer.",
      });
    }

    const subject = await Subject.findById(subjectId);

    if (!subject) {
      return res.status(404).json({
        message: "Subject not found.",
      });
    }

    if (subject.courses.length === 0) {
      return res.status(400).json({
        message:
          "Assign this subject to a course before assigning lecturers.",
      });
    }

    const uniqueIds = [
      ...new Set(lecturerIds.map((id) => String(id))),
    ];

    const lecturers = await Staff.find({
      _id: { $in: uniqueIds },
    });

    if (lecturers.length !== uniqueIds.length) {
      return res.status(400).json({
        message:
          "One or more selected lecturers are invalid.",
      });
    }

    const invalidLecturer = lecturers.find(
      (lecturer) =>
        lecturer.designation === "Administrator" ||
        lecturer.status !== "active"
    );

    if (invalidLecturer) {
      return res.status(400).json({
        message:
          "Only active teaching staff can be assigned to subjects.",
      });
    }

    const assignedIds = subject.lecturers.map((id) =>
      id.toString()
    );

    const newLecturerIds = uniqueIds.filter(
      (id) => !assignedIds.includes(id)
    );

    if (newLecturerIds.length === 0) {
      return res.status(409).json({
        message:
          "All selected lecturers are already assigned to this subject.",
      });
    }

    subject.lecturers.push(...newLecturerIds);
    await subject.save();

    await Staff.updateMany(
      { _id: { $in: newLecturerIds } },
      {
        $addToSet: {
          subjects: subject._id,
          courses: {
            $each: subject.courses,
          },
        },
      }
    );

    return res.status(200).json({
      message: `${newLecturerIds.length} lecturer(s) assigned to the subject successfully.`,
    });
  } catch (error) {
    console.error(
      "Add lecturers to subject error:",
      error
    );

    if (error.name === "CastError") {
      return res.status(400).json({
        message: "Invalid subject or lecturer ID.",
      });
    }

    return res.status(500).json({
      message:
        "Server error while assigning lecturers to the subject.",
    });
  }
};

// Remove lecturer from subject
const removeLecturerFromSubject = async (req, res) => {
  try {
    const { subjectId, lecturerId } = req.params;

    const subject = await Subject.findById(subjectId);

    if (!subject) {
      return res.status(404).json({
        message: "Subject not found.",
      });
    }

    const isAssigned = subject.lecturers.some(
      (id) => id.toString() === lecturerId
    );

    if (!isAssigned) {
      return res.status(400).json({
        message:
          "This lecturer is not assigned to the subject.",
      });
    }

    subject.lecturers = subject.lecturers.filter(
      (id) => id.toString() !== lecturerId
    );

    await subject.save();

    await Staff.findByIdAndUpdate(lecturerId, {
      $pull: {
        subjects: subject._id,
      },
    });

    return res.status(200).json({
      message:
        "Lecturer removed from the subject successfully.",
    });
  } catch (error) {
    console.error(
      "Remove lecturer from subject error:",
      error
    );

    if (error.name === "CastError") {
      return res.status(400).json({
        message: "Invalid subject or lecturer ID.",
      });
    }

    return res.status(500).json({
      message:
        "Server error while removing the lecturer from the subject.",
    });
  }
};

module.exports = {
  createSubject,
  getSubjects,
  getSubjectById,
  updateSubject,
  deleteSubject,
  addStudentsToSubject,
  removeStudentFromSubject,
  addLecturersToSubject,
  removeLecturerFromSubject,
};