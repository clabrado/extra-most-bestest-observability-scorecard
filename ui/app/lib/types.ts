/** The five signal types the scorecard grades every service against. */
export type SignalKey = "metrics" | "traces" | "logs" | "cloudEvents" | "slos";

export const SIGNAL_KEYS: SignalKey[] = [
  "metrics",
  "traces",
  "logs",
  "cloudEvents",
  "slos",
];

export const SIGNAL_LABELS: Record<SignalKey, string> = {
  metrics: "Metrics",
  traces: "Traces",
  logs: "Logs",
  cloudEvents: "Cloud Events",
  slos: "SLOs",
};

/** One table row: a service and its presence/absence per signal. */
export interface ServiceRow {
  id: string;
  name: string;
  metrics: boolean;
  traces: boolean;
  logs: boolean;
  cloudEvents: boolean;
  slos: boolean;
  /** How many of the five signals this service reports. */
  covered: number;
}

/** Per-signal rollup driving one KPI tile. */
export interface SignalSummary {
  key: SignalKey;
  label: string;
  /** Services reporting this signal in the current 24h window. */
  current: number;
  /** Same count for the preceding 24h window. */
  prior: number;
  total: number;
  /** current / total, 0..1. */
  ratio: number;
  /** current - prior, in services. */
  delta: number;
  /**
   * Hourly count of services reporting this signal across the full 48h.
   * Empty when the signal has no time dimension (SLOs are configuration).
   */
  series: number[];
  /** True when this signal is a point-in-time fact rather than a time series. */
  pointInTime: boolean;
}

/** Wall-clock extent of the bucketed series, read from the query result. */
export interface SeriesWindow {
  startMs: number;
  intervalMs: number;
}

export interface Scorecard {
  rows: ServiceRow[];
  signals: SignalSummary[];
  /** Coverage ratio (0..1) per hourly bucket across the time-series signals. */
  overallSeries: number[];
  /** Timestamps for the series buckets, or null if no query returned one. */
  window: SeriesWindow | null;
  totalServices: number;
  /** Covered cells / total cells, 0..1. */
  overallRatio: number;
  /** Services missing at least one signal. */
  servicesWithGaps: number;
}
