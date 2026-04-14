import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { BookingsTable } from "@/components/bookings-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma.server";

type BookingsPageProps = {
  searchParams: Promise<{
    page?: string;
  }>;
};

export default async function BookingsPage({
  searchParams,
}: BookingsPageProps) {
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

  const { page } = await searchParams;
  const currentPage = Number.parseInt(page || "1", 10);
  const pageSize = 20;

  const [bookings, totalCount] = await Promise.all([
    prisma.booking.findMany({
      where: {
        userId: user.id,
      },
      include: {
        eventType: true,
      },
      orderBy: {
        startTime: "desc",
      },
      skip: (currentPage - 1) * pageSize,
      take: pageSize,
    }),
    prisma.booking.count({
      where: {
        userId: user.id,
      },
    }),
  ]);

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Bookings</h1>
        <p className="text-gray-500">Manage all your scheduled meetings</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Bookings</CardTitle>
        </CardHeader>
        <CardContent>
          <BookingsTable bookings={bookings} />

          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-6">
              {currentPage > 1 && (
                <Button variant="outline" asChild>
                  <Link href={`/dashboard/bookings?page=${currentPage - 1}`}>
                    Previous
                  </Link>
                </Button>
              )}
              <div className="flex items-center px-4 text-sm font-medium">
                Page {currentPage} of {totalPages}
              </div>
              {currentPage < totalPages && (
                <Button variant="outline" asChild>
                  <Link href={`/dashboard/bookings?page=${currentPage + 1}`}>
                    Next
                  </Link>
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
