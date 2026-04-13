import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  buildClientReport,
  formatClientEventSummary,
} from "@/lib/client-report";
import { getClientReportDateRange } from "@/lib/client-report-filters";
import { prisma } from "@/lib/prisma.server";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const dateRange = getClientReportDateRange(
      searchParams.get("startDate"),
      searchParams.get("endDate"),
    );

    const startTimeFilter =
      dateRange.start || dateRange.endExclusive
        ? {
            ...(dateRange.start ? { gte: dateRange.start } : {}),
            ...(dateRange.endExclusive ? { lt: dateRange.endExclusive } : {}),
          }
        : undefined;

    const bookings = await prisma.booking.findMany({
      where: {
        userId: user.id,
        status: {
          not: "cancelled",
        },
        ...(startTimeFilter ? { startTime: startTimeFilter } : {}),
      },
      select: {
        guestName: true,
        guestEmail: true,
        eventType: {
          select: { title: true },
        },
      },
    });

    const report = buildClientReport(bookings);
    const format = searchParams.get("format");

    if (format === "csv") {
      const rows = [["Name", "Email", "Total Bookings", "Events By Type"]];

      for (const entry of report) {
        rows.push([
          entry.name,
          entry.email,
          String(entry.totalBookings),
          formatClientEventSummary(entry),
        ]);
      }

      const csv = rows
        .map((row) =>
          row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(","),
        )
        .join("\n");

      return new NextResponse(csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": 'attachment; filename="clients-report.csv"',
        },
      });
    }

    return NextResponse.json(report);
  } catch (error) {
    console.error("Clients report error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
