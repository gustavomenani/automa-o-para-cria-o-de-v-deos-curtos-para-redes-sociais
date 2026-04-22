import { describe, expect, it } from "vitest";
import {
  SCHEDULE_PAST_DATE_ERROR,
  assertFutureSchedule,
  parseScheduledAt,
} from "@/features/schedule/validation";

describe("schedule validation", () => {
  it("parses local date and time inputs", () => {
    expect(parseScheduledAt("2026-04-23", "10:30").getFullYear()).toBe(2026);
  });

  it("rejects past or current dates", () => {
    const now = new Date("2026-04-22T12:00:00");

    expect(() => assertFutureSchedule(new Date("2026-04-22T12:00:00"), now)).toThrow(
      SCHEDULE_PAST_DATE_ERROR,
    );
    expect(() => assertFutureSchedule(new Date("2026-04-22T11:59:59"), now)).toThrow(
      SCHEDULE_PAST_DATE_ERROR,
    );
  });

  it("accepts future dates", () => {
    expect(() =>
      assertFutureSchedule(new Date("2026-04-22T12:01:00"), new Date("2026-04-22T12:00:00")),
    ).not.toThrow();
  });
});
