import { statusTone, type EventStatus } from "@/lib/events";

const tones = {
  open: "bg-success/15 text-success border-success/40",
  warn: "bg-warning/20 text-foreground border-warning",
  live: "bg-primary/15 text-primary border-primary/40",
  closed: "bg-muted text-muted-foreground border-border",
};

export function StatusBadge({ status }: { status: EventStatus }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${tones[statusTone(status)]}`}>
      {status}
    </span>
  );
}
