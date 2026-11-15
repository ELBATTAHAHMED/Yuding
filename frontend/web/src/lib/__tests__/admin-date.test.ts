import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { formatAdminDay, formatAdminMoment, formatStayDates } from "../admin-date.ts";

describe("Admin travel dates", () => {
  it("formats stays and pluralizes nights", () => {
    assert.equal(formatStayDates("2026-10-06", "2026-10-07"), "06 – 07 oct. 2026 · 1 nuit");
    assert.equal(formatStayDates("2026-10-06", "2026-10-08"), "06 – 08 oct. 2026 · 2 nuits");
    assert.equal(formatStayDates("2026-09-30", "2026-10-01"), "30 sept. 2026 – 01 oct. 2026 · 1 nuit");
  });
  it("handles missing values and preserves timestamp time", () => {
    assert.equal(formatAdminDay(undefined), "—");
    assert.equal(formatStayDates("2026-10-06", null), "06 oct. 2026");
    assert.equal(formatAdminMoment("2026-10-06T14:01:00"), "06 oct. 2026, 14:01");
  });
});
