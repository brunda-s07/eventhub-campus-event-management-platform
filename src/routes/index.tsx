import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Megaphone, Search } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { announcementsQuery, eventsQuery, myRegistrationsQuery } from "@/lib/api";
import { CATEGORIES, eventStatus, canRegister } from "@/lib/events";
import { useIdentity } from "@/lib/demo-identity";
import { EventCard } from "@/components/EventCard";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Discover Campus Events — EventHub" },
      { name: "description", content: "Browse technical, cultural, sports and workshop events happening on campus and register in one click." },
      { property: "og:title", content: "Discover Campus Events — EventHub" },
      { property: "og:description", content: "Browse and register for college events in one place." },
    ],
  }),
  component: Discover,
});

function Discover() {
  const { studentId } = useIdentity();
  const { data: events, isLoading } = useQuery(eventsQuery);
  const { data: regs } = useQuery(myRegistrationsQuery(studentId));
  const { data: announcements } = useQuery(announcementsQuery);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>("All");
  const [price, setPrice] = useState("any");
  const [mode, setMode] = useState("any");
  const [onlyOpen, setOnlyOpen] = useState(false);
  const [sort, setSort] = useState("date");

  const myIds = new Set(regs?.filter((r) => r.status === "registered").map((r) => r.event_id));

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    let list = (events ?? []).filter((e) => {
      if (cat !== "All" && e.category !== cat) return false;
      if (price === "free" && e.fee > 0) return false;
      if (price === "paid" && e.fee === 0) return false;
      if (mode === "online" && !e.is_online) return false;
      if (mode === "offline" && e.is_online) return false;
      if (onlyOpen && !canRegister(eventStatus(e, e.registered))) return false;
      if (term && ![e.title, e.description, e.club, e.venue].some((f) => f.toLowerCase().includes(term))) return false;
      return true;
    });
    list = [...list].sort((a, b) =>
      sort === "popular" ? b.registered - a.registered
      : sort === "points" ? b.activity_points - a.activity_points
      : sort === "recent" ? +new Date(b.created_at) - +new Date(a.created_at)
      : +new Date(a.starts_at) - +new Date(b.starts_at),
    );
    return list;
  }, [events, q, cat, price, mode, onlyOpen, sort]);

  const featured = events?.find((e) => e.featured && !e.is_cancelled && new Date(e.ends_at) > new Date());

  return (
    <div className="space-y-10">
      <section className="grid gap-6 md:grid-cols-[1.4fr_1fr]">
        <div className="rounded-3xl border-2 border-ink bg-primary p-8 text-primary-foreground shadow-pop-lg">
          <p className="text-sm font-semibold uppercase tracking-widest opacity-80">Happening around campus</p>
          <h1 className="mt-3 text-4xl font-extrabold leading-[1.05] md:text-5xl">
            Find your next hackathon, fest or workshop.
          </h1>
          <p className="mt-4 max-w-md opacity-90">
            {events?.length ?? "…"} events from every club, one place to register and track them.
          </p>
          {featured && (
            <a href={`/events/${featured.id}`} className="mt-6 inline-flex items-center gap-2 rounded-full border-2 border-ink bg-accent px-4 py-2 text-sm font-bold text-accent-foreground shadow-pop">
              Featured: {featured.title} →
            </a>
          )}
        </div>
        <div className="rounded-3xl border-2 border-ink bg-card p-6 shadow-pop">
          <h2 className="flex items-center gap-2 text-lg font-bold"><Megaphone className="h-5 w-5 text-primary" /> Announcements</h2>
          <ul className="mt-4 space-y-3">
            {announcements?.slice(0, 4).map((a) => (
              <li key={a.id} className="border-l-4 border-primary pl-3">
                <p className="text-sm font-semibold">{a.title}</p>
                <p className="text-sm text-muted-foreground">{a.message}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}</p>
              </li>
            ))}
            {announcements?.length === 0 && <p className="text-sm text-muted-foreground">No announcements yet.</p>}
          </ul>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-3xl font-extrabold">All events</h2>
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search events, clubs, venues…" className="h-10 border-2 border-ink bg-card pl-9" />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {["All", ...CATEGORIES].map((c) => (
            <button
              key={c}
              onClick={() => setCat(c)}
              className={`rounded-full border-2 border-ink px-3.5 py-1 text-sm font-semibold transition-colors ${cat === c ? "bg-ink text-ink-foreground" : "bg-card hover:bg-secondary"}`}
            >
              {c}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2 text-sm">
          <FilterSelect value={price} onChange={setPrice} options={[["any", "Any price"], ["free", "Free"], ["paid", "Paid"]]} />
          <FilterSelect value={mode} onChange={setMode} options={[["any", "Online & offline"], ["online", "Online"], ["offline", "Offline"]]} />
          <FilterSelect value={sort} onChange={setSort} options={[["date", "Upcoming date"], ["recent", "Recently added"], ["popular", "Most popular"], ["points", "Highest points"]]} />
          <label className="flex cursor-pointer items-center gap-2 rounded-full border-2 border-ink bg-card px-3 py-1.5 font-medium">
            <input type="checkbox" checked={onlyOpen} onChange={(e) => setOnlyOpen(e.target.checked)} className="accent-primary" />
            Open for registration
          </label>
        </div>

        {isLoading ? (
          <p className="text-muted-foreground">Loading events…</p>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-ink p-10 text-center text-muted-foreground">No events match your filters.</div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((e) => <EventCard key={e.id} event={e} registered={myIds.has(e.id)} />)}
          </div>
        )}
      </section>
    </div>
  );
}

function FilterSelect({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: [string, string][] }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-9 w-auto gap-2 rounded-full border-2 border-ink bg-card"><SelectValue /></SelectTrigger>
      <SelectContent>
        {options.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}
