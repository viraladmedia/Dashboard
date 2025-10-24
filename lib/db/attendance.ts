// File: lib/db/attendance.ts
import { supabase } from "@/lib/supabase/client";

export type Teacher = {
  id: string; user_id: string;
  first_name: string; last_name: string; created_at: string;
};

export type Student = {
  id: string; user_id: string;
  teacher_id: string | null;
  first_name: string; last_name: string;
  program?: string | null;
  duration_weeks?: number | null;
  sessions_per_week?: number | null;
  class_name?: string | null;
  created_at: string;
};

export type AttendanceRow = {
  id: string; user_id: string;
  teacher_id: string | null;
  student_id: string;
  class_name?: string | null;
  date: string; // yyyy-mm-dd
  status: "present" | "absent";
  location?: string | null;
  created_at: string;
};

export async function loadAll() {
  const [t, s, a] = await Promise.all([
    supabase.from("teachers").select("*").order("created_at", { ascending: false }),
    supabase.from("students").select("*").order("created_at", { ascending: false }),
    supabase.from("attendance").select("*").order("date", { ascending: false }),
  ]);
  if (t.error) throw t.error;
  if (s.error) throw s.error;
  if (a.error) throw a.error;
  return {
    teachers: (t.data || []) as Teacher[],
    students: (s.data || []) as Student[],
    attendance: (a.data || []) as AttendanceRow[],
  };
}

/* ---------- TEACHERS ---------- */
export async function addTeacher(first_name: string, last_name: string) {
  const { data, error } = await supabase
    .from("teachers")
    .insert({ first_name, last_name })
    .select()
    .single();
  if (error) throw error;
  return data as Teacher;
}
export async function deleteTeacher(id: string) {
  const { error } = await supabase.from("teachers").delete().eq("id", id);
  if (error) throw error;
}

/* ---------- STUDENTS ---------- */
export async function addStudent(input: {
  first_name: string; last_name: string; teacher_id: string;
  program?: string; duration_weeks?: number | ""; sessions_per_week?: number | "";
  class_name?: string;
}) {
  const payload = {
    ...input,
    duration_weeks: input.duration_weeks === "" ? null : input.duration_weeks,
    sessions_per_week: input.sessions_per_week === "" ? null : input.sessions_per_week,
  };
  const { data, error } = await supabase.from("students").insert(payload).select().single();
  if (error) throw error;
  return data as Student;
}
export async function deleteStudent(id: string) {
  const { error } = await supabase.from("students").delete().eq("id", id);
  if (error) throw error;
}

/* ---------- ATTENDANCE ---------- */
export async function addAttendance(input: {
  date: string; teacher_id: string; student_id: string;
  status: "present" | "absent"; class_name?: string; location?: string;
}) {
  const { data, error } = await supabase.from("attendance").insert(input).select().single();
  if (error) throw error;
  return data as AttendanceRow;
}
export async function updateAttendance(id: string, patch: Partial<AttendanceRow>) {
  const { data, error } = await supabase.from("attendance").update(patch).eq("id", id).select().single();
  if (error) throw error;
  return data as AttendanceRow;
}
export async function deleteAttendance(id: string) {
  const { error } = await supabase.from("attendance").delete().eq("id", id);
  if (error) throw error;
}

/* ---------- Realtime subscription (optional, nice!) ---------- */
export function subscribeAttendance(onChange: () => void) {
  // You can expand to also watch teachers/students if you like
  const channel = supabase
    .channel("attendance-live")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "attendance" },
      () => onChange()
    )
    .subscribe();
  return () => { supabase.removeChannel(channel); };
}
