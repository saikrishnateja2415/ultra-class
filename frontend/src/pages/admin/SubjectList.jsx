import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import * as XLSX from "xlsx";
import { FiBookOpen, FiDownload, FiEdit2, FiSearch, FiTrash2, FiUsers, FiUserCheck, FiX } from "react-icons/fi";
import "./SubjectList.css";

const API_URL = "http://localhost:5000";
const emptyForm = { subjectName: "", subjectCode: "", department: "", credits: "", semester: "", academicYear: "", description: "", status: "active" };

function SubjectList() {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [search, setSearch] = useState("");
  const [courseFilter, setCourseFilter] = useState("all");
  const [semesterFilter, setSemesterFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [editSubject, setEditSubject] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [listModal, setListModal] = useState(null);

  const loadSubjects = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/subjects`);
      setSubjects(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      setMessage({ type: "error", text: error.response?.data?.message || "Unable to load subjects." });
    } finally { setLoading(false); }
  };

  useEffect(() => { loadSubjects(); }, []);

  const courses = useMemo(() => {
    const map = new Map();
    subjects.forEach((subject) => (subject.courses || []).forEach((course) => map.set(course._id, course)));
    return [...map.values()];
  }, [subjects]);

  const filtered = useMemo(() => subjects.filter((subject) => {
    const q = search.trim().toLowerCase();
    const textMatch = !q || [subject.subjectName, subject.subjectCode, subject.department, ...(subject.courses || []).flatMap((c) => [c.courseName, c.courseCode])].some((v) => String(v || "").toLowerCase().includes(q));
    const courseMatch = courseFilter === "all" || (subject.courses || []).some((c) => c._id === courseFilter);
    const semesterMatch = semesterFilter === "all" || String(subject.semester) === semesterFilter;
    const statusMatch = statusFilter === "all" || subject.status === statusFilter;
    return textMatch && courseMatch && semesterMatch && statusMatch;
  }), [subjects, search, courseFilter, semesterFilter, statusFilter]);

  const openEdit = (subject) => {
    setEditSubject(subject);
    setForm({ subjectName: subject.subjectName || "", subjectCode: subject.subjectCode || "", department: subject.department || "", credits: subject.credits || "", semester: subject.semester || "", academicYear: subject.academicYear || "", description: subject.description || "", status: subject.status || "active" });
  };

  const saveEdit = async (event) => {
    event.preventDefault(); setSaving(true);
    try {
      const response = await axios.put(`${API_URL}/api/subjects/${editSubject._id}`, form);
      await loadSubjects(); setEditSubject(null);
      setMessage({ type: "success", text: response.data?.message || "Subject updated successfully." });
    } catch (error) { setMessage({ type: "error", text: error.response?.data?.message || "Unable to update subject." }); }
    finally { setSaving(false); }
  };

  const deleteSubject = async (subject) => {
    if ((subject.courses?.length || 0) + (subject.students?.length || 0) + (subject.lecturers?.length || 0) > 0) {
      setMessage({ type: "error", text: "Remove assigned courses, students and lecturers before deleting this subject." }); return;
    }
    if (!window.confirm(`Delete ${subject.subjectName}?`)) return;
    try {
      const response = await axios.delete(`${API_URL}/api/subjects/${subject._id}`);
      setSubjects((prev) => prev.filter((item) => item._id !== subject._id));
      setMessage({ type: "success", text: response.data?.message || "Subject deleted successfully." });
    } catch (error) { setMessage({ type: "error", text: error.response?.data?.message || "Unable to delete subject." }); }
  };

  const downloadStudents = (subject) => {
    const rows = (subject.students || []).map((student, i) => ({ "S.No": i + 1, "Student ID": student.studentId || "", "Student Name": student.userId?.name || "", Email: student.userId?.email || "" }));
    if (!rows.length) return;
    const sheet = XLSX.utils.json_to_sheet(rows); sheet["!cols"] = [{ wch: 8 }, { wch: 18 }, { wch: 30 }, { wch: 35 }];
    const book = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(book, sheet, "Students");
    XLSX.writeFile(book, `${subject.subjectCode}_Student_List.xlsx`);
  };

  return <main className="subject-list-page">
    <header className="subject-list-heading"><div><p>Academic Structure</p><h2>Subject Management</h2><span>Search, filter and manage all academic subjects.</span></div><strong>{filtered.length} Subjects</strong></header>
    <section className="subject-filters">
      <label className="subject-search"><FiSearch/><input value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Search subject, code or course" /></label>
      <select value={courseFilter} onChange={(e)=>setCourseFilter(e.target.value)}><option value="all">All Courses</option>{courses.map((c)=><option key={c._id} value={c._id}>{c.courseCode} - {c.courseName}</option>)}</select>
      <select value={semesterFilter} onChange={(e)=>setSemesterFilter(e.target.value)}><option value="all">All Semesters</option>{[1,2,3,4,5,6].map((n)=><option key={n} value={n}>Semester {n}</option>)}</select>
      <select value={statusFilter} onChange={(e)=>setStatusFilter(e.target.value)}><option value="all">All Statuses</option><option value="active">Active</option><option value="inactive">Inactive</option><option value="draft">Draft</option></select>
    </section>
    {message.text && <div className={`subject-message ${message.type}`}>{message.text}<button onClick={()=>setMessage({type:"",text:""})}>×</button></div>}
    {loading ? <div className="subject-empty">Loading subjects...</div> : filtered.length === 0 ? <div className="subject-empty">No subjects match your filters.</div> :
      <section className="subject-grid">{filtered.map((subject)=><article className="subject-card" key={subject._id}>
        <div className="subject-card-top"><span className="subject-icon"><FiBookOpen/></span><div><div className="subject-title"><h3>{subject.subjectName}</h3><small className={subject.status}>{subject.status}</small></div><p>{subject.subjectCode} · {subject.department}</p></div></div>
        <div className="subject-meta"><span>{subject.credits} Credits</span><span>Semester {subject.semester}</span><span>{subject.academicYear}</span></div>
        <div className="subject-courses"><strong>Courses</strong><div>{(subject.courses || []).length ? subject.courses.map((c)=><span key={c._id}>{c.courseCode}</span>) : <em>Not assigned</em>}</div></div>
        <div className="subject-counts"><span>{subject.students?.length || 0} Students</span><span>{subject.lecturers?.length || 0} Lecturers</span></div>
        <div className="subject-actions"><button onClick={()=>setListModal({type:"students",subject})}><FiUsers/> Students</button><button onClick={()=>setListModal({type:"lecturers",subject})}><FiUserCheck/> Lecturers</button><button onClick={()=>openEdit(subject)}><FiEdit2/> Edit</button><button className="delete" onClick={()=>deleteSubject(subject)}><FiTrash2/> Delete</button></div>
      </article>)}</section>}

    {editSubject && <div className="subject-modal-backdrop"><section className="subject-modal"><header><div><small>Edit Subject</small><h3>{editSubject.subjectName}</h3></div><button onClick={()=>setEditSubject(null)}><FiX/></button></header><form onSubmit={saveEdit}><div className="subject-form-grid">{[["subjectName","Subject Name"],["subjectCode","Subject Code"],["department","Department"],["credits","Credits"],["semester","Semester"],["academicYear","Academic Year"]].map(([name,label])=><label key={name}><span>{label}</span><input name={name} type={["credits","semester"].includes(name)?"number":"text"} value={form[name]} onChange={(e)=>setForm({...form,[name]:e.target.value})} required /></label>)}<label><span>Status</span><select value={form.status} onChange={(e)=>setForm({...form,status:e.target.value})}><option value="active">Active</option><option value="inactive">Inactive</option><option value="draft">Draft</option></select></label></div><label className="subject-description"><span>Description</span><textarea rows="4" value={form.description} onChange={(e)=>setForm({...form,description:e.target.value})}/></label><footer><button type="button" onClick={()=>setEditSubject(null)}>Cancel</button><button className="primary" disabled={saving}>{saving?"Saving...":"Save Changes"}</button></footer></form></section></div>}

    {listModal && <div className="subject-modal-backdrop"><section className="subject-modal subject-list-modal"><header><div><small>{listModal.type === "students" ? "Student List" : "Lecturer List"}</small><h3>{listModal.subject.subjectName}</h3></div><button onClick={()=>setListModal(null)}><FiX/></button></header><div className="subject-modal-body">{(listModal.subject[listModal.type] || []).length === 0 ? <div className="subject-empty">No {listModal.type} assigned.</div> : <div className="subject-table-wrap"><table><thead><tr>{listModal.type === "students" ? <><th>Student ID</th><th>Name</th><th>Email</th></> : <><th>Staff ID</th><th>Name</th><th>Email</th><th>Designation</th></>}</tr></thead><tbody>{listModal.type === "students" ? listModal.subject.students.map((s)=><tr key={s._id}><td>{s.studentId}</td><td>{s.userId?.name}</td><td>{s.userId?.email}</td></tr>) : listModal.subject.lecturers.map((l)=><tr key={l._id}><td>{l.staffId}</td><td>{l.name}</td><td>{l.email}</td><td>{l.designation}</td></tr>)}</tbody></table></div>}<footer><button onClick={()=>setListModal(null)}>Close</button>{listModal.type === "students" && <button className="primary" disabled={!listModal.subject.students?.length} onClick={()=>downloadStudents(listModal.subject)}><FiDownload/> Download Excel</button>}</footer></div></section></div>}
  </main>;
}

export default SubjectList;