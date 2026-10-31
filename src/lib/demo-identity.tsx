import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

// Demo access mode: no real authentication. The chosen role + student identity
// are kept in the browser only; all event data lives in the database.
type Role = "student" | "organizer";
type Ctx = {
  role: Role;
  setRole: (r: Role) => void;
  studentId: string | null;
  setStudentId: (id: string) => void;
};

const IdentityContext = createContext<Ctx | null>(null);

export function IdentityProvider({ children }: { children: ReactNode }) {
  const [role, setRoleState] = useState<Role>("student");
  const [studentId, setStudentIdState] = useState<string | null>(null);

  useEffect(() => {
    const r = localStorage.getItem("demo-role");
    if (r === "student" || r === "organizer") setRoleState(r);
    setStudentIdState(localStorage.getItem("demo-student"));
  }, []);

  const setRole = (r: Role) => {
    setRoleState(r);
    localStorage.setItem("demo-role", r);
  };
  const setStudentId = (id: string) => {
    setStudentIdState(id);
    localStorage.setItem("demo-student", id);
  };

  return (
    <IdentityContext.Provider value={{ role, setRole, studentId, setStudentId }}>
      {children}
    </IdentityContext.Provider>
  );
}

export function useIdentity() {
  const ctx = useContext(IdentityContext);
  if (!ctx) throw new Error("useIdentity must be used inside IdentityProvider");
  return ctx;
}
