import {
  SIGNAL_LABELS,
  type SeriesWindow,
  type Scorecard,
  type ServiceRow,
  type SignalKey,
  type SignalSummary,
} from "./types";

/** A row from any of the by-service timeseries queries. */
interface TimeseriesRecord {
  "dt.smartscape.service"?: unknown;
  c?: unknown;
}

interface ServiceRecord {
  id?: unknown;
  name?: unknown;
}

/**
 * `dt.entity.service` comes back as a bare string on most tables but as a
 * single-element array on events, where the field is multi-valued.
 */
function serviceIdOf(raw: unknown): string | null {
  if (typeof raw === "string") return raw;
  if (Array.isArray(raw) && typeof raw[0] === "string") return raw[0];
  return null;
}

function bucketsOf(raw: unknown): number[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((v) => (typeof v === "number" && isFinite(v) ? v : 0));
}

/**
 * Collapse one signal's query result into per-service hourly buckets.
 * A service appearing twice (string and array key forms) is merged.
 */
export function bucketsByService(
  records: unknown[] | undefined
): Map<string, number[]> {
  const out = new Map<string, number[]>();
  for (const rec of records ?? []) {
    const row = rec as TimeseriesRecord;
    const id = serviceIdOf(row["dt.smartscape.service"]);
    if (!id) continue;
    const buckets = bucketsOf(row.c);
    const existing = out.get(id);
    if (!existing) {
      out.set(id, buckets);
      continue;
    }
    const merged = existing.slice();
    for (let i = 0; i < buckets.length; i++) {
      merged[i] = (merged[i] ?? 0) + buckets[i];
    }
    out.set(id, merged);
  }
  return out;
}

/** Index of the first bucket belonging to the current (most recent) half. */
function splitPoint(length: number): number {
  return Math.floor(length / 2);
}

function anyAbove(buckets: number[], from: number, to: number): boolean {
  for (let i = from; i < to; i++) {
    if ((buckets[i] ?? 0) > 0) return true;
  }
  return false;
}

/**
 * Build one signal's rollup: current and prior coverage counts, plus the
 * hourly count of services reporting it across the whole window.
 */
export function summarizeSignal(
  key: SignalKey,
  byService: Map<string, number[]>,
  serviceIds: Set<string>
): SignalSummary {
  let width = 0;
  for (const buckets of byService.values()) {
    width = Math.max(width, buckets.length);
  }
  const mid = splitPoint(width);

  let current = 0;
  let prior = 0;
  for (const id of serviceIds) {
    const buckets = byService.get(id);
    if (!buckets) continue;
    if (anyAbove(buckets, mid, width)) current++;
    if (anyAbove(buckets, 0, mid)) prior++;
  }

  // The final bucket covers the current, still-filling hour. Plotting it would
  // draw a cliff that hasn't happened, so the trendline stops at the last
  // complete bucket. Presence above still uses every bucket.
  const plotted = width > 2 ? width - 1 : width;
  const series: number[] = [];
  for (let i = 0; i < plotted; i++) {
    let reporting = 0;
    for (const id of serviceIds) {
      if ((byService.get(id)?.[i] ?? 0) > 0) reporting++;
    }
    series.push(reporting);
  }

  const total = serviceIds.size;
  return {
    key,
    label: SIGNAL_LABELS[key],
    current,
    prior,
    total,
    ratio: total === 0 ? 0 : current / total,
    delta: current - prior,
    series,
    pointInTime: false,
  };
}

/**
 * SLOs are configuration, not telemetry — an SLO either targets a service or it
 * doesn't, with no hourly history to trend. This produces a comparable summary
 * with an empty series rather than inventing one.
 */
export function summarizeSlos(
  sloServiceIds: Set<string>,
  serviceIds: Set<string>
): SignalSummary {
  let current = 0;
  for (const id of serviceIds) {
    if (sloServiceIds.has(id)) current++;
  }
  const total = serviceIds.size;
  return {
    key: "slos",
    label: SIGNAL_LABELS.slos,
    current,
    prior: current,
    total,
    ratio: total === 0 ? 0 : current / total,
    delta: 0,
    series: [],
    pointInTime: true,
  };
}

