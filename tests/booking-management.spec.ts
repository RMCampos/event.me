import { expect, test } from "@playwright/test";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma.server";

test.describe("Booking Management", () => {
  let userId: string;
  let eventTypeId: string;
  let _username: string;
  let _slug: string;
  const testEmail = `booking-mgmt-test-${Date.now()}@test.com`;
  const testUsername = `booking-mgmt-test-${Date.now()}`;

  test.beforeAll(async () => {
    // Create test user
    const hashedPassword = await bcrypt.hash("Test123!@#", 10);
    const user = await prisma.user.create({
      data: {
        email: testEmail,
        password: hashedPassword,
        name: "Booking Mgmt Test User",
        username: testUsername,
      },
    });
    userId = user.id;
    _username = user.username ?? "testuser";

    // Create availability for tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dayOfWeek = tomorrow.getDay();

    await prisma.availability.create({
      data: {
        userId,
        dayOfWeek,
        startTime: "09:00",
        endTime: "17:00",
      },
    });

    // Create event type
    const eventType = await prisma.eventType.create({
      data: {
        userId,
        title: "Test Meeting",
        slug: `test-meeting-${Date.now()}`,
        description: "A test meeting for booking management",
        duration: 30,
        active: true,
        minimumNoticeHours: 1,
        maximumNoticeDays: 14,
        maxBookingsPerWeek: 10,
      },
    });
    eventTypeId = eventType.id;
    _slug = eventType.slug;
  });

  test.afterAll(async () => {
    // Cleanup
    if (userId) {
      await prisma.booking.deleteMany({ where: { userId } });
      await prisma.eventType.deleteMany({ where: { userId } });
      await prisma.availability.deleteMany({ where: { userId } });
      await prisma.user.delete({ where: { id: userId } });
    }
    await prisma.$disconnect();
  });

  test("should display bookings page with navigation", async ({ page }) => {
    // Login
    await page.goto("/login");
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', "Test123!@#");
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL("/dashboard", { timeout: 5000 });

    // Navigate to bookings page
    await page.click('a[href="/dashboard/bookings"]');

    await expect(page).toHaveURL("/dashboard/bookings");
    await expect(page.locator("h1")).toContainText("Bookings");
  });

  test("should show empty state when no bookings", async ({ page }) => {
    // Login
    await page.goto("/login");
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', "Test123!@#");
    await page.click('button[type="submit"]');

    await page.waitForURL("/dashboard");

    // Navigate to bookings
    await page.goto("/dashboard/bookings");

    await expect(page.locator("text=No bookings yet")).toBeVisible();
  });

  test("should display bookings when they exist", async ({ page }) => {
    // Create a booking
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);

    const endTime = new Date(tomorrow);
    endTime.setMinutes(endTime.getMinutes() + 30);

    await prisma.booking.create({
      data: {
        eventTypeId,
        userId,
        guestName: "Test Guest",
        guestEmail: "guest@example.com",
        guestNotes: "Test notes",
        startTime: tomorrow,
        endTime,
        status: "confirmed",
      },
    });

    // Login
    await page.goto("/login");
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', "Test123!@#");
    await page.click('button[type="submit"]');

    await page.waitForURL("/dashboard");

    // Navigate to bookings
    await page.goto("/dashboard/bookings");

    await expect(page.locator("text=Test Meeting").first()).toBeVisible();
    await expect(page.locator("text=Test Guest")).toBeVisible();
    await expect(page.locator("text=guest@example.com")).toBeVisible();
  });

  test("should cancel a booking", async ({ page }) => {
    // Create a booking to cancel
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 2);
    tomorrow.setHours(14, 0, 0, 0);

    const endTime = new Date(tomorrow);
    endTime.setMinutes(endTime.getMinutes() + 30);

    const booking = await prisma.booking.create({
      data: {
        eventTypeId,
        userId,
        guestName: "Cancel Test",
        guestEmail: "cancel@example.com",
        startTime: tomorrow,
        endTime,
        status: "confirmed",
      },
    });

    // Login
    await page.goto("/login");
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', "Test123!@#");
    await page.click('button[type="submit"]');

    await page.waitForURL("/dashboard");

    // Navigate to bookings
    await page.goto("/dashboard/bookings");

    // Wait for bookings table to load
    await page.waitForSelector("text=cancel@example.com", { timeout: 10000 });

    // Wait a bit more for buttons to render
    await page.waitForTimeout(1000);

    // Find the cancel button more directly - it should be in the same row
    const cancelButton = page
      .locator('button:has-text("Cancel")')
      .filter({ hasText: /^Cancel$/ })
      .first();
    await cancelButton.waitFor({ state: "visible", timeout: 10000 });
    await cancelButton.click();

    // Wait for the action to complete
    await page.waitForTimeout(2000);

    // Verify booking is cancelled in database
    const cancelledBooking = await prisma.booking.findUnique({
      where: { id: booking.id },
    });

    expect(cancelledBooking?.status).toBe("cancelled");
  });
});
