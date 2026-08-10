const express = require("express");

const Session = require("../models/Session");
const Staff = require("../models/Staff");
const Student = require("../models/Student");
const Subject = require("../models/Subject");
const Course = require("../models/Course");
const SessionAIAnalysis = require("../models/SessionAIAnalysis");

const {
  lecturerOnly,
  studentOnly,
  requireSelf,
} = require("../middleware/authMiddleware");

const router = express.Router();

function generateSessionCode() {
  const randomCode = Math.random()
    .toString(36)
    .substring(2, 7)
    .toUpperCase();

  return `UC-${randomCode}`;
}

/*
|--------------------------------------------------------------------------
| LECTURER: GET ASSIGNED SUBJECTS
|--------------------------------------------------------------------------
*/

router.get(
  "/lecturer/:lecturerId/subjects",
  ...lecturerOnly,
  requireSelf("lecturerId"),
  async (req, res) => {
    try {
      const { lecturerId } = req.params;

      const staff = await Staff.findOne({
        userId: lecturerId,
        status: "active",
      });

      if (!staff) {
        return res.status(404).json({
          success: false,
          message: "Active lecturer profile not found",
        });
      }

      const subjects = await Subject.find({
        _id: {
          $in: staff.subjects,
        },
        lecturers: staff._id,
        status: "active",
      })
        .select(
          "subjectName subjectCode department semester academicYear courses"
        )
        .populate("courses", "courseName courseCode")
        .sort({
          subjectCode: 1,
        });

      return res.status(200).json({
        success: true,
        subjects,
      });
    } catch (error) {
      console.error("Get lecturer subjects error:", error);

      return res.status(500).json({
        success: false,
        message: "Error loading assigned subjects",
      });
    }
  }
);

/*
|--------------------------------------------------------------------------
| LECTURER: CREATE SESSION
|--------------------------------------------------------------------------
*/

router.post(
  "/lecturer/sessions",
  ...lecturerOnly,
  async (req, res) => {
    try {
      const { title, subjectId } = req.body;

      // Always use the authenticated lecturer ID.
      const lecturerId = req.user.id;

      if (!title?.trim() || !subjectId) {
        return res.status(400).json({
          success: false,
          message: "Subject and session title are required",
        });
      }

      const staff = await Staff.findOne({
        userId: lecturerId,
        status: "active",
      });

      if (!staff) {
        return res.status(404).json({
          success: false,
          message: "Active lecturer profile not found",
        });
      }

      const subject = await Subject.findOne({
        _id: subjectId,
        lecturers: staff._id,
        status: "active",
      });

      if (!subject) {
        return res.status(403).json({
          success: false,
          message: "You are not assigned to the selected subject",
        });
      }

      let sessionCode;
      let codeExists = true;

      while (codeExists) {
        sessionCode = generateSessionCode();

        codeExists = await Session.exists({
          sessionCode,
        });
      }

      const session = await Session.create({
        title: title.trim(),
        moduleCode: subject.subjectCode,
        subjectId: subject._id,
        subjectName: subject.subjectName,
        sessionCode,
        lecturerId,
        lecturerName: staff.name,
        participants: [],
        status: "active",
        endedAt: null,
      });

      return res.status(201).json({
        success: true,
        message: "Session created successfully",
        session,
      });
    } catch (error) {
      console.error("Create session error:", error);

      if (error.name === "CastError") {
        return res.status(400).json({
          success: false,
          message: "Invalid lecturer or subject information",
        });
      }

      return res.status(500).json({
        success: false,
        message: "Error creating session",
      });
    }
  }
);

/*
|--------------------------------------------------------------------------
| LECTURER: GET OWN SESSIONS
|--------------------------------------------------------------------------
*/

