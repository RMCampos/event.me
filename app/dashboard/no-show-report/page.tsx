import { Download } from "lucide-react";
import { revalidatePath } from "next/cache";
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
import { prisma } from "@/lib/prisma.server";

export default async function NoShowReportPage() {
  async function unblockGuestEmail(formData: FormData) {
    "use server";

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

    const guestEmail = String(formData.get("guestEmail") || "")
      .trim()
      .toLowerCase();

    if (!guestEmail) {
      return;
    }

    await prisma.noShowPolicyException.upsert({
      where: {
        userId_guestEmail: {
          userId: user.id,
          guestEmail,
        },
      },
      update: {},
      create: {
        userId: user.id,
        guestEmail,
      },
    });

    revalidatePath("/dashboard/no-show-report");
  }

  const session = await auth();

  if (!session?.user?.email) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  if (!user) {
    redirect("/login");
  }

  const noShowBookings = await prisma.booking.findMany({
    where: {
      userId: user.id,
      status: "no_show",
    },
    select: {
      guestName: true,
      guestEmail: true,
      startTime: true,
      eventType: {
        select: { title: true },
      },
    },
    orderBy: { startTime: "desc" },
  });

  // Aggregate by email
  const aggregated = new Map<
    string,
    { name: string; email: string; count: number }
  >();
  for (const booking of noShowBookings) {
    const key = booking.guestEmail.toLowerCase();
    const existing = aggregated.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      aggregated.set(key, {
        name: booking.guestName,
        email: booking.guestEmail,
        count: 1,
      });
    }
  }

  const report = Array.from(aggregated.values()).sort(
    (a, b) => b.count - a.count,
  );

  const exceptions = await prisma.noShowPolicyException.findMany({
    where: { userId: user.id },
    select: { guestEmail: true },
  });
  const unblockedEmails = new Set(exceptions.map((entry) => entry.guestEmail));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">No Show Report</h1>
          <p className="text-gray-500">
            Guests who did not attend their scheduled meetings
          </p>
        </div>
        {report.length > 0 && (
          <Button asChild variant="outline">
            <a href="/api/no-show-report?format=csv" download>
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </a>
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>No Show Summary</CardTitle>
          <CardDescription>
            {report.length === 0
              ? "No no-shows recorded yet."
              : `${report.length} guest(s) with at least one no show`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {report.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p>No no-shows recorded yet.</p>
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
                    <th className="text-right py-3 px-4 font-medium text-gray-700">
                      No Show Count
                    </th>
                    <th className="text-right py-3 px-4 font-medium text-gray-700">
                      Policy
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {report.map((entry) => {
                    const normalizedEmail = entry.email.toLowerCase();
                    const isBlocked = !unblockedEmails.has(normalizedEmail);

                    return (
                      <tr
                        key={entry.email}
                        className="border-b last:border-0 hover:bg-gray-50"
                      >
                        <td className="py-3 px-4">{entry.name}</td>
                        <td className="py-3 px-4 text-gray-600">
                          {entry.email}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className="inline-flex items-center justify-center min-w-8 px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-semibold">
                            {entry.count}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          {isBlocked ? (
                            <form action={unblockGuestEmail}>
                              <input
                                type="hidden"
                                name="guestEmail"
                                value={normalizedEmail}
                              />
                              <Button type="submit" variant="outline" size="sm">
                                Unblock Email
                              </Button>
                            </form>
                          ) : (
                            <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-semibold text-xs">
                              Unblocked
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
