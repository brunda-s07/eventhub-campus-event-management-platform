import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { Sparkles } from "lucide-react";
import { studentsQuery } from "@/lib/api";
import { useIdentity } from "@/lib/demo-identity";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function SiteHeader() {
  const { role, setRole, studentId, setStudentId } = useIdentity();
  const { data: students } = useQuery(studentsQuery);
  const navigate = useNavigate();
  const pathname = useLocation({ select: (l) => l.pathname });

  useEffect(() => {
    if (pathname.startsWith("/organizer") && role !== "organizer") setRole("organizer");
    if ((pathname === "/" || pathname.startsWith("/my-events")) && role !== "student") setRole("student");
  }, [pathname, role, setRole]);

  useEffect(() => {
    if (students?.length && (!studentId || !students.some((s) => s.id === studentId))) {
      setStudentId(students[0]!.id);
    }
  }, [students, studentId, setStudentId]);

  const linkCls =
    "rounded-full px-3 py-1.5 text-sm font-medium transition-colors";
  const activeCls = "bg-ink text-ink-foreground";
  const inactive = { className: "text-muted-foreground hover:text-foreground" };

  return (
    <header className="sticky top-0 z-40 border-b-2 border-ink bg-background/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-3">
        <Link to="/" className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-lg border-2 border-ink bg-primary text-primary-foreground shadow-pop">
            <Sparkles className="h-4 w-4" />
          </span>
          <span className="font-display text-xl font-extrabold">EventHub</span>
        </Link>

        <nav className="flex items-center gap-1">
          {role === "student" ? (
            <>
              <Link to="/" className={linkCls} activeProps={{ className: activeCls }} inactiveProps={inactive} activeOptions={{ exact: true }}>
                Discover
              </Link>
              <Link to="/my-events" className={linkCls} activeProps={{ className: activeCls }} inactiveProps={inactive}>
                My Events
              </Link>
            </>
          ) : (
            <Link to="/organizer" className={linkCls} activeProps={{ className: activeCls }} inactiveProps={inactive}>
              Dashboard
            </Link>
          )}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <div className="flex rounded-full border-2 border-ink bg-card p-0.5 text-xs font-semibold">
            {(["student", "organizer"] as const).map((r) => (
              <button
                key={r}
                onClick={() => {
                  setRole(r);
                  navigate({ to: r === "student" ? "/" : "/organizer" });
                }}
                className={`rounded-full px-3 py-1 capitalize transition-colors ${
                  role === r ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
          {role === "student" && students && studentId && (
            <Select value={studentId} onValueChange={setStudentId}>
              <SelectTrigger className="h-9 w-[160px] border-2 border-ink bg-card text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {students.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>
      <div className="bg-ink py-1 text-center text-[11px] text-ink-foreground">
        Demo access mode — pick a role and sample student above. No real sign-in.
      </div>
    </header>
  );
}
