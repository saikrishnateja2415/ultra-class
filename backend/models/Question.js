const mongoose = require("mongoose");

const questionSchema = new mongoose.Schema(
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

        studentName: {
            type: String,
            required: true,
        },

        question: {
            type: String,
            required: true,
        },

        answer: {
            type: String,
            default: "",
        },

        status: {
            type: String,
            default: "Pending",
        },

        pinned: {
            type: Boolean,
            default: false,
        },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model("Question", questionSchema);