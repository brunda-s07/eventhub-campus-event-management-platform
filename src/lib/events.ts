import type { Tables } from "@/integrations/supabase/types";

export type EventRow = Tables<"events">;
export type Student = Tables<"students">;
export type Registration = Tables<"registrations">;
export type Announcement = Tables<"announcements">;
export type EventWithCount = EventRow & { registered: number };

export const CATEGORIES = [
  "Technical",
  "Cultural",
  "Sports",
  "Workshop",
  "Competition",
  "Seminar",
  "Other",
] as const;

export const CLUBS = [
  "Protocol - Computer Science Club",
  "Singularity - The Astronomical Society",
  "TeamCodeLocked - The Technical Club",
  "NSS - Social Club",
  "Inksanity - Literary and Debating Society",
  "Falcons - Multimedia Team",
  "Pentagram - Mathematical Society",
  "FAC - The Fine Arts Club",
] as const;

export type EventStatus =
  | "Registration Open"
  | "Filling Fast"
  | "Almost Full"
  | "Full"
  | "Registration Closed"
  | "Ongoing"
  | "Completed"
  | "Cancelled";

export function eventStatus(
  e: Pick<EventRow, "is_cancelled" | "starts_at" | "ends_at" | "registration_deadline" | "capacity">,
  registered: number,
  now: Date = new Date(),
): EventStatus {
  if (e.is_cancelled) return "Cancelled";
  const start = new Date(e.starts_at);
  const end = new Date(e.ends_at);
  if (now > end) return "Completed";
  if (now >= start) return "Ongoing";
  if (now > new Date(e.registration_deadline)) return "Registration Closed";
  if (e.capacity != null) {
    if (registered >= e.capacity) return "Full";
    const ratio = registered / e.capacity;
    if (ratio >= 0.9) return "Almost Full";
    if (ratio >= 0.6) return "Filling Fast";
  }
  return "Registration Open";
}

export function canRegister(status: EventStatus) {
  return status === "Registration Open" || status === "Filling Fast" || status === "Almost Full";
}

export function statusTone(s: EventStatus): "open" | "warn" | "closed" | "live" {
  if (s === "Registration Open") return "open";
  if (s === "Filling Fast" || s === "Almost Full") return "warn";
  if (s === "Ongoing") return "live";
  return "closed";
}

function icsDate(d: string) {
  return new Date(d).toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

export function buildIcs(e: Pick<EventRow, "id" | "title" | "description" | "starts_at" | "ends_at" | "venue">) {
  const esc = (s: string) => s.replace(/[,;\\]/g, (m) => "\\" + m).replace(/\n/g, "\\n");
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//EventHub//EN",
    "BEGIN:VEVENT",
    `UID:${e.id}@eventhub`,
    `DTSTAMP:${icsDate(new Date().toISOString())}`,
    `DTSTART:${icsDate(e.starts_at)}`,
    `DTEND:${icsDate(e.ends_at)}`,
    `SUMMARY:${esc(e.title)}`,
    `DESCRIPTION:${esc(e.description)}`,
    `LOCATION:${esc(e.venue)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

export function downloadIcs(e: Parameters<typeof buildIcs>[0]) {
  const blob = new Blob([buildIcs(e)], { type: "text/calendar" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${e.title.replace(/\W+/g, "-")}.ics`;
  a.click();
  URL.revokeObjectURL(a.href);
}
