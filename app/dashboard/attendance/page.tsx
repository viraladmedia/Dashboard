// File: app/dashboard/attendance/page.tsx
"use client";

import * as React from "react";
import { TopBar } from "@/components/dashboard/TopBar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Download, Upload } from "lucide-react";
import { parseAttendanceCSV, summarizeByStudent, summarizeByTeacher } from "@/lib/attendance";
import type { AttendanceRow } from "@/app/types/attendance";
import { ResponsiveContainer, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, Legend } from "recharts";
import { fmt } from "@/lib/metrics";

export default function AttendancePage() {
  const [query, setQuery] = React.useState("");
  const [rows, setRows] = React.useState<AttendanceRow[]>([]);
  const [loading, setLoading] = React.useState(false);

  const onUpload = async (file: File) => {
    setLoading(true);
    try {
      const text = await file.text();
      const parsed = parseAttendanceCSV(text);
      setRows(parsed);
      // persist locally for convenience
      try { localStorage.setItem("vam.attendance.csv", text); } catch {}
    } finally {
      setLoading(false);
    }
  };

  // Load last CSV if present
  React.useEffect(() => {
    try {
      const cached = localStorage.getItem("vam.attendance.csv");
      if (cached) setRows(parseAttendanceCSV(cached));
    } catch {}
  }, []);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(r =>
      [r.teacher, r.student, r.date, r.status].map(x => (x || "").toLowerCase()).join(" ").includes(q)
    );
  }, [rows, query]);

  const teacherSum = React.useMemo(() => summarizeByTeacher(filtered), [filtered]);
  const studentSum = React.useMemo(() => summarizeByStudent(filtered), [filtered]);

  const exportCSV = () => {
    const header = ["date","teacher","student","session_id","status"];
    const body = filtered.map(r => [
      r.date || "", r.teacher || "", r.student || "", r.session_id || "", r.status || ""
    ]);
    const text = [header.join(","), ...body.map(r => escapeRow(r).join(","))].join("\n");
    const blob = new Blob([text], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "attendance_export.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="w-full">
      <TopBar query={query} setQuery={setQuery} subtitle="Attendance" title="Student Attendance" showAccountInTitle={false} />

      {/* Controls */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <label className="inline-flex items-center gap-2">
          <Input
            type="file"
            accept=".csv,text/csv"
            className="h-9"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onUpload(f);
              e.currentTarget.value = "";
            }}
          />
        </label>
        <Button size="sm" variant="outline" onClick={exportCSV} disabled={!filtered.length}>
          <Download className="h-4 w-4" />
          <span className="ml-1">Export</span>
        </Button>
        {!rows.length && (
          <div className="text-xs text-slate-500 flex items-center gap-1">
            <Upload className="h-4 w-4" /> Upload your attendance CSV to begin
          </div>
        )}
      </div>

      {/* KPIs */}
      <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-6 mb-5">
        <Stat title="Teachers" value={fmt(new Set(filtered.map(r => r.teacher).filter(Boolean)).size)} />
        <Stat title="Students" value={fmt(new Set(filtered.map(r => r.student).filter(Boolean)).size)} />
        <Stat title="Entries" value={fmt(filtered.length)} />
        <Stat title="Avg Teacher Rate" value={avgRate(teacherSum)} />
        <Stat title="Top Student Sessions" value={fmt(studentSum[0]?.sessionsAttended || 0)} />
        <Stat title="Top Teacher Students" value={fmt(teacherSum[0]?.uniqueStudents || 0)} />
      </div>

      {/* Teacher summary */}
      <Card className="rounded-2xl border bg-white/95">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-slate-700">Teachers — Students & Attendance</CardTitle>
        </CardHeader>
        <CardContent className="pt-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500">
                <th className="py-2 pr-3">Teacher</th>
                <th className="py-2 pr-3">Unique Students</th>
                <th className="py-2 pr-3">Total Entries</th>
                <th className="py-2 pr-0">Attendance Rate</th>
              </tr>
            </thead>
            <tbody>
              {teacherSum.map((t, i) => (
                <tr key={i} className="border-t">
                  <td className="py-2 pr-3">{t.teacher}</td>
                  <td className="py-2 pr-3">{fmt(t.uniqueStudents)}</td>
                  <td className="py-2 pr-3">{fmt(t.totalSessions)}</td>
                  <td className="py-2 pr-0">{t.attendanceRate == null ? "–" : (t.attendanceRate * 100).toFixed(1) + "%"}</td>
                </tr>
              ))}
              {!teacherSum.length && (
                <tr><td className="py-6 text-center text-slate-500" colSpan={4}>{loading ? "Loading…" : "No data."}</td></tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Students chart */}
      <Card className="mt-4 rounded-2xl border bg-white/95">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-slate-700">Top Students — Sessions Attended</CardTitle>
        </CardHeader>
        <CardContent className="pt-0 h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={studentSum.slice(0, 20)}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="student" hide />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="sessionsAttended" name="Sessions Attended" radius={[6,6,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Students table */}
      <Card className="mt-4 rounded-2xl border bg-white/95">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-slate-700">Students — Per Teacher</CardTitle>
        </CardHeader>
        <CardContent className="pt-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500">
                <th className="py-2 pr-3">Student</th>
                <th className="py-2 pr-3">Teacher</th>
                <th className="py-2 pr-3">Sessions Attended</th>
                <th className="py-2 pr-0">Attendance Rate</th>
              </tr>
            </thead>
            <tbody>
              {studentSum.map((s, i) => (
                <tr key={i} className="border-t">
                  <td className="py-2 pr-3">{s.student}</td>
                  <td className="py-2 pr-3">{s.teacher}</td>
                  <td className="py-2 pr-3">{fmt(s.sessionsAttended)}</td>
                  <td className="py-2 pr-0">{s.attendanceRate == null ? "–" : (s.attendanceRate * 100).toFixed(1) + "%"}</td>
                </tr>
              ))}
              {!studentSum.length && (
                <tr><td className="py-6 text-center text-slate-500" colSpan={4}>{loading ? "Loading…" : "No data."}</td></tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

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

function avgRate(teachers: ReturnType<typeof summarizeByTeacher>) {
  if (!teachers.length) return "–";
  const vals = teachers.map(t => t.attendanceRate).filter(v => v != null) as number[];
  if (!vals.length) return "–";
  const m = vals.reduce((a,b)=>a+b,0)/vals.length;
  return (m*100).toFixed(1) + "%";
}

function escapeRow(cols: string[]) {
  return cols.map((c) => /[",\n]/.test(c) ? `"${c.replace(/"/g,'""')}"` : c);
}
