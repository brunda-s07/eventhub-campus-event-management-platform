import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { EventWithCount } from "./events";

export const eventsQuery = queryOptions({
  queryKey: ["events"],
  queryFn: async (): Promise<EventWithCount[]> => {
    const [{ data: events, error }, { data: regs, error: e2 }] = await Promise.all([
      supabase.from("events").select("*").order("starts_at"),
      supabase.from("registrations").select("event_id").eq("status", "registered"),
    ]);
    if (error) throw error;
    if (e2) throw e2;
    const counts = new Map<string, number>();
    regs?.forEach((r) => counts.set(r.event_id, (counts.get(r.event_id) ?? 0) + 1));
    return (events ?? []).map((e) => ({ ...e, registered: counts.get(e.id) ?? 0 }));
  },
});

export const studentsQuery = queryOptions({
  queryKey: ["students"],
  queryFn: async () => {
    const { data, error } = await supabase.from("students").select("*").order("name");
    if (error) throw error;
    return data;
  },
});

export const myRegistrationsQuery = (studentId: string | null) =>
  queryOptions({
    queryKey: ["my-registrations", studentId],
    enabled: !!studentId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("registrations")
        .select("*")
        .eq("student_id", studentId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

export const announcementsQuery = queryOptions({
  queryKey: ["announcements"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("announcements")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data;
  },
});

export const participantsQuery = (eventId: string | null) =>
  queryOptions({
    queryKey: ["participants", eventId],
    enabled: !!eventId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("registrations")
        .select("*, students(*)")
        .eq("event_id", eventId!)
        .order("created_at");
      if (error) throw error;
      return data;
    },
  });
