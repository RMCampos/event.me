import { describe, expect, it } from "vitest";
import {
  buildClientReport,
  formatClientEventSummary,
} from "@/lib/client-report";

describe("buildClientReport", () => {
  it("groups bookings by guest email and aggregates counts by event type", () => {
    const report = buildClientReport([
      {
        guestName: "Edgar",
        guestEmail: "edgar@gmail.com",
        eventType: { title: "1:1" },
      },
      {
        guestName: "Edgar Berlinck",
        guestEmail: "EDGAR@gmail.com",
        eventType: { title: "Mentoria" },
      },
      {
        guestName: "Edgar",
        guestEmail: "edgar@gmail.com",
        eventType: { title: "Mentoria" },
      },
      {
        guestName: "Ana",
        guestEmail: "ana@gmail.com",
        eventType: { title: "1:1" },
      },
    ]);

    expect(report).toHaveLength(2);
    expect(report[0]).toEqual({
      name: "Edgar",
      email: "edgar@gmail.com",
      totalBookings: 3,
      eventTypes: [
        { title: "Mentoria", count: 2 },
        { title: "1:1", count: 1 },
      ],
    });
    expect(report[1]).toEqual({
      name: "Ana",
      email: "ana@gmail.com",
      totalBookings: 1,
      eventTypes: [{ title: "1:1", count: 1 }],
    });
  });

  it("formats the event summary for table and csv output", () => {
    const [entry] = buildClientReport([
      {
        guestName: "Edgar",
        guestEmail: "edgar@gmail.com",
        eventType: { title: "1:1" },
      },
      {
        guestName: "Edgar",
        guestEmail: "edgar@gmail.com",
        eventType: { title: "Mentoria" },
      },
      {
        guestName: "Edgar",
        guestEmail: "edgar@gmail.com",
        eventType: { title: "Mentoria" },
      },
    ]);

    expect(formatClientEventSummary(entry)).toBe("Mentoria - 2, 1:1 - 1");
  });
});
