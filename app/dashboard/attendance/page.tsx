// File: app/dashboard/attendance/page.tsx
"use client";

import * as React from "react";
import { TopBar } from "@/components/dashboard/TopBar";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  ResponsiveContainer, BarChart as RBarChart, Bar, CartesianGrid, Tooltip, XAxis, YAxis, Legend,
} from "recharts";
import { Pencil, Trash2 } from "lucide-react";

/* ---------------- Types (aligned with your schema/views/RPCs) ---------------- */
type Teacher = { id: string; name: string; email: string | null };
type Student = {
  id: string; name: string; email: string | null;
  program: string | null; duration_weeks: number | null;
  sessions_per_week: number | null; class_name: string | null;
};
type Session = { id: string; teacher_id: string | null; title: string | null; starts_at: string };
type Attendance = {
  session_id: string; student_id: string;
  status: "present" | "absent" | "late"; noted_at: string;
};

type TabKey = "overview" | "teachers" | "students" | "sessions";
type Status = Attendance["status"];

/* ---------------- Utils ---------------- */
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString();
const toLocalDT = (iso: string) => {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  // yyyy-MM-ddTHH:mm
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const byId = <T extends { id: string }>(arr: T[]) => {
  const m = new Map<string, T>(); arr.forEach(x => m.set(x.id, x)); return m;
};

/* ---------------- Simple Modal + Confirm ---------------- */
function Modal({
  open, onClose, title, children, maxWidth = "max-w-lg",
}: { open: boolean; onClose: () => void; title: string; children: React.ReactNode; maxWidth?: string }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center" role="dialog" aria-modal="true" onMouseDown={onClose}>
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
      <div className={`relative ${maxWidth} w-full rounded-2xl border bg-white p-4 shadow-xl`} onMouseDown={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-base font-semibold text-slate-800">{title}</h3>
          <button onClick={onClose} aria-label="Close" className="h-8 w-8 rounded-md hover:bg-slate-100">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Confirm({
  open, onClose, title = "Are you sure?", message, onConfirm, danger = false,
}: { open: boolean; onClose: () => void; title?: string; message: React.ReactNode; onConfirm: () => void; danger?: boolean }) {
  if (!open) return null;
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <div className="text-slate-600">{message}</div>
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={() => { onConfirm(); onClose(); }} className={danger ? "bg-red-600 hover:bg-red-700" : ""}>
          Confirm
        </Button>
      </div>
    </Modal>
  );
}

/* ---------------- Page ---------------- */
export default function AttendancePage() {
  const [tab, setTab] = React.useState<TabKey>("overview");

  // Supabase browser client (memoized)
  const sb = React.useMemo(() => getBrowserSupabase(), []);

  // Data
  const [teachers, setTeachers] = React.useState<Teacher[]>([]);
  const [students, setStudents] = React.useState<Student[]>([]);
  const [sessions, setSessions] = React.useState<Session[]>([]);
  const [attendance, setAttendance] = React.useState<Attendance[]>([]);

  // Filters & search
  const [teacherFilter, setTeacherFilter] = React.useState<string>("all");
  const [query, setQuery] = React.useState("");

  // Add Teacher modal
  const [openTeacher, setOpenTeacher] = React.useState(false);
  const [tName, setTName] = React.useState("");
  const [tEmail, setTEmail] = React.useState("");

  // Add Student modal (RPC)
  const [openStudent, setOpenStudent] = React.useState(false);
  const [sName, setSName] = React.useState("");
  const [sEmail, setSEmail] = React.useState("");
  const [sProgram, setSProgram] = React.useState("");
  const [sDuration, setSDuration] = React.useState<number | "">("");
  const [sPerWeek, setSPerWeek] = React.useState<number | "">("");
  const [sClass, setSClass] = React.useState("");
  const [sTeacherId, setSTeacherId] = React.useState("");

  // Add Session modal (RPC)
  const [openSession, setOpenSession] = React.useState(false);
  const [sessTeacherId, setSessTeacherId] = React.useState("");
  const [sessTitle, setSessTitle] = React.useState("");
  const [sessStartsAt, setSessStartsAt] = React.useState<string>("");

  // Add Attendance modal
  const [openAttend, setOpenAttend] = React.useState(false);
  const [attendSessionId, setAttendSessionId] = React.useState("");
  const [attendStudentId, setAttendStudentId] = React.useState("");
  const [attendStatus, setAttendStatus] = React.useState<Status>("present");

  // EDIT Teacher modal
  const [openEditTeacher, setOpenEditTeacher] = React.useState(false);
  const [editTeacherId, setEditTeacherId] = React.useState<string>("");
  const [editTName, setEditTName] = React.useState("");
  const [editTEmail, setEditTEmail] = React.useState("");

  // EDIT Student modal
  const [openEditStudent, setOpenEditStudent] = React.useState(false);
  const [editStudentId, setEditStudentId] = React.useState<string>("");
  const [editSName, setEditSName] = React.useState("");
  const [editSEmail, setEditSEmail] = React.useState("");
  const [editSProgram, setEditSProgram] = React.useState("");
  const [editSDuration, setEditSDuration] = React.useState<number | "">("");
  const [editSPerWeek, setEditSPerWeek] = React.useState<number | "">("");
  const [editSClass, setEditSClass] = React.useState("");
  const [editSTeacherId, setEditSTeacherId] = React.useState<string>("");

  // EDIT Session modal
  const [openEditSession, setOpenEditSession] = React.useState(false);
  const [editSessionId, setEditSessionId] = React.useState<string>("");
  const [editSessTeacherId, setEditSessTeacherId] = React.useState<string>("");
  const [editSessTitle, setEditSessTitle] = React.useState<string>("");
  const [editSessStartsAt, setEditSessStartsAt] = React.useState<string>("");

  // EDIT Attendance modal
  const [openEditAttendance, setOpenEditAttendance] = React.useState(false);
  const [editAttendSessionId, setEditAttendSessionId] = React.useState<string>("");
  const [editAttendStudentId, setEditAttendStudentId] = React.useState<string>("");
  const [editAttendStatus, setEditAttendStatus] = React.useState<Status>("present");
  const [editAttendKey, setEditAttendKey] = React.useState<{ session_id: string; student_id: string } | null>(null);

  // CONFIRM deletions
  const [confirmTeacher, setConfirmTeacher] = React.useState<{ open: boolean; id?: string; name?: string }>({ open: false });
  const [confirmStudent, setConfirmStudent] = React.useState<{ open: boolean; id?: string; name?: string }>({ open: false });
  const [confirmSession, setConfirmSession] = React.useState<{ open: boolean; id?: string; title?: string }>({ open: false });
  const [confirmAttendance, setConfirmAttendance] = React.useState<{ open: boolean; session_id?: string; student_id?: string; label?: string }>({ open: false });

  /* ------------ Loaders (views recommended for RLS convenience) ------------ */
  const reload = React.useCallback(async () => {
    if (!sb) return;
    const [t, s, ss, a] = await Promise.all([
      sb.from("my_teachers").select("*").order("created_at", { ascending: false }),
      sb.from("my_students").select("*").order("created_at", { ascending: false }),
      sb.from("my_sessions").select("*").order("starts_at", { ascending: false }),
      sb.from("my_attendance").select("*").order("noted_at", { ascending: false }),
    ]);
    if (!t.error && t.data) setTeachers(t.data as Teacher[]);
    if (!s.error && s.data) setStudents(s.data as Student[]);
    if (!ss.error && ss.data) setSessions(ss.data as Session[]);
    if (!a.error && a.data) setAttendance(a.data as Attendance[]);
  }, [sb]);

  React.useEffect(() => { reload(); }, [reload]);

  // Realtime subscriptions for all tables
  React.useEffect(() => {
    if (!sb) return;
    const channel = sb.channel("attendance-bus")
      .on("postgres_changes", { event: "*", schema: "public", table: "teachers" }, reload)
      .on("postgres_changes", { event: "*", schema: "public", table: "students" }, reload)
      .on("postgres_changes", { event: "*", schema: "public", table: "teacher_students" }, reload)
      .on("postgres_changes", { event: "*", schema: "public", table: "sessions" }, reload)
      .on("postgres_changes", { event: "*", schema: "public", table: "attendance" }, reload)
      .subscribe();
    return () => { sb.removeChannel(channel); };
  }, [sb, reload]);

  /* ------------ Derived ------------ */
  const tMap = React.useMemo(() => byId(teachers), [teachers]);

  const filteredStudents = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return students
      .filter(s => {
        if (teacherFilter === "all") return true;
        // proxy: student appears under teacher if attended any session led by teacher
        const attendedWithTeacher = attendance.some(a => {
          if (a.student_id !== s.id) return false;
          const sess = sessions.find(x => x.id === a.session_id);
          return sess?.teacher_id === teacherFilter;
        });
        return attendedWithTeacher || false;
      })
      .filter(s => (q ? `${s.name} ${s.email ?? ""} ${s.program ?? ""}`.toLowerCase().includes(q) : true));
  }, [students, teacherFilter, query, attendance, sessions]);

  const filteredSessions = React.useMemo(() => {
    return sessions.filter(s => (teacherFilter === "all" ? true : s.teacher_id === teacherFilter));
  }, [sessions, teacherFilter]);

  const attendanceBySession = React.useMemo(() => {
    const m = new Map<string, number>();
    const present = new Map<string, number>();
    attendance.forEach(a => {
      m.set(a.session_id, (m.get(a.session_id) || 0) + 1);
      if (a.status === "present") present.set(a.session_id, (present.get(a.session_id) || 0) + 1);
    });
    return { totalBySession: m, presentBySession: present };
  }, [attendance]);

  const kpis = React.useMemo(() => {
    const totalStudents = students.length;
    const totalTeachers = teachers.length;
    const totalSessions = sessions.length;
    const totalMarks = attendance.length;
    const totalPresent = attendance.filter(a => a.status === "present").length;
    const rate = totalMarks ? (totalPresent / totalMarks) : 0;
    return { totalStudents, totalTeachers, totalSessions, totalMarks, attendanceRate: rate };
  }, [students, teachers, sessions, attendance]);

  /* ------------ Adds (same as before) ------------ */
  const addTeacher = async () => {
    if (!sb) return;
    const name = tName.trim(); if (!name) return;
    await sb.from("teachers").insert({ name, email: tEmail || null });
    setTName(""); setTEmail(""); setOpenTeacher(false);
  };

  const addStudentRPC = async () => {
    if (!sb) return;
    if (!sTeacherId) return;
    const name = sName.trim(); if (!name) return;
    const { error } = await sb.rpc("create_student_and_link", {
      p_teacher_id: sTeacherId,
      p_name: name,
      p_email: sEmail || null,
      p_program: sProgram || null,
      p_duration_weeks: sDuration === "" ? null : Number(sDuration),
      p_sessions_per_week: sPerWeek === "" ? null : Number(sPerWeek),
      p_class_name: sClass || null,
    });
    if (error) { console.error(error); return; }
    setSName(""); setSEmail(""); setSProgram(""); setSDuration(""); setSPerWeek(""); setSClass(""); setSTeacherId("");
    setOpenStudent(false);
  };

  const addSessionRPC = async () => {
    if (!sb) return;
    if (!sessTeacherId || !sessStartsAt) return;
    const startsAt = new Date(sessStartsAt).toISOString();
    const { error } = await sb.rpc("create_session_owned", {
      p_teacher_id: sessTeacherId,
      p_title: sessTitle || null,
      p_starts_at: startsAt,
    });
    if (error) { console.error(error); return; }
    setSessTeacherId(""); setSessTitle(""); setSessStartsAt(""); setOpenSession(false);
  };

  const addAttendance = async () => {
    if (!sb) return;
    if (!attendSessionId || !attendStudentId) return;
    const { error } = await sb.from("attendance").insert({
      session_id: attendSessionId,
      student_id: attendStudentId,
      status: attendStatus,
    });
    if (error) { console.error(error); return; }
    setAttendSessionId(""); setAttendStudentId(""); setAttendStatus("present");
    setOpenAttend(false);
  };

  /* ------------ EDIT flows ------------ */
  const onOpenEditTeacher = (t: Teacher) => {
    setEditTeacherId(t.id); setEditTName(t.name); setEditTEmail(t.email ?? ""); setOpenEditTeacher(true);
  };
  const saveEditTeacher = async () => {
    if (!sb) return;
    if (!editTeacherId) return;
    const name = editTName.trim(); const email = editTEmail.trim() || null;
    const { error } = await sb.from("teachers").update({ name, email }).eq("id", editTeacherId);
    if (error) { console.error(error); return; }
    setOpenEditTeacher(false); setEditTeacherId(""); setEditTName(""); setEditTEmail("");
  };

  const onOpenEditStudent = async (s: Student) => {
    if (!sb) return;
    setEditStudentId(s.id);
    setEditSName(s.name); setEditSEmail(s.email ?? "");
    setEditSProgram(s.program ?? ""); setEditSDuration(s.duration_weeks ?? "");
    setEditSPerWeek(s.sessions_per_week ?? ""); setEditSClass(s.class_name ?? "");

    const { data } = await sb.from("teacher_students").select("teacher_id").eq("student_id", s.id).limit(1);
    setEditSTeacherId(data && data.length ? (data[0] as any).teacher_id : "");

    setOpenEditStudent(true);
  };
  const saveEditStudent = async () => {
    if (!sb) return;
    if (!editStudentId) return;
    const { error: e1 } = await sb.from("students").update({
      name: editSName.trim(),
      email: editSEmail.trim() || null,
      program: editSProgram.trim() || null,
      duration_weeks: editSDuration === "" ? null : Number(editSDuration),
      sessions_per_week: editSPerWeek === "" ? null : Number(editSPerWeek),
      class_name: editSClass.trim() || null,
    }).eq("id", editStudentId);
    if (e1) { console.error(e1); return; }

    if (editSTeacherId) {
      await sb.from("teacher_students").delete().eq("student_id", editStudentId);
      const { error: e2 } = await sb.from("teacher_students").insert({ teacher_id: editSTeacherId, student_id: editStudentId });
      if (e2) { console.error(e2); return; }
    }
    setOpenEditStudent(false);
    setEditStudentId(""); setEditSName(""); setEditSEmail(""); setEditSProgram("");
    setEditSDuration(""); setEditSPerWeek(""); setEditSClass(""); setEditSTeacherId("");
  };

  const onOpenEditSession = (s: Session) => {
    setEditSessionId(s.id);
    setEditSessTeacherId(s.teacher_id ?? "");
    setEditSessTitle(s.title ?? "");
    setEditSessStartsAt(toLocalDT(s.starts_at));
    setOpenEditSession(true);
  };
  const saveEditSession = async () => {
    if (!sb) return;
    if (!editSessionId) return;
    const payload: Partial<Session> = {
      teacher_id: editSessTeacherId || null,
      title: editSessTitle || null,
      starts_at: new Date(editSessStartsAt).toISOString(),
    };
    const { error } = await sb.from("sessions").update(payload).eq("id", editSessionId);
    if (error) { console.error(error); return; }
    setOpenEditSession(false);
    setEditSessionId(""); setEditSessTeacherId(""); setEditSessTitle(""); setEditSessStartsAt("");
  };

  const onOpenEditAttendance = (a: Attendance) => {
    setEditAttendKey({ session_id: a.session_id, student_id: a.student_id });
    setEditAttendSessionId(a.session_id);
    setEditAttendStudentId(a.student_id);
    setEditAttendStatus(a.status);
    setOpenEditAttendance(true);
  };
  const saveEditAttendance = async () => {
    if (!sb) return;
    if (!editAttendKey) return;
    // If session or student changed, we must delete old PK row and insert new one
    const changedKey = editAttendKey.session_id !== editAttendSessionId || editAttendKey.student_id !== editAttendStudentId;
    if (changedKey) {
      const { error: delErr } = await sb.from("attendance").delete()
        .match({ session_id: editAttendKey.session_id, student_id: editAttendKey.student_id });
      if (delErr) { console.error(delErr); return; }
      const { error: insErr } = await sb.from("attendance").insert({
        session_id: editAttendSessionId, student_id: editAttendStudentId, status: editAttendStatus,
      });
      if (insErr) { console.error(insErr); return; }
    } else {
      const { error } = await sb.from("attendance").update({ status: editAttendStatus })
        .match({ session_id: editAttendSessionId, student_id: editAttendStudentId });
      if (error) { console.error(error); return; }
    }
    setOpenEditAttendance(false);
    setEditAttendKey(null); setEditAttendSessionId(""); setEditAttendStudentId(""); setEditAttendStatus("present");
  };

  /* ------------ DELETE with confirmation ------------ */
  const doDeleteTeacher = async (id?: string) => {
    if (!sb) return;
    if (!id) return;
    await sb.from("teachers").delete().eq("id", id);
  };
  const doDeleteStudent = async (id?: string) => {
    if (!sb) return;
    if (!id) return;
    await sb.from("students").delete().eq("id", id);
  };
  const doDeleteSession = async (id?: string) => {
    if (!sb) return;
    if (!id) return;
    await sb.from("sessions").delete().eq("id", id);
  };
  const doDeleteAttendance = async (sid?: string, stid?: string) => {
    if (!sb) return;
    if (!sid || !stid) return;
    await sb.from("attendance").delete().match({ session_id: sid, student_id: stid });
  };

  /* ------------ Charts data ------------ */
  const sessionChart = React.useMemo(() => {
    return filteredSessions.map(s => {
      const total = attendance.filter(a => a.session_id === s.id).length;
      const present = attendance.filter(a => a.session_id === s.id && a.status === "present").length;
      return { name: `${s.title ?? "Session"} • ${fmtDate(s.starts_at)}`, present, total };
    });
  }, [filteredSessions, attendance]);

  /* ------------ Render ------------ */
  return (
    <div className="w-full">
      <TopBar title="Attendance" subtitle="Student Attendance Tracking" showAccountInTitle={false} showAccountIdInSubtitle={false} />

      {/* Controls */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="w-[220px]">
          <Select value={teacherFilter} onValueChange={setTeacherFilter}>
            <SelectTrigger className="h-9"><SelectValue placeholder="Filter by teacher" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Teachers</SelectItem>
              {teachers.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="flex-1 min-w-[180px] max-w-[360px]">
          <Input placeholder="Search student / email / program…" value={query} onChange={(e) => setQuery(e.target.value)} className="h-9" />
        </div>

        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" onClick={() => setOpenTeacher(true)}>Add Teacher</Button>
          <Button variant="outline" onClick={() => setOpenStudent(true)}>Add Student</Button>
          <Button variant="outline" onClick={() => setOpenSession(true)}>Add Session</Button>
          <Button onClick={() => setOpenAttend(true)}>Add Attendance</Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-3 flex gap-2">
        {(["overview","teachers","students","sessions"] as TabKey[]).map(k => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`px-3 py-1.5 rounded-md border ${tab===k ? "bg-slate-900 text-white" : "bg-white hover:bg-slate-50"}`}
          >
            {k[0].toUpperCase()+k.slice(1)}
          </button>
        ))}
      </div>

      {/* Panels */}
      {tab === "overview" && (
        <>
          <div className="grid gap-3 md:grid-cols-4">
            <Stat title="Teachers" value={teachers.length} />
            <Stat title="Students" value={students.length} />
            <Stat title="Sessions" value={sessions.length} />
            <Stat title="Attendance Rate" value={`${(kpis.attendanceRate*100).toFixed(1)}%`} />
          </div>

          <Card className="mt-4">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-slate-700">Attendance by Session</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 h-72">
              <ResponsiveContainer width="100%" height="100%">
                <RBarChart data={sessionChart}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" hide />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="present" name="Present" radius={[6,6,0,0]} />
                  <Bar dataKey="total" name="Total" radius={[6,6,0,0]} />
                </RBarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </>
      )}

      {tab === "teachers" && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Teachers</CardTitle></CardHeader>
          <CardContent className="pt-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500">
                  <th className="py-2 pr-3">Name</th>
                  <th className="py-2 pr-3">Email</th>
                  <th className="py-2 pr-3">Students</th>
                  <th className="py-2 pr-0 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {teachers.map(t => {
                  const studentIds = new Set(
                    attendance
                      .filter(a => sessions.find(s => s.id === a.session_id)?.teacher_id === t.id)
                      .map(a => a.student_id)
                  );
                  return (
                    <tr key={t.id} className="border-t">
                      <td className="py-2 pr-3">{t.name}</td>
                      <td className="py-2 pr-3">{t.email ?? "—"}</td>
                      <td className="py-2 pr-3">{studentIds.size}</td>
                      <td className="py-2 pr-0 text-right">
                        <div className="inline-flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => onOpenEditTeacher(t)}>
                            <Pencil className="h-4 w-4 mr-1" /> Edit
                          </Button>
                          <Button size="sm" variant="outline" className="text-red-600 hover:bg-red-50"
                            onClick={() => setConfirmTeacher({ open: true, id: t.id, name: t.name })}>
                            <Trash2 className="h-4 w-4 mr-1" /> Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {!teachers.length && (
                  <tr><td className="py-6 text-center text-slate-500" colSpan={4}>No teachers yet.</td></tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {tab === "students" && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Students</CardTitle></CardHeader>
          <CardContent className="pt-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500">
                  <th className="py-2 pr-3">Name</th>
                  <th className="py-2 pr-3">Program</th>
                  <th className="py-2 pr-3">Sessions/Week</th>
                  <th className="py-2 pr-3">Attendance Rate</th>
                  <th className="py-2 pr-0 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map(s => {
                  const marks = attendance.filter(a => a.student_id === s.id);
                  const present = marks.filter(m => m.status === "present").length;
                  const rate = marks.length ? (present/marks.length) : 0;
                  return (
                    <tr key={s.id} className="border-t">
                      <td className="py-2 pr-3">{s.name}</td>
                      <td className="py-2 pr-3">{s.program ?? "—"}</td>
                      <td className="py-2 pr-3">{s.sessions_per_week ?? "—"}</td>
                      <td className="py-2 pr-3">{(rate*100).toFixed(0)}%</td>
                      <td className="py-2 pr-0 text-right">
                        <div className="inline-flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => onOpenEditStudent(s)}>
                            <Pencil className="h-4 w-4 mr-1" /> Edit
                          </Button>
                          <Button size="sm" variant="outline" className="text-red-600 hover:bg-red-50"
                            onClick={() => setConfirmStudent({ open: true, id: s.id, name: s.name })}>
                            <Trash2 className="h-4 w-4 mr-1" /> Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {!filteredStudents.length && (
                  <tr><td className="py-6 text-center text-slate-500" colSpan={5}>No students match.</td></tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {tab === "sessions" && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Sessions & Attendance</CardTitle></CardHeader>
          <CardContent className="pt-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500">
                  <th className="py-2 pr-3">Title</th>
                  <th className="py-2 pr-3">Teacher</th>
                  <th className="py-2 pr-3">Starts</th>
                  <th className="py-2 pr-3">Present / Total</th>
                  <th className="py-2 pr-0 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredSessions.map(s => {
                  const total = attendance.filter(a => a.session_id === s.id).length;
                  const present = attendance.filter(a => a.session_id === s.id && a.status === "present").length;
                  const tName = s.teacher_id ? (tMap.get(s.teacher_id)?.name ?? "—") : "—";
                  return (
                    <tr key={s.id} className="border-t">
                      <td className="py-2 pr-3">{s.title ?? "Session"}</td>
                      <td className="py-2 pr-3">{tName}</td>
                      <td className="py-2 pr-3">{fmtDate(s.starts_at)}</td>
                      <td className="py-2 pr-3">{present} / {total}</td>
                      <td className="py-2 pr-0 text-right">
                        <div className="inline-flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => onOpenEditSession(s)}>
                            <Pencil className="h-4 w-4 mr-1" /> Edit
                          </Button>
                          <Button size="sm" variant="outline" className="text-red-600 hover:bg-red-50"
                            onClick={() => setConfirmSession({ open: true, id: s.id, title: s.title ?? "Session" })}>
                            <Trash2 className="h-4 w-4 mr-1" /> Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {!filteredSessions.length && (
                  <tr><td className="py-6 text-center text-slate-500" colSpan={5}>No sessions yet.</td></tr>
                )}
              </tbody>
            </table>

            {/* Quick attendance editor list (optional) */}
            <div className="mt-4">
              <div className="text-sm font-semibold text-slate-700 mb-2">All Attendance</div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-500">
                    <th className="py-2 pr-3">Session</th>
                    <th className="py-2 pr-3">Student</th>
                    <th className="py-2 pr-3">Status</th>
                    <th className="py-2 pr-0 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {attendance.map(a => {
                    const sess = sessions.find(s => s.id === a.session_id);
                    const stu = students.find(s => s.id === a.student_id);
                    return (
                      <tr key={`${a.session_id}:${a.student_id}`} className="border-t">
                        <td className="py-2 pr-3">{(sess?.title ?? "Session")} • {sess ? fmtDate(sess.starts_at) : ""}</td>
                        <td className="py-2 pr-3">{stu?.name ?? "—"}</td>
                        <td className="py-2 pr-3 capitalize">{a.status}</td>
                        <td className="py-2 pr-0 text-right">
                          <div className="inline-flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => onOpenEditAttendance(a)}>
                              <Pencil className="h-4 w-4 mr-1" /> Edit
                            </Button>
                            <Button size="sm" variant="outline" className="text-red-600 hover:bg-red-50"
                              onClick={() => setConfirmAttendance({
                                open: true, session_id: a.session_id, student_id: a.student_id,
                                label: `${stu?.name ?? "Student"} • ${(sess?.title ?? "Session")}`
                              })}>
                              <Trash2 className="h-4 w-4 mr-1" /> Delete
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {!attendance.length && (
                    <tr><td className="py-6 text-center text-slate-500" colSpan={4}>No attendance yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* --------- Add Modals --------- */}
      <Modal open={openTeacher} onClose={() => setOpenTeacher(false)} title="Add Teacher">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <Input placeholder="Full name" value={tName} onChange={(e) => setTName(e.target.value)} className="h-9 sm:col-span-2" />
          <Input placeholder="Email (optional)" value={tEmail} onChange={(e) => setTEmail(e.target.value)} className="h-9 sm:col-span-2" />
        </div>
        <div className="mt-3 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpenTeacher(false)}>Cancel</Button>
          <Button onClick={addTeacher}>Save</Button>
        </div>
      </Modal>

      <Modal open={openStudent} onClose={() => setOpenStudent(false)} title="Add Student">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <Input placeholder="Full name" value={sName} onChange={(e) => setSName(e.target.value)} className="h-9 sm:col-span-2" />
          <Input placeholder="Email (optional)" value={sEmail} onChange={(e) => setSEmail(e.target.value)} className="h-9 sm:col-span-2" />
          <Input placeholder="Program" value={sProgram} onChange={(e) => setSProgram(e.target.value)} className="h-9 sm:col-span-2" />
          <Input placeholder="Duration (weeks)" inputMode="numeric" value={sDuration === "" ? "" : sDuration} onChange={(e) => setSDuration(e.target.value ? Number(e.target.value) : "")} className="h-9" />
          <Input placeholder="Sessions / week" inputMode="numeric" value={sPerWeek === "" ? "" : sPerWeek} onChange={(e) => setSPerWeek(e.target.value ? Number(e.target.value) : "")} className="h-9" />
          <Input placeholder="Class name" value={sClass} onChange={(e) => setSClass(e.target.value)} className="h-9 sm:col-span-2" />
          <div className="sm:col-span-2">
            <Select value={sTeacherId} onValueChange={setSTeacherId}>
              <SelectTrigger className="h-9 w-full"><SelectValue placeholder="Assign to teacher" /></SelectTrigger>
              <SelectContent>
                {teachers.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="mt-3 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpenStudent(false)}>Cancel</Button>
          <Button onClick={addStudentRPC}>Save</Button>
        </div>
      </Modal>

      <Modal open={openSession} onClose={() => setOpenSession(false)} title="Add Session">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <Select value={sessTeacherId} onValueChange={setSessTeacherId}>
            <SelectTrigger className="h-9 w-full"><SelectValue placeholder="Teacher" /></SelectTrigger>
            <SelectContent>
              {teachers.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input placeholder="Title (optional)" value={sessTitle} onChange={(e) => setSessTitle(e.target.value)} className="h-9" />
          <Input type="datetime-local" value={sessStartsAt} onChange={(e) => setSessStartsAt(e.target.value)} className="h-9 sm:col-span-2" />
        </div>
        <div className="mt-3 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpenSession(false)}>Cancel</Button>
          <Button onClick={addSessionRPC}>Save</Button>
        </div>
      </Modal>

      <Modal open={openAttend} onClose={() => setOpenAttend(false)} title="Add Attendance">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <Select value={attendSessionId} onValueChange={setAttendSessionId}>
            <SelectTrigger className="h-9 w-full"><SelectValue placeholder="Select session" /></SelectTrigger>
            <SelectContent>
              {sessions.map(s => <SelectItem key={s.id} value={s.id}>{(s.title ?? "Session")} • {fmtDate(s.starts_at)}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={attendStudentId} onValueChange={setAttendStudentId}>
            <SelectTrigger className="h-9 w-full"><SelectValue placeholder="Select student" /></SelectTrigger>
            <SelectContent>
              {students.map(st => <SelectItem key={st.id} value={st.id}>{st.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={attendStatus} onValueChange={(v: Status) => setAttendStatus(v)}>
            <SelectTrigger className="h-9 w-full"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="present">Present</SelectItem>
              <SelectItem value="absent">Absent</SelectItem>
              <SelectItem value="late">Late</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="mt-3 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpenAttend(false)}>Cancel</Button>
          <Button onClick={addAttendance}>Save</Button>
        </div>
      </Modal>

      {/* --------- Edit Modals --------- */}
      <Modal open={openEditTeacher} onClose={() => setOpenEditTeacher(false)} title="Edit Teacher">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <Input placeholder="Full name" value={editTName} onChange={(e) => setEditTName(e.target.value)} className="h-9 sm:col-span-2" />
          <Input placeholder="Email (optional)" value={editTEmail} onChange={(e) => setEditTEmail(e.target.value)} className="h-9 sm:col-span-2" />
        </div>
        <div className="mt-3 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpenEditTeacher(false)}>Cancel</Button>
          <Button onClick={saveEditTeacher}>Save Changes</Button>
        </div>
      </Modal>

      <Modal open={openEditStudent} onClose={() => setOpenEditStudent(false)} title="Edit Student">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <Input placeholder="Full name" value={editSName} onChange={(e) => setEditSName(e.target.value)} className="h-9 sm:col-span-2" />
          <Input placeholder="Email (optional)" value={editSEmail} onChange={(e) => setEditSEmail(e.target.value)} className="h-9 sm:col-span-2" />
          <Input placeholder="Program" value={editSProgram} onChange={(e) => setEditSProgram(e.target.value)} className="h-9 sm:col-span-2" />
          <Input placeholder="Duration (weeks)" inputMode="numeric" value={editSDuration === "" ? "" : editSDuration} onChange={(e) => setEditSDuration(e.target.value ? Number(e.target.value) : "")} className="h-9" />
          <Input placeholder="Sessions / week" inputMode="numeric" value={editSPerWeek === "" ? "" : editSPerWeek} onChange={(e) => setEditSPerWeek(e.target.value ? Number(e.target.value) : "")} className="h-9" />
          <Input placeholder="Class name" value={editSClass} onChange={(e) => setEditSClass(e.target.value)} className="h-9 sm:col-span-2" />
          <div className="sm:col-span-2">
            <Select value={editSTeacherId} onValueChange={setEditSTeacherId}>
              <SelectTrigger className="h-9 w-full"><SelectValue placeholder="Assign to teacher" /></SelectTrigger>
              <SelectContent>
                {teachers.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="mt-3 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpenEditStudent(false)}>Cancel</Button>
          <Button onClick={saveEditStudent}>Save Changes</Button>
        </div>
      </Modal>

      <Modal open={openEditSession} onClose={() => setOpenEditSession(false)} title="Edit Session">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <Select value={editSessTeacherId} onValueChange={setEditSessTeacherId}>
            <SelectTrigger className="h-9 w-full"><SelectValue placeholder="Teacher" /></SelectTrigger>
            <SelectContent>
              {teachers.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input placeholder="Title (optional)" value={editSessTitle} onChange={(e) => setEditSessTitle(e.target.value)} className="h-9" />
          <Input type="datetime-local" value={editSessStartsAt} onChange={(e) => setEditSessStartsAt(e.target.value)} className="h-9 sm:col-span-2" />
        </div>
        <div className="mt-3 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpenEditSession(false)}>Cancel</Button>
          <Button onClick={saveEditSession}>Save Changes</Button>
        </div>
      </Modal>

      <Modal open={openEditAttendance} onClose={() => setOpenEditAttendance(false)} title="Edit Attendance">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <Select value={editAttendSessionId} onValueChange={setEditAttendSessionId}>
            <SelectTrigger className="h-9 w-full"><SelectValue placeholder="Select session" /></SelectTrigger>
            <SelectContent>
              {sessions.map(s => <SelectItem key={s.id} value={s.id}>{(s.title ?? "Session")} • {fmtDate(s.starts_at)}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={editAttendStudentId} onValueChange={setEditAttendStudentId}>
            <SelectTrigger className="h-9 w-full"><SelectValue placeholder="Select student" /></SelectTrigger>
            <SelectContent>
              {students.map(st => <SelectItem key={st.id} value={st.id}>{st.name}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={editAttendStatus} onValueChange={(v: Status) => setEditAttendStatus(v)}>
            <SelectTrigger className="h-9 w-full"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="present">Present</SelectItem>
              <SelectItem value="absent">Absent</SelectItem>
              <SelectItem value="late">Late</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="mt-3 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpenEditAttendance(false)}>Cancel</Button>
          <Button onClick={saveEditAttendance}>Save Changes</Button>
        </div>
      </Modal>

      {/* --------- Confirm Modals --------- */}
      <Confirm
        open={confirmTeacher.open}
        onClose={() => setConfirmTeacher({ open: false })}
        title="Delete teacher?"
        message={<span>This will remove <b>{confirmTeacher.name}</b> and may cascade links/sessions depending on policies.</span>}
        onConfirm={() => doDeleteTeacher(confirmTeacher.id)}
        danger
      />
      <Confirm
        open={confirmStudent.open}
        onClose={() => setConfirmStudent({ open: false })}
        title="Delete student?"
        message={<span>This will remove <b>{confirmStudent.name}</b> and related links/attendance.</span>}
        onConfirm={() => doDeleteStudent(confirmStudent.id)}
        danger
      />
      <Confirm
        open={confirmSession.open}
        onClose={() => setConfirmSession({ open: false })}
        title="Delete session?"
        message={<span>Delete <b>{confirmSession.title}</b> and its attendance?</span>}
        onConfirm={() => doDeleteSession(confirmSession.id)}
        danger
      />
      <Confirm
        open={confirmAttendance.open}
        onClose={() => setConfirmAttendance({ open: false })}
        title="Delete attendance?"
        message={<span>Remove attendance for <b>{confirmAttendance.label}</b>?</span>}
        onConfirm={() => doDeleteAttendance(confirmAttendance.session_id, confirmAttendance.student_id)}
        danger
      />
    </div>
  );
}

/* ---------------- Small KPI Card ---------------- */
function Stat({ title, value }: { title: string; value: React.ReactNode }) {
  return (
    <Card className="rounded-xl border bg-white/90">
      <CardContent className="py-3">
        <div className="text-[11px] text-slate-500">{title}</div>
        <div className="text-lg font-semibold text-slate-800">{value}</div>
      </CardContent>
    </Card>
  );
}
