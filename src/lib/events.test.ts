import { describe, expect, it } from "vitest";
import { eventStatus } from "./events";

const now = new Date("2026-11-01T10:00:00Z");
const base = {
  is_cancelled: false,
  starts_at: "2026-11-05T10:00:00Z",
  ends_at: "2026-11-05T12:00:00Z",
  registration_deadline: "2026-11-04T10:00:00Z",
  capacity: 10 as number | null,
};

describe("eventStatus", () => {
  it("is Full when registrations reach capacity", () => expect(eventStatus(base, 10, now)).toBe("Full"));
  it("is Registration Closed after the deadline", () =>
    expect(eventStatus(base, 0, new Date("2026-11-04T11:00:00Z"))).toBe("Registration Closed"));
  it("is Cancelled when organiser cancels", () => expect(eventStatus({ ...base, is_cancelled: true }, 0, now)).toBe("Cancelled"));
  it("never shows Full for unlimited events", () => expect(eventStatus({ ...base, capacity: null }, 999, now)).toBe("Registration Open"));
});
