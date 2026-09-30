import { describe, expect, it } from "vitest";
import {
  bucketsByService,
  buildScorecard,
  serviceIdsFromSloIndicators,
  seriesWindowOf,
  summarizeSignal,
} from "../coverage";

const SVC_A = "SERVICE-0000000000000001";
const SVC_B = "SERVICE-0000000000000002";

describe("bucketsByService", () => {
  it("reads a plain string service id", () => {
    const out = bucketsByService([
      { "dt.smartscape.service": SVC_A, c: [1, 2] },
    ]);
    expect(out.get(SVC_A)).toEqual([1, 2]);
  });

  it("reads a service id delivered as a single-element array", () => {
    // Events carry dt.smartscape.service as a multi-valued field.
    const out = bucketsByService([
      { "dt.smartscape.service": [SVC_A], c: [3, 4] },
    ]);
    expect(out.get(SVC_A)).toEqual([3, 4]);
  });

  it("merges the string and array forms of the same service", () => {
    const out = bucketsByService([
      { "dt.smartscape.service": SVC_A, c: [1, 1] },
      { "dt.smartscape.service": [SVC_A], c: [2, 2] },
    ]);
    expect(out.get(SVC_A)).toEqual([3, 3]);
  });

  it("treats nulls in the bucket array as zero", () => {
    const out = bucketsByService([
      { "dt.smartscape.service": SVC_A, c: [null, 5] },
    ]);
    expect(out.get(SVC_A)).toEqual([0, 5]);
  });

  it("skips rows with no service id", () => {
    const out = bucketsByService([{ "dt.smartscape.service": null, c: [1] }]);
    expect(out.size).toBe(0);
  });
});

describe("summarizeSignal window split", () => {
  const ids = new Set([SVC_A, SVC_B]);

  it("counts a service present only in the current half", () => {
    // 4 buckets: first two are prior, last two current.
    const map = new Map([[SVC_A, [0, 0, 1, 1]]]);
    const s = summarizeSignal("logs", map, ids);
    expect(s.current).toBe(1);
    expect(s.prior).toBe(0);
    expect(s.delta).toBe(1);
  });

  it("counts a service present only in the prior half as a loss", () => {
    const map = new Map([[SVC_A, [1, 1, 0, 0]]]);
    const s = summarizeSignal("cloudEvents", map, ids);
    expect(s.current).toBe(0);
    expect(s.prior).toBe(1);
    expect(s.delta).toBe(-1);
  });

  it("reports the ratio against the full service set, not just reporters", () => {
    const map = new Map([[SVC_A, [1, 1, 1, 1]]]);
    const s = summarizeSignal("traces", map, ids);
    expect(s.total).toBe(2);
    expect(s.ratio).toBe(0.5);
  });

  it("builds a per-bucket count of reporting services", () => {
    const map = new Map([
      [SVC_A, [1, 0, 1, 0]],
      [SVC_B, [1, 1, 0, 0]],
    ]);
    const s = summarizeSignal("metrics", map, ids);
    // The trailing bucket is the still-filling current hour and is not plotted.
    expect(s.series).toEqual([2, 1, 1]);
  });

  it("drops only the trailing bucket, and keeps it in the presence check", () => {
    // Activity exists solely in the final, partial bucket.
    const map = new Map([[SVC_A, [0, 0, 0, 7]]]);
    const s = summarizeSignal("logs", map, ids);
    expect(s.series).toEqual([0, 0, 0]);
    expect(s.current).toBe(1);
  });

  it("ignores services that are not in the tenant's service list", () => {
    const map = new Map([["SERVICE-DEADBEEFDEADBEEF", [1, 1, 1, 1]]]);
    const s = summarizeSignal("logs", map, ids);
    expect(s.current).toBe(0);
  });
});