router.get(
  "/lecturer/sessions/:lecturerId",
  ...lecturerOnly,
  requireSelf("lecturerId"),
  async (req, res) => {
    try {
      const sessions = await Session.find({
        lecturerId: req.params.lecturerId,
      })
        .populate({
          path: "subjectId",
          select: "subjectName subjectCode",
        })
        .sort({
          createdAt: -1,
        })
        .lean();

      const subjectIds = sessions
        .map((session) => session.subjectId?._id)
        .filter(Boolean);

      const courses =
        subjectIds.length === 0
          ? []
          : await Course.find({
              subjects: {
                $in: subjectIds,
              },
            })
              .select("courseName courseCode subjects status")
              .lean();

      const sessionsWithCourses = sessions.map((session) => {
        if (!session.subjectId?._id) {
          return {
            ...session,
            participantCount: session.participants?.length || 0,
          };
        }

        const currentSubjectId =
          session.subjectId._id.toString();

        const matchingCourses = courses
          .filter((course) =>
            (course.subjects || []).some(
              (courseSubjectId) =>
                courseSubjectId.toString() === currentSubjectId
            )
          )
          .map((course) => ({
            _id: course._id,
            courseName: course.courseName,
            courseCode: course.courseCode,
            status: course.status,
          }));

        return {
          ...session,
          participantCount: session.participants?.length || 0,
          subjectId: {
            ...session.subjectId,
            courses: matchingCourses,
          },
        };
      });

      return res.status(200).json({
        success: true,
        sessions: sessionsWithCourses,
      });
    } catch (error) {
      console.error("Get lecturer sessions error:", error);

      return res.status(500).json({
        success: false,
        message: "Error fetching sessions",
      });
    }
  }
);

/*
|--------------------------------------------------------------------------
| LECTURER: GET SESSION PARTICIPANTS
|--------------------------------------------------------------------------
*/

router.get(
  "/lecturer/session/:sessionId/participants",
  ...lecturerOnly,
  async (req, res) => {
    try {
      const { sessionId } = req.params;

      const session = await Session.findById(sessionId);

      if (!session) {
        return res.status(404).json({
          success: false,
          message: "Session not found",
        });
      }

      // Prevent lecturers from viewing another lecturer's session.
      if (
        String(session.lecturerId) !== String(req.user.id)
      ) {
        return res.status(403).json({
          success: false,
          message:
            "You are not authorised to view this session's participants",
        });
      }

      if (!session.subjectId) {
        return res.status(400).json({
          success: false,
          message: "This session is not linked to a subject",
        });
      }

      const subject = await Subject.findById(session.subjectId)
        .select("subjectName subjectCode students")
        .populate({
          path: "students",
          select: "studentId userId yearOfStudy status",
          populate: {
            path: "userId",
            select: "name email",
          },
        });

      if (!subject) {
        return res.status(404).json({
          success: false,
          message: "Session subject not found",
        });
      }

      const joinedParticipantMap = new Map(
        (session.participants || []).map((participant) => [
          participant.studentId.toString(),
          participant.joinedAt,
        ])
      );

      const participants = subject.students
        .filter(
          (student) =>
            student && student.status === "active"
        )
        .map((student) => {
          const joinedAt =
            joinedParticipantMap.get(
              student._id.toString()
            ) || null;

          return {
            _id: student._id,
            studentId:
              student.studentId || "Not available",
            name:
              student.userId?.name || "Name unavailable",
            email:
              student.userId?.email || "Email unavailable",
            yearOfStudy: student.yearOfStudy || 1,
            status: student.status,
            joined: Boolean(joinedAt),
            joinedAt,
          };
        })
        .sort((firstStudent, secondStudent) => {
          if (
            firstStudent.joined !== secondStudent.joined
          ) {
            return firstStudent.joined ? -1 : 1;
          }

          return firstStudent.name.localeCompare(
            secondStudent.name
          );
        });

      const joinedCount = participants.filter(
        (participant) => participant.joined
      ).length;

      return res.status(200).json({
        success: true,
        session: {
          _id: session._id,
          title: session.title,
          sessionCode: session.sessionCode,
          status: session.status,
          createdAt: session.createdAt,
          endedAt: session.endedAt,
        },
        subject: {
          _id: subject._id,
          subjectName: subject.subjectName,
          subjectCode: subject.subjectCode,
        },
        registeredCount: participants.length,
        joinedCount,
        notJoinedCount: participants.length - joinedCount,
        participants,
      });
    } catch (error) {
      console.error(
        "Get session participants error:",
        error
      );

      if (error.name === "CastError") {
        return res.status(400).json({
          success: false,
          message: "Invalid session ID",
        });
      }

      return res.status(500).json({
        success: false,
        message: "Error loading session participants",
      });
    }
  }
);

/*
|--------------------------------------------------------------------------
| LECTURER: END OWN SESSION
|--------------------------------------------------------------------------
*/

