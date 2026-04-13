export type ClientReportDateRange = {
  startDate?: string;
  endDate?: string;
  start?: Date;
  endExclusive?: Date;
};

function isValidDateInput(value?: string | null): value is string {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));
}

function toUtcDate(date: string) {
  return new Date(`${date}T00:00:00.000Z`);
}

function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

export function getClientReportDateRange(
  startDate?: string | null,
  endDate?: string | null,
): ClientReportDateRange {
  const normalizedStartDate = isValidDateInput(startDate)
    ? startDate
    : undefined;
  const normalizedEndDate = isValidDateInput(endDate) ? endDate : undefined;

  const start = normalizedStartDate
    ? toUtcDate(normalizedStartDate)
    : undefined;
  const endExclusive = normalizedEndDate
    ? addDays(toUtcDate(normalizedEndDate), 1)
    : undefined;

  if (start && endExclusive && start >= endExclusive) {
    return {};
  }

  return {
    startDate: normalizedStartDate,
    endDate: normalizedEndDate,
    start,
    endExclusive,
  };
}
