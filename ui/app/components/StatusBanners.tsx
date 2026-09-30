import React from "react";
import { Text } from "@dynatrace/strato-components/typography";
import Colors from "@dynatrace/strato-design-tokens/colors";
import { scoreOf } from "../lib/grade";
import type { SignalSummary } from "../lib/types";

interface Banner {
  severity: "critical" | "warning";
  headline: string;
  detail: string;
}

/**
 * Turn the signal rollups into the few findings worth calling out: a signal
 * nobody reports is critical, thin coverage is a warning.
 */
export function bannersFor(signals: SignalSummary[]): Banner[] {
  const banners: Banner[] = [];
  for (const signal of signals) {
    if (signal.current === 0) {
      banners.push({
        severity: "critical",
        headline: `No ${signal.label.toLowerCase()} coverage`,
        detail: `0 of ${signal.total} services`,
      });
    } else if (signal.ratio < 0.7) {
      banners.push({
        severity: "warning",
        headline: `${signal.label} coverage thin`,
        detail: `${signal.current} of ${signal.total} · ${scoreOf(signal.ratio)}%`,
      });
    }
  }
  return banners;
}

export const StatusBanners = ({ signals }: { signals: SignalSummary[] }) => {
  const banners = bannersFor(signals);
  if (banners.length === 0) return null;

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${banners.length}, minmax(0, 1fr))`,
        gap: 12,
        width: "100%",
      }}
    >
      {banners.map((banner) => {
        const color =
          banner.severity === "critical"
            ? Colors.Charts.Status.Critical.Default
            : Colors.Charts.Status.Warning.Default;
        return (
          <div
            key={banner.headline}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              height: 52,
              padding: "0 16px",
              minWidth: 0,
              boxSizing: "border-box",
              borderRadius: 8,
              border: `1px solid ${color}`,
              borderLeft: `4px solid ${color}`,
              background: Colors.Background.Surface.Default,
              overflow: "hidden",
            }}
          >
            <span
              aria-hidden="true"
              style={{ color, fontSize: 15, lineHeight: 1 }}
            >
              {banner.severity === "critical" ? "◆" : "▲"}
            </span>
            <Text
              style={{
                fontSize: 14,
                fontWeight: 700,
                color,
                whiteSpace: "nowrap",
              }}
            >
              {banner.headline}
            </Text>
            <Text
              style={{
                fontSize: 14,
                opacity: 0.75,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {banner.detail}
            </Text>
          </div>
        );
      })}
    </div>
  );
};
