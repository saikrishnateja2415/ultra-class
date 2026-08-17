import {
    useCallback,
    useEffect,
    useState,
} from "react";

import axios from "axios";
import * as XLSX from "xlsx";

import {
  API_URL,
} from "../../config/api";

import { recordEvaluationEvent } from "../../services/evaluationLogger";

import "./LecturerMCQ.css";

const createInitialForm = () => ({
    question: "",
    options: ["", ""],
    correctOptionIndex: 0,
    explanation: "",
    revealAnswerAfterSubmission: true,
});

function LecturerMCQ({
    session,
    user,
    onBack,
}) {
    const [activeSection, setActiveSection] =
        useState("manual");

    const [form, setForm] = useState(
        createInitialForm()
    );

    const [polls, setPolls] = useState([]);
    const [pollsLoading, setPollsLoading] =
        useState(true);

    const [refreshingResults, setRefreshingResults] =
        useState(false);

    const [creatingPoll, setCreatingPoll] =
        useState(false);

    const [selectedFileName, setSelectedFileName] =
        useState("");

    const [uploadedRows, setUploadedRows] =
        useState([]);

    const [validationResult, setValidationResult] =
        useState(null);

    const [validatingFile, setValidatingFile] =
        useState(false);

    const [importingQuestions, setImportingQuestions] =
        useState(false);

    const [openingAllPolls, setOpeningAllPolls] =
        useState(false);

    const [closingAllPolls, setClosingAllPolls] =
        useState(false);

    const [deletingPollId, setDeletingPollId] =
        useState(null);

    const lecturerId = user?.id || user?._id;

    /*
      Load all MCQs belonging to the selected session.
    */

    const fetchPolls = useCallback(
        async (showLoader = true, notifyError = showLoader) => {
        if (!session?._id || !lecturerId) {
            setPolls([]);
            setPollsLoading(false);
            return;
        }

        try {
            if (showLoader) {
                setPollsLoading(true);
            } else {
                setRefreshingResults(true);
            }

            const response = await axios.get(
                `${API_URL}/lecturer/${lecturerId}/sessions/${session._id}/mcq-polls`
            );

            setPolls(response.data.polls || []);
        } catch (error) {
            console.log(
                "Load MCQ polls error:",
                error
            );

            if (notifyError) {
                alert(
                    error.response?.data?.message ||
                    "Unable to load MCQ polls."
                );
            }
        } finally {
            if (showLoader) {
                setPollsLoading(false);
            } else {
                setRefreshingResults(false);
            }
        }
        },
        [session?._id, lecturerId]
    );

    useEffect(() => {
        fetchPolls(true);
    }, [fetchPolls]);

    const hasOpenPolls = polls.some(
        (poll) => poll.status === "open"
    );

    /*
      Refresh response analytics every five seconds only while
      at least one poll question is open.

      Background refresh does not display the full-page loader,
      so lecturer cards remain stable and do not flicker.
    */

    useEffect(() => {
        if (!hasOpenPolls) {
            return undefined;
        }

        const resultsInterval = setInterval(() => {
            fetchPolls(false, false);
        }, 5000);

        return () => {
            clearInterval(resultsInterval);
        };
    }, [hasOpenPolls, fetchPolls]);

    /*
      Update a normal manual-form field.
    */

    const updateFormField = (
        field,
        value
    ) => {
        setForm((currentForm) => ({
            ...currentForm,
            [field]: value,
        }));
    };

    /*
      Update one answer option.
    */

    const updateOption = (
        optionIndex,
        value
    ) => {
        setForm((currentForm) => ({
            ...currentForm,

            options: currentForm.options.map(
                (option, index) =>
                    index === optionIndex
                        ? value
                        : option
            ),
        }));
    };

    /*
      Add another optional answer.
  
      A maximum of six options is allowed.
    */

    const addOption = () => {
        setForm((currentForm) => {
            if (
                currentForm.options.length >= 6
            ) {
                return currentForm;
            }

            return {
                ...currentForm,
                options: [
                    ...currentForm.options,
                    "",
                ],
            };
        });
    };

    /*
      Remove an answer option.
  
      The form must always retain at least two options.
    */

    const removeOption = (optionIndex) => {
        setForm((currentForm) => {
            if (
                currentForm.options.length <= 2
            ) {
                return currentForm;
            }

            const updatedOptions =
                currentForm.options.filter(
                    (_, index) =>
                        index !== optionIndex
                );

            let updatedCorrectOptionIndex =
                currentForm.correctOptionIndex;

            if (
                optionIndex ===
                currentForm.correctOptionIndex
            ) {
                updatedCorrectOptionIndex = 0;
            } else if (
                optionIndex <
                currentForm.correctOptionIndex
            ) {
                updatedCorrectOptionIndex -= 1;
            }

            return {
                ...currentForm,
                options: updatedOptions,

                correctOptionIndex:
                    updatedCorrectOptionIndex,
            };
        });
    };

    /*
      Create one MCQ manually as a draft.
    */

    const createManualPoll = async (
        event
    ) => {
        event.preventDefault();

        const cleanedOptions =
            form.options.map((option) =>
                option.trim()
            );

        if (!form.question.trim()) {
            alert("Please enter the MCQ question.");
            return;
        }

        if (
            cleanedOptions.some(
                (option) => !option
            )
        ) {
            alert(
                "Please complete or remove every answer option."
            );
            return;
        }

        if (!form.explanation.trim()) {
            alert(
                "Please provide a brief explanation of the correct answer."
            );
            return;
        }

        try {
            setCreatingPoll(true);

            await axios.post(
                `${API_URL}/lecturer/mcq-polls`,
                {
                    sessionId: session._id,
                    lecturerId,

                    question:
                        form.question.trim(),

                    options: cleanedOptions,

                    correctOptionIndex:
                        Number(
                            form.correctOptionIndex
                        ),

                    explanation:
                        form.explanation.trim(),

                    revealAnswerAfterSubmission:
                        form.revealAnswerAfterSubmission,
                }
            );

            setForm(createInitialForm());

            await fetchPolls();

            alert(
                "MCQ created successfully as a draft."
            );
        } catch (error) {
            console.log(
                "Create manual MCQ error:",
                error
            );

            alert(
                error.response?.data?.message ||
                "Unable to create the MCQ."
            );
        } finally {
            setCreatingPoll(false);
        }
    };

    /*
      Download the lecturer Excel template.
  
      The first worksheet contains an example MCQ.
      The second worksheet contains instructions.
    */

    const downloadTemplate = () => {
        const templateRows = [
            [
                "Question",
                "Option A",
                "Option B",
                "Option C",
                "Option D",
                "Option E",
                "Option F",
                "Correct Option",
                "Explanation",
                "Immediate Result",
            ],

            [
                "Which technology is used to build the Ultra Class frontend?",
                "React",
                "MongoDB",
                "Express",
                "Node.js",
                "",
                "",
                "A",
                "React is used to build the frontend user interface.",
                "YES",
            ],
        ];

        const instructionRows = [
            ["Field", "Instruction"],

            [
                "Question",
                "Required. Maximum 500 characters.",
            ],

            [
                "Option A",
                "Required answer option.",
            ],

            [
                "Option B",
                "Required answer option.",
            ],

            [
                "Options C-F",
                "Optional. Do not leave a gap between options.",
            ],

            [
                "Correct Option",
                "Required. Enter A, B, C, D, E or F.",
            ],

            [
                "Explanation",
                "Required. Maximum 1000 characters.",
            ],

            [
                "Immediate Result",
                "Required. Enter YES or NO.",
            ],
        ];

        const templateSheet =
            XLSX.utils.aoa_to_sheet(
                templateRows
            );

        const instructionSheet =
            XLSX.utils.aoa_to_sheet(
                instructionRows
            );

        templateSheet["!cols"] = [
            { wch: 55 },
            { wch: 25 },
            { wch: 25 },
            { wch: 25 },
            { wch: 25 },
            { wch: 25 },
            { wch: 25 },
            { wch: 18 },
            { wch: 60 },
            { wch: 20 },
        ];

        instructionSheet["!cols"] = [
            { wch: 22 },
            { wch: 70 },
        ];

        const workbook =
            XLSX.utils.book_new();

        XLSX.utils.book_append_sheet(
            workbook,
            templateSheet,
            "MCQ Template"
        );

        XLSX.utils.book_append_sheet(
            workbook,
            instructionSheet,
            "Instructions"
        );

        XLSX.writeFile(
            workbook,
            "Ultra_Class_MCQ_Bulk_Upload_Template.xlsx"
        );
    };

    /*
      Read the first Excel worksheet and convert its
      column headings into backend field names.
    */

    const handleExcelFile = (event) => {
        const file = event.target.files?.[0];

        setValidationResult(null);
        setUploadedRows([]);
        setSelectedFileName("");

        if (!file) {
            return;
        }

        const extension =
            file.name
                .split(".")
                .pop()
                ?.toLowerCase();

        if (
            !["xlsx", "xls"].includes(extension)
        ) {
            alert(
                "Please select a valid Excel file."
            );

            event.target.value = "";
            return;
        }

        const reader = new FileReader();

        reader.onload = (loadEvent) => {
            try {
                const fileData =
                    new Uint8Array(
                        loadEvent.target.result
                    );

                const workbook = XLSX.read(
                    fileData,
                    {
                        type: "array",
                    }
                );

                const firstSheetName =
                    workbook.SheetNames[0];

                const worksheet =
                    workbook.Sheets[
                    firstSheetName
                    ];

                const excelRows =
                    XLSX.utils.sheet_to_json(
                        worksheet,
                        {
                            defval: "",
                        }
                    );

                if (excelRows.length === 0) {
                    alert(
                        "The selected Excel file does not contain any MCQ rows."
                    );

                    return;
                }

                const normalizedRows =
                    excelRows.map((row) => ({
                        question:
                            row.Question ?? "",

                        optionA:
                            row["Option A"] ?? "",

                        optionB:
                            row["Option B"] ?? "",

                        optionC:
                            row["Option C"] ?? "",

                        optionD:
                            row["Option D"] ?? "",

                        optionE:
                            row["Option E"] ?? "",

                        optionF:
                            row["Option F"] ?? "",

                        correctOption:
                            row["Correct Option"] ?? "",

                        explanation:
                            row.Explanation ?? "",

                        immediateResult:
                            row["Immediate Result"] ?? "",
                    }));

                setUploadedRows(
                    normalizedRows
                );

                setSelectedFileName(
                    file.name
                );
            } catch (error) {
                console.log(
                    "Read MCQ Excel file error:",
                    error
                );

                alert(
                    "The Excel file could not be read. Download and use the official template."
                );
            }
        };

        reader.onerror = () => {
            alert(
                "The Excel file could not be read."
            );
        };

        reader.readAsArrayBuffer(file);
    };

    /*
      Send the extracted rows to the backend for
      validation without importing them.
    */

    const validateExcelRows = async () => {
        if (uploadedRows.length === 0) {
            alert(
                "Please select an Excel file first."
            );

            return;
        }

        try {
            setValidatingFile(true);

            const response = await axios.post(
                `${API_URL}/lecturer/mcq-polls/bulk`,
                {
                    sessionId: session._id,
                    lecturerId,
                    mode: "validate",
                    rows: uploadedRows,
                },
                {
                    timeout: 15000,
                }
            );

            setValidationResult(
                response.data
            );
        } catch (error) {
            console.log(
                "Validate MCQ Excel error:",
                error
            );

            setValidationResult(null);

            if (error.code === "ECONNABORTED") {
                alert(
                    "Validation timed out. Please check the backend terminal and MongoDB connection."
                );
            } else {
                alert(
                    error.response?.data?.message ||
                    "Unable to validate the Excel file."
                );
            }
        } finally {
            setValidatingFile(false);
        }
    };

    /*
      Revalidate and import the valid Excel rows.
    */

    const importExcelRows = async () => {
        if (
            !validationResult ||
            validationResult.validCount === 0
        ) {
            alert(
                "There are no valid MCQs to import."
            );

            return;
        }

        const confirmed = window.confirm(
            `Import ${validationResult.validCount} valid MCQ questions as drafts?`
        );

        if (!confirmed) {
            return;
        }

        try {
            setImportingQuestions(true);

            const response = await axios.post(
                `${API_URL}/lecturer/mcq-polls/bulk`,
                {
                    sessionId: session._id,
                    lecturerId,
                    mode: "import",
                    rows: uploadedRows,
                }
            );

            alert(response.data.message);

            setUploadedRows([]);
            setValidationResult(null);
            setSelectedFileName("");

            await fetchPolls();

            setActiveSection("polls");
        } catch (error) {
            console.log(
                "Import MCQ Excel error:",
                error
            );

            alert(
                error.response?.data?.message ||
                "Unable to import the MCQs."
            );
        } finally {
            setImportingQuestions(false);
        }
    };

    /*
      Open every draft MCQ in this session together.

      Students will receive all questions whose status
      changes from draft to open.
    */

    const openAllPolls = async () => {
        const draftCount = polls.filter(
            (poll) => poll.status === "draft"
        ).length;

        if (draftCount === 0) {
            alert(
                "There are no draft questions available to open."
            );
            return;
        }

        const confirmed = window.confirm(
            `Open all ${draftCount} draft questions? Students will be able to view and answer all of them.`
        );

        if (!confirmed) {
            return;
        }

        try {
            setOpeningAllPolls(true);

            const response = await axios.put(
                `${API_URL}/lecturer/mcq-polls/session/${session._id}/open-all`,
                {
                    lecturerId,
                },
                {
                    timeout: 15000,
                }
            );

            recordEvaluationEvent({
                actorId: lecturerId,
                eventType: "quiz_opened",
                sessionId: session._id,

                metrics: {
                    questionCount: draftCount,
                    success: true,
                },
            });

            await fetchPolls();

            alert(
                response.data.message ||
                "All draft questions opened successfully."
            );
        } catch (error) {
            console.log(
                "Open all MCQ polls error:",
                error
            );

            if (error.code === "ECONNABORTED") {
                alert(
                    "Opening the poll timed out. Please check the backend terminal and MongoDB connection."
                );
            } else {
                alert(
                    error.response?.data?.message ||
                    "Unable to open the session poll."
                );
            }
        } finally {
            setOpeningAllPolls(false);
        }
    };

    /*
      Delete one draft question.

      Open or completed questions cannot be deleted,
      protecting student response and evaluation data.
    */

    const deletePoll = async (poll) => {
        if (poll.status !== "draft") {
            alert(
                "Only draft questions can be deleted."
            );
            return;
        }

        const confirmed = window.confirm(
            `Delete this question permanently?\n\n${poll.question}`
        );

        if (!confirmed) {
            return;
        }

        try {
            setDeletingPollId(poll._id);

            const response = await axios.delete(
                `${API_URL}/lecturer/mcq-polls/${poll._id}`,
                {
                    params: {
                        lecturerId,
                    },
                    timeout: 15000,
                }
            );

            await fetchPolls();

            alert(
                response.data.message ||
                "Question deleted successfully."
            );
        } catch (error) {
            console.log(
                "Delete MCQ question error:",
                error
            );

            if (error.code === "ECONNABORTED") {
                alert(
                    "Deleting the question timed out. Please check the backend terminal and MongoDB connection."
                );
            } else {
                alert(
                    error.response?.data?.message ||
                    "Unable to delete the question."
                );
            }
        } finally {
            setDeletingPollId(null);
        }
    };

    /*
      Close every open MCQ in this session together.
    */

    const closeAllPolls = async () => {
        const openCount = polls.filter(
            (poll) => poll.status === "open"
        ).length;

        if (openCount === 0) {
            alert(
                "There are no open questions available to close."
            );
            return;
        }

        const confirmed = window.confirm(
            `Close the complete poll containing ${openCount} questions? Students will no longer be able to submit answers.`
        );

        if (!confirmed) {
            return;
        }

        try {
            setClosingAllPolls(true);

            const response = await axios.put(
                `${API_URL}/lecturer/mcq-polls/session/${session._id}/close-all`,
                {
                    lecturerId,
                },
                {
                    timeout: 15000,
                }
            );

            const totalResponses = polls.reduce(
                (total, poll) => total + (poll.responseCount || 0),
                0
            );

            const totalCorrect = polls.reduce(
                (total, poll) => total + (poll.correctCount || 0),
                0
            );

            recordEvaluationEvent({
                actorId: lecturerId,
                eventType: "quiz_closed",
                sessionId: session._id,

                metrics: {
                    questionCount: openCount,
                    responseCount: totalResponses,
                    correctCount: totalCorrect,
                    scorePercentage:
                        totalResponses > 0
                            ? Math.round(
                                  (totalCorrect / totalResponses) * 100
                              )
                            : 0,
                    success: true,
                },
            });

            await fetchPolls();

            alert(
                response.data.message ||
                "MCQ poll closed successfully."
            );
        } catch (error) {
            console.log(
                "Close all MCQ polls error:",
                error
            );

            if (error.code === "ECONNABORTED") {
                alert(
                    "Closing the poll timed out. Please check the backend terminal and MongoDB connection."
                );
            } else {
                alert(
                    error.response?.data?.message ||
                    "Unable to close the poll."
                );
            }
        } finally {
            setClosingAllPolls(false);
        }
    };

    if (!session) {
        return null;
    }

    const draftPollCount = polls.filter(
        (poll) => poll.status === "draft"
    ).length;

    const openPollCount = polls.filter(
        (poll) => poll.status === "open"
    ).length;

    return (
        <section className="lecturer-mcq-page">
            <button
                type="button"
                className="lecturer-mcq-back"
                onClick={onBack}
            >
                ← Back to Session
            </button>

            <div className="lecturer-mcq-header">
                <div>
                    <span>MCQ Polling</span>

                    <h1>{session.title}</h1>

                    <p>
                        Create questions manually or import them
                        using the validated Excel template.
                    </p>
                </div>

                <div className="lecturer-mcq-session-status">
                    <span>Session</span>
                    <strong>{session.status}</strong>
                </div>
            </div>

            <div className="lecturer-mcq-tabs">
                <button
                    type="button"
                    className={
                        activeSection === "manual"
                            ? "active"
                            : ""
                    }
                    onClick={() =>
                        setActiveSection("manual")
                    }
                >
                    Create Manually
                </button>

                <button
                    type="button"
                    className={
                        activeSection === "bulk"
                            ? "active"
                            : ""
                    }
                    onClick={() =>
                        setActiveSection("bulk")
                    }
                >
                    Excel Bulk Upload
                </button>

                <button
                    type="button"
                    className={
                        activeSection === "polls"
                            ? "active"
                            : ""
                    }
                    onClick={() => {
                        setActiveSection("polls");
                        fetchPolls();
                    }}
                >
                    Manage Polls ({polls.length})
                </button>
            </div>

            {activeSection === "manual" && (
                <form
                    className="lecturer-mcq-form"
                    onSubmit={createManualPoll}
                >
                    <div className="lecturer-mcq-section-title">
                        <h2>Create MCQ Manually</h2>

                        <p>
                            The question will be stored as a draft
                            until you open the poll.
                        </p>
                    </div>

                    <label>
                        Question

                        <textarea
                            value={form.question}
                            onChange={(event) =>
                                updateFormField(
                                    "question",
                                    event.target.value
                                )
                            }
                            placeholder="Enter the MCQ question"
                            maxLength={500}
                        />

                        <small>
                            {form.question.length}/500
                        </small>
                    </label>

                    <div className="lecturer-mcq-options">
                        <div className="lecturer-mcq-options-heading">
                            <h3>Answer Options</h3>

                            <button
                                type="button"
                                onClick={addOption}
                                disabled={
                                    form.options.length >= 6
                                }
                            >
                                + Add Option
                            </button>
                        </div>

                        {form.options.map(
                            (option, optionIndex) => (
                                <div
                                    className="lecturer-mcq-option-row"
                                    key={optionIndex}
                                >
                                    <input
                                        type="radio"
                                        name="correctOption"
                                        checked={
                                            form.correctOptionIndex ===
                                            optionIndex
                                        }
                                        onChange={() =>
                                            updateFormField(
                                                "correctOptionIndex",
                                                optionIndex
                                            )
                                        }
                                        title="Select as correct answer"
                                    />

                                    <span>
                                        {String.fromCharCode(
                                            65 + optionIndex
                                        )}
                                    </span>

                                    <input
                                        type="text"
                                        value={option}
                                        onChange={(event) =>
                                            updateOption(
                                                optionIndex,
                                                event.target.value
                                            )
                                        }
                                        placeholder={`Option ${String.fromCharCode(
                                            65 + optionIndex
                                        )}`}
                                        maxLength={300}
                                    />

                                    <button
                                        type="button"
                                        className="remove"
                                        onClick={() =>
                                            removeOption(optionIndex)
                                        }
                                        disabled={
                                            form.options.length <= 2
                                        }
                                    >
                                        Remove
                                    </button>
                                </div>
                            )
                        )}
                    </div>

                    <label>
                        Correct-answer explanation

                        <textarea
                            value={form.explanation}
                            onChange={(event) =>
                                updateFormField(
                                    "explanation",
                                    event.target.value
                                )
                            }
                            placeholder="Briefly explain why the selected answer is correct"
                            maxLength={1000}
                        />

                        <small>
                            {form.explanation.length}/1000
                        </small>
                    </label>

                    <label className="lecturer-mcq-checkbox">
                        <input
                            type="checkbox"
                            checked={
                                form.revealAnswerAfterSubmission
                            }
                            onChange={(event) =>
                                updateFormField(
                                    "revealAnswerAfterSubmission",
                                    event.target.checked
                                )
                            }
                        />

                        <span>
                            Show the correct/incorrect result and
                            explanation immediately after the
                            student submits.
                        </span>
                    </label>

                    <button
                        type="submit"
                        className="lecturer-mcq-primary"
                        disabled={creatingPoll}
                    >
                        {creatingPoll
                            ? "Creating MCQ..."
                            : "Save MCQ as Draft"}
                    </button>
                </form>
            )}

            {activeSection === "bulk" && (
                <section className="lecturer-mcq-bulk">
                    <div className="lecturer-mcq-section-title">
                        <h2>Excel Bulk Upload</h2>

                        <p>
                            Download the official template,
                            complete the MCQs and validate the file
                            before importing.
                        </p>
                    </div>

                    <div className="lecturer-mcq-bulk-steps">
                        <div>
                            <span>1</span>
                            <h3>Download Template</h3>

                            <button
                                type="button"
                                onClick={downloadTemplate}
                            >
                                Download Excel Template
                            </button>
                        </div>

                        <div>
                            <span>2</span>
                            <h3>Select Completed File</h3>

                            <input
                                type="file"
                                accept=".xlsx,.xls"
                                onChange={handleExcelFile}
                            />

                            {selectedFileName && (
                                <p>{selectedFileName}</p>
                            )}
                        </div>

                        <div>
                            <span>3</span>
                            <h3>Validate Questions</h3>

                            <button
                                type="button"
                                onClick={validateExcelRows}
                                disabled={
                                    uploadedRows.length === 0 ||
                                    validatingFile
                                }
                            >
                                {validatingFile
                                    ? "Validating..."
                                    : "Validate Excel File"}
                            </button>
                        </div>
                    </div>

                    {validationResult && (
                        <div className="lecturer-mcq-validation">
                            <div className="lecturer-mcq-validation-stats">
                                <div>
                                    <span>Total Rows</span>
                                    <strong>
                                        {validationResult.totalRows}
                                    </strong>
                                </div>

                                <div className="valid">
                                    <span>Valid Rows</span>
                                    <strong>
                                        {validationResult.validCount}
                                    </strong>
                                </div>

                                <div className="invalid">
                                    <span>Invalid Rows</span>
                                    <strong>
                                        {validationResult.invalidCount}
                                    </strong>
                                </div>
                            </div>

                            {validationResult.invalidRows
                                ?.length > 0 && (
                                    <div className="lecturer-mcq-errors">
                                        <h3>Validation Errors</h3>

                                        {validationResult.invalidRows.map(
                                            (invalidRow) => (
                                                <div
                                                    key={invalidRow.rowNumber}
                                                >
                                                    <strong>
                                                        Row{" "}
                                                        {invalidRow.rowNumber}:{" "}
                                                        {invalidRow.question}
                                                    </strong>

                                                    <ul>
                                                        {invalidRow.errors.map(
                                                            (errorMessage) => (
                                                                <li
                                                                    key={
                                                                        errorMessage
                                                                    }
                                                                >
                                                                    {
                                                                        errorMessage
                                                                    }
                                                                </li>
                                                            )
                                                        )}
                                                    </ul>
                                                </div>
                                            )
                                        )}
                                    </div>
                                )}

                            <button
                                type="button"
                                className="lecturer-mcq-primary"
                                onClick={importExcelRows}
                                disabled={
                                    validationResult.validCount === 0 ||
                                    importingQuestions
                                }
                            >
                                {importingQuestions
                                    ? "Importing Questions..."
                                    : `Import ${validationResult.validCount} Valid Questions`}
                            </button>
                        </div>
                    )}
                </section>
            )}

            {activeSection === "polls" && (
                <section className="lecturer-mcq-polls">
                    <div className="lecturer-mcq-section-title">
                        <h2>Manage MCQ Polls</h2>

                        <p>
                            Open all draft questions together,
                            monitor responses and close questions
                            independently from the classroom session.
                        </p>
                    </div>

                    {polls.length > 0 && (
                        <div className="lecturer-mcq-session-poll-actions">
                            <div className="lecturer-mcq-session-poll-summary">
                                <span>
                                    Draft questions: {draftPollCount}
                                </span>

                                <span>
                                    Open questions: {openPollCount}
                                </span>
                            </div>

                            <div className="lecturer-mcq-session-poll-controls">
                                <button
                                    type="button"
                                    className="lecturer-mcq-refresh-results"
                                    onClick={() => fetchPolls(false, true)}
                                    disabled={
                                        refreshingResults ||
                                        pollsLoading
                                    }
                                >
                                    {refreshingResults
                                        ? "Refreshing Results..."
                                        : "Refresh Results"}
                                </button>

                                {openPollCount > 0 ? (
                                    <button
                                        type="button"
                                        className="lecturer-mcq-primary lecturer-mcq-close-all"
                                        onClick={closeAllPolls}
                                        disabled={closingAllPolls}
                                    >
                                        {closingAllPolls
                                            ? "Closing All Questions..."
                                            : `Close Poll (${openPollCount} Questions)`}
                                    </button>
                                ) : draftPollCount > 0 ? (
                                    <button
                                        type="button"
                                        className="lecturer-mcq-primary lecturer-mcq-open-all"
                                        onClick={openAllPolls}
                                        disabled={
                                            openingAllPolls || closingAllPolls
                                        }
                                    >
                                        {openingAllPolls
                                            ? "Opening All Questions..."
                                            : `Open Poll (${draftPollCount} Questions)`}
                                    </button>
                                ) : (
                                    <span className="lecturer-mcq-closed-message">
                                        Poll completed — no draft questions available
                                    </span>
                                )}
                            </div>
                        </div>
                    )}

                    {pollsLoading ? (
                        <div className="lecturer-mcq-message">
                            Loading MCQ polls...
                        </div>
                    ) : polls.length === 0 ? (
                        <div className="lecturer-mcq-message">
                            No MCQ polls have been created for this
                            session.
                        </div>
                    ) : (
                        <div className="lecturer-mcq-poll-grid">
                            {polls.map((poll) => (
                                <article
                                    className="lecturer-mcq-poll-card"
                                    key={poll._id}
                                >
                                    <div className="lecturer-mcq-poll-top">
                                        <div>
                                            <span>
                                                {poll.creationMethod}
                                            </span>

                                            <h3>{poll.question}</h3>
                                        </div>

                                        <strong
                                            className={`status ${poll.status}`}
                                        >
                                            {poll.status}
                                        </strong>
                                    </div>

                                    <ol type="A">
                                        {poll.options.map(
                                            (option, optionIndex) => (
                                                <li
                                                    key={optionIndex}
                                                    className={
                                                        optionIndex ===
                                                            poll.correctOptionIndex
                                                            ? "correct"
                                                            : ""
                                                    }
                                                >
                                                    {option.text}
                                                </li>
                                            )
                                        )}
                                    </ol>

                                    <div className="lecturer-mcq-explanation">
                                        <strong>Explanation</strong>
                                        <p>{poll.explanation}</p>
                                    </div>

                                    <div className="lecturer-mcq-poll-stats">
                                        <div>
                                            <span>Responses</span>
                                            <strong>
                                                {poll.responseCount || 0}
                                            </strong>
                                        </div>

                                        <div>
                                            <span>Correct</span>
                                            <strong>
                                                {poll.correctCount || 0}
                                            </strong>
                                        </div>

                                        <div>
                                            <span>Accuracy</span>
                                            <strong>
                                                {(poll.responseCount || 0) > 0
                                                    ? `${Math.round(
                                                        ((poll.correctCount || 0) /
                                                            poll.responseCount) *
                                                        100
                                                    )}%`
                                                    : "0%"}
                                            </strong>
                                        </div>
                                    </div>

                                    <div className="lecturer-mcq-poll-actions">
                                        {poll.status === "draft" && (
                                            <button
                                                type="button"
                                                className="delete"
                                                onClick={() =>
                                                    deletePoll(poll)
                                                }
                                                disabled={
                                                    deletingPollId === poll._id ||
                                                    openingAllPolls ||
                                                    closingAllPolls
                                                }
                                            >
                                                {deletingPollId === poll._id
                                                    ? "Deleting..."
                                                    : "Delete Question"}
                                            </button>
                                        )}

                                        {poll.status === "open" && (
                                            <span className="lecturer-mcq-poll-open-message">
                                                Included in the active poll
                                            </span>
                                        )}

                                        {poll.status === "closed" && (
                                            <span className="lecturer-mcq-closed-message">
                                                Poll completed
                                            </span>
                                        )}
                                    </div>
                                </article>
                            ))}
                        </div>
                    )}
                </section>
            )}
        </section>
    );
}

export default LecturerMCQ;