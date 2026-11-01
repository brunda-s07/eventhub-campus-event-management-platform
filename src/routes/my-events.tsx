import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import { CalendarPlus, QrCode, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { eventsQuery, myRegistrationsQuery, studentsQuery } from "@/lib/api";
import { downloadIcs, eventStatus } from "@/lib/events";
import { useIdentity } from "@/lib/demo-identity";
import { StatusBadge } from "@/components/StatusBadge";
import { EventCalendar } from "@/components/EventCalendar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/my-events")({
  head: () => ({
    meta: [
      { title: "My Events — EventHub" },
      { name: "description", content: "Track your registered college events, QR passes and activity points." },
      { property: "og:title", content: "My Events — EventHub" },
      { property: "og:description", content: "Your registrations, passes and activity points." },
    ],
  }),
  component: MyEvents,
});

function MyEvents() {
  const { studentId } = useIdentity();
  const qc = useQueryClient();
  const { data: events } = useQuery(eventsQuery);
  const { data: regs, isLoading } = useQuery(myRegistrationsQuery(studentId));
  const { data: students } = useQuery(studentsQuery);
  const me = students?.find((s) => s.id === studentId);

  const cancel = useMutation({
    mutationFn: async (regId: string) => {
      const { error } = await supabase.from("registrations").update({ status: "cancelled", cancelled_at: new Date().toISOString() }).eq("id", regId);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries(); toast.success("Registration cancelled — your slot was released"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const rows = (regs ?? []).map((r) => ({ r, e: events?.find((e) => e.id === r.event_id) })).filter((x) => x.e);
  const now = new Date();
  const active = rows.filter((x) => x.r.status === "registered");
  const upcoming = active.filter((x) => new Date(x.e!.ends_at) >= now);
  const past = active.filter((x) => new Date(x.e!.ends_at) < now);
  const cancelled = rows.filter((x) => x.r.status === "cancelled");
  const earned = past.filter((x) => x.r.attended).reduce((s, x) => s + x.e!.activity_points, 0);
  const pending = upcoming.reduce((s, x) => s + x.e!.activity_points, 0);

  const list = (items: typeof rows, allowCancel: boolean) =>
    items.length === 0 ? (
      <div className="rounded-2xl border-2 border-dashed border-ink p-10 text-center text-muted-foreground">
        Nothing here yet. <Link to="/" className="font-semibold text-primary underline">Browse events</Link>
      </div>
    ) : (
      <div className="space-y-3">
        {items.map(({ r, e }) => (
          <div key={r.id} className="flex flex-col gap-4 rounded-2xl border-2 border-ink bg-card p-4 shadow-pop sm:flex-row sm:items-center">
            {e!.image_url && <img src={e!.image_url} alt="" className="h-20 w-full rounded-lg border-2 border-ink object-cover sm:w-32" />}
            <div className="flex-1">
              <Link to="/events/$id" params={{ id: e!.id }} className="text-lg font-bold hover:underline">{e!.title}</Link>
              <p className="text-sm text-muted-foreground">
                {format(new Date(e!.starts_at), "EEE d MMM · h:mm a")} · {e!.is_online ? "Online" : e!.venue}
              </p>
              <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs">
                <StatusBadge status={eventStatus(e!, e!.registered)} />
                <span className="text-muted-foreground">Registered {format(new Date(r.created_at), "d MMM")}</span>
                {r.cancelled_at && <span className="text-muted-foreground">· Cancelled {format(new Date(r.cancelled_at), "d MMM")}</span>}
                {r.attended && <span className="font-semibold text-success">· Attended</span>}
              </div>
            </div>
            {r.status === "registered" && (
              <div className="flex flex-wrap gap-2">
                <Dialog>
                  <DialogTrigger asChild><Button size="sm" variant="outline" className="border-2 border-ink"><QrCode className="mr-1 h-4 w-4" />Pass</Button></DialogTrigger>
                  <DialogContent className="text-center">
                    <DialogHeader><DialogTitle>{e!.title}</DialogTitle></DialogHeader>
                    <div className="mx-auto rounded-xl border-2 border-ink bg-card p-4"><QRCodeSVG value={`eventhub:${r.id}`} size={200} /></div>
                    <p className="font-semibold">{me?.name} · {me?.roll_no}</p>
                    <p className="text-xs text-muted-foreground">Pass ID {r.id.slice(0, 8).toUpperCase()}</p>
                  </DialogContent>
                </Dialog>
                <Button size="sm" variant="ghost" onClick={() => downloadIcs(e!)}><CalendarPlus className="h-4 w-4" /></Button>
                {allowCancel && new Date(e!.starts_at) > now && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild><Button size="sm" variant="ghost" className="text-destructive">Cancel</Button></AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Cancel your registration?</AlertDialogTitle>
                        <AlertDialogDescription>Your slot for {e!.title} will be released to other students.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Keep it</AlertDialogCancel>
                        <AlertDialogAction onClick={() => cancel.mutate(r.id)}>Yes, cancel</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    );

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-muted-foreground">{me?.department} · Year {me?.year}</p>
          <h1 className="text-4xl font-extrabold">Hi {me?.name.split(" ")[0] ?? "there"} 👋</h1>
        </div>
        <div className="flex gap-3">
          <Stat label="Upcoming" value={upcoming.length} />
          <Stat label="Points earned" value={earned} icon />
          <Stat label="Points pending" value={pending} />
        </div>
      </div>
      {isLoading ? <p className="text-muted-foreground">Loading…</p> : (
        <Tabs defaultValue="upcoming">
          <TabsList className="border-2 border-ink bg-card">
            <TabsTrigger value="upcoming">Upcoming ({upcoming.length})</TabsTrigger>
            <TabsTrigger value="past">Completed ({past.length})</TabsTrigger>
            <TabsTrigger value="cancelled">Cancelled ({cancelled.length})</TabsTrigger>
            <TabsTrigger value="calendar">Calendar</TabsTrigger>
          </TabsList>
          <TabsContent value="upcoming" className="mt-4">{list(upcoming, true)}</TabsContent>
          <TabsContent value="past" className="mt-4">{list(past, false)}</TabsContent>
          <TabsContent value="cancelled" className="mt-4">{list(cancelled, false)}</TabsContent>
          <TabsContent value="calendar" className="mt-4"><EventCalendar events={active.map((x) => x.e!)} /></TabsContent>
        </Tabs>
      )}
    </div>
  );
}

function Stat({ label, value, icon }: { label: string; value: number; icon?: boolean }) {
  return (
    <div className="rounded-2xl border-2 border-ink bg-card px-4 py-2 shadow-pop">
      <p className="flex items-center gap-1 font-display text-2xl font-extrabold">{icon && <Star className="h-5 w-5 text-primary" />}{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
