// File: lib/db/attendance.ts
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { getBrowserSupabase } from "@/lib/supabase/client";

/** Types aligned with your tables/views */
export type Teacher = { id: string; name: string; email: string | null };
export type Student = {
  id: string; name: string; email: string | null;
  program: string | null; duration_weeks: number | null;
  sessions_per_week: number | null; class_name: string | null;
};
export type Session = { id: string; teacher_id: string | null; title: string | null; starts_at: string };
export type Attendance = {
  session_id: string; student_id: string;
  status: "present" | "absent" | "late"; noted_at: string;
};

/** Get a client only when called in the browser */
function sb() {
  const s = getBrowserSupabase();
  if (!s) throw new Error("Supabase client unavailable on server. Call these helpers from client components.");
  return s;
}

/* ------------ Reads (prefer views with RLS baked in) ------------ */
export async function listTeachers(): Promise<Teacher[]> {
  const { data, error } = await sb().from("my_teachers").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []) as Teacher[];
}

export async function listStudents(): Promise<Student[]> {
  const { data, error } = await sb().from("my_students").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []) as Student[];
}

export async function listSessions(): Promise<Session[]> {
  const { data, error } = await sb().from("my_sessions").select("*").order("starts_at", { ascending: false });
  if (error) throw error;
  return (data || []) as Session[];
}

export async function listAttendance(): Promise<Attendance[]> {
  const { data, error } = await sb().from("my_attendance").select("*").order("noted_at", { ascending: false });
  if (error) throw error;
  return (data || []) as Attendance[];
}

/* ------------ Creates ------------ */
export async function createTeacher(payload: { name: string; email?: string | null }) {
  return sb().from("teachers").insert({ name: payload.name, email: payload.email ?? null });
}

export async function createStudentAndLink(args: {
  teacher_id: string;
  name: string;
  email?: string | null;
  program?: string | null;
  duration_weeks?: number | null;
  sessions_per_week?: number | null;
  class_name?: string | null;
}) {
  return sb().rpc("create_student_and_link", {
    p_teacher_id: args.teacher_id,
    p_name: args.name,
    p_email: args.email ?? null,
    p_program: args.program ?? null,
    p_duration_weeks: args.duration_weeks ?? null,
    p_sessions_per_week: args.sessions_per_week ?? null,
    p_class_name: args.class_name ?? null,
  });
}

export async function createSessionOwned(args: { teacher_id: string; title?: string | null; starts_at_iso: string }) {
  return sb().rpc("create_session_owned", {
    p_teacher_id: args.teacher_id,
    p_title: args.title ?? null,
    p_starts_at: args.starts_at_iso,
  });
}

export async function markAttendance(args: { session_id: string; student_id: string; status: Attendance["status"] }) {
  return sb().from("attendance").insert({
    session_id: args.session_id,
    student_id: args.student_id,
    status: args.status,
  });
}

/* ------------ Updates ------------ */
export async function updateTeacher(id: string, payload: { name?: string; email?: string | null }) {
  return sb().from("teachers").update(payload).eq("id", id);
}

export async function updateStudent(id: string, payload: Partial<Omit<Student, "id">>) {
  return sb().from("students").update(payload).eq("id", id);
}

export async function relinkStudentToTeacher(studentId: string, teacherId: string) {
  const client = sb();
  await client.from("teacher_students").delete().eq("student_id", studentId);
  return client.from("teacher_students").insert({ teacher_id: teacherId, student_id: studentId });
}

export async function updateSession(id: string, payload: { teacher_id?: string | null; title?: string | null; starts_at_iso?: string }) {
  return sb().from("sessions").update({
    teacher_id: payload.teacher_id ?? null,
    title: payload.title ?? null,
    starts_at: payload.starts_at_iso ?? undefined,
  }).eq("id", id);
}

export async function updateAttendanceStatus(session_id: string, student_id: string, status: Attendance["status"]) {
  return sb().from("attendance").update({ status }).match({ session_id, student_id });
}

/* ------------ Deletes ------------ */
export async function deleteTeacher(id: string) {
  return sb().from("teachers").delete().eq("id", id);
}

export async function deleteStudent(id: string) {
  return sb().from("students").delete().eq("id", id);
}

export async function deleteSession(id: string) {
  return sb().from("sessions").delete().eq("id", id);
}

export async function deleteAttendance(session_id: string, student_id: string) {
  return sb().from("attendance").delete().match({ session_id, student_id });
}
