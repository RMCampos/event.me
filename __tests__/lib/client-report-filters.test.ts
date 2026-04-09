import { describe, expect, it } from "vitest";
import { getClientReportDateRange } from "@/lib/client-report-filters";

describe("getClientReportDateRange", () => {
  it("builds an inclusive start and end date range", () => {
    const result = getClientReportDateRange("2026-04-01", "2026-04-09");

    expect(result.startDate).toBe("2026-04-01");
    expect(result.endDate).toBe("2026-04-09");
    expect(result.start?.toISOString()).toBe("2026-04-01T00:00:00.000Z");
    expect(result.endExclusive?.toISOString()).toBe("2026-04-10T00:00:00.000Z");
  });

  it("ignores invalid dates", () => {
    const result = getClientReportDateRange("invalid", "2026-04-09");

    expect(result.startDate).toBeUndefined();
    expect(result.endDate).toBe("2026-04-09");
    expect(result.start).toBeUndefined();
    expect(result.endExclusive?.toISOString()).toBe("2026-04-10T00:00:00.000Z");
  });

  it("returns no range when start date is after end date", () => {
    expect(getClientReportDateRange("2026-04-10", "2026-04-09")).toEqual({});
  });
});
