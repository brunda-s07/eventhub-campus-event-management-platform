import { Link } from "@tanstack/react-router";
import { format } from "date-fns";
import { Calendar, MapPin, Monitor, Star, Users } from "lucide-react";
import { eventStatus, statusTone, type EventWithCount } from "@/lib/events";
import { StatusBadge } from "./StatusBadge";

export function EventCard({ event, registered }: { event: EventWithCount; registered?: boolean }) {
  const status = eventStatus(event, event.registered);
  const pct = event.capacity ? Math.min(100, (event.registered / event.capacity) * 100) : 0;
  return (
    <Link
      to="/events/$id"
      params={{ id: event.id }}
      className="group flex flex-col overflow-hidden rounded-2xl border-2 border-ink bg-card shadow-pop transition-transform hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-pop-lg"
    >
      <div className="relative aspect-[16/9] overflow-hidden border-b-2 border-ink bg-muted">
        {event.image_url && (
          <img src={event.image_url} alt={event.title} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
        )}
        <span className="absolute left-3 top-3 rounded-full border-2 border-ink bg-accent px-2.5 py-0.5 text-xs font-bold text-accent-foreground">
          {event.category}
        </span>
        {registered && (
          <span className="absolute right-3 top-3 rounded-full border-2 border-ink bg-primary px-2.5 py-0.5 text-xs font-bold text-primary-foreground">
            You're in
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{event.club}</p>
          <h3 className="mt-1 text-lg font-bold leading-tight">{event.title}</h3>
        </div>
        <div className="space-y-1.5 text-sm text-muted-foreground">
          <p className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            {format(new Date(event.starts_at), "EEE, d MMM · h:mm a")} – {format(new Date(event.ends_at), "h:mm a")}
          </p>
          <p className="flex items-center gap-2">
            {event.is_online ? <Monitor className="h-4 w-4" /> : <MapPin className="h-4 w-4" />}
            {event.is_online ? "Online" : event.venue}
          </p>
        </div>
        <div className="mt-auto space-y-2">
          {event.capacity ? (
            <div>
              <div className="h-2 overflow-hidden rounded-full border border-ink bg-muted">
                <div className={`h-full ${statusTone(status) === "warn" ? "bg-warning" : "bg-primary"}`} style={{ width: `${pct}%` }} />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {Math.max(0, event.capacity - event.registered)} of {event.capacity} slots left
              </p>
            </div>
          ) : (
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Users className="h-3.5 w-3.5" /> {event.registered} registered · no limit
            </p>
          )}
          <div className="flex items-center justify-between gap-2">
            <StatusBadge status={status} />
            <div className="flex items-center gap-2 text-xs font-semibold">
              <span className="flex items-center gap-1"><Star className="h-3.5 w-3.5" />{event.activity_points} pts</span>
              <span className="rounded-md bg-secondary px-2 py-0.5">{event.fee ? `₹${event.fee}` : "Free"}</span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
