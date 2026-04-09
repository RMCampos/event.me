import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma.server", () => ({
  prisma: {
    eventType: {
      findUnique: vi.fn(),
    },
    noShowPolicyException: {
      findUnique: vi.fn(),
    },
    booking: {
      findFirst: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("@/lib/google-calendar", () => ({
  isGoogleCalendarConnected: vi.fn().mockResolvedValue(false),
  createGoogleCalendarEvent: vi.fn(),
}));

vi.mock("@/lib/resend", () => ({
  sendBookingCreatedEmail: vi.fn().mockResolvedValue(undefined),
}));

import { NextRequest } from "next/server";
import { POST } from "@/app/api/bookings/route";
import { prisma } from "@/lib/prisma.server";

describe("Booking Creation API", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    (
      prisma.noShowPolicyException.findUnique as ReturnType<typeof vi.fn>
    ).mockResolvedValue(null);

    (prisma.eventType.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(
      {
        id: "event-type-1",
        userId: "host-1",
        title: "Consultation",
        duration: 30,
        minimumNoticeHours: 1,
        maximumNoticeDays: 30,
        maxBookingsPerWeek: null,
        user: { timezone: "UTC" },
      } as never,
    );
  });

  it("blocks booking when guest email has previous no_show", async () => {
    (
      prisma.booking.findFirst as ReturnType<typeof vi.fn>
    ).mockResolvedValueOnce({
      id: "ns-1",
    } as never);

    const now = new Date();
    const start = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    const end = new Date(start.getTime() + 30 * 60 * 1000);

    const request = new NextRequest(
      new Request("http://localhost:3000/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventTypeId: "event-type-1",
          guestName: "Guest Test",
          guestEmail: "guest@example.com",
          startTime: start.toISOString(),
          endTime: end.toISOString(),
        }),
      }),
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe(
      "Este endereço foi bloqueado pela política de No Show.",
    );
    expect(prisma.booking.create).not.toHaveBeenCalled();
    expect(prisma.booking.findFirst).toHaveBeenCalledWith({
      where: {
        userId: "host-1",
        status: "no_show",
        guestEmail: {
          equals: "guest@example.com",
          mode: "insensitive",
        },
      },
      select: { id: true },
    });
  });

  it("bypasses no-show block when email is manually unblocked", async () => {
    (
      prisma.noShowPolicyException.findUnique as ReturnType<typeof vi.fn>
    ).mockResolvedValue({ id: "exception-1" } as never);
    (
      prisma.booking.findFirst as ReturnType<typeof vi.fn>
    ).mockResolvedValueOnce({
      id: "conflict-1",
    } as never);

    const now = new Date();
    const start = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    const end = new Date(start.getTime() + 30 * 60 * 1000);

    const request = new NextRequest(
      new Request("http://localhost:3000/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventTypeId: "event-type-1",
          guestName: "Guest Test",
          guestEmail: "guest@example.com",
          startTime: start.toISOString(),
          endTime: end.toISOString(),
        }),
      }),
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(409);
    expect(data.error).toBe("This time slot is no longer available");
  });
});
