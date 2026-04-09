type ClientReportBooking = {
  guestName: string;
  guestEmail: string;
  eventType: {
    title: string;
  };
};

export type ClientReportEntry = {
  name: string;
  email: string;
  totalBookings: number;
  eventTypes: Array<{
    title: string;
    count: number;
  }>;
};

export function buildClientReport(
  bookings: ClientReportBooking[],
): ClientReportEntry[] {
  const aggregated = new Map<
    string,
    {
      name: string;
      email: string;
      totalBookings: number;
      eventTypeCounts: Map<string, number>;
    }
  >();

  for (const booking of bookings) {
    const key = booking.guestEmail.trim().toLowerCase();
    const existing = aggregated.get(key);

    if (existing) {
      existing.totalBookings += 1;
      existing.name = existing.name || booking.guestName;
      existing.eventTypeCounts.set(
        booking.eventType.title,
        (existing.eventTypeCounts.get(booking.eventType.title) ?? 0) + 1,
      );
      continue;
    }

    aggregated.set(key, {
      name: booking.guestName,
      email: booking.guestEmail,
      totalBookings: 1,
      eventTypeCounts: new Map([[booking.eventType.title, 1]]),
    });
  }

  return Array.from(aggregated.values())
    .map((entry) => ({
      name: entry.name,
      email: entry.email,
      totalBookings: entry.totalBookings,
      eventTypes: Array.from(entry.eventTypeCounts.entries())
        .map(([title, count]) => ({ title, count }))
        .sort((a, b) => b.count - a.count || a.title.localeCompare(b.title)),
    }))
    .sort(
      (a, b) =>
        b.totalBookings - a.totalBookings || a.name.localeCompare(b.name),
    );
}

export function formatClientEventSummary(entry: ClientReportEntry) {
  return entry.eventTypes
    .map((eventType) => `${eventType.title} - ${eventType.count}`)
    .join(", ");
}
