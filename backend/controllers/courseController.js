const Course = require("../models/Course");
const Subject = require("../models/Subject");

// Create a new course
const createCourse = async (req, res) => {
  try {
    const {
      courseName,
      courseCode,
      department,
      qualificationLevel,
      duration,
      academicYear,
      description,
      status,
    } = req.body;

    if (
      !courseName ||
      !courseCode ||
      !department ||
      !qualificationLevel ||
      !duration ||
      !academicYear
    ) {
      return res.status(400).json({
        message: "Please complete all required course fields.",
      });
    }

    const formattedCourseCode = courseCode.trim().toUpperCase();

    const existingCourse = await Course.findOne({
      courseCode: formattedCourseCode,
    });

    if (existingCourse) {
      return res.status(409).json({
        message: "A course with this course code already exists.",
      });
    }

    const course = await Course.create({
      courseName: courseName.trim(),
      courseCode: formattedCourseCode,
      department: department.trim(),
      qualificationLevel,
      duration,
      academicYear: academicYear.trim(),
      description: description?.trim() || "",
      status: status || "active",
    });

    return res.status(201).json({
      message: "Course created successfully.",
      course,
    });
  } catch (error) {
    console.error("Create course error:", error);

    if (error.name === "ValidationError") {
      const validationMessages = Object.values(error.errors).map(
        (item) => item.message
      );

      return res.status(400).json({
        message: validationMessages.join(", "),
      });
    }

    if (error.code === 11000) {
      return res.status(409).json({
        message: "A course with this course code already exists.",
      });
    }

    return res.status(500).json({
      message: "Server error while creating the course.",
    });
  }
};

// Get all courses
const getCourses = async (req, res) => {
  try {
    const courses = await Course.find()
      .sort({ createdAt: -1 })
      .populate(
        "subjects",
        "subjectName subjectCode department credits semester academicYear status"
      )
      .populate({
        path: "students",
        select: "studentId userId status",
        populate: {
          path: "userId",
          select: "name email",
        },
      });

    return res.status(200).json(courses);
  } catch (error) {
    console.error("Get courses error:", error);

    return res.status(500).json({
      message: "Server error while loading courses.",
    });
  }
};

// Get one course
const getCourseById = async (req, res) => {
  try {
    const course = await Course.findById(req.params.courseId)
      .populate(
        "subjects",
        "subjectName subjectCode department credits semester academicYear status"
      )
      .populate({
        path: "students",
        select: "studentId userId status",
        populate: {
          path: "userId",
          select: "name email",
        },
      });

    if (!course) {
      return res.status(404).json({
        message: "Course not found.",
      });
    }

    return res.status(200).json(course);
  } catch (error) {
    console.error("Get course error:", error);

    if (error.name === "CastError") {
      return res.status(400).json({
        message: "Invalid course ID.",
      });
    }

    return res.status(500).json({
      message: "Server error while loading the course.",
    });
  }
};

// Update a course
const updateCourse = async (req, res) => {
  try {
    const {
      courseName,
      courseCode,
      department,
      qualificationLevel,
      duration,
      academicYear,
      description,
      status,
    } = req.body;

    const course = await Course.findById(req.params.courseId);

    if (!course) {
      return res.status(404).json({
        message: "Course not found.",
      });
    }

    if (courseCode !== undefined) {
      const formattedCourseCode = courseCode.trim().toUpperCase();

      const duplicateCourse = await Course.findOne({
        courseCode: formattedCourseCode,
        _id: { $ne: course._id },
      });

      if (duplicateCourse) {
        return res.status(409).json({
          message: "Another course already uses this course code.",
        });
      }

      course.courseCode = formattedCourseCode;
    }

    if (courseName !== undefined) {
      course.courseName = courseName.trim();
    }

    if (department !== undefined) {
      course.department = department.trim();
    }

    if (qualificationLevel !== undefined) {
      course.qualificationLevel = qualificationLevel;
    }

    if (duration !== undefined) {
      course.duration = duration;
    }

    if (academicYear !== undefined) {
      course.academicYear = academicYear.trim();
    }

    if (description !== undefined) {
      course.description = description.trim();
    }

    if (status !== undefined) {
      course.status = status;
    }

    const updatedCourse = await course.save();

    return res.status(200).json({
      message: "Course updated successfully.",
      course: updatedCourse,
    });
  } catch (error) {
    console.error("Update course error:", error);

    if (error.name === "ValidationError") {
      const validationMessages = Object.values(error.errors).map(
        (item) => item.message
      );

      return res.status(400).json({
        message: validationMessages.join(", "),
      });
    }

    if (error.name === "CastError") {
      return res.status(400).json({
        message: "Invalid course ID.",
      });
    }

    if (error.code === 11000) {
      return res.status(409).json({
        message: "Another course already uses this course code.",
      });
    }

    return res.status(500).json({
      message: "Server error while updating the course.",
    });
  }
};

