import { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  addDays, addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format, isSameDay, isSameMonth,
  startOfMonth, startOfWeek, subMonths,
} from "date-fns";
import { BellRing, ChevronLeft, ChevronRight, Clock, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { EventWithCount } from "@/lib/events";

export function EventCalendar({ events }: { events: EventWithCount[] }) {
  const [month, setMonth] = useState(() => new Date());
  const [selected, setSelected] = useState<Date | null>(null);
  const today = new Date();
  const tomorrow = addDays(today, 1);
  const reminders = events.filter((e) => {
    const d = new Date(e.starts_at);
    return isSameDay(d, today) || isSameDay(d, tomorrow);
  });
  const days = eachDayOfInterval({ start: startOfWeek(startOfMonth(month)), end: endOfWeek(endOfMonth(month)) });
  const on = (d: Date) => events.filter((e) => isSameDay(new Date(e.starts_at), d));
  const dayEvents = selected ? on(selected) : [];

  return (
    <div className="space-y-4">
      {reminders.length > 0 ? (
        reminders.map((e) => (
          <div key={e.id} className="flex items-center gap-3 rounded-2xl border-2 border-ink bg-primary p-4 text-primary-foreground shadow-pop">
            <BellRing className="h-5 w-5 shrink-0" />
            <p className="text-sm font-semibold">
              Reminder: {e.title} is {isSameDay(new Date(e.starts_at), today) ? "today" : "tomorrow"} at{" "}
              {format(new Date(e.starts_at), "h:mm a")} · {e.is_online ? "Online" : e.venue}
            </p>
          </div>
        ))
      ) : (
        <p className="rounded-2xl border-2 border-dashed border-ink p-3 text-sm text-muted-foreground">No events today or tomorrow.</p>
      )}

      <div className="rounded-2xl border-2 border-ink bg-card p-4 shadow-pop">
        <div className="mb-3 flex items-center justify-between">
          <Button size="icon" variant="ghost" onClick={() => setMonth(subMonths(month, 1))}><ChevronLeft className="h-4 w-4" /></Button>
          <h3 className="font-display text-lg font-bold">{format(month, "MMMM yyyy")}</h3>
          <Button size="icon" variant="ghost" onClick={() => setMonth(addMonths(month, 1))}><ChevronRight className="h-4 w-4" /></Button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-muted-foreground">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => <div key={d}>{d}</div>)}
        </div>
        <div className="mt-1 grid grid-cols-7 gap-1">
          {days.map((d) => {
            const has = on(d).length > 0;
            const isSel = selected && isSameDay(d, selected);
            return (
              <button
                key={d.toISOString()}
                onClick={() => setSelected(d)}
                className={`flex aspect-square flex-col items-center justify-center rounded-lg border text-sm transition-colors ${
                  isSel ? "border-ink bg-ink text-ink-foreground" : has ? "border-ink bg-accent font-bold" : "border-transparent hover:bg-muted"
                } ${isSameMonth(d, month) ? "" : "opacity-40"} ${isSameDay(d, today) && !isSel ? "ring-2 ring-primary" : ""}`}
              >
                {format(d, "d")}
                {has && <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-primary" />}
              </button>
            );
          })}
        </div>
      </div>

      {selected && (
        <div className="rounded-2xl border-2 border-ink bg-card p-4 shadow-pop">
          <h4 className="mb-2 font-bold">{format(selected, "EEEE, d MMMM")}</h4>
          {dayEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground">No registered events on this day.</p>
          ) : (
            <ul className="space-y-2">
              {dayEvents.map((e) => (
                <li key={e.id} className="rounded-lg border-2 border-ink p-3">
                  <Link to="/events/$id" params={{ id: e.id }} className="font-semibold hover:underline">{e.title}</Link>
                  <p className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" />
                    {format(new Date(e.starts_at), "h:mm a")} – {format(new Date(e.ends_at), "h:mm a")}
                  </p>
                  <p className="flex items-center gap-1 text-sm text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5" />{e.is_online ? "Online" : e.venue}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
