import { Download, Users } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  buildClientReport,
  formatClientEventSummary,
} from "@/lib/client-report";
import { getClientReportDateRange } from "@/lib/client-report-filters";
import { prisma } from "@/lib/prisma.server";

type ClientsPageProps = {
  searchParams: Promise<{
    startDate?: string;
    endDate?: string;
  }>;
};

export default async function ClientsPage({ searchParams }: ClientsPageProps) {
  const session = await auth();

  if (!session?.user?.email) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  });

  if (!user) {
    redirect("/login");
  }

  const params = await searchParams;
  const dateRange = getClientReportDateRange(params.startDate, params.endDate);
  const hasDateFilter = Boolean(dateRange.start || dateRange.endExclusive);

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
  const totalBookings = report.reduce(
    (accumulator, client) => accumulator + client.totalBookings,
    0,
  );
  const exportQuery = new URLSearchParams();

  if (dateRange.startDate) {
    exportQuery.set("startDate", dateRange.startDate);
  }

  if (dateRange.endDate) {
    exportQuery.set("endDate", dateRange.endDate);
  }

  exportQuery.set("format", "csv");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Clients</h1>
          <p className="text-gray-500">
            Guests who booked with you, grouped by email and event type
          </p>
        </div>
        {report.length > 0 && (
          <Button asChild variant="outline">
            <a href={`/api/clients-report?${exportQuery.toString()}`} download>
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </a>
          </Button>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Unique Clients
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{report.length}</div>
            <p className="text-xs text-muted-foreground">
              {report.length === 1
                ? "1 client with bookings"
                : `${report.length} clients with bookings`}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Tracked Bookings
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalBookings}</div>
            <p className="text-xs text-muted-foreground">
              Cancelled bookings are excluded from this report
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Date Filter</CardTitle>
          <CardDescription>
            Optionally filter the report by scheduled event date
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 md:grid-cols-[1fr_1fr_auto_auto] md:items-end">
            <div className="space-y-2">
              <Label htmlFor="startDate">Start date</Label>
              <Input
                id="startDate"
                name="startDate"
                type="date"
                defaultValue={dateRange.startDate}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">End date</Label>
              <Input
                id="endDate"
                name="endDate"
                type="date"
                defaultValue={dateRange.endDate}
              />
            </div>
            <Button type="submit">Apply filter</Button>
            {hasDateFilter && (
              <Button asChild type="button" variant="ghost">
                <Link href="/dashboard/clients">Clear</Link>
              </Button>
            )}
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Client Report</CardTitle>
          <CardDescription>
            Name, email, total bookings, and the breakdown by event type
            {hasDateFilter ? " within the selected date range" : ""}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {report.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p>No clients yet.</p>
              <p className="text-sm mt-2">
                When someone books with you, they will appear here.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium text-gray-700">
                      Name
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">
                      Email
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">
                      Event Breakdown
                    </th>
                    <th className="text-right py-3 px-4 font-medium text-gray-700">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {report.map((entry) => (
                    <tr
                      key={entry.email}
                      className="border-b last:border-0 align-top hover:bg-gray-50"
                    >
                      <td className="py-3 px-4 font-medium">{entry.name}</td>
                      <td className="py-3 px-4 text-gray-600">{entry.email}</td>
                      <td className="py-3 px-4 text-gray-600">
                        {formatClientEventSummary(entry)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="inline-flex items-center justify-center min-w-[2rem] px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-semibold">
                          {entry.totalBookings}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
