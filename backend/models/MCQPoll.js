const mongoose = require("mongoose");

/*
  Each answer option is stored as an object.

  Example:
  {
    text: "React"
  }
*/

const mcqOptionSchema =
  new mongoose.Schema(
    {
      text: {
        type: String,

        required: [
          true,
          "Option text is required",
        ],

        trim: true,

        maxlength: [
          300,
          "An option cannot exceed 300 characters",
        ],
      },
    },
    {
      /*
        MongoDB will not create a separate _id for
        every answer option.
      */

      _id: false,
    }
  );

const mcqPollSchema =
  new mongoose.Schema(
    {
      /*
        The classroom session associated with this
        MCQ poll.

        Poll status remains independent from session
        status. Therefore, a poll can remain open even
        after the classroom session has ended.
      */

      sessionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Session",

        required: [
          true,
          "Session ID is required",
        ],

        index: true,
      },

      /*
        The lecturer User account that created and
        controls this poll.
      */

      lecturerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",

        required: [
          true,
          "Lecturer ID is required",
        ],

        index: true,
      },

      /*
        MCQ question displayed to students.
      */

      question: {
        type: String,

        required: [
          true,
          "Question is required",
        ],

        trim: true,

        maxlength: [
          500,
          "Question cannot exceed 500 characters",
        ],
      },

      /*
        Every question must have between two and six
        answer options.
      */

      options: {
        type: [mcqOptionSchema],

        validate: {
          validator: function (options) {
            return (
              Array.isArray(options) &&
              options.length >= 2 &&
              options.length <= 6
            );
          },

          message:
            "An MCQ must contain between 2 and 6 answer options.",
        },
      },

      /*
        Stores the array position of the correct
        answer.

        Option A = 0
        Option B = 1
        Option C = 2
        Option D = 3
        Option E = 4
        Option F = 5
      */

      correctOptionIndex: {
        type: Number,

        required: [
          true,
          "Correct option is required",
        ],

        min: [
          0,
          "Correct option index cannot be negative",
        ],
      },

      /*
        The explanation is written manually by the
        lecturer.

        It is displayed to the student when the
        answer result is released.
      */

      explanation: {
        type: String,

        required: [
          true,
          "A correct-answer explanation is required",
        ],

        trim: true,

        maxlength: [
          1000,
          "Explanation cannot exceed 1000 characters",
        ],
      },

      /*
        Records whether the poll was created through
        the manual form or Excel bulk upload.
      */

      creationMethod: {
        type: String,
        enum: ["manual", "bulk"],
        default: "manual",
      },

      /*
        Draft:
        The lecturer created the poll, but students
        cannot see or answer it.

        Open:
        Eligible students can submit one response.

        Closed:
        No additional student responses are accepted.
      */

      status: {
        type: String,
        enum: ["draft", "open", "closed"],
        default: "draft",
        index: true,
      },

      /*
        If true, the student receives their
        correct/incorrect result and explanation
        immediately after submitting.

        If false, only a submission confirmation is
        shown until the poll closes.
      */

      revealAnswerAfterSubmission: {
        type: Boolean,
        default: true,
      },

      /*
        Exact time when the lecturer opened the poll.
      */

      openedAt: {
        type: Date,
        default: null,
      },

      /*
        Exact time when the lecturer closed the poll.
      */

      closedAt: {
        type: Date,
        default: null,
      },
    },
    {
      /*
        Automatically creates:

        createdAt
        updatedAt
      */

      timestamps: true,
    }
  );

/*
  Validate that the selected correct answer exists
  inside the supplied options.

  Example:

  If only Option A and Option B exist, the lecturer
  cannot select Option C as the correct answer.
*/

mcqPollSchema.pre(
  "validate",
  function validateCorrectOption() {
    if (
      Number.isInteger(
        this.correctOptionIndex
      ) &&
      Array.isArray(this.options) &&
      this.correctOptionIndex >=
        this.options.length
    ) {
      this.invalidate(
        "correctOptionIndex",
        "The selected correct answer is not one of the supplied options."
      );
    }
  }
);

/*
  Prevent duplicate questions inside the same
  classroom session.

  The collation makes the comparison
  case-insensitive.

  The following are treated as duplicates:

  "What is React?"
  "what is react?"

  The same question may still be used in another
  classroom session.
*/

mcqPollSchema.index(
  {
    sessionId: 1,
    question: 1,
  },
  {
    unique: true,

    collation: {
      locale: "en",
      strength: 2,
    },
  }
);

/*
  Improve session-based poll searches.

  Example:

  Find all open polls for a selected classroom
  session and return the newest ones first.
*/

mcqPollSchema.index({
  sessionId: 1,
  status: 1,
  createdAt: -1,
});

/*
  Improve lecturer poll-history searches.
*/

mcqPollSchema.index({
  lecturerId: 1,
  createdAt: -1,
});

module.exports = mongoose.model(
  "MCQPoll",
  mcqPollSchema
);