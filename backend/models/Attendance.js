const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema(
    {
        sessionId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Session",
            required: true,
        },

        sessionCode: {
            type: String,
            required: true,
        },

        studentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

        attendanceDate: {
            type: Date,
            required: true,
        },

        studentName: {
            type: String,
            required: true,
        },

        challengeId: {
            type: String,
            required: true,
        },

        verificationScore: {
            type: Number,
            default: 0,
        },

        attendanceStatus: {
            type: String,
            enum: [
                "Pending",
                "Verified",
                "Rejected",
                "Suspicious",
            ],
            default: "Pending",
        },

        capturedImage: {
            type: String,
            default: "",
        },

        verifiedAt: {
            type: Date,
        },
    },
    {
        timestamps: true,
    }
);

/* Prevent duplicate attendance */

attendanceSchema.index(
    {
        sessionId: 1,
        studentId: 1,
    },
    {
        unique: true,
    }
);

module.exports = mongoose.model(
    "Attendance",
    attendanceSchema
);