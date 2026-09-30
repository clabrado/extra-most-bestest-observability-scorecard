import React from "react";
import type { SeriesWindow } from "../lib/types";

export interface TrendlineProps {
  values: number[];
  color: string;
  window: SeriesWindow | null;
  height?: number;
  label: string;
  /** Upper bound of the y-domain, so coverage is drawn against the whole fleet. */
  max: number;
}

const HOUR_MS = 3600_000;

/**
 * Coverage trendline.
 *
 * Inline SVG rather than Strato's Sparkline, deliberately:
 *   - Strato autoscales the y-domain to min..max, so one partially-filled
 *     bucket renders as a full-height cliff and reads as an outage that never
 *     happened. Coverage has to be drawn against a fixed 0..fleet-size domain.
 *   - The sparkline slot inside SingleValue collapses to zero height when its
 *     parent is an unsized flex child.
 * Deviation from the pattern's "use Strato charts" guidance, recorded in the
 * validation report.
 */
export const Trendline = ({
  values,
  color,
  window,
  height = 44,
  label,
  max,
}: TrendlineProps) => {
  if (values.length < 2) {
    return <div style={{ height }} aria-hidden="true" />;
  }

  const width = 100;
  const top = Math.max(max, 1);
  const x = (i: number) => (i / (values.length - 1)) * width;
  const y = (v: number) => height - (v / top) * (height - 6) - 3;

  const line = values.map((v, i) => `${x(i)},${y(v)}`).join(" ");
  const area = `0,${height} ${line} ${width},${height}`;
  const gradientId = `trend-${label.replace(/[^a-z0-9]/gi, "")}`;
  const intervalMs = window?.intervalMs ?? HOUR_MS;
  const hours = Math.round((values.length * intervalMs) / HOUR_MS);

  return (
    <svg
      width="100%"
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      role="img"
      aria-label={`${label} trend over the last ${hours} hours`}
      style={{ display: "block" }}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.32" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={area} fill={`url(#${gradientId})`} />
      <line
        x1={width / 2}
        y1={0}
        x2={width / 2}
        y2={height}
        stroke={color}
        strokeOpacity="0.28"
        strokeWidth="1"
        strokeDasharray="2 2"
        vectorEffect="non-scaling-stroke"
      />
      <polyline
        points={line}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
};
