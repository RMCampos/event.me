import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { prisma } from "@/lib/prisma.server";

type Props = {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ submitted?: string }>;
};

export default async function NoShowJustificationPage({
  params,
  searchParams,
}: Props) {
  const prismaClient = prisma as any;

  const { token } = await params;
  const { submitted } = await searchParams;

  const request = await prismaClient.noShowJustificationRequest.findUnique({
    where: { token },
  });

  if (!request) {
    notFound();
  }

  async function submitJustification(formData: FormData) {
    "use server";

    const justificationText = String(
      formData.get("justificationText") || "",
    ).trim();
    const requestId = String(formData.get("requestId") || "");

    if (!justificationText || !requestId) {
      return;
    }

    await prismaClient.noShowJustificationRequest.update({
      where: { id: requestId },
      data: {
        status: "submitted",
        justificationText,
        submittedAt: new Date(),
      },
    });

    revalidatePath(`/no-show-justification/${token}`);
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>No Show Policy Review</CardTitle>
            <CardDescription>
              Submit your absence justification for review.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-gray-600 space-y-1">
              <p>
                <strong>Email:</strong> {request.guestEmail}
              </p>
              <p>
                <strong>Status:</strong> {request.status}
              </p>
            </div>

            {(submitted === "1" || request.status === "submitted") && (
              <div className="rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-700">
                Justification submitted successfully. Your host will review it.
              </div>
            )}

            {request.status === "approved" && (
              <div className="rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-700">
                Your justification has been approved. You can try scheduling
                again.
              </div>
            )}

            {request.status === "rejected" && (
              <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
                Your previous justification was reviewed and rejected.
              </div>
            )}

            {request.status === "pending" && (
              <form action={submitJustification} className="space-y-4">
                <input type="hidden" name="requestId" value={request.id} />
                <div className="space-y-2">
                  <Label htmlFor="justificationText">Justification</Label>
                  <Textarea
                    id="justificationText"
                    name="justificationText"
                    rows={6}
                    required
                    placeholder="Explain what happened and why you missed your event"
                  />
                </div>
                <Button type="submit">Submit Justification</Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