/** Pull the service each SLO targets out of its custom SLI DQL. */
export function serviceIdsFromSloIndicators(indicators: string[]): Set<string> {
  const ids = new Set<string>();
  const pattern = /SERVICE-[0-9A-F]{16}/g;
  for (const indicator of indicators) {
    for (const match of indicator.match(pattern) ?? []) {
      ids.add(match);
    }
  }
  return ids;
}

/**
 * Read the real bucket timestamps off a query result rather than assuming the
 * series ends exactly at now(). `interval` arrives as nanoseconds in a string.
 */
export function seriesWindowOf(
  records: unknown[] | undefined
): SeriesWindow | null {
  for (const rec of records ?? []) {
    const row = rec as {
      interval?: unknown;
      timeframe?: { start?: unknown };
    };
    const start = row.timeframe?.start;
    if (typeof start !== "string" || typeof row.interval !== "string") continue;
    const startMs = Date.parse(start);
    const intervalMs = Number(row.interval) / 1e6;
    if (!isFinite(startMs) || !isFinite(intervalMs) || intervalMs <= 0) continue;
    return { startMs, intervalMs };
  }
  return null;
}

export interface ScorecardInput {
  services: unknown[] | undefined;
  metrics: Map<string, number[]>;
  traces: Map<string, number[]>;
  logs: Map<string, number[]>;
  cloudEvents: Map<string, number[]>;
  sloServiceIds: Set<string>;
  window: SeriesWindow | null;
}

/** Assemble the whole scorecard: one row per service plus the five rollups. */
export function buildScorecard(input: ScorecardInput): Scorecard {
  const services: { id: string; name: string }[] = [];
  for (const rec of input.services ?? []) {
    const row = rec as ServiceRecord;
    if (typeof row.id !== "string") continue;
    services.push({
      id: row.id,
      name: typeof row.name === "string" && row.name ? row.name : row.id,
    });
  }

  const serviceIds = new Set(services.map((s) => s.id));

  const signals: SignalSummary[] = [
    summarizeSignal("metrics", input.metrics, serviceIds),
    summarizeSignal("traces", input.traces, serviceIds),
    summarizeSignal("logs", input.logs, serviceIds),
    summarizeSignal("cloudEvents", input.cloudEvents, serviceIds),
    summarizeSlos(input.sloServiceIds, serviceIds),
  ];

  // A service reports a signal if it has any activity in the current half.
  const present = (map: Map<string, number[]>, id: string): boolean => {
    const buckets = map.get(id);
    if (!buckets) return false;
    return anyAbove(buckets, splitPoint(buckets.length), buckets.length);
  };

  const rows: ServiceRow[] = services.map((svc) => {
    const metrics = present(input.metrics, svc.id);
    const traces = present(input.traces, svc.id);
    const logs = present(input.logs, svc.id);
    const cloudEvents = present(input.cloudEvents, svc.id);
    const slos = input.sloServiceIds.has(svc.id);
    const covered = [metrics, traces, logs, cloudEvents, slos].filter(Boolean)
      .length;
    return {
      id: svc.id,
      name: svc.name,
      metrics,
      traces,
      logs,
      cloudEvents,
      slos,
      covered,
    };
  });

  const totalCells = rows.length * 5;
  const coveredCells = rows.reduce((sum, r) => sum + r.covered, 0);

  // Overall trend: share of all time-series signal/service pairs reporting in
  // each bucket. SLOs are excluded — they carry no hourly history.
  const trended = signals.filter((s) => !s.pointInTime);
  const width = trended.reduce((w, s) => Math.max(w, s.series.length), 0);
  const denominator = trended.length * serviceIds.size;
  const overallSeries: number[] = [];
  for (let i = 0; i < width; i++) {
    const reporting = trended.reduce((sum, s) => sum + (s.series[i] ?? 0), 0);
    overallSeries.push(denominator === 0 ? 0 : reporting / denominator);
  }

  return {
    rows,
    signals,
    overallSeries,
    window: input.window,
    totalServices: rows.length,
    overallRatio: totalCells === 0 ? 0 : coveredCells / totalCells,
    servicesWithGaps: rows.filter((r) => r.covered < 5).length,
  };
}
