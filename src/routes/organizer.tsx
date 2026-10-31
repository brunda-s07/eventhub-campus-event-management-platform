import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { z } from "zod";
import { Download, Megaphone, Pencil, Plus, Trash2, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { TablesInsert } from "@/integrations/supabase/types";
import { eventsQuery, participantsQuery } from "@/lib/api";
import { CATEGORIES, eventStatus, type EventWithCount } from "@/lib/events";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const Route = createFileRoute("/organizer")({
  head: () => ({
    meta: [
      { title: "Organizer Dashboard — EventHub" },
      { name: "description", content: "Create, edit and manage college events and view registered participants." },
      { property: "og:title", content: "Organizer Dashboard — EventHub" },
      { property: "og:description", content: "Manage events and participants." },
    ],
  }),
  component: Organizer,
});

const toLocal = (iso: string) => format(new Date(iso), "yyyy-MM-dd'T'HH:mm");

const eventSchema = z
  .object({
    title: z.string().trim().min(3, "Title is too short").max(120),
    description: z.string().trim().min(10, "Add a longer description").max(3000),
    category: z.string().min(1),
    club: z.string().trim().min(2, "Club is required").max(80),
    contact: z.string().trim().max(120),
    image_url: z.string().trim().url("Poster must be a URL").or(z.literal("")),
    starts_at: z.string().min(1, "Start is required"),
    ends_at: z.string().min(1, "End is required"),
    registration_deadline: z.string().min(1, "Deadline is required"),
    is_online: z.boolean(),
    venue: z.string().trim().max(200),
    meeting_url: z.string().trim().url("Meeting link must be a URL").or(z.literal("")),
    fee: z.coerce.number().int().min(0),
    capacity: z.string(),
    activity_points: z.coerce.number().int().min(0).max(100),
    eligibility: z.string().trim().max(300),
    what_to_bring: z.string().trim().max(500),
    agenda: z.string().trim().max(1500),
    featured: z.boolean(),
    is_cancelled: z.boolean(),
  })
  .refine((v) => new Date(v.ends_at) > new Date(v.starts_at), { message: "End must be after start", path: ["ends_at"] })
  .refine((v) => new Date(v.registration_deadline) <= new Date(v.starts_at), { message: "Deadline must be before the event starts", path: ["registration_deadline"] })
  .refine((v) => v.is_online || v.venue.length > 0, { message: "Venue is required for offline events", path: ["venue"] })
  .refine((v) => v.capacity === "" || (Number.isInteger(+v.capacity) && +v.capacity > 0), { message: "Capacity must be a positive number or empty", path: ["capacity"] });

type FormState = z.input<typeof eventSchema>;

const blank = (): FormState => ({
  title: "", description: "", category: "Technical", club: "", contact: "", image_url: "",
  starts_at: "", ends_at: "", registration_deadline: "", is_online: false, venue: "", meeting_url: "",
  fee: 0, capacity: "", activity_points: 5, eligibility: "Open to all students", what_to_bring: "", agenda: "",
  featured: false, is_cancelled: false,
});

function Organizer() {
  const qc = useQueryClient();
  const { data: events, isLoading } = useQuery(eventsQuery);
  const [editing, setEditing] = useState<{ id: string | null; form: FormState } | null>(null);
  const [viewing, setViewing] = useState<EventWithCount | null>(null);
  const [announceFor, setAnnounceFor] = useState<EventWithCount | null>(null);

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("events").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries(); toast.success("Event deleted"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const all = events ?? [];
  const now = new Date();
  const totalRegs = all.reduce((s, e) => s + e.registered, 0);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-muted-foreground">Organizer portal</p>
          <h1 className="text-4xl font-extrabold">Your events</h1>
        </div>
        <Button onClick={() => setEditing({ id: null, form: blank() })} className="h-11 border-2 border-ink font-bold shadow-pop">
          <Plus className="mr-1 h-4 w-4" /> Create event
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Kpi label="Total events" value={all.length} />
        <Kpi label="Upcoming" value={all.filter((e) => new Date(e.starts_at) > now && !e.is_cancelled).length} />
        <Kpi label="Registrations" value={totalRegs} />
        <Kpi label="Cancelled events" value={all.filter((e) => e.is_cancelled).length} />
      </div>

      <div className="overflow-hidden rounded-2xl border-2 border-ink bg-card shadow-pop">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Event</TableHead><TableHead>Date</TableHead><TableHead>Status</TableHead>
              <TableHead className="text-right">Participants</TableHead><TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <TableRow><TableCell colSpan={5}>Loading…</TableCell></TableRow>}
            {all.map((e) => (
              <TableRow key={e.id}>
                <TableCell><p className="font-semibold">{e.title}</p><p className="text-xs text-muted-foreground">{e.club} · {e.category}</p></TableCell>
                <TableCell className="whitespace-nowrap text-sm">{format(new Date(e.starts_at), "d MMM yyyy, h:mm a")}</TableCell>
                <TableCell><StatusBadge status={eventStatus(e, e.registered)} /></TableCell>
                <TableCell className="text-right">
                  <button onClick={() => setViewing(e)} className="inline-flex items-center gap-1 font-semibold text-primary hover:underline">
                    <Users className="h-4 w-4" /> {e.registered}{e.capacity ? ` / ${e.capacity}` : ""}
                  </button>
                </TableCell>
                <TableCell className="text-right whitespace-nowrap">
                  <Button size="icon" variant="ghost" title="Post announcement" onClick={() => setAnnounceFor(e)}><Megaphone className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" title="Edit" onClick={() => setEditing({ id: e.id, form: fromEvent(e) })}><Pencil className="h-4 w-4" /></Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild><Button size="icon" variant="ghost" title="Delete" className="text-destructive"><Trash2 className="h-4 w-4" /></Button></AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete “{e.title}”?</AlertDialogTitle>
                        <AlertDialogDescription>This removes the event and all {e.registered} registrations. This can't be undone.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter><AlertDialogCancel>Keep</AlertDialogCancel><AlertDialogAction onClick={() => del.mutate(e.id)}>Delete</AlertDialogAction></AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {editing && <EventForm initial={editing} onClose={() => setEditing(null)} />}
      {viewing && <Participants event={viewing} onClose={() => setViewing(null)} />}
      {announceFor && <Announce event={announceFor} onClose={() => setAnnounceFor(null)} />}
    </div>
  );
}

function fromEvent(e: EventWithCount): FormState {
  return {
    title: e.title, description: e.description, category: e.category, club: e.club, contact: e.contact,
    image_url: e.image_url ?? "", starts_at: toLocal(e.starts_at), ends_at: toLocal(e.ends_at),
    registration_deadline: toLocal(e.registration_deadline), is_online: e.is_online, venue: e.venue,
    meeting_url: e.meeting_url ?? "", fee: e.fee, capacity: e.capacity?.toString() ?? "",
    activity_points: e.activity_points, eligibility: e.eligibility, what_to_bring: e.what_to_bring,
    agenda: e.agenda, featured: e.featured, is_cancelled: e.is_cancelled,
  };
}

function Kpi({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border-2 border-ink bg-card p-4 shadow-pop">
      <p className="font-display text-3xl font-extrabold">{value}</p>
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}

function EventForm({ initial, onClose }: { initial: { id: string | null; form: FormState }; onClose: () => void }) {
  const qc = useQueryClient();
  const [f, setF] = useState<FormState>(initial.form);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setF((p) => ({ ...p, [k]: v }));

  const save = useMutation({
    mutationFn: async () => {
      const parsed = eventSchema.safeParse(f);
      if (!parsed.success) {
        const errs: Record<string, string> = {};
        parsed.error.issues.forEach((i) => { errs[String(i.path[0])] ??= i.message; });
        setErrors(errs);
        throw new Error("Please fix the highlighted fields");
      }
      setErrors({});
      const v = parsed.data;
      const row: TablesInsert<"events"> = {
        ...v,
        image_url: v.image_url || null,
        meeting_url: v.meeting_url || null,
        venue: v.is_online ? v.venue || "Online" : v.venue,
        capacity: v.capacity === "" ? null : Number(v.capacity),
        starts_at: new Date(v.starts_at).toISOString(),
        ends_at: new Date(v.ends_at).toISOString(),
        registration_deadline: new Date(v.registration_deadline).toISOString(),
      };
      const { error } = initial.id
        ? await supabase.from("events").update(row).eq("id", initial.id)
        : await supabase.from("events").insert(row);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries(); toast.success(initial.id ? "Event updated" : "Event published"); onClose(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const field = (k: keyof FormState, label: string, props: React.ComponentProps<typeof Input> = {}) => (
    <div>
      <Label htmlFor={k}>{label}</Label>
      <Input id={k} value={String(f[k] ?? "")} onChange={(e) => set(k, e.target.value as never)} {...props} />
      {errors[k] && <p className="mt-1 text-xs text-destructive">{errors[k]}</p>}
    </div>
  );

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader><DialogTitle>{initial.id ? "Edit event" : "Create event"}</DialogTitle></DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">{field("title", "Event name *")}</div>
          <div className="sm:col-span-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea id="description" rows={4} value={f.description} onChange={(e) => set("description", e.target.value)} />
            {errors.description && <p className="mt-1 text-xs text-destructive">{errors.description}</p>}
          </div>
          <div>
            <Label>Category *</Label>
            <Select value={f.category} onValueChange={(v) => set("category", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          {field("club", "Organising club *")}
          {field("contact", "Organiser contact")}
          {field("image_url", "Poster image URL", { placeholder: "https://…" })}
          {field("starts_at", "Starts *", { type: "datetime-local" })}
          {field("ends_at", "Ends *", { type: "datetime-local" })}
          {field("registration_deadline", "Registration deadline *", { type: "datetime-local" })}
          {field("capacity", "Max capacity (blank = unlimited)", { type: "number", min: 1 })}
          <div className="flex items-center gap-3 sm:col-span-2">
            <Switch id="online" checked={f.is_online} onCheckedChange={(v) => set("is_online", v)} />
            <Label htmlFor="online">Online event</Label>
          </div>
          {f.is_online ? field("meeting_url", "Meeting link") : field("venue", "Venue (building, room) *")}
          {field("fee", "Fee in ₹ (0 = free)", { type: "number", min: 0 })}
          {field("activity_points", "Activity points", { type: "number", min: 0 })}
          {field("eligibility", "Eligibility")}
          {field("what_to_bring", "What to bring")}
          <div className="sm:col-span-2">
            <Label htmlFor="agenda">Agenda</Label>
            <Textarea id="agenda" rows={3} value={f.agenda} onChange={(e) => set("agenda", e.target.value)} />
          </div>
          <div className="flex items-center gap-3"><Switch id="featured" checked={f.featured} onCheckedChange={(v) => set("featured", v)} /><Label htmlFor="featured">Feature on home</Label></div>
          {initial.id && <div className="flex items-center gap-3"><Switch id="cancelled" checked={f.is_cancelled} onCheckedChange={(v) => set("is_cancelled", v)} /><Label htmlFor="cancelled">Mark as cancelled</Label></div>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>{save.isPending ? "Saving…" : initial.id ? "Save changes" : "Publish event"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Participants({ event, onClose }: { event: EventWithCount; onClose: () => void }) {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery(participantsQuery(event.id));
  const toggle = useMutation({
    mutationFn: async ({ id, attended }: { id: string; attended: boolean }) => {
      const { error } = await supabase.from("registrations").update({ attended }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["participants", event.id] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const exportCsv = () => {
    const rows = [["Name", "Roll no", "Email", "Department", "Year", "Phone", "Status", "Attended", "Registered at", "Note"]];
    data?.forEach((r) => rows.push([r.students?.name ?? "", r.students?.roll_no ?? "", r.students?.email ?? "", r.students?.department ?? "", String(r.students?.year ?? ""), r.phone, r.status, r.attended ? "yes" : "no", r.created_at, r.note]));
    const csv = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = `${event.title.replace(/\W+/g, "-")}-participants.csv`;
    a.click();
  };

  const active = data?.filter((r) => r.status === "registered").length ?? 0;

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader><DialogTitle>{event.title} — participants ({active})</DialogTitle></DialogHeader>
        <div className="flex justify-end"><Button size="sm" variant="outline" onClick={exportCsv} disabled={!data?.length}><Download className="mr-1 h-4 w-4" />Export CSV</Button></div>
        {isLoading ? <p>Loading…</p> : !data?.length ? <p className="text-muted-foreground">No registrations yet.</p> : (
          <Table>
            <TableHeader><TableRow><TableHead>Student</TableHead><TableHead>Dept</TableHead><TableHead>Phone</TableHead><TableHead>Registered</TableHead><TableHead>Status</TableHead><TableHead>Attended</TableHead></TableRow></TableHeader>
            <TableBody>
              {data.map((r) => (
                <TableRow key={r.id} className={r.status === "cancelled" ? "opacity-50" : ""}>
                  <TableCell><p className="font-medium">{r.students?.name}</p><p className="text-xs text-muted-foreground">{r.students?.roll_no} · {r.students?.email}</p>{r.note && <p className="text-xs italic text-muted-foreground">“{r.note}”</p>}</TableCell>
                  <TableCell className="text-sm">{r.students?.department} · Y{r.students?.year}</TableCell>
                  <TableCell className="text-sm">{r.phone || "—"}</TableCell>
                  <TableCell className="text-sm whitespace-nowrap">{format(new Date(r.created_at), "d MMM, h:mm a")}</TableCell>
                  <TableCell className="text-sm capitalize">{r.status}</TableCell>
                  <TableCell>{r.status === "registered" && <Checkbox checked={r.attended} onCheckedChange={(v) => toggle.mutate({ id: r.id, attended: !!v })} />}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Announce({ event, onClose }: { event: EventWithCount; onClose: () => void }) {
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const post = useMutation({
    mutationFn: async () => {
      const t = title.trim(), m = message.trim();
      if (t.length < 3 || m.length < 5) throw new Error("Add a title and a message");
      const { error } = await supabase.from("announcements").insert({ event_id: event.id, title: t.slice(0, 120), message: m.slice(0, 1000) });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["announcements"] }); toast.success("Announcement posted"); onClose(); },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Announcement for {event.title}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label htmlFor="at">Title</Label><Input id="at" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} /></div>
          <div><Label htmlFor="am">Message</Label><Textarea id="am" value={message} onChange={(e) => setMessage(e.target.value)} maxLength={1000} /></div>
        </div>
        <DialogFooter><Button onClick={() => post.mutate()} disabled={post.isPending}>Post</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