describe("serviceIdsFromSloIndicators", () => {
  it("extracts the service an SLO indicator targets", () => {
    const ids = serviceIdsFromSloIndicators([
      `timeseries avgUs = avg(dt.service.request.response_time), filter:{dt.entity.service == "${SVC_A}"}`,
    ]);
    expect(ids.has(SVC_A)).toBe(true);
  });

  it("dedupes multiple SLOs on the same service", () => {
    const ids = serviceIdsFromSloIndicators([
      `filter:{dt.entity.service == "${SVC_A}"}`,
      `filter:{dt.entity.service == "${SVC_A}"}`,
    ]);
    expect(ids.size).toBe(1);
  });

  it("returns nothing for an SLO with no service reference", () => {
    expect(serviceIdsFromSloIndicators(["timeseries x = avg(foo)"]).size).toBe(0);
  });
});

describe("seriesWindowOf", () => {
  it("converts the nanosecond interval string to milliseconds", () => {
    const w = seriesWindowOf([
      {
        interval: "3600000000000",
        timeframe: { start: "2026-09-28T16:00:00.000000000Z" },
      },
    ]);
    expect(w?.intervalMs).toBe(3_600_000);
    expect(w?.startMs).toBe(Date.parse("2026-09-28T16:00:00.000Z"));
  });

  it("returns null when no record carries a usable timeframe", () => {
    expect(seriesWindowOf([{ interval: "x" }])).toBeNull();
    expect(seriesWindowOf(undefined)).toBeNull();
  });
});

describe("buildScorecard", () => {
  const services = [
    { id: SVC_A, name: "alpha" },
    { id: SVC_B, name: "beta" },
  ];

  it("marks a signal present only when it appears in the current half", () => {
    const card = buildScorecard({
      services,
      metrics: new Map([[SVC_A, [1, 1, 0, 0]]]), // prior only -> absent now
      traces: new Map([[SVC_A, [0, 0, 1, 1]]]),
      logs: new Map(),
      cloudEvents: new Map(),
      sloServiceIds: new Set([SVC_B]),
      window: null,
    });
    const alpha = card.rows.find((r) => r.id === SVC_A);
    expect(alpha?.metrics).toBe(false);
    expect(alpha?.traces).toBe(true);
    expect(alpha?.covered).toBe(1);

    const beta = card.rows.find((r) => r.id === SVC_B);
    expect(beta?.slos).toBe(true);
    expect(beta?.covered).toBe(1);
  });

  it("counts services with gaps and the overall cell ratio", () => {
    const card = buildScorecard({
      services,
      metrics: new Map(),
      traces: new Map(),
      logs: new Map(),
      cloudEvents: new Map(),
      sloServiceIds: new Set(),
      window: null,
    });
    expect(card.totalServices).toBe(2);
    expect(card.servicesWithGaps).toBe(2);
    expect(card.overallRatio).toBe(0);
  });

  it("keeps services that report nothing as rows rather than dropping them", () => {
    const card = buildScorecard({
      services,
      metrics: new Map([[SVC_A, [1, 1, 1, 1]]]),
      traces: new Map(),
      logs: new Map(),
      cloudEvents: new Map(),
      sloServiceIds: new Set(),
      window: null,
    });
    expect(card.rows.map((r) => r.name)).toEqual(["alpha", "beta"]);
  });

  it("excludes SLOs from the overall trend, which has no hourly history", () => {
    const card = buildScorecard({
      services,
      metrics: new Map([[SVC_A, [1, 1]]]),
      traces: new Map(),
      logs: new Map(),
      cloudEvents: new Map(),
      sloServiceIds: new Set([SVC_A, SVC_B]),
      window: null,
    });
    const slo = card.signals.find((s) => s.key === "slos");
    expect(slo?.pointInTime).toBe(true);
    expect(slo?.series).toEqual([]);
    // 4 trended signals x 2 services = 8 possible; only alpha/metrics reports.
    // Series is 2 buckets wide, so nothing is trimmed at this width.
    expect(card.overallSeries[0]).toBeCloseTo(1 / 8);
  });
});
