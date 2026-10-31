import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { format } from "date-fns";
import confetti from "canvas-confetti";
import { toast } from "sonner";
import { z } from "zod";
import { ArrowLeft, Calendar, CalendarPlus, Clock, IndianRupee, Mail, MapPin, Monitor, Star, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { announcementsQuery, eventsQuery, myRegistrationsQuery } from "@/lib/api";
import { canRegister, downloadIcs, eventStatus } from "@/lib/events";
import { useIdentity } from "@/lib/demo-identity";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/events/$id")({
  head: () => ({
    meta: [
      { title: "Event details — EventHub" },
      { name: "description", content: "Full schedule, venue, eligibility and registration for this college event." },
      { property: "og:title", content: "Event details — EventHub" },
      { property: "og:description", content: "See the details and register for this campus event." },
    ],
  }),
  component: EventDetails,
});

const regSchema = z.object({
  phone: z.string().trim().regex(/^[0-9+\- ]{7,15}$/, "Enter a valid phone number"),
  note: z.string().trim().max(300, "Keep it under 300 characters"),
});

function EventDetails() {
  const { id } = Route.useParams();
  const { studentId } = useIdentity();
  const qc = useQueryClient();
  const { data: events, isLoading } = useQuery(eventsQuery);
  const { data: regs } = useQuery(myRegistrationsQuery(studentId));
  const { data: announcements } = useQuery(announcementsQuery);
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(false);
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const event = events?.find((e) => e.id === id);
  const mine = regs?.find((r) => r.event_id === id && r.status === "registered");

  const register = useMutation({
    mutationFn: async () => {
      const parsed = regSchema.safeParse({ phone, note });
      if (!parsed.success) throw new Error(parsed.error.issues[0].message);
      const { error } = await supabase.from("registrations").insert({ event_id: id, student_id: studentId!, ...parsed.data });
      if (error) throw new Error(error.code === "23505" ? "You're already registered for this event" : error.message);
    },
    onSuccess: () => {
      qc.invalidateQueries();
      setOpen(false);
      setDone(true);
      confetti({ particleCount: 140, spread: 80, origin: { y: 0.6 } });
    },
    onError: (e: Error) => setErr(e.message),
  });

  if (isLoading) return <p className="text-muted-foreground">Loading…</p>;
  if (!event) return <p>Event not found. <Link to="/" className="text-primary underline">Back to events</Link></p>;

  const status = eventStatus(event, event.registered);
  const eventAnn = announcements?.filter((a) => a.event_id === id) ?? [];
  const left = event.capacity != null ? Math.max(0, event.capacity - event.registered) : null;

  return (
    <div className="space-y-6">
      <Link to="/" className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> All events
      </Link>

      <div className="overflow-hidden rounded-3xl border-2 border-ink bg-card shadow-pop-lg">
        {event.image_url && <img src={event.image_url} alt={event.title} className="h-64 w-full border-b-2 border-ink object-cover md:h-80" />}
        <div className="grid gap-8 p-6 md:grid-cols-[1.6fr_1fr] md:p-8">
          <div className="space-y-6">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border-2 border-ink bg-accent px-2.5 py-0.5 text-xs font-bold text-accent-foreground">{event.category}</span>
                <StatusBadge status={status} />
              </div>
              <h1 className="mt-3 text-4xl font-extrabold">{event.title}</h1>
              <p className="mt-1 font-medium text-muted-foreground">by {event.club}</p>
            </div>
            <p className="whitespace-pre-line leading-relaxed">{event.description}</p>
            {event.agenda && <Section title="Agenda">{event.agenda}</Section>}
            <Section title="Eligibility">{event.eligibility}</Section>
            {event.what_to_bring && <Section title="What to bring">{event.what_to_bring}</Section>}
            {eventAnn.length > 0 && (
              <div>
                <h3 className="mb-2 text-lg font-bold">Announcements</h3>
                <ul className="space-y-2">
                  {eventAnn.map((a) => (
                    <li key={a.id} className="rounded-xl border-2 border-ink bg-secondary p-3">
                      <p className="font-semibold">{a.title}</p>
                      <p className="text-sm text-muted-foreground">{a.message}</p>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <aside className="h-fit space-y-4 rounded-2xl border-2 border-ink bg-background p-5">
            <Info icon={Calendar} label="Date">{format(new Date(event.starts_at), "EEEE, d MMMM yyyy")}</Info>
            <Info icon={Clock} label="Time">{format(new Date(event.starts_at), "h:mm a")} – {format(new Date(event.ends_at), "h:mm a")}</Info>
            <Info icon={event.is_online ? Monitor : MapPin} label="Venue">{event.is_online ? "Online event" : event.venue}</Info>
            <Info icon={IndianRupee} label="Fee">{event.fee ? `₹${event.fee}` : "Free"}</Info>
            <Info icon={Star} label="Activity points">{event.activity_points}</Info>
            <Info icon={Users} label="Participants">
              {event.registered} registered{left != null ? ` · ${left} slots left` : ""}
            </Info>
            <Info icon={Clock} label="Register by">{format(new Date(event.registration_deadline), "d MMM, h:mm a")}</Info>
            {event.contact && <Info icon={Mail} label="Contact">{event.contact}</Info>}

            {mine ? (
              <div className="space-y-2">
                <p className="rounded-xl bg-success/15 p-3 text-center text-sm font-semibold text-success">You're registered 🎉</p>
                {event.is_online && event.meeting_url && <a href={event.meeting_url} target="_blank" rel="noreferrer" className="block text-center text-sm text-primary underline">Join meeting link</a>}
                <Button asChild variant="outline" className="w-full border-2 border-ink"><Link to="/my-events">View in My Events</Link></Button>
              </div>
            ) : (
              <Button
                disabled={!canRegister(status) || !studentId}
                onClick={() => { setErr(null); setOpen(true); }}
                className="h-12 w-full border-2 border-ink text-base font-bold shadow-pop"
              >
                {canRegister(status) ? "Register now" : status}
              </Button>
            )}
            <Button variant="ghost" className="w-full" onClick={() => downloadIcs(event)}>
              <CalendarPlus className="mr-2 h-4 w-4" /> Add to calendar
            </Button>
          </aside>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Register for {event.title}</DialogTitle>
            <DialogDescription>Your student details are attached automatically.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div><Label htmlFor="phone">Phone number *</Label><Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="98765 43210" /></div>
            <div><Label htmlFor="note">Anything the organisers should know?</Label><Textarea id="note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} /></div>
            {err && <p className="text-sm font-medium text-destructive">{err}</p>}
          </div>
          <DialogFooter>
            <Button onClick={() => register.mutate()} disabled={register.isPending}>{register.isPending ? "Registering…" : "Confirm registration"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={done} onOpenChange={setDone}>
        <DialogContent className="text-center">
          <DialogHeader>
            <DialogTitle className="text-2xl">You're in! 🎉</DialogTitle>
            <DialogDescription>Your spot at {event.title} is confirmed. Your QR pass is in My Events.</DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-center">
            <Button variant="outline" onClick={() => downloadIcs(event)}>Add to calendar</Button>
            <Button asChild><Link to="/my-events" onClick={() => toast.success("Registration saved")}>Go to My Events</Link></Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-1 text-lg font-bold">{title}</h3>
      <p className="whitespace-pre-line text-muted-foreground">{children}</p>
    </div>
  );
}

function Info({ icon: Icon, label, children }: { icon: React.ComponentType<{ className?: string }>; label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="text-sm font-medium">{children}</p>
      </div>
    </div>
  );
}