// Delete a course
const deleteCourse = async (req, res) => {
  try {
    const course = await Course.findById(req.params.courseId);

    if (!course) {
      return res.status(404).json({
        message: "Course not found.",
      });
    }

    if (course.students.length > 0 || course.subjects.length > 0) {
      return res.status(400).json({
        message:
          "This course cannot be deleted while students or subjects are assigned to it.",
      });
    }

    await course.deleteOne();

    return res.status(200).json({
      message: "Course deleted successfully.",
    });
  } catch (error) {
    console.error("Delete course error:", error);

    if (error.name === "CastError") {
      return res.status(400).json({
        message: "Invalid course ID.",
      });
    }

    return res.status(500).json({
      message: "Server error while deleting the course.",
    });
  }
};

// Add one or more subjects to a course
const addSubjectsToCourse = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { subjectIds } = req.body;

    if (!Array.isArray(subjectIds) || subjectIds.length === 0) {
      return res.status(400).json({
        message: "Please select at least one subject.",
      });
    }

    const uniqueSubjectIds = [
      ...new Set(subjectIds.map((id) => String(id))),
    ];

    const course = await Course.findById(courseId);

    if (!course) {
      return res.status(404).json({
        message: "Course not found.",
      });
    }

    const subjects = await Subject.find({
      _id: { $in: uniqueSubjectIds },
    });

    if (subjects.length !== uniqueSubjectIds.length) {
      return res.status(400).json({
        message: "One or more selected subjects are invalid.",
      });
    }

    const alreadyAssignedIds = course.subjects.map((subjectId) =>
      subjectId.toString()
    );

    const newSubjectIds = uniqueSubjectIds.filter(
      (subjectId) => !alreadyAssignedIds.includes(subjectId)
    );

    if (newSubjectIds.length === 0) {
      return res.status(409).json({
        message:
          "All selected subjects are already assigned to this course.",
      });
    }

    course.subjects.push(...newSubjectIds);

    await course.save();

    await Subject.updateMany(
      {
        _id: { $in: newSubjectIds },
      },
      {
        $addToSet: {
          courses: course._id,
        },
      }
    );

    const updatedCourse = await Course.findById(courseId).populate(
      "subjects",
      "subjectName subjectCode department credits semester academicYear status"
    );

    return res.status(200).json({
      message: `${newSubjectIds.length} subject(s) added to the course successfully.`,
      course: updatedCourse,
    });
  } catch (error) {
    console.error("Add subjects to course error:", error);

    if (error.name === "CastError") {
      return res.status(400).json({
        message: "Invalid course or subject ID.",
      });
    }

    return res.status(500).json({
      message: "Server error while assigning subjects to the course.",
    });
  }
};

// Remove one subject from a course
const removeSubjectFromCourse = async (req, res) => {
  try {
    const { courseId, subjectId } = req.params;

    const course = await Course.findById(courseId);

    if (!course) {
      return res.status(404).json({
        message: "Course not found.",
      });
    }

    const subject = await Subject.findById(subjectId);

    if (!subject) {
      return res.status(404).json({
        message: "Subject not found.",
      });
    }

    const isAssigned = course.subjects.some(
      (assignedSubjectId) =>
        assignedSubjectId.toString() === subjectId
    );

    if (!isAssigned) {
      return res.status(400).json({
        message: "This subject is not assigned to the course.",
      });
    }

    course.subjects = course.subjects.filter(
      (assignedSubjectId) =>
        assignedSubjectId.toString() !== subjectId
    );

    await course.save();

    await Subject.findByIdAndUpdate(subjectId, {
      $pull: {
        courses: course._id,
      },
    });

    const updatedCourse = await Course.findById(courseId).populate(
      "subjects",
      "subjectName subjectCode department credits semester academicYear status"
    );

    return res.status(200).json({
      message: "Subject removed from the course successfully.",
      course: updatedCourse,
    });
  } catch (error) {
    console.error("Remove subject from course error:", error);

    if (error.name === "CastError") {
      return res.status(400).json({
        message: "Invalid course or subject ID.",
      });
    }

    return res.status(500).json({
      message:
        "Server error while removing the subject from the course.",
    });
  }
};

module.exports = {
  createCourse,
  getCourses,
  getCourseById,
  updateCourse,
  deleteCourse,
  addSubjectsToCourse,
  removeSubjectFromCourse,
};