router.put(
  "/lecturer/sessions/:sessionId/end",
  ...lecturerOnly,
  async (req, res) => {
    try {
      const { sessionId } = req.params;
      const lecturerId = req.user.id;

      const session = await Session.findById(sessionId);

      if (!session) {
        return res.status(404).json({
          success: false,
          message: "Session not found",
        });
      }

      if (
        String(session.lecturerId) !== String(lecturerId)
      ) {
        return res.status(403).json({
          success: false,
          message:
            "You are not authorised to end this session",
        });
      }

      if (session.status === "ended") {
        return res.status(400).json({
          success: false,
          message: "This session has already ended",
        });
      }

      session.status = "ended";
      session.endedAt = new Date();

      await session.save();

      return res.status(200).json({
        success: true,
        message: "Session ended successfully",
        session,
      });
    } catch (error) {
      console.error("End session error:", error);

      if (error.name === "CastError") {
        return res.status(400).json({
          success: false,
          message: "Invalid session ID",
        });
      }

      return res.status(500).json({
        success: false,
        message: "Error ending session",
      });
    }
  }
);

/*
|--------------------------------------------------------------------------
| LECTURER: DELETE OWN SESSION
|--------------------------------------------------------------------------
*/

router.delete(
  "/delete-session/:id",
  ...lecturerOnly,
  async (req, res) => {
    try {
      const session = await Session.findOneAndDelete({
        _id: req.params.id,
        lecturerId: req.user.id,
      });

      if (!session) {
        return res.status(404).json({
          success: false,
          message:
            "Session not found or you are not authorised to delete it",
        });
      }

      return res.status(200).json({
        success: true,
        message: "Session deleted successfully",
      });
    } catch (error) {
      console.error("Delete session error:", error);

      if (error.name === "CastError") {
        return res.status(400).json({
          success: false,
          message: "Invalid session ID",
        });
      }

      return res.status(500).json({
        success: false,
        message: "Error deleting session",
      });
    }
  }
);

/*
|--------------------------------------------------------------------------
| STUDENT: CHECK JOINED SESSION STATUS
|--------------------------------------------------------------------------
*/

router.get(
  "/student/session/:sessionId/status",
  ...studentOnly,
  async (req, res) => {
    try {
      const { sessionId } = req.params;

      // Find the student using the authenticated token.
      const student = await Student.findOne({
        userId: req.user.id,
        status: "active",
      }).select("_id");

      if (!student) {
        return res.status(404).json({
          success: false,
          message: "Active student profile not found",
        });
      }

      // Only return the session if this student joined it.
      const session = await Session.findOne({
        _id: sessionId,
        "participants.studentId": student._id,
      }).select(
        "title moduleCode subjectName sessionCode lecturerName status endedAt updatedAt"
      );

      if (!session) {
        return res.status(404).json({
          success: false,
          message:
            "Session not found or you have not joined it",
        });
      }

      return res.status(200).json({
        success: true,
        session: {
          _id: session._id,
          title: session.title,
          moduleCode: session.moduleCode,
          subjectName: session.subjectName,
          sessionCode: session.sessionCode,
          lecturerName: session.lecturerName,
          status: session.status,
          endedAt: session.endedAt,
          updatedAt: session.updatedAt,
        },
      });
    } catch (error) {
      console.error(
        "Get student session status error:",
        error
      );

      if (error.name === "CastError") {
        return res.status(400).json({
          success: false,
          message: "Invalid session ID",
        });
      }

      return res.status(500).json({
        success: false,
        message: "Error checking session status",
      });
    }
  }
);

/*
|--------------------------------------------------------------------------
| STUDENT: JOIN SESSION
|--------------------------------------------------------------------------
*/

router.post(
  "/student/join-session",
  ...studentOnly,
  async (req, res) => {
    try {
      const { sessionCode } = req.body;

      // Do not trust a student ID sent from the frontend.
      // Always use the ID from the verified JWT token.
      const studentId = req.user.id;

      if (!sessionCode?.trim()) {
        return res.status(400).json({
          success: false,
          message: "Session code is required",
        });
      }

      const session = await Session.findOne({
        sessionCode: sessionCode.trim().toUpperCase(),
        status: "active",
      });

      if (!session) {
        return res.status(404).json({
          success: false,
          message: "Session not found or inactive",
        });
      }

      if (!session.subjectId) {
        return res.status(403).json({
          success: false,
          message: "This session is not linked to a subject",
        });
      }

      const student = await Student.findOne({
        userId: studentId,
        status: "active",
        subjects: session.subjectId,
      });

      if (!student) {
        return res.status(403).json({
          success: false,
          message:
            "You are not registered for this session's subject",
        });
      }

      const subjectContainsStudent =
        await Subject.exists({
          _id: session.subjectId,
          students: student._id,
          status: "active",
        });

      if (!subjectContainsStudent) {
        return res.status(403).json({
          success: false,
          message:
            "Your subject registration is not active",
        });
      }

      const alreadyJoined = (
        session.participants || []
      ).some(
        (participant) =>
          participant.studentId.toString() ===
          student._id.toString()
      );

      if (!alreadyJoined) {
        await Session.updateOne(
          {
            _id: session._id,
            "participants.studentId": {
              $ne: student._id,
            },
          },
          {
            $push: {
              participants: {
                studentId: student._id,
                joinedAt: new Date(),
              },
            },
          }
        );
      }

      const updatedSession = await Session.findById(
        session._id
      );

      return res.status(200).json({
        success: true,
        message: alreadyJoined
          ? "You have already joined this session"
          : "Session joined successfully",
        alreadyJoined,
        participantCount:
          updatedSession.participants.length,
        session: updatedSession,
      });
    } catch (error) {
      console.error("Join session error:", error);

      if (error.name === "CastError") {
        return res.status(400).json({
          success: false,
          message:
            "Invalid student or session information",
        });
      }

      return res.status(500).json({
        success: false,
        message: "Error joining session",
      });
    }
  }
);

/*
|--------------------------------------------------------------------------
| STUDENT: GET OWN JOINED SESSIONS
|--------------------------------------------------------------------------
*/

router.get(
  "/student/:studentId/joined-sessions",
  ...studentOnly,
  requireSelf("studentId"),
  async (req, res) => {
    try {
      const { studentId } = req.params;

      const student = await Student.findOne({
        userId: studentId,
        status: "active",
      })
        .select("_id subjects status")
        .populate({
          path: "subjects",
          select: "subjectName subjectCode status",
          match: {
            status: "active",
          },
        });

      if (!student) {
        return res.status(404).json({
          success: false,
          message: "Active student profile not found",
        });
      }

      const sessions = await Session.find({
        "participants.studentId": student._id,
      })
        .populate({
          path: "subjectId",
          select: "subjectName subjectCode",
        })
        .sort({
          createdAt: -1,
        })
        .lean();

      const sessionIds = sessions.map(
        (session) => session._id
      );

      const publishedAnalyses =
        sessionIds.length === 0
          ? []
          : await SessionAIAnalysis.find({
              sessionId: {
                $in: sessionIds,
              },
              "sessionSummary.status": "completed",
              "sessionSummary.isPublished": true,
            })
              .select(
                "sessionId sessionSummary.publishedAt"
              )
              .lean();

      const publishedSummaryMap = new Map(
        publishedAnalyses.map((analysis) => [
          analysis.sessionId.toString(),
          analysis.sessionSummary.publishedAt,
        ])
      );

      const formattedSessions = sessions.map(
        (session) => {
          const participation = (
            session.participants || []
          ).find(
            (participant) =>
              participant.studentId.toString() ===
              student._id.toString()
          );

          const publishedAt =
            publishedSummaryMap.get(
              session._id.toString()
            ) || null;

          return {
            _id: session._id,
            title: session.title,
            subjectId:
              session.subjectId?._id ||
              session.subjectId,
            moduleCode: session.moduleCode,
            subjectName:
              session.subjectName ||
              session.subjectId?.subjectName ||
              "Subject unavailable",
            sessionCode: session.sessionCode,
            lecturerName: session.lecturerName,
            status: session.status,
            createdAt: session.createdAt,
            endedAt: session.endedAt,
            joinedAt: participation?.joinedAt || null,
            summaryAvailable:
              session.status === "ended" &&
              Boolean(publishedAt),
            summaryPublishedAt: publishedAt,
          };
        }
      );

      const activeCount = formattedSessions.filter(
        (session) => session.status === "active"
      ).length;

      const endedCount = formattedSessions.filter(
        (session) => session.status === "ended"
      ).length;

      const summariesAvailable =
        formattedSessions.filter(
          (session) => session.summaryAvailable
        ).length;

      return res.status(200).json({
        success: true,
        totalSessions: formattedSessions.length,
        activeCount,
        endedCount,
        summariesAvailable,
        registeredSubjects: student.subjects || [],
        sessions: formattedSessions,
      });
    } catch (error) {
      console.error(
        "Get student joined sessions error:",
        error
      );

      if (error.name === "CastError") {
        return res.status(400).json({
          success: false,
          message: "Invalid student information",
        });
      }

      return res.status(500).json({
        success: false,
        message: "Unable to load joined sessions",
      });
    }
  }
);

module.exports = router;