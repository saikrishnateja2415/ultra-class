import { useEffect, useState } from "react";
import "./Attendance.css";

function Attendance() {
    const challengeOptions = [
        { shape: "◆", name: "Blue Diamond", color: "#2563eb" },
        { shape: "▲", name: "Green Triangle", color: "#16a34a" },
        { shape: "●", name: "Purple Circle", color: "#7c3aed" },
        { shape: "■", name: "Orange Square", color: "#f97316" },
        { shape: "★", name: "Red Star", color: "#ef4444" },
    ];

    const generateCode = () => {
        const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        let code = "";
        const randomValues = new Uint32Array(5);

        window.crypto.getRandomValues(randomValues);

        for (let i = 0; i < 5; i++) {
            code += chars[randomValues[i] % chars.length];
        }

        return code;
    };

    const generateChallenge = () => {
        const randomValue = new Uint32Array(1);

        window.crypto.getRandomValues(randomValue);

        const randomIndex = randomValue[0] % challengeOptions.length;

        return {
            code: generateCode(),
            ...challengeOptions[randomIndex],
        };
    };

    const [attendanceStarted, setAttendanceStarted] = useState(false);
    const [attendanceClosed, setAttendanceClosed] = useState(false);
    const [timeLeft, setTimeLeft] = useState(60);
    const [verifiedCount, setVerifiedCount] = useState(0);
    const [pendingCount, setPendingCount] = useState(0);
    const [rejectedCount, setRejectedCount] = useState(0);
    const [expandedDate, setExpandedDate] = useState(null);
    const [currentChallenge, setCurrentChallenge] = useState(generateChallenge());

    const [attendanceHistory, setAttendanceHistory] = useState([
        {
            id: 1,
            date: "03 July 2026",
            totalStudents: 5,
            present: 3,
            absent: 2,
            students: [
                { id: "S001", name: "Sai Krishna", status: "Present" },
                { id: "S002", name: "Rahul", status: "Present" },
                { id: "S003", name: "Priya", status: "Absent" },
                { id: "S004", name: "John", status: "Present" },
                { id: "S005", name: "Aisha", status: "Absent" },
            ],
        },
    ]);

    const today = new Date().toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "long",
        year: "numeric",
    });

    const startAttendance = () => {
        setCurrentChallenge(generateChallenge());
        setAttendanceStarted(true);
        setAttendanceClosed(false);
        setTimeLeft(60);
        setVerifiedCount(0);
        setPendingCount(0);
        setRejectedCount(0);
    };

    useEffect(() => {
        if (!attendanceStarted) return;

        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    setAttendanceStarted(false);
                    setAttendanceClosed(true);
                    return 0;
                }

                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [attendanceStarted]);

    const updateStudentStatus = (recordId, studentId, newStatus) => {
        const updatedHistory = attendanceHistory.map((record) => {
            if (record.id === recordId) {
                const updatedStudents = record.students.map((student) =>
                    student.id === studentId
                        ? { ...student, status: newStatus }
                        : student
                );

                const presentCount = updatedStudents.filter(
                    (student) => student.status === "Present"
                ).length;

                return {
                    ...record,
                    students: updatedStudents,
                    present: presentCount,
                    absent: updatedStudents.length - presentCount,
                };
            }

            return record;
        });

        setAttendanceHistory(updatedHistory);
    };

    const saveAttendanceChanges = () => {
        alert("Attendance changes saved successfully");
    };

    return (
        <section className="attendance-page">
            <div className="attendance-hero">
                <div>
                    <h1>AI Attendance Verification</h1>
                    <p>
                        Take secure attendance using live camera capture and dynamic visual
                        challenge verification.
                    </p>
                    <span>Today: {today}</span>
                </div>

                <button
                    className={
                        attendanceStarted
                            ? "attendance-live-btn"
                            : attendanceClosed
                                ? "attendance-closed-btn"
                                : ""
                    }
                    onClick={startAttendance}
                    disabled={attendanceStarted}
                >
                    {attendanceStarted
                        ? "Attendance Live"
                        : attendanceClosed
                            ? "Restart Attendance"
                            : "Start AI Attendance"}
                </button>
            </div>

            <div className="attendance-live-grid">
                <div className="attendance-live-card">
                    <p>Verified</p>
                    <h2>{verifiedCount}</h2>
                </div>

                <div className="attendance-live-card">
                    <p>Pending</p>
                    <h2>{pendingCount}</h2>
                </div>

                <div className="attendance-live-card">
                    <p>Rejected</p>
                    <h2>{rejectedCount}</h2>
                </div>

                <div className="attendance-live-card">
                    <p>Time Left</p>
                    <h2>{attendanceStarted ? `${timeLeft}s` : "—"}</h2>
                </div>
            </div>

            {attendanceStarted && (
                <div className="challenge-card">
                    <h2>ULTRA CLASS</h2>
                    <p>Attendance Challenge</p>

                    <h3 className="challenge-timer">
                        ⏳ {timeLeft} Seconds Remaining
                    </h3>

                    <div className="challenge-code">{currentChallenge.code}</div>

                    <div
                        className="challenge-shape"
                        style={{ color: currentChallenge.color }}
                    >
                        {currentChallenge.shape}
                    </div>

                    <h3>{currentChallenge.name}</h3>

                    <p className="challenge-note">
                        Students must capture this projected challenge using live camera.
                    </p>
                </div>
            )}

            {attendanceClosed && (
                <div className="attendance-ended">
                    <h2>Attendance Closed</h2>
                    <p>This attendance session has expired automatically.</p>
                </div>
            )}

            <div className="attendance-history-section">
                <h2>Attendance History</h2>

                <div className="attendance-table">
                    <div className="attendance-table-header">
                        <span>Date</span>
                        <span>Total Students</span>
                        <span>Present</span>
                        <span>Absent</span>
                    </div>

                    {attendanceHistory.map((record) => (
                        <div key={record.id}>
                            <div
                                className="attendance-table-row"
                                onClick={() =>
                                    setExpandedDate(expandedDate === record.id ? null : record.id)
                                }
                            >
                                <span>{record.date}</span>
                                <span>{record.totalStudents}</span>
                                <span>{record.present}</span>
                                <span>{record.absent}</span>
                            </div>

                            {expandedDate === record.id && (
                                <div className="student-attendance-panel">
                                    <div className="student-attendance-header">
                                        <span>Student ID</span>
                                        <span>Student Name</span>
                                        <span>Present</span>
                                        <span>Absent</span>
                                    </div>

                                    {record.students.map((student) => (
                                        <div className="student-attendance-row" key={student.id}>
                                            <span>{student.id}</span>
                                            <span>{student.name}</span>

                                            <label>
                                                <input
                                                    type="radio"
                                                    name={`${record.id}-${student.id}`}
                                                    checked={student.status === "Present"}
                                                    onChange={() =>
                                                        updateStudentStatus(
                                                            record.id,
                                                            student.id,
                                                            "Present"
                                                        )
                                                    }
                                                />
                                                Present
                                            </label>

                                            <label>
                                                <input
                                                    type="radio"
                                                    name={`${record.id}-${student.id}`}
                                                    checked={student.status === "Absent"}
                                                    onChange={() =>
                                                        updateStudentStatus(
                                                            record.id,
                                                            student.id,
                                                            "Absent"
                                                        )
                                                    }
                                                />
                                                Absent
                                            </label>
                                        </div>
                                    ))}

                                    <button
                                        className="save-attendance-btn"
                                        onClick={saveAttendanceChanges}
                                    >
                                        Save Changes
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

export default Attendance;