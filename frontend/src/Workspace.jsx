import { useEffect, useMemo, useRef, useState } from "react";
import logoUrl from "./assets/KIDDIES DROID-LOGO.png";
import { apiPath, request } from "./api.js";

const PROGRAMS = "/academics/program/";

const STUDENT_FEEDBACK_QUESTIONS = [
  { key: "attendance_status", question: "Attendance", options: [["not_assessed", "Not assessed"], ["on_time", "Present and on time"], ["late", "Arrived late"], ["absent_with_notice", "Absent with notice"], ["absent_without_notice", "Absent without notice"]] },
  { key: "participation", question: "Participation", options: [["independent_contribution", "Contributed independently"], ["when_prompted", "Participated when prompted"], ["limited_observed", "Limited participation observed"], ["not_assessed", "Not assessed"]] },
  { key: "understanding", question: "Understanding of today’s learning goals", options: [["demonstrated", "Demonstrated understanding"], ["developing", "Understanding is developing"], ["needs_practice", "Needs more practice"], ["not_assessed", "Not assessed"]] },
  { key: "practical_work", question: "Practical work or project", options: [["not_assessed", "Not assessed"], ["completed_independently", "Completed independently"], ["completed_with_support", "Completed with support"], ["partially_completed", "Partially completed"], ["not_attempted", "Not attempted"], ["not_applicable", "Not applicable"]] },
  { key: "assignment_status", question: "Assignment status", options: [["not_assessed", "Not assessed"], ["completed", "Completed"], ["partially_completed", "Partially completed"], ["not_submitted", "Not submitted"], ["not_yet_due", "Not yet due"], ["no_assignment", "No assignment"]] },
  { key: "collaboration", question: "Collaboration", options: [["worked_well", "Worked well with others"], ["some_support", "Needed some support"], ["needed_reminders", "Needed reminders"], ["not_assessed", "Not assessed"]] },
];

function feedbackAnswerLabel(question, value) {
  return question.options.find(([option]) => option === value)?.[1] || value;
}

function defaultFeedbackAnswers() {
  return {
    attendance_status: "not_assessed",
    participation: "not_assessed",
    understanding: "not_assessed",
    practical_work: "not_assessed",
    assignment_status: "not_assessed",
    collaboration: "not_assessed",
  };
}

function Icon({ name, size = 18 }) {
  const common = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true };
  const paths = {
    home: <><path d="m3 10 9-7 9 7"/><path d="M5 9v12h14V9M9 21v-7h6v7"/></>,
    program: <><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z"/></>,
    students: <><path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="10" cy="7" r="4"/><path d="M20 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></>,
    classes: <><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 8h10M7 12h10M7 16h5"/></>,
    instructor: <><path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z"/><path d="M9 12h6M12 9v6"/></>,
    reports: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6M8 13h8M8 17h8"/></>,
    feedback: <><path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8Z"/><path d="M8 12h8M8 15h5"/></>,
    search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>,
    plus: <><path d="M12 5v14M5 12h14"/></>,
    logout: <><path d="M10 17l5-5-5-5M15 12H3"/><path d="M12 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6"/></>,
    menu: <><path d="M4 6h16M4 12h16M4 18h16"/></>,
    close: <><path d="m18 6-12 12M6 6l12 12"/></>,
    arrow: <><path d="M5 12h14M12 5l7 7-7 7"/></>,
    check: <path d="m5 12 4 4L19 6"/>,
  };
  return <svg {...common}>{paths[name] || null}</svg>;
}

function Button({ children, variant = "primary", icon, ...props }) {
  return <button className={`button button-${variant}`} {...props}>{icon && <Icon name={icon} size={17}/>}<span>{children}</span></button>;
}

function Panel({ children, className = "" }) {
  return <section className={`panel ${className}`}>{children}</section>;
}

function PageHeading({ eyebrow = "Kiddies Droid Portal", title, description, action }) {
  return <div className="page-heading"><div><p className="eyebrow">{eyebrow}</p><h2>{title}</h2>{description && <p className="page-description">{description}</p>}</div>{action}</div>;
}

function Feedback({ error, success }) {
  if (!error && !success) return null;
  return <div className={`feedback ${error ? "feedback-error" : "feedback-success"}`} role={error ? "alert" : "status"}>{error || success}</div>;
}

function Loading({ children = "Loading…" }) {
  return <div className="loading-state"><span className="spinner" aria-hidden="true"/>{children}</div>;
}

function Empty({ title, children }) {
  return <div className="empty-state"><span className="empty-icon"><Icon name="program" size={22}/></span><h3>{title}</h3><p>{children}</p></div>;
}

function Table({ headers, children }) {
  return <div className="table-scroll"><table><thead><tr>{headers.map((header) => <th key={header}>{header}</th>)}</tr></thead><tbody>{children}</tbody></table></div>;
}

function useLoad(key, loader, dependencies = []) {
  const [state, setState] = useState({ data: null, loading: true, error: "" });
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setState({ data: null, loading: true, error: "" });
    loader(controller.signal)
      .then((data) => setState({ data, loading: false, error: "" }))
      .catch((error) => {
        if (error.name !== "AbortError") setState({ data: null, loading: false, error: error.message || `Unable to load ${key}.` });
      });
    return () => controller.abort();
    // The caller supplies stable IDs as dependencies; refresh triggers a reload after mutations.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...dependencies, refresh]);
  return { ...state, reload: () => setRefresh((value) => value + 1) };
}

function AdminPrograms({ programs, loading, error, onReload, onSelect, activeProgramId }) {
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  async function createProgram(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setSaving(true); setFormError("");
    try {
      await request(PROGRAMS, { method: "POST", data: {
        name: String(form.get("name")).trim(),
        status: form.get("status"),
        start_date: form.get("start_date") || null,
        end_date: form.get("end_date") || null,
      } });
      setFormOpen(false); onReload();
    } catch (caught) { setFormError(caught.message); }
    finally { setSaving(false); }
  }
  return <>
    <PageHeading title="Programs" description="Choose a program to open its classes, students, instructors, and reports." action={<Button icon="plus" onClick={() => setFormOpen((value) => !value)}>New program</Button>}/>
    <UpcomingProgramsBanner />
    <Feedback error={error || formError}/>
    {formOpen && <Panel className="form-panel"><div className="panel-heading"><div><h3>Create a program</h3><p>Start and end dates can be left blank until they are confirmed.</p></div><button className="icon-button" aria-label="Close" onClick={() => setFormOpen(false)}><Icon name="close"/></button></div><form className="form-grid" onSubmit={createProgram}><label>Program name<input name="name" required maxLength="50" placeholder="Summer Bootcamp"/></label><label>Status<select name="status" defaultValue="upcoming"><option value="upcoming">Upcoming</option><option value="active">Active</option><option value="completed">Completed</option><option value="archived">Archived</option></select></label><label>Start date<input name="start_date" type="date"/></label><label>End date<input name="end_date" type="date"/></label><div className="form-actions"><Button disabled={saving}>{saving ? "Creating…" : "Create program"}</Button><Button type="button" variant="secondary" onClick={() => setFormOpen(false)}>Cancel</Button></div></form></Panel>}
    {loading ? <Loading>Loading programs…</Loading> : programs?.length ? <div className="program-grid">{programs.map((program) => <article className={`program-card ${String(activeProgramId) === String(program.id) ? "program-card-active" : ""}`} key={program.id}><div className="program-card-top"><span className={`status-pill status-${program.status}`}>{program.status}</span><Icon name="program" size={21}/></div><h3>{program.name}</h3><p>{program.start_date || "Start date not set"}{program.end_date ? ` – ${program.end_date}` : ""}</p><div className="program-card-actions"><Button onClick={() => onSelect(program)}>{String(activeProgramId) === String(program.id) ? "Open program" : "Select program"}</Button></div></article>)}</div> : <Empty title="No programs yet">Create a program to start organizing classes and enrollments.</Empty>}
    <Panel className="subtle-note"><strong>Program selection controls the workspace.</strong><span>When a program is selected, student lists show only students enrolled in that program.</span></Panel>
  </>;
}

function UpcomingProgramsBanner() {
  return <section className="upcoming-banner" aria-label="Upcoming programs">
    <div className="upcoming-banner-copy"><span className="upcoming-kicker">Coming up at Kiddies Droid</span><h2>Big ideas. Bright futures.</h2><p>New learning programs are on the way. Keep an eye out for dates, age groups, and registration details.</p><span className="upcoming-coming">Upcoming program announcement <span>Coming soon</span></span></div>
    <div className="upcoming-art" aria-hidden="true"><span className="orbit orbit-one"/><span className="orbit orbit-two"/><span className="sparkle sparkle-one">✦</span><span className="sparkle sparkle-two">✦</span><div className="upcoming-book"><span>LEARN</span><strong>CREATE<br/>EXPLORE</strong><small>KIDDIES DROID</small></div><div className="upcoming-star">✦</div></div>
  </section>;
}

function parseStudentCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  const source = text.replace(/^\uFEFF/, "");
  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    if (quoted) {
      if (character === '"' && source[index + 1] === '"') { cell += '"'; index += 1; }
      else if (character === '"') quoted = false;
      else cell += character;
    } else if (character === '"') quoted = true;
    else if (character === ",") { row.push(cell.trim()); cell = ""; }
    else if (character === "\n" || character === "\r") {
      if (character === "\r" && source[index + 1] === "\n") index += 1;
      row.push(cell.trim());
      if (row.some((value) => value !== "")) rows.push(row);
      row = []; cell = "";
    } else cell += character;
  }
  row.push(cell.trim());
  if (row.some((value) => value !== "")) rows.push(row);
  if (quoted) throw new Error("The CSV has an opening quote without a matching closing quote.");
  if (rows.length < 2) throw new Error("Add a header row and at least one student row.");
  const headers = rows[0].map((value) => value.toLowerCase().replace(/[ -]+/g, "_").trim());
  const aliases = { first_name: ["first_name", "firstname"], last_name: ["last_name", "lastname"], parent_email: ["parent_email"], program: ["program", "program_name"], classroom: ["class", "class_name", "classroom"] };
  const positions = Object.fromEntries(Object.entries(aliases).map(([field, choices]) => [field, headers.findIndex((header) => choices.includes(header))]));
  for (const field of ["first_name", "last_name", "program", "classroom"]) {
    if (positions[field] < 0) throw new Error(`CSV is missing a required column: ${field === "classroom" ? "class" : field}.`);
  }
  return rows.slice(1).map((values, index) => ({
    rowNumber: index + 2,
    first_name: values[positions.first_name] || "",
    last_name: values[positions.last_name] || "",
    parent_email: positions.parent_email >= 0 ? values[positions.parent_email] || "" : "",
    program: values[positions.program] || "",
    classroom: values[positions.classroom] || "",
  })).filter((item) => item.first_name || item.last_name || item.program || item.classroom);
}

function studentNameKey(firstName, lastName) {
  return `${firstName} ${lastName}`.normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase();
}

function StudentCsvImport({ programs, students, disabled, onImported }) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [summary, setSummary] = useState(null);

  async function importCsv(event) {
    event.preventDefault();
    if (!file || disabled) return;
    setBusy(true); setError(""); setSummary(null);
    try {
      const rows = parseStudentCsv(await file.text());
      const programNames = new Map();
      for (const item of programs || []) {
        const key = item.name.normalize("NFKC").trim().toLocaleLowerCase();
        programNames.set(key, [...(programNames.get(key) || []), item]);
      }
      const validRows = [];
      const rowErrors = [];
      for (const item of rows) {
        if (!item.first_name || !item.last_name || !item.program || !item.classroom) {
          rowErrors.push(`Row ${item.rowNumber}: first name, last name, program, and class are required.`); continue;
        }
        const matches = programNames.get(item.program.normalize("NFKC").trim().toLocaleLowerCase()) || [];
        if (matches.length !== 1) {
          rowErrors.push(`Row ${item.rowNumber}: program “${item.program}” ${matches.length ? "matches more than one program" : "was not found"}.`); continue;
        }
        validRows.push({ ...item, programRecord: matches[0], nameKey: studentNameKey(item.first_name, item.last_name) });
      }

      const repeated = new Map();
      for (const item of validRows) {
        const key = `${item.programRecord.id}:${item.nameKey}`;
        repeated.set(key, [...(repeated.get(key) || []), item]);
      }
      const repeatedKeys = new Set([...repeated].filter(([, items]) => items.length > 1).map(([key]) => key));
      for (const item of validRows) {
        if (repeatedKeys.has(`${item.programRecord.id}:${item.nameKey}`)) rowErrors.push(`Row ${item.rowNumber}: duplicate student name and program in the CSV; all matching rows were skipped.`);
      }

      const targetProgramIds = [...new Set(validRows.filter((item) => !repeatedKeys.has(`${item.programRecord.id}:${item.nameKey}`)).map((item) => item.programRecord.id))];
      const programData = new Map(await Promise.all(targetProgramIds.map(async (programId) => {
        const [programEnrollments, programClasses] = await Promise.all([
          request(`/academics/program/${programId}/enrollment/`),
          request(`/academics/program/${programId}/classes/`),
        ]);
        return [String(programId), { enrollments: programEnrollments, classes: programClasses }];
      })));

      const counts = { created: 0, enrolled: 0, moved: 0, unchanged: 0, skipped: rowErrors.length, errors: rowErrors };
      const workingStudents = [...(students || [])];
      for (const item of validRows) {
        const repeatedKey = `${item.programRecord.id}:${item.nameKey}`;
        if (repeatedKeys.has(repeatedKey)) continue;
        try {
          const classMatches = (programData.get(String(item.programRecord.id))?.classes || []).filter((room) => room.name.normalize("NFKC").trim().toLocaleLowerCase() === item.classroom.normalize("NFKC").trim().toLocaleLowerCase());
          if (classMatches.length !== 1) throw new Error(`Class “${item.classroom}” ${classMatches.length ? "matches more than one class" : `was not found in ${item.programRecord.name}`}.`);
          const existing = workingStudents.filter((student) => studentNameKey(student.first_name, student.last_name) === item.nameKey);
          if (existing.length > 1) throw new Error(`More than one existing student is named ${item.first_name} ${item.last_name}; row skipped.`);
          if (!existing.length && (!item.parent_email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(item.parent_email))) throw new Error(`A valid parent_email is required to create ${item.first_name} ${item.last_name}.`);
          let student = existing[0];
          if (!student) {
            student = await request("/student/", { method: "POST", data: { first_name: item.first_name, last_name: item.last_name, parent_email: item.parent_email } });
            workingStudents.push(student);
            counts.created += 1;
          }
          const targetData = programData.get(String(item.programRecord.id));
          const workingEnrollments = targetData.enrollments;
          const classroom = classMatches[0];
          const enrollment = workingEnrollments.find((entry) => String(entry.student) === String(student.id));
          if (!enrollment) {
            const createdEnrollment = await request(`/academics/program/${item.programRecord.id}/enrollment/`, { method: "POST", data: { student: Number(student.id), classroom: Number(classroom.id) } });
            workingEnrollments.push(createdEnrollment); counts.enrolled += 1;
          } else if (String(enrollment.classroom) !== String(classroom.id)) {
            const updatedEnrollment = await request(`/academics/program/${item.programRecord.id}/enrollment/${enrollment.id}/`, { method: "PATCH", data: { classroom: Number(classroom.id) } });
            Object.assign(enrollment, updatedEnrollment); counts.moved += 1;
          } else counts.unchanged += 1;
        } catch (caught) {
          counts.skipped += 1;
          counts.errors.push(`Row ${item.rowNumber}: ${caught.message}`);
        }
      }
      setSummary(counts);
      setFile(null);
      const input = document.getElementById("student-csv-file");
      if (input) input.value = "";
      onImported?.();
    } catch (caught) { setError(caught.message); }
    finally { setBusy(false); }
  }

  return <div className="student-import-control">
    <Button variant="secondary" icon="students" onClick={() => { setOpen((value) => !value); setError(""); }}>{open ? "Close CSV import" : "Import students"}</Button>
    {open && <Panel className="form-panel student-import-panel"><div className="panel-heading"><div><h3>Import students from CSV</h3><p>Each row uses its <code>program</code> and <code>class</code> values to choose the enrollment destination.</p></div></div><p className="form-help">Required columns: <code>first_name</code>, <code>last_name</code>, <code>program</code>, and <code>class</code>. Add <code>parent_email</code> for new student accounts. Existing students are matched by first and last name; their enrollment in each listed program is added or moved, while other program enrollments are preserved.</p><a className="inline-link" href={`data:text/csv;charset=utf-8,${encodeURIComponent("first_name,last_name,parent_email,program,class\nJane,Doe,parent@example.com,Summer Bootcamp,Robotics")}`} download="student-import-template.csv">Download CSV template</a>{disabled ? <Loading>Loading student records…</Loading> : <form className="form-grid" onSubmit={importCsv}><label className="form-span">CSV file<input id="student-csv-file" type="file" accept=".csv,text/csv" onChange={(event) => { setFile(event.target.files?.[0] || null); setSummary(null); setError(""); }} required/></label><div className="form-actions"><Button disabled={busy || !file || !(programs || []).length}>{busy ? "Importing…" : "Import CSV"}</Button></div></form>}<Feedback error={error}/>{summary && <div className="import-summary" role="status"><strong>Import complete</strong><span>{summary.created} created · {summary.enrolled} enrolled · {summary.moved} moved · {summary.unchanged} unchanged · {summary.skipped} skipped</span>{summary.errors.length > 0 && <ul>{summary.errors.map((message, index) => <li key={`${index}-${message}`}>{message}</li>)}</ul>}</div>}</Panel>}
  </div>;
}

function StudentList({ activeProgram, programs, onStudentsChanged, onManage }) {
  const [query, setQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [assigningStudent, setAssigningStudent] = useState("");
  const [selectedClass, setSelectedClass] = useState("");
  const [assigning, setAssigning] = useState(false);
  const { data, loading, error, reload } = useLoad("students", async (signal) => {
    const students = await request("/student/", { signal });
    if (!activeProgram) return { students, enrollments: [], classes: [] };
    const [enrollments, classes] = await Promise.all([
      request(`/academics/program/${activeProgram.id}/enrollment/`, { signal }),
      request(`/academics/program/${activeProgram.id}/classes/`, { signal }),
    ]);
    return { students, enrollments, classes };
  }, [activeProgram?.id]);
  async function createStudent(event) {
    event.preventDefault(); const form = new FormData(event.currentTarget);
    setSaving(true); setFormError("");
    try {
      await request("/student/", { method: "POST", data: { first_name: String(form.get("first_name")).trim(), last_name: String(form.get("last_name")).trim(), parent_email: String(form.get("parent_email")).trim() } });
      setShowForm(false); reload(); onStudentsChanged?.();
    } catch (caught) { setFormError(caught.message); }
    finally { setSaving(false); }
  }
  const filtered = useMemo(() => {
    const students = data?.students || [];
    const term = query.trim().toLowerCase();
    const matches = students.filter((student) => `${student.first_name} ${student.last_name} ${student.username}`.toLowerCase().includes(term));
    const enrolledIds = new Set((data?.enrollments || []).map((item) => String(item.student)));
    return activeProgram ? { enrolled: matches.filter((item) => enrolledIds.has(String(item.id))), available: matches.filter((item) => !enrolledIds.has(String(item.id))) } : { enrolled: matches, available: [] };
  }, [activeProgram, data, query]);
  const classesByStudent = useMemo(() => {
    const result = new Map();
    for (const enrollment of data?.enrollments || []) {
      const room = data?.classes?.find((item) => String(item.id) === String(enrollment.classroom));
      const names = result.get(String(enrollment.student)) || [];
      names.push(room?.name || "Class");
      result.set(String(enrollment.student), names);
    }
    return result;
  }, [data]);
  async function assignStudent(studentId) {
    if (!activeProgram || !selectedClass) return;
    setAssigning(true); setFormError("");
    try {
      await request(`/academics/program/${activeProgram.id}/enrollment/`, { method: "POST", data: { student: Number(studentId), classroom: Number(selectedClass) } });
      setAssigningStudent(""); setSelectedClass(""); reload(); onStudentsChanged?.();
    } catch (caught) { setFormError(caught.message); }
    finally { setAssigning(false); }
  }
  const renderStudents = (students, canAssign = false) => students.length ? <Panel className="table-panel"><Table headers={["Student", "Username", "Parent email", "Manage", ...(activeProgram ? [canAssign ? "Assign to program" : "Class"] : [])]}>{students.map((student) => <tr key={student.id}><td><span className="student-cell"><strong>{student.first_name} {student.last_name}</strong></span></td><td className="mono">{student.username}</td><td>{student.parent_email}</td><td><a className="student-manage-link" href={`/app/students/${student.id}/manage`} onClick={(event) => { event.preventDefault(); onManage?.(student.id); }}>Manage</a></td>{activeProgram && <td>{canAssign ? <div className="assign-cell">{assigningStudent === String(student.id) ? <><select aria-label={`Class for ${student.first_name} ${student.last_name}`} value={selectedClass} onChange={(event) => setSelectedClass(event.target.value)}><option value="">Choose class</option>{(data?.classes || []).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><Button disabled={!selectedClass || assigning} onClick={() => assignStudent(student.id)}>{assigning ? "Assigning…" : "Confirm"}</Button><button className="inline-link" type="button" onClick={() => { setAssigningStudent(""); setSelectedClass(""); }}>Cancel</button></> : <Button variant="secondary" disabled={!data?.classes?.length} onClick={() => { setAssigningStudent(String(student.id)); setSelectedClass(""); }}>Assign</Button>}</div> : (classesByStudent.get(String(student.id)) || []).join(", ")}</td>}</tr>)}</Table></Panel> : <Empty title={canAssign ? "All students are enrolled" : activeProgram ? "No students enrolled yet" : "No student accounts yet"}>{canAssign ? `Every student account is already enrolled in ${activeProgram.name}.` : activeProgram ? `Enroll a student in ${activeProgram.name} to show them here.` : "Create a student account to add the first student."}</Empty>;
  return <>
    <PageHeading title="Students" description={activeProgram ? `Students enrolled in ${activeProgram.name} appear first. Assign other students below.` : "All student accounts. Select a program to see its enrollments and assign students."} action={<Button icon="plus" onClick={() => setShowForm((value) => !value)}>New student</Button>}/>
    <StudentCsvImport programs={programs} students={data?.students} disabled={loading} onImported={() => { reload(); onStudentsChanged?.(); }}/>
    <Feedback error={error || formError}/>
    {showForm && <Panel className="form-panel"><div className="panel-heading"><div><h3>Create student account</h3><p>Login details are generated and sent to the parent email address.</p></div><button className="icon-button" onClick={() => setShowForm(false)} aria-label="Close"><Icon name="close"/></button></div><form className="form-grid" onSubmit={createStudent}><label>First name<input name="first_name" required autoComplete="given-name" maxLength="150"/></label><label>Last name<input name="last_name" required autoComplete="family-name" maxLength="150"/></label><label className="form-span">Parent email<input name="parent_email" type="email" required autoComplete="email" placeholder="parent@example.com"/></label><div className="form-actions"><Button disabled={saving}>{saving ? "Creating…" : "Create student"}</Button><Button type="button" variant="secondary" onClick={() => setShowForm(false)}>Cancel</Button></div></form></Panel>}
    <Panel className="filter-panel"><label className="search-field"><Icon name="search"/><span className="sr-only">Search students</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by student name or username"/></label><span className="result-count">{loading ? "Loading" : `${filtered.enrolled.length + filtered.available.length} student${filtered.enrolled.length + filtered.available.length === 1 ? "" : "s"}`}</span></Panel>
    {loading ? <Loading>Loading students…</Loading> : activeProgram ? <div className="student-groups"><section className="student-group"><div className="section-heading"><div><p className="eyebrow">{activeProgram.name}</p><h3>Enrolled students</h3></div><span className="count-badge">{filtered.enrolled.length}</span></div>{renderStudents(filtered.enrolled)}</section><section className="student-group"><div className="section-heading"><div><p className="eyebrow">Student directory</p><h3>All other students</h3><p>Assign an available student to a class in this program.</p></div><span className="count-badge">{filtered.available.length}</span></div>{renderStudents(filtered.available, true)}</section></div> : renderStudents(filtered.enrolled)}
  </>;
}

function ClassesPage({ program, onChanged }) {
  const [showClassForm, setShowClassForm] = useState(false);
  const [showEnrollmentForm, setShowEnrollmentForm] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [rosterFor, setRosterFor] = useState(null);
  const classesState = useLoad("classes", (signal) => request(`/academics/program/${program.id}/classes/`, { signal }), [program.id]);
  const enrollmentState = useLoad("enrollments", (signal) => request(`/academics/program/${program.id}/enrollment/`, { signal }), [program.id]);
  const studentState = useLoad("students", (signal) => request("/student/", { signal }), [program.id]);
  const assignmentState = useLoad("assignments", (signal) => request(`/academics/program/${program.id}/instructor_assignment/`, { signal }), [program.id]);
  const classes = classesState.data || [];
  const enrollments = enrollmentState.data || [];
  const students = studentState.data || [];
  const assignments = assignmentState.data || [];
  const [instructors, setInstructors] = useState([]);
  useEffect(() => { let live = true; request("/instructors/").then((rows) => { if (live) setInstructors(rows); }).catch(() => {}); return () => { live = false; }; }, []);
  async function submitForm(event, kind) {
    event.preventDefault(); const form = new FormData(event.currentTarget); setSaving(true); setErrorMessage("");
    try {
      if (kind === "class") await request(`/academics/program/${program.id}/classes/`, { method: "POST", data: { name: String(form.get("name")).trim() } });
      else await request(`/academics/program/${program.id}/enrollment/`, { method: "POST", data: { student: Number(form.get("student")), classroom: Number(form.get("classroom")) } });
      setShowClassForm(false); setShowEnrollmentForm(false); classesState.reload(); enrollmentState.reload(); onChanged?.();
    } catch (caught) { setErrorMessage(caught.message); }
    finally { setSaving(false); }
  }
  return <>
    <PageHeading title="Classes" description={`Classes, student enrollment, and instructor assignments for ${program.name}.`} action={<div className="button-row"><Button variant="secondary" icon="students" onClick={() => setShowEnrollmentForm((value) => !value)}>Enroll student</Button><Button icon="plus" onClick={() => setShowClassForm((value) => !value)}>New class</Button></div>}/>
    <Feedback error={errorMessage || classesState.error || enrollmentState.error || studentState.error || assignmentState.error}/>
    {showClassForm && <Panel className="form-panel"><h3>Create a class</h3><form className="form-grid" onSubmit={(event) => submitForm(event, "class")}><label className="form-span">Class name<input name="name" required maxLength="20" placeholder="Beginners"/></label><div className="form-actions"><Button disabled={saving}>{saving ? "Saving…" : "Create class"}</Button><Button type="button" variant="secondary" onClick={() => setShowClassForm(false)}>Cancel</Button></div></form></Panel>}
    {showEnrollmentForm && <Panel className="form-panel"><h3>Enroll a student in {program.name}</h3><form className="form-grid" onSubmit={(event) => submitForm(event, "enrollment")}><label>Student<select name="student" required defaultValue=""><option value="" disabled>Select student</option>{students.map((student) => <option key={student.id} value={student.id}>{student.first_name} {student.last_name} · {student.username}</option>)}</select></label><label>Class<select name="classroom" required defaultValue=""><option value="" disabled>Select class</option>{classes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><div className="form-actions"><Button disabled={saving}>{saving ? "Saving…" : "Create enrollment"}</Button><Button type="button" variant="secondary" onClick={() => setShowEnrollmentForm(false)}>Cancel</Button></div></form></Panel>}
    {(classesState.loading || enrollmentState.loading) ? <Loading>Loading classes…</Loading> : classes.length ? <div className="class-grid">{classes.map((classroom) => { const roster = enrollments.filter((item) => String(item.classroom) === String(classroom.id)); const classAssignments = assignments.filter((item) => String(item.classroom) === String(classroom.id)); const names = classAssignments.map((item) => { const instructor = instructors.find((record) => String(record.id) === String(item.instructor)); return instructor ? `${instructor.first_name} ${instructor.last_name}` : "Instructor"; }); return <Panel key={classroom.id} className="class-card"><div className="class-icon"><Icon name="classes" size={22}/></div><h3>{classroom.name}</h3><p>{program.name}</p><div className="class-metrics"><span><strong>{roster.length}</strong> students</span><span><strong>{classAssignments.length}</strong> assignments</span></div><div className="tag-list">{names.length ? names.map((name, index) => <span key={`${name}-${index}`}>{name}</span>) : <span>Instructor unassigned</span>}</div><Button variant="secondary" onClick={() => setRosterFor(rosterFor === classroom.id ? null : classroom.id)}>{rosterFor === classroom.id ? "Hide roster" : "View roster"}</Button>{rosterFor === classroom.id && <div className="roster-list">{roster.map((enrollment) => { const student = students.find((item) => String(item.id) === String(enrollment.student)); return <div key={enrollment.id}>{student ? `${student.first_name} ${student.last_name}` : "Student"}</div>; })}{!roster.length && <p>No students enrolled yet.</p>}</div>}</Panel>; })}</div> : !classesState.loading && <Empty title="No classes in this program">Create a class, then enroll students and assign instructors.</Empty>}
  </>;
}

function InstructorsPage({ program, onManage }) {
  const instructorsState = useLoad("instructors", (signal) => request("/instructors/", { signal }), []);
  const assignmentsState = useLoad("assignments", (signal) => program ? request(`/academics/program/${program.id}/instructor_assignment/`, { signal }) : Promise.resolve([]), [program?.id]);
  const classesState = useLoad("classes", (signal) => program ? request(`/academics/program/${program.id}/classes/`, { signal }) : Promise.resolve([]), [program?.id]);
  const [form, setForm] = useState(false); const [saving, setSaving] = useState(false); const [errorMessage, setErrorMessage] = useState("");
  async function addInstructor(event) {
    event.preventDefault(); const values = new FormData(event.currentTarget); setSaving(true); setErrorMessage("");
    try { await request("/instructors/", { method: "POST", data: { first_name: String(values.get("first_name")).trim(), last_name: String(values.get("last_name")).trim(), email: String(values.get("email")).trim() } }); setForm(false); instructorsState.reload(); }
    catch (caught) { setErrorMessage(caught.message); } finally { setSaving(false); }
  }
  async function addAssignment(event) {
    if (!program) return;
    event.preventDefault(); const values = new FormData(event.currentTarget); setSaving(true); setErrorMessage("");
    try { await request(`/academics/program/${program.id}/instructor_assignment/`, { method: "POST", data: { instructor: Number(values.get("instructor")), classroom: Number(values.get("classroom")), subject: String(values.get("subject")).trim() } }); assignmentsState.reload(); }
    catch (caught) { setErrorMessage(caught.message); } finally { setSaving(false); }
  }
  const instructors = instructorsState.data || []; const assignments = assignmentsState.data || []; const classes = classesState.data || [];
  return <><PageHeading title={program ? "Instructors" : "All instructors"} description={program ? `Manage instructors and their class assignments in ${program.name}.` : "View and create instructor accounts across all programs."} action={<Button icon="plus" onClick={() => setForm((value) => !value)}>New instructor</Button>}/><Feedback error={errorMessage || instructorsState.error || assignmentsState.error || classesState.error}/>
    {form && <Panel className="form-panel"><h3>Create instructor account</h3><p className="form-help">A generated username and temporary password will be sent to the instructor's email.</p><form className="form-grid" onSubmit={addInstructor}><label>First name<input name="first_name" required/></label><label>Last name<input name="last_name" required/></label><label className="form-span">Email<input type="email" name="email" required/></label><div className="form-actions"><Button disabled={saving}>{saving ? "Creating…" : "Create instructor"}</Button><Button type="button" variant="secondary" onClick={() => setForm(false)}>Cancel</Button></div></form></Panel>}
    {program && <Panel className="form-panel"><div className="panel-heading"><div><h3>Assign an instructor</h3><p>Assignments grant access to class rosters and reporting.</p></div></div>{!classes.length || !instructors.length ? <p className="form-help">Create at least one class and one instructor before assigning.</p> : <form className="form-grid" onSubmit={addAssignment}><label>Instructor<select name="instructor" required defaultValue=""><option value="" disabled>Select instructor</option>{instructors.map((item) => <option key={item.id} value={item.id}>{item.first_name} {item.last_name} · {item.username}</option>)}</select></label><label>Class<select name="classroom" required defaultValue=""><option value="" disabled>Select class</option>{classes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label className="form-span">Subject<input name="subject" required maxLength="20" placeholder="Reading"/></label><div className="form-actions"><Button disabled={saving}>{saving ? "Saving…" : "Assign instructor"}</Button></div></form>}</Panel>}
    {instructorsState.loading || assignmentsState.loading ? <Loading>Loading instructors…</Loading> : <Panel className="table-panel"><Table headers={program ? ["Instructor", "Username", "Email", "Class assignments", "Manage"] : ["Instructor", "Username", "Email", "Manage"]}>{instructors.map((instructor) => { const assigned = assignments.filter((item) => String(item.instructor) === String(instructor.id)); return <tr key={instructor.id}><td><strong>{instructor.first_name} {instructor.last_name}</strong></td><td className="mono">{instructor.username}</td><td>{instructor.email}</td>{program && <td>{assigned.length ? assigned.map((item) => `${classes.find((room) => String(room.id) === String(item.classroom))?.name || "Class"} · ${item.subject}`).join(", ") : "No assignments in this program"}</td>}<td><a className="student-manage-link" href={`/app/instructors/${instructor.id}/manage`} onClick={(event) => { event.preventDefault(); onManage(instructor.id); }}>Manage</a></td></tr>; })}</Table>{!instructors.length && <Empty title="No instructor accounts">Create an instructor account to make class assignments.</Empty>}</Panel>}
  </>;
}

function InstructorManage({ instructorId, programs, onBack }) {
  const profileState = useLoad("instructor", (signal) => request(`/instructors/${instructorId}/`, { signal }), [instructorId]);
  const programKey = programs.map((program) => program.id).join(",");
  const assignmentsState = useLoad("instructor assignments", async (signal) => {
    const groups = await Promise.all(programs.map(async (program) => {
      const [assignments, classes] = await Promise.all([
        request(`/academics/program/${program.id}/instructor_assignment/`, { signal }),
        request(`/academics/program/${program.id}/classes/`, { signal }),
      ]);
      return assignments.filter((item) => String(item.instructor) === String(instructorId)).map((item) => ({
        ...item,
        programId: program.id,
        programName: program.name,
        className: classes.find((classroom) => String(classroom.id) === String(item.classroom))?.name || "Class",
      }));
    }));
    return groups.flat();
  }, [programKey, instructorId]);
  const [selectedProgramId, setSelectedProgramId] = useState("");
  const classesState = useLoad("classes", (signal) => selectedProgramId ? request(`/academics/program/${selectedProgramId}/classes/`, { signal }) : Promise.resolve([]), [selectedProgramId]);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const profile = profileState.data;
  const assignments = assignmentsState.data || [];
  const classes = classesState.data || [];

  async function saveDetails(event) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    setSaving(true); setFormError(""); setSuccessMessage("");
    try {
      await request(`/instructors/${instructorId}/`, { method: "PATCH", data: {
        first_name: String(values.get("first_name")).trim(),
        last_name: String(values.get("last_name")).trim(),
        email: String(values.get("email")).trim(),
      } });
      profileState.reload();
      setSuccessMessage("Instructor details saved.");
    } catch (caught) { setFormError(caught.message); }
    finally { setSaving(false); }
  }

  async function addAssignment(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    setSaving(true); setFormError(""); setSuccessMessage("");
    try {
      await request(`/academics/program/${selectedProgramId}/instructor_assignment/`, { method: "POST", data: {
        instructor: Number(instructorId),
        classroom: Number(values.get("classroom")),
        subject: String(values.get("subject")).trim(),
      } });
      form.reset();
      assignmentsState.reload();
      setSuccessMessage("Class assignment added.");
    } catch (caught) { setFormError(caught.message); }
    finally { setSaving(false); }
  }

  async function removeAssignment(assignment) {
    setSaving(true); setFormError(""); setSuccessMessage("");
    try {
      await request(`/academics/program/${assignment.programId}/instructor_assignment/${assignment.id}/`, { method: "DELETE" });
      assignmentsState.reload();
      setSuccessMessage(`Assignment removed from ${assignment.className}.`);
    } catch (caught) { setFormError(caught.message); }
    finally { setSaving(false); }
  }

  return <>
    <PageHeading title={profile ? `${profile.first_name} ${profile.last_name}` : "Manage instructor"} description="Update this instructor’s details and class assignments." action={<Button variant="secondary" onClick={onBack}>Back to instructors</Button>}/>
    <Feedback error={profileState.error || assignmentsState.error || formError} success={successMessage}/>
    {profileState.loading ? <Loading>Loading instructor…</Loading> : profile ? <Panel className="form-panel"><h3>Instructor details</h3><p className="form-help">Username: <span className="mono">{profile.username}</span></p><form className="form-grid" onSubmit={saveDetails}><label>First name<input name="first_name" required maxLength="150" defaultValue={profile.first_name}/></label><label>Last name<input name="last_name" required maxLength="150" defaultValue={profile.last_name}/></label><label className="form-span">Email<input name="email" type="email" required defaultValue={profile.email}/></label><div className="form-actions"><Button disabled={saving}>{saving ? "Saving…" : "Save details"}</Button></div></form></Panel> : !profileState.error && <Empty title="Instructor not found">Return to the instructor list and choose an instructor to manage.</Empty>}
    <div className="section-heading manage-roster-heading"><div><p className="eyebrow">Assignments</p><h3>Programs and classes</h3></div><span className="count-badge">{assignments.length}</span></div>
    <Feedback error={assignmentsState.error || classesState.error}/>
    {programs.length > 0 && <Panel className="form-panel"><h3>Assign to a class</h3><form className="form-grid" onSubmit={addAssignment}><label>Program<select required value={selectedProgramId} onChange={(event) => setSelectedProgramId(event.target.value)}><option value="">Select a program</option>{programs.map((program) => <option key={program.id} value={program.id}>{program.name}</option>)}</select></label><label>Class<select name="classroom" required disabled={!selectedProgramId} defaultValue=""><option value="">Select a class</option>{classes.map((classroom) => <option key={classroom.id} value={classroom.id}>{classroom.name}</option>)}</select></label><label className="form-span">Subject<input name="subject" required maxLength="20" placeholder="Reading"/></label><div className="form-actions"><Button disabled={saving || !selectedProgramId || !classes.length}>{saving ? "Saving…" : "Add assignment"}</Button></div></form>{selectedProgramId && !classesState.loading && !classes.length && <p className="form-help">This program has no classes yet.</p>}</Panel>}
    {assignmentsState.loading ? <Loading>Loading assignments…</Loading> : assignments.length ? <Panel className="table-panel"><Table headers={["Program", "Class", "Subject", "Action"]}>{assignments.map((assignment) => <tr key={`${assignment.programId}-${assignment.id}`}><td>{assignment.programName}</td><td>{assignment.className}</td><td>{assignment.subject}</td><td><Button variant="secondary" disabled={saving} onClick={() => removeAssignment(assignment)}>Remove</Button></td></tr>)}</Table></Panel> : !assignmentsState.error && <Empty title="No class assignments">Assign this instructor to a class above to give them access to its roster and reporting.</Empty>}
  </>;
}

function ReportsPage({ program, user, instructorClasses = null }) {
  const admin = user.role === "admin" || !user.role;
  const classesState = useLoad("classes", (signal) => instructorClasses ? Promise.resolve(instructorClasses) : request(`/academics/program/${program.id}/classes/`, { signal }), [program?.id, instructorClasses?.map((item) => item.id).join(",")]);
  const classes = classesState.data || [];
  const reportState = useLoad("reports", async (signal) => {
    const rows = await Promise.all(classes.map(async (item) => {
      try { const reports = await request(`/classes/${item.id}/reports/`, { signal }); return reports.map((report) => ({ ...report, classLabel: item.name })); }
      catch (error) { if (error.name === "AbortError") throw error; return []; }
    }));
    return rows.flat().sort((a, b) => new Date(b.written_on) - new Date(a.written_on));
  }, [classes.map((item) => item.id).join(",")]);
  const [editingReport, setEditingReport] = useState(null);
  const [form, setForm] = useState(false); const [saving, setSaving] = useState(false); const [errorMessage, setErrorMessage] = useState(""); const [successMessage, setSuccessMessage] = useState("");
  async function publishReport(reportId) {
    setSaving(true); setErrorMessage(""); setSuccessMessage("");
    try {
      const result = await request(`/class-reports/${reportId}/publish/`, { method: "POST", data: {} });
      reportState.reload();
      const delivery = result.delivery_attempt;
      setSuccessMessage(delivery ? `Report published. Email delivery: ${delivery.sent} sent, ${delivery.failed} failed, ${delivery.skipped} skipped.` : "Report published and parent emails were queued.");
      return result;
    } catch (caught) { setErrorMessage(caught.message); return null; }
    finally { setSaving(false); }
  }
  const reports = reportState.data || [];
  return <><PageHeading title="Class reports" description={`Structured class updates and student feedback for ${program.name}. Each report includes private answers for every enrolled student.`} action={!admin && <Button icon="plus" onClick={() => { setEditingReport(null); setForm((value) => !value); setErrorMessage(""); }}>New report</Button>}/><Feedback error={errorMessage || classesState.error || reportState.error} success={successMessage}/>
    {form && <ClassReportComposer key={editingReport?.id || "new"} classes={classes} initialReport={editingReport} saving={saving} setSaving={setSaving} onCancel={() => { setForm(false); setEditingReport(null); }} onSaved={() => reportState.reload()} onError={setErrorMessage} onPublish={publishReport}/>}
    {classesState.loading || reportState.loading ? <Loading>Loading reports…</Loading> : reports.length ? <Panel className="table-panel"><Table headers={["Report", "Class", "Author", "Written", "Status", "Email delivery", "Action"]}>{reports.map((report) => {
      const delivery = report.email_delivery || {};
      const canRetry = report.status === "published" && (delivery.failed > 0 || delivery.pending > 0 || delivery.skipped > 0);
      return <tr key={report.id}><td><strong>{report.display_title || report.title || "Class learning report"}</strong><small className="report-preview">{report.reporting_period || report.topic_taught || "Class report"}</small></td><td>{report.classLabel}</td><td>{report.author_name || "Instructor"}</td><td>{new Date(report.written_on).toLocaleDateString()}</td><td><span className={`status-pill status-${report.status}`}>{report.status}</span></td><td>{delivery.total ? `${delivery.sent}/${delivery.total} sent · ${delivery.failed} failed · ${delivery.skipped} skipped` : report.status === "draft" ? "Not sent" : "No delivery records"}</td><td>{report.status === "draft" && !admin ? <Button variant="secondary" disabled={saving} onClick={() => { setEditingReport(report); setForm(true); setSuccessMessage(""); }}>Review / edit</Button> : canRetry ? <Button variant="secondary" disabled={saving} onClick={() => publishReport(report.id)}>Retry email</Button> : report.published_on ? new Date(report.published_on).toLocaleDateString() : "—"}</td></tr>;
    })}</Table></Panel> : <Empty title="No reports yet">Create a class update and complete private feedback for its enrolled students.</Empty>}
  </>;
}

function ClassReportComposer({ classes, initialReport = null, saving, setSaving, onCancel, onSaved, onError, onPublish }) {
  const [classroomId, setClassroomId] = useState(String(initialReport?.classroom || ""));
  const enrollmentsState = useLoad("class enrollments", (signal) => classroomId ? request(`/classes/${classroomId}/enrollments/`, { signal }) : Promise.resolve([]), [classroomId]);
  const initialEntries = initialReport?.feedback_entries || [];
  const [answers, setAnswers] = useState(() => Object.fromEntries(initialEntries.map((entry) => [entry.enrollment, entry.answers || {}])));
  const [notes, setNotes] = useState(() => Object.fromEntries(initialEntries.map((entry) => [entry.enrollment, entry.note || ""])));
  const [feedbackStudentIds, setFeedbackStudentIds] = useState(() => initialEntries
    .filter((entry) => entry.note || Object.values(entry.answers || {}).some((value) => value !== "not_assessed"))
    .map((entry) => String(entry.enrollment)));
  const [showFeedbackStudentPicker, setShowFeedbackStudentPicker] = useState(false);
  const [reportFields, setReportFields] = useState({ practical_works: initialReport?.practical_works || "", assignment: initialReport?.assignment || "", assignment_due_date: initialReport?.assignment_due_date || "" });
  const [reportId, setReportId] = useState(initialReport?.id || null);
  const [previews, setPreviews] = useState(null);
  const [isEditing, setIsEditing] = useState(!initialReport);
  const initialClassroomId = useRef(classroomId);
  useEffect(() => {
    if (initialClassroomId.current === classroomId) return;
    initialClassroomId.current = classroomId;
    setAnswers({}); setNotes({}); setFeedbackStudentIds([]); setShowFeedbackStudentPicker(false);
    setReportFields({ practical_works: "", assignment: "", assignment_due_date: "" }); setPreviews(null);
  }, [classroomId]);
  const enrollments = enrollmentsState.data || [];
  const defaults = defaultFeedbackAnswers();
  const feedbackStudents = feedbackStudentIds.map((id) => enrollments.find((entry) => String(entry.id) === String(id))).filter(Boolean);
  const availableStudents = enrollments.filter((entry) => !feedbackStudentIds.some((id) => String(id) === String(entry.id)));
  const answersFor = (entry) => ({ ...defaults, ...answers[entry.id] });
  function removeStudentFeedback(studentId) {
    setFeedbackStudentIds((current) => current.filter((id) => String(id) !== String(studentId)));
    setAnswers((current) => { const next = { ...current }; delete next[studentId]; return next; });
    setNotes((current) => { const next = { ...current }; delete next[studentId]; return next; });
  }
  async function submit(event) {
    event.preventDefault(); setSaving(true); onError("");
    try {
      const values = new FormData(event.currentTarget);
      const payload = {
        title: String(values.get("title") || "").trim(),
        reporting_period: String(values.get("reporting_period") || "").trim(),
        topic_taught: String(values.get("topic_taught") || "").trim(),
        learning_goals: String(values.get("learning_goals") || "").trim(),
        key_concepts: String(values.get("key_concepts") || "").trim(),
        activities: String(values.get("activities") || "").trim(),
        practical_works: String(values.get("practical_works") || "").trim(),
        assignment: String(values.get("assignment") || "").trim(),
        assignment_due_date: values.get("assignment_due_date") || null,
        next_lesson: String(values.get("next_lesson") || "").trim(),
        materials: String(values.get("materials") || "").trim(),
        student_feedback: enrollments
          .filter((entry) => feedbackStudentIds.some((id) => String(id) === String(entry.id)))
          .map((entry) => ({ enrollment: Number(entry.id), answers: answersFor(entry), note: notes[entry.id] || "" })),
      };
      let targetReportId = reportId;
      if (!targetReportId) {
        const report = await request(`/classes/${classroomId}/reports/`, { method: "POST", data: payload });
        targetReportId = report.id; setReportId(targetReportId); onSaved();
      } else if (isEditing) {
        await request(`/class-reports/${targetReportId}/`, { method: "PATCH", data: payload });
        onSaved();
      }
      const preview = await request(`/class-reports/${targetReportId}/preview/`, { method: "POST", data: {} });
      setPreviews(preview.students || []); setIsEditing(false);
    } catch (caught) { onError(caught.message); }
    finally { setSaving(false); }
  }
  const nameFor = (entry) => entry.student_name || "Student";
  return <Panel className="form-panel report-composer"><div className="panel-heading"><div><h3>{initialReport ? "Review class report draft" : "Class learning report"}</h3><p>Add a report title and lesson details. Gemini will turn these notes and each student’s feedback into a complete parent-facing report.</p></div></div>
    <form className="form-grid" key={classroomId || "no-class"} onSubmit={submit}>
      <label className="form-span">Class<select required disabled={Boolean(reportId) || !isEditing} value={classroomId} onChange={(event) => setClassroomId(event.target.value)}><option value="">Select a class</option>{classes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <label className="form-span">Report title<input name="title" maxLength="50" required disabled={!isEditing} defaultValue={initialReport?.title || ""} placeholder="e.g. August Learning Report"/></label>
      <label>Reporting period<input name="reporting_period" maxLength="50" disabled={!isEditing} defaultValue={initialReport?.reporting_period || ""} placeholder="e.g. August 2026"/></label>
      <label className="form-span">Topic taught<input name="topic_taught" maxLength="500" required disabled={!isEditing} defaultValue={initialReport?.topic_taught || ""} placeholder="e.g. Introduction to robotics"/></label>
      <label className="form-span">Learning goals<textarea name="learning_goals" maxLength="1000" rows="2" required disabled={!isEditing} defaultValue={initialReport?.learning_goals || ""} placeholder="What should students understand or be able to do?"/></label>
      <label className="form-span">Key concepts and skills<textarea name="key_concepts" maxLength="1500" rows="3" required disabled={!isEditing} defaultValue={initialReport?.key_concepts || ""} placeholder="List the specific ideas or skills covered"/></label>
      <label className="form-span">Activities<textarea name="activities" maxLength="1000" rows="3" required disabled={!isEditing} defaultValue={initialReport?.activities || ""} placeholder="What did the class do today?"/></label>
      <label className="form-span">Practical work / project<textarea name="practical_works" maxLength="1000" rows="3" disabled={!isEditing} value={reportFields.practical_works} onChange={(event) => setReportFields((current) => ({ ...current, practical_works: event.target.value }))} placeholder="Describe the practical work or project"/></label>
      <label>Assignment<textarea name="assignment" maxLength="1000" rows="3" disabled={!isEditing} value={reportFields.assignment} onChange={(event) => setReportFields((current) => ({ ...current, assignment: event.target.value }))} placeholder="What should students work on?"/></label>
      <label>Assignment due date<input name="assignment_due_date" type="date" disabled={!isEditing} value={reportFields.assignment_due_date} onChange={(event) => setReportFields((current) => ({ ...current, assignment_due_date: event.target.value }))}/></label>
      <label>Next lesson or follow-up<textarea name="next_lesson" maxLength="1000" rows="2" disabled={!isEditing} defaultValue={initialReport?.next_lesson || ""} placeholder="What will the class build on next?"/></label>
      <label>Materials or resources<textarea name="materials" maxLength="1000" rows="2" disabled={!isEditing} defaultValue={initialReport?.materials || ""} placeholder="Optional links, tools, or learning materials"/></label>
      {classroomId && <div className="form-span private-question-list"><div className="section-heading"><div><p className="eyebrow">Private feedback</p><h3>Individual adjustments</h3></div>{isEditing && !enrollmentsState.loading && availableStudents.length > 0 && <Button type="button" variant="secondary" onClick={() => setShowFeedbackStudentPicker((current) => !current)}>{showFeedbackStudentPicker ? "Cancel" : "Add private feedback"}</Button>}</div>
        {enrollmentsState.loading ? <Loading>Loading enrolled students…</Loading> : enrollmentsState.error ? <Feedback error={enrollmentsState.error}/> : enrollments.length ? <>
          <p className="form-help">The class report is used for every student by default. Select only students who need individual observations or a private note.</p>
          {showFeedbackStudentPicker && <div className="feedback-student-picker"><label htmlFor="private-feedback-student">Choose a student<select id="private-feedback-student" value="" onChange={(event) => { if (event.target.value) { setFeedbackStudentIds((current) => [...current, event.target.value]); setShowFeedbackStudentPicker(false); } }}><option value="">Select a student</option>{availableStudents.map((entry) => <option key={entry.id} value={entry.id}>{nameFor(entry)}</option>)}</select></label></div>}
          {feedbackStudents.length ? <div className="individual-feedback-grid">{feedbackStudents.map((student) => <article className="student-question-card selected-student-feedback" key={student.id}><div className="selected-student-heading"><div><p className="eyebrow">Private feedback</p><h4>{nameFor(student)}</h4></div>{isEditing && <Button type="button" variant="secondary" onClick={() => removeStudentFeedback(student.id)}>Remove</Button>}</div><div className="feedback-question-grid">{STUDENT_FEEDBACK_QUESTIONS.map(({ key, question, options }) => <fieldset className="radio-question" key={key}><legend>{question}</legend>{options.map(([value, label]) => <label key={value}><input type="radio" disabled={!isEditing} name={`${student.id}-${key}`} checked={answersFor(student)[key] === value} onChange={() => setAnswers((current) => ({ ...current, [student.id]: { ...current[student.id], [key]: value } }))}/> {label}</label>)}</fieldset>)}</div><label className="private-note-label">Optional example, strength, or next step<textarea rows="2" maxLength="500" disabled={!isEditing} value={notes[student.id] || ""} onChange={(event) => setNotes((current) => ({ ...current, [student.id]: event.target.value }))} placeholder="Add one specific observation that will help the parent understand the student's progress"/></label></article>)}</div> : <p className="form-help">No individual feedback selected. The class report will be used for every student.</p>}
        </> : <p className="form-help">No students are enrolled in this class yet.</p>}
      </div>}
      {isEditing && <div className="form-actions"><Button disabled={saving || !classroomId || enrollmentsState.loading || !enrollments.length}>{saving ? (reportId ? "Saving and previewing…" : "Saving and previewing…") : reportId ? "Save changes and preview" : "Save draft and preview"}</Button><Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button></div>}
    </form>
    <p className="form-help">Only selected students receive individual observations; everyone else gets a report based on the shared class details. Gemini writes the narrative and the PDF won’t repeat the form fields. Review each preview before publishing.</p>
    {previews && <section className="generated-preview"><div className="section-heading"><div><p className="eyebrow">Gemini preview</p><h3>Review each student’s report</h3></div><span className="count-badge">{previews.length}</span></div>{previews.map((preview) => <article className="generated-preview-card" key={preview.enrollment_id}><h4>{preview.student_name}</h4><p>{preview.personalized_report}</p><Button type="button" variant="secondary" onClick={() => window.open(apiPath(`/class-reports/${reportId}/pdf-preview/${preview.enrollment_id}/`), "_blank", "noopener,noreferrer")}>Preview PDF</Button></article>)}<div className="form-actions"><Button type="button" variant="secondary" disabled={saving} onClick={() => { setIsEditing(true); setPreviews(null); }}>Edit draft</Button><Button disabled={saving} onClick={async () => { const result = await onPublish(reportId); if (result) onCancel(); }}>{saving ? "Publishing…" : "Publish & email parents"}</Button><Button type="button" variant="secondary" onClick={onCancel}>Close</Button></div></section>}
  </Panel>;
}

function StudentPortal({ page, reportId, navigate }) {
  const enrollments = useLoad("enrollments", (signal) => request("/student/me/enrollments/", { signal }), []);
  const reports = useLoad("reports", (signal) => request("/student/me/reports/", { signal }), []);
  const feedback = useLoad("feedback", (signal) => request("/student/me/feedback/", { signal }), []);
  const [selectedProgramId, setSelectedProgramId] = useState("");
  const busy = enrollments.loading || reports.loading || feedback.loading;
  const error = enrollments.error || reports.error || feedback.error;
  const enrolledPrograms = [...new Map((enrollments.data || []).map((item) => [String(item.program), { id: item.program, name: item.program_name || "Program" }])).values()];
  const selectedProgram = enrolledPrograms.find((item) => String(item.id) === String(selectedProgramId)) || enrolledPrograms[0] || null;
  const programEnrollments = selectedProgram ? (enrollments.data || []).filter((item) => String(item.program) === String(selectedProgram.id)) : [];
  const classIds = new Set(programEnrollments.map((item) => String(item.classroom)));
  const enrollmentIds = new Set(programEnrollments.map((item) => String(item.id)));
  const programReports = (reports.data || []).filter((item) => classIds.has(String(item.classroom)));
  const programFeedback = (feedback.data || []).filter((item) => enrollmentIds.has(String(item.enrollment)));
  const selectedReport = reports.data?.find((item) => String(item.id) === String(reportId));
  const programTabs = <div className="tab-row program-tabs" role="tablist" aria-label="Your programs">
    {enrolledPrograms.map((program) => <button key={program.id} role="tab" aria-selected={String(selectedProgram?.id) === String(program.id)} onClick={() => setSelectedProgramId(String(program.id))}>{program.name}</button>)}
  </div>;
  const classNote = <div className="program-class-note">{programEnrollments.map((item) => item.class_name || "Class").join(" · ")}</div>;
  if (page === "student-report-detail") {
    return <>
      <PageHeading title={selectedReport?.display_title || selectedReport?.title || "Class report"} description="Published class report" action={<Button variant="secondary" onClick={() => navigate("/app/student-reports")}>Back to Class Reports</Button>}/>
      {reports.error && <Feedback error={reports.error}/>}
      {reports.loading ? <Loading>Loading report…</Loading> : selectedReport ? <Panel className="student-report-detail"><div className="report-card-meta"><span className="status-pill status-published">Published</span><time>{selectedReport.published_on ? new Date(selectedReport.published_on).toLocaleDateString() : ""}</time></div><h3>{selectedReport.title || "KiddiesDroid Report"}</h3><ReportSection label="Progress report" value={selectedReport.personalized_report}/><div className="student-report-author">{selectedReport.class_name || "Class"} · {selectedReport.author_name || "Instructor"}</div></Panel> : <Empty title="Report not found">This report is unavailable or is not published for your enrollments.</Empty>}
    </>;
  }
  return <>
    <PageHeading title={page === "portal" ? "My learning" : page === "student-reports" ? "Class Reports" : "Private feedback"} description={page === "portal" ? "Your program enrollments and learning progress." : page === "student-reports" ? "Published reports for your enrolled classes." : "Private feedback written for you by your instructors."}/>
    {error && <Feedback error={error}/>}
    {page === "portal" ? <>
      <UpcomingProgramsBanner />
      <div className="metric-grid">
        <Metric label="Published reports" value={reports.loading ? "…" : reports.data?.length ?? 0}/>
        <Metric label="Private feedback" value={feedback.loading ? "…" : feedback.data?.length ?? 0}/>
        <Metric label="My enrollments" value={enrollments.loading ? "…" : enrollments.data?.length ?? 0}/>
      </div>
      {enrollments.loading ? <Loading>Loading your programs…</Loading> : enrolledPrograms.length ? <>
        <div className="section-heading"><div><p className="eyebrow">Your learning</p><h3>Enrolled programs</h3></div><span className="count-badge">{enrolledPrograms.length}</span></div>
        <Panel className="table-panel"><Table headers={["Program", "Classes"]}>{enrolledPrograms.map((program) => {
          const classes = (enrollments.data || []).filter((item) => String(item.program) === String(program.id)).map((item) => item.class_name || "Class");
          return <tr key={program.id}><td><strong>{program.name}</strong></td><td>{[...new Set(classes)].join(", ")}</td></tr>;
        })}</Table></Panel>
        <p className="form-help">Open Class Reports or Private feedback in the navigation to view your learning records.</p>
      </> : <Empty title="No programs yet">Your enrolled programs will appear here once an administrator enrolls you.</Empty>}
    </> : busy ? <Loading>Loading your records…</Loading> : selectedProgram ? <>
      {enrolledPrograms.length > 1 && programTabs}
      {page === "student-reports" && classNote}
      {page === "student-reports" ? <div className="student-report-list">{programReports.map((item) => <Panel key={item.id} className="student-report-row"><div><h3>{item.display_title || item.title || "Class learning report"}</h3><small>{item.class_name || "Class"} · {item.published_on ? new Date(item.published_on).toLocaleDateString() : "Published"}</small></div><Button variant="secondary" onClick={() => navigate(`/app/student-reports/${item.id}`)}>Read</Button></Panel>)}{!programReports.length && <Empty title="No published reports for this program">Published class reports will appear here.</Empty>}</div> : <div className="report-cards student-feedback-list">{programFeedback.map((item) => {
        const enrollment = programEnrollments.find((entry) => String(entry.id) === String(item.enrollment));
        return <Panel key={item.id}><div className="report-card-meta"><span className="status-pill status-active">Private feedback</span><time>{new Date(item.written_on).toLocaleDateString()}</time></div>{item.personalized_report && <p>{item.personalized_report}</p>}{STUDENT_FEEDBACK_QUESTIONS.map(({ key, question }) => item.answers?.[key] && <p key={key}>{question}: <strong>{feedbackAnswerLabel(STUDENT_FEEDBACK_QUESTIONS.find((entry) => entry.key === key), item.answers[key])}</strong></p>)}{item.answers?.came_late && <p>Arrived late: <strong>{item.answers.came_late === "yes" ? "Yes" : "No"}</strong></p>}{item.answers?.did_assignment && <p>Assignment completed: <strong>{item.answers.did_assignment === "yes" ? "Yes" : "No"}</strong></p>}{item.note && <p>{item.note}</p>}{item.feedback && <p>{item.feedback}</p>}<small>From {item.author_name || "your instructor"}{enrollment ? ` · ${enrollment.class_name || "Class"}` : ""}</small></Panel>;
      })}{!programFeedback.length && <Empty title="No private feedback for this program">Private feedback from your instructors will appear here.</Empty>}</div>}
    </> : <Empty title="No programs yet">Your reports and private feedback will appear here after you are enrolled in a program.</Empty>}
  </>;
}

function ReportSection({ label, value }) {
  if (!value) return null;
  return <section className="report-content-section"><h3>{label}</h3><p>{value}</p></section>;
}

function InstructorWorkspace({ user, page }) {
  const classesState = useLoad("assigned classes", (signal) => request("/my/classes/", { signal }), []);
  const classes = classesState.data || [];
  const [selectedClassId, setSelectedClassId] = useState("");
  useEffect(() => { if (classes.length && !classes.some((item) => String(item.id) === selectedClassId)) setSelectedClassId(String(classes[0].id)); }, [classes, selectedClassId]);
  if (page === "reports") {
    const selectedProgram = classes.find((item) => String(item.id) === selectedClassId)?.program;
    const compatible = classes.filter((item) => String(item.program) === String(selectedProgram));
    const selectedProgramName = classes.find((item) => String(item.program) === String(selectedProgram))?.program_name || "Selected program";
    return <>{classesState.error && <Feedback error={classesState.error}/>}<div className="filter-panel panel"><label>Program classes<select value={selectedClassId} onChange={(event) => setSelectedClassId(event.target.value)}>{classes.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.program_name || "Program"}</option>)}</select></label></div>{selectedProgram ? <ReportsPage key={selectedProgram} program={{ id: selectedProgram, name: selectedProgramName }} user={user} instructorClasses={compatible}/> : classesState.loading ? <Loading>Loading assigned classes…</Loading> : <Empty title="No assigned classes">Ask an administrator to assign you to a class before writing reports.</Empty>}</>;
  }
  return <><PageHeading title="My classes" description="Your class assignments and current student rosters."/>{classesState.error && <Feedback error={classesState.error}/>}<div className="class-grid">{classes.map((item) => <InstructorClassCard key={item.id} classroom={item}/>)}</div>{!classesState.loading && classes.length === 0 && <Empty title="No assigned classes">An administrator must assign you to a class before the roster and report tools become available.</Empty>}{classesState.loading && <Loading>Loading assigned classes…</Loading>}</>;
}

function InstructorClassCard({ classroom }) {
  const roster = useLoad(`roster for ${classroom.name}`, (signal) => request(`/classes/${classroom.id}/students/`, { signal }), [classroom.id]);
  const [open, setOpen] = useState(false);
  return <Panel className="class-card"><div className="class-icon"><Icon name="classes" size={22}/></div><p className="eyebrow">{classroom.program_name || "Program"}</p><h3>{classroom.name}</h3><p>{roster.data?.length ?? (roster.loading ? "Loading" : "—")} enrolled students</p><Button variant="secondary" onClick={() => setOpen((value) => !value)}>{open ? "Hide roster" : "View roster"}</Button>{open && (roster.error ? <Feedback error={roster.error}/> : roster.loading ? <Loading>Loading roster…</Loading> : <div className="roster-list">{roster.data.map((student) => <div key={student.id}>{student.first_name} {student.last_name}<small>@{student.username}</small></div>)}{!roster.data.length && <p>No students enrolled yet.</p>}</div>)}</Panel>;
}

function Metric({ label, value }) { return <Panel className="metric-card"><span>{label}</span><strong>{value}</strong></Panel>; }

function Workspace({ user, onLogout }) {
  const isAdmin = user.role === "admin" || !user.role;
  const isInstructor = user.role === "instructor";
  const [path, setPath] = useState(window.location.pathname);
  const [programs, setPrograms] = useState([]);
  const [programsLoading, setProgramsLoading] = useState(false);
  const [programError, setProgramError] = useState("");
  const [programsVersion, setProgramsVersion] = useState(0);
  const [activeProgramId, setActiveProgramId] = useState(localStorage.getItem("kd-active-program") || "");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarHidden, setSidebarHidden] = useState(false);
  const navigate = (next) => { window.history.pushState({}, "", next); setPath(next); setMobileOpen(false); };
  useEffect(() => { const onPopState = () => setPath(window.location.pathname); window.addEventListener("popstate", onPopState); return () => window.removeEventListener("popstate", onPopState); }, []);
  useEffect(() => {
    if (!isAdmin) return;
    let live = true; setProgramsLoading(true); setProgramError("");
    request(PROGRAMS).then((data) => { if (!live) return; setPrograms(data); if (activeProgramId && !data.some((program) => String(program.id) === String(activeProgramId))) { setActiveProgramId(""); localStorage.removeItem("kd-active-program"); } }).catch((error) => { if (live) setProgramError(error.message); }).finally(() => { if (live) setProgramsLoading(false); });
    return () => { live = false; };
  }, [isAdmin, activeProgramId, programsVersion]);
  const activeProgram = programs.find((item) => String(item.id) === String(activeProgramId)) || null;
  const defaultPage = isAdmin ? "programs" : isInstructor ? "classes" : "portal";
  const lastSegment = path.split("/").filter(Boolean).at(-1);
  const studentManageMatch = path.match(/^\/app\/students\/(\d+)\/manage\/?$/);
  const instructorManageMatch = path.match(/^\/app\/instructors\/(\d+)\/manage\/?$/);
  const studentReportMatch = path.match(/^\/app\/student-reports\/(\d+)\/?$/);
  const supportedPages = new Set(["programs", "overview", "students", "classes", "instructors", "all-instructors", "reports", "student-reports", "student-feedback", "student-report-detail", "portal", "test-scores"]);
  const permittedPages = isAdmin ? supportedPages : isInstructor ? new Set(["classes", "reports"]) : new Set(["portal", "student-reports", "student-feedback", "student-report-detail", "test-scores"]);
  const page = studentManageMatch && isAdmin ? "student-manage" : instructorManageMatch && isAdmin ? "instructor-manage" : studentReportMatch && !isAdmin && !isInstructor ? "student-report-detail" : lastSegment === "app" || !supportedPages.has(lastSegment) || !permittedPages.has(lastSegment) ? defaultPage : lastSegment;
  const chooseProgram = (program) => { setActiveProgramId(String(program.id)); localStorage.setItem("kd-active-program", String(program.id)); navigate("/app/overview"); };
  const clearProgram = () => { setActiveProgramId(""); localStorage.removeItem("kd-active-program"); navigate("/app/programs"); };
  const navItems = isAdmin
    ? (activeProgram ? [{ key: "programs", label: "Programs", icon: "program" }, { key: "overview", label: "Overview", icon: "home" }, { key: "students", label: "Students", icon: "students" }, { key: "classes", label: "Classes", icon: "classes" }, { key: "instructors", label: "Instructors", icon: "instructor" }, { key: "reports", label: "Reports", icon: "reports" }, { key: "all-instructors", label: "All instructors", icon: "instructor" }] : [{ key: "programs", label: "Programs", icon: "program" }, { key: "students", label: "All students", icon: "students" }, { key: "all-instructors", label: "All instructors", icon: "instructor" }])
    : isInstructor ? [{ key: "classes", label: "My classes", icon: "classes" }, { key: "reports", label: "Class report & feedback", icon: "reports" }]
      : [{ key: "portal", label: "My learning", icon: "home" }, { key: "student-reports", label: "Class Reports", icon: "reports" }, { key: "student-feedback", label: "Private feedback", icon: "feedback" }, { key: "test-scores", label: "Test Scores", icon: "reports" }];
  useEffect(() => { if (isAdmin && !programsLoading && ["overview", "classes", "reports"].includes(page) && !activeProgram) navigate("/app/programs"); }, [isAdmin, page, activeProgram, programsLoading]);
  const titleByPage = { programs: "Programs", overview: activeProgram?.name || "Program overview", students: "Students", classes: "Classes", instructors: "Instructors", "all-instructors": "All instructors", reports: "Class report & feedback", "student-reports": "Class Reports", "student-feedback": "Private feedback", "student-report-detail": "Class report", "student-manage": "Manage student", "instructor-manage": "Manage instructor", portal: "My learning", "test-scores": "Test Scores" };
  const pageTitle = titleByPage[page] || (isAdmin ? "Programs" : isInstructor ? "My classes" : "My learning");
  return <div className={`app-shell ${sidebarHidden ? "sidebar-hidden" : ""}`}>
    <a className="skip-link" href="#main-content">Skip to content</a>
    <aside className="sidebar"><div className="sidebar-brand"><img src={logoUrl} alt="Kiddies Droid"/><span><strong>Kiddies Droid</strong><small>Learning Portal</small></span></div><div className="sidebar-accent"/><nav aria-label="Main navigation">{navItems.map((item) => <button key={item.key} className={`nav-item ${page === item.key || (item.key === "students" && page === "student-manage") || (item.key === (activeProgram ? "instructors" : "all-instructors") && page === "instructor-manage") || (item.key === "student-reports" && page === "student-report-detail") ? "nav-active" : ""}`} onClick={() => navigate(`/app/${item.key}`)}><Icon name={item.icon}/>{item.label}</button>)}</nav><div className="sidebar-footer"><div className="signed-user"><strong>{[user.first_name, user.last_name].filter(Boolean).join(" ") || user.username}</strong></div><button className="logout-link" onClick={onLogout}><Icon name="logout" size={17}/>Sign out</button></div></aside>
    <div className="main-column"><header className="topbar"><button className="nav-toggle icon-button" aria-label="Toggle navigation" aria-expanded={window.matchMedia("(max-width: 1023px)").matches ? mobileOpen : !sidebarHidden} onClick={() => { if (window.matchMedia("(max-width: 1023px)").matches) setMobileOpen((value) => !value); else setSidebarHidden((value) => !value); }}><Icon name={mobileOpen ? "close" : "menu"}/></button><div className="topbar-heading"><h1>{pageTitle}</h1>{activeProgram && isAdmin && <button className="active-program-chip" aria-label={`Clear active program ${activeProgram.name}`} onClick={clearProgram}><span className="active-program-label">Active program</span><strong>{activeProgram.name}</strong><span className="active-program-close">×</span></button>}</div><div className="topbar-user"><span className="role-chip">Role: {user.role || "admin"}</span><button className="logout-button" onClick={onLogout}><Icon name="logout" size={16}/>Sign out</button></div></header>
      {mobileOpen && <nav className="mobile-nav">{navItems.map((item) => <button key={item.key} className={`nav-item ${page === item.key || (item.key === "students" && page === "student-manage") || (item.key === (activeProgram ? "instructors" : "all-instructors") && page === "instructor-manage") || (item.key === "student-reports" && page === "student-report-detail") ? "nav-active" : ""}`} onClick={() => navigate(`/app/${item.key}`)}><Icon name={item.icon}/>{item.label}</button>)}</nav>}
      <main id="main-content" className="workspace-content">
        {isAdmin && page === "programs" && <AdminPrograms programs={programs} loading={programsLoading} error={programError} onReload={() => setProgramsVersion((value) => value + 1)} onSelect={chooseProgram} activeProgramId={activeProgramId}/>}
        {isAdmin && page === "students" && <StudentList activeProgram={activeProgram} programs={programs} onStudentsChanged={() => {}} onManage={(id) => navigate(`/app/students/${id}/manage`)}/>}
        {isAdmin && page === "student-manage" && <StudentManage studentId={studentManageMatch[1]} programs={programs} onBack={() => navigate("/app/students")}/>}
        {isAdmin && page === "overview" && activeProgram && <AdminOverview program={activeProgram} navigate={navigate}/>}
        {isAdmin && page === "classes" && activeProgram && <ClassesPage key={activeProgram.id} program={activeProgram}/>}
        {isAdmin && page === "instructors" && <InstructorsPage key={activeProgram?.id || "all"} program={activeProgram} onManage={(id) => navigate(`/app/instructors/${id}/manage`)}/>}
        {isAdmin && page === "all-instructors" && <InstructorsPage key="all-instructors" program={null} onManage={(id) => navigate(`/app/instructors/${id}/manage`)}/>}
        {isAdmin && page === "instructor-manage" && <InstructorManage instructorId={instructorManageMatch[1]} programs={programs} onBack={() => navigate(activeProgram ? "/app/instructors" : "/app/all-instructors")}/>}
        {isAdmin && page === "reports" && activeProgram && <ReportsPage key={activeProgram.id} program={activeProgram} user={user}/>}
        {isInstructor && page === "classes" && <InstructorWorkspace user={user} page="classes"/>}
        {isInstructor && page === "reports" && <InstructorWorkspace user={user} page="reports"/>}
        {!isAdmin && !isInstructor && page === "test-scores" && <StudentTestScores/>}
        {!isAdmin && !isInstructor && ["portal", "student-reports", "student-feedback", "student-report-detail"].includes(page) && <StudentPortal page={page === "student-report-detail" ? "student-report-detail" : page === "student-reports" ? "student-reports" : page === "student-feedback" ? "student-feedback" : "portal"} reportId={studentReportMatch?.[1]} navigate={navigate}/>}
      </main>
    </div>
  </div>;
}

function StudentTestScores() {
  return <>
    <PageHeading title="Test Scores" description="Your assessment results and progress."/>
    <Empty title="Coming soon">Test scores will appear here when this feature is ready.</Empty>
  </>;
}

function StudentManage({ studentId, programs, onBack }) {
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [newProgramId, setNewProgramId] = useState("");
  const [newClassroomId, setNewClassroomId] = useState("");
  const [editingEnrollmentId, setEditingEnrollmentId] = useState("");
  const [movingClassroomId, setMovingClassroomId] = useState("");
  const profileState = useLoad(`student ${studentId}`, (signal) => request(`/student/${studentId}/`, { signal }), [studentId]);
  const programKey = programs.map((item) => item.id).join(",");
  const enrollmentsState = useLoad(`enrollments for student ${studentId}`, async (signal) => {
    const programData = await Promise.all(programs.map(async (program) => {
      const [enrollments, classes] = await Promise.all([
        request(`/academics/program/${program.id}/enrollment/`, { signal }),
        request(`/academics/program/${program.id}/classes/`, { signal }),
      ]);
      return {
        program,
        classes,
        enrollments: enrollments.filter((item) => String(item.student) === String(studentId)),
      };
    }));
    return programData;
  }, [studentId, programKey]);
  const programData = enrollmentsState.data || [];
  const enrollments = programData.flatMap((group) => group.enrollments.map((item) => ({ ...item, programName: group.program.name, className: group.classes.find((room) => String(room.id) === String(item.classroom))?.name || item.class_name || "Class" })));
  const enrolledProgramIds = new Set(enrollments.map((item) => String(item.program)));
  const availablePrograms = programs.filter((item) => !enrolledProgramIds.has(String(item.id)));
  const addProgram = availablePrograms.find((item) => String(item.id) === String(newProgramId)) || availablePrograms[0] || null;
  const addProgramClasses = programData.find((item) => String(item.program.id) === String(addProgram?.id))?.classes || [];
  const profile = profileState.data;

  useEffect(() => {
    if (addProgramClasses.length && !addProgramClasses.some((item) => String(item.id) === String(newClassroomId))) setNewClassroomId(String(addProgramClasses[0].id));
  }, [addProgramClasses, newClassroomId]);

  async function saveDetails(event) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    setSaving(true); setFormError(""); setSuccessMessage("");
    try {
      await request(`/student/${studentId}/`, { method: "PATCH", data: { first_name: String(values.get("first_name")).trim(), last_name: String(values.get("last_name")).trim(), parent_email: String(values.get("parent_email")).trim() } });
      profileState.reload();
      setSuccessMessage("Student details updated.");
    } catch (caught) { setFormError(caught.message); }
    finally { setSaving(false); }
  }

  async function addEnrollment(event) {
    event.preventDefault();
    if (!addProgram || !newClassroomId) return;
    setSaving(true); setFormError(""); setSuccessMessage("");
    try {
      await request(`/academics/program/${addProgram.id}/enrollment/`, { method: "POST", data: { student: Number(studentId), classroom: Number(newClassroomId) } });
      setNewProgramId("");
      enrollmentsState.reload();
      setSuccessMessage(`Enrollment added to ${addProgram.name}.`);
    } catch (caught) { setFormError(caught.message); }
    finally { setSaving(false); }
  }

  async function moveEnrollment(event, enrollment) {
    event.preventDefault();
    if (String(enrollment.classroom) === String(movingClassroomId)) return;
    setSaving(true); setFormError(""); setSuccessMessage("");
    try {
      await request(`/academics/program/${enrollment.program}/enrollment/${enrollment.id}/`, { method: "PATCH", data: { classroom: Number(movingClassroomId) } });
      setEditingEnrollmentId("");
      enrollmentsState.reload();
      setSuccessMessage("Enrollment moved to the selected class.");
    } catch (caught) { setFormError(caught.message); }
    finally { setSaving(false); }
  }

  return <>
    <PageHeading title={profile ? `${profile.first_name} ${profile.last_name}` : "Manage student"} description="Update this student's details and program/class enrollments." action={<Button variant="secondary" onClick={onBack}>Back to students</Button>}/>
    <Feedback error={profileState.error || enrollmentsState.error || formError} success={successMessage}/>
    {profileState.loading ? <Loading>Loading student…</Loading> : profile ? <Panel className="form-panel"><h3>Student details</h3><form className="form-grid" onSubmit={saveDetails}><label>First name<input name="first_name" required maxLength="150" defaultValue={profile.first_name}/></label><label>Last name<input name="last_name" required maxLength="150" defaultValue={profile.last_name}/></label><label className="form-span">Parent email<input name="parent_email" type="email" required defaultValue={profile.parent_email}/></label><div className="form-actions"><Button disabled={saving}>{saving ? "Saving…" : "Save details"}</Button></div></form></Panel> : !profileState.error && <Empty title="Student not found">Return to the student list and choose a student to manage.</Empty>}
    <div className="section-heading manage-roster-heading"><div><p className="eyebrow">Enrollment</p><h3>Programs and classes</h3></div><span className="count-badge">{enrollments.length}</span></div>
    {enrollmentsState.loading ? <Loading>Loading enrollments…</Loading> : <>
      {availablePrograms.length > 0 && <Panel className="form-panel"><h3>Add enrollment</h3><form className="form-grid" onSubmit={addEnrollment}><label>Program<select required value={addProgram?.id || ""} onChange={(event) => { setNewProgramId(event.target.value); setNewClassroomId(""); }}><option value="">Select a program</option>{availablePrograms.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label>Class<select required value={newClassroomId} onChange={(event) => setNewClassroomId(event.target.value)}><option value="">Select a class</option>{addProgramClasses.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><div className="form-actions"><Button disabled={saving || !addProgram || !newClassroomId}>{saving ? "Saving…" : "Add enrollment"}</Button></div></form>{addProgram && !addProgramClasses.length && <p className="form-help">Create a class in {addProgram.name} before enrolling this student.</p>}</Panel>}
      {availablePrograms.length === 0 && programs.length > 0 && <Panel className="subtle-note"><strong>Already enrolled in every program.</strong><span>You can still change the student's class in an existing enrollment below.</span></Panel>}
      {enrollments.length ? <Panel className="table-panel"><Table headers={["Program", "Class", "Enrolled", "Action"]}>{enrollments.map((enrollment) => {
        const group = programData.find((item) => String(item.program.id) === String(enrollment.program));
        const isEditing = editingEnrollmentId === String(enrollment.id);
        return <tr key={enrollment.id}><td>{enrollment.programName}</td><td>{isEditing ? <form className="move-class-form" onSubmit={(event) => moveEnrollment(event, enrollment)}><select aria-label={`Class in ${enrollment.programName}`} value={movingClassroomId} onChange={(event) => setMovingClassroomId(event.target.value)}>{(group?.classes || []).map((room) => <option key={room.id} value={room.id}>{room.name}</option>)}</select><Button disabled={saving || String(enrollment.classroom) === String(movingClassroomId)}>{saving ? "Saving…" : "Save"}</Button><button type="button" className="inline-link" onClick={() => setEditingEnrollmentId("")}>Cancel</button></form> : enrollment.className}</td><td>{enrollment.enrolled_on ? new Date(enrollment.enrolled_on).toLocaleDateString() : "—"}</td><td>{!isEditing && <Button variant="secondary" onClick={() => { setEditingEnrollmentId(String(enrollment.id)); setMovingClassroomId(String(enrollment.classroom)); }}>Change class</Button>}</td></tr>;
      })}</Table></Panel> : <Empty title="No program enrollments">Add an enrollment above to assign this student to a program and class.</Empty>}
    </>}
  </>;
}

function AdminOverview({ program, navigate }) {
  const classes = useLoad("classes", (signal) => request(`/academics/program/${program.id}/classes/`, { signal }), [program.id]);
  const enrollments = useLoad("enrollments", (signal) => request(`/academics/program/${program.id}/enrollment/`, { signal }), [program.id]);
  const assigned = useLoad("instructor assignments", (signal) => request(`/academics/program/${program.id}/instructor_assignment/`, { signal }), [program.id]);
  return <><PageHeading eyebrow="Program workspace" title={program.name} description="A program-specific view of classes, enrollments, and instructor assignments."/><div className="metric-grid"><Metric label="Classes" value={classes.data?.length ?? (classes.loading ? "…" : "—")}/><Metric label="Enrolled students" value={enrollments.data?.length ?? (enrollments.loading ? "…" : "—")}/><Metric label="Instructor assignments" value={assigned.data?.length ?? (assigned.loading ? "…" : "—")}/></div><div className="quick-actions"><Panel><div className="quick-icon"><Icon name="students"/></div><h3>Students</h3><p>See only students enrolled in {program.name}.</p><Button onClick={() => navigate("/app/students")}>View students</Button></Panel><Panel><div className="quick-icon"><Icon name="classes"/></div><h3>Classes</h3><p>Manage the classes and student enrollments in this program.</p><Button variant="secondary" onClick={() => navigate("/app/classes")}>Manage classes</Button></Panel><Panel><div className="quick-icon"><Icon name="reports"/></div><h3>Reports</h3><p>Review reports written for this program's classes.</p><Button variant="secondary" onClick={() => navigate("/app/reports")}>Open reports</Button></Panel></div></>;
}

export function AppWorkspace({ user, onLogout }) { return <Workspace user={user} onLogout={onLogout}/>; }
