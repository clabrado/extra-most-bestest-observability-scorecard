import React from "react";
import { Heading, Text } from "@dynatrace/strato-components/typography";
import { Trendline } from "./Sparkline";
import { colorForRatio, gradeOf, scoreOf } from "../lib/grade";
import {
  DELTA_SIZE,
  TILE_HEIGHT,
  gradeChipStyle,
  labelStyle,
  subStyle,
  tileStyle,
  valueStyle,
} from "../lib/tileStyles";
import Colors from "@dynatrace/strato-design-tokens/colors";
import type { SeriesWindow, SignalSummary } from "../lib/types";

export interface SignalTileProps {
  signal: SignalSummary;
  window: SeriesWindow | null;
}

function deltaColor(delta: number): string {
  if (delta > 0) return Colors.Charts.Status.Ideal.Default;
  if (delta < 0) return Colors.Charts.Status.Critical.Default;
  return Colors.Text.Neutral.Subdued;
}

/**
 * One signal's coverage tile. Fixed height and a fixed internal running order
 * — label, value, delta, trend — so a row of these lines up exactly.
 */
export const SignalTile = ({ signal, window }: SignalTileProps) => {
  const color = colorForRatio(signal.ratio);
  const arrow = signal.delta > 0 ? "▲" : signal.delta < 0 ? "▼" : "—";

  return (
    <div style={tileStyle(color, TILE_HEIGHT)}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 8,
        }}
      >
        <span style={labelStyle}>{signal.label}</span>
        <span style={gradeChipStyle(color)}>{gradeOf(signal.ratio)}</span>
      </div>

      <div>
        <Heading level={2} style={valueStyle(color)}>
          {`${scoreOf(signal.ratio)}%`}
        </Heading>
        <Text style={subStyle}>
          {`${signal.current} of ${signal.total} services`}
        </Text>
      </div>

      <div style={{ height: 44 }}>
        {signal.pointInTime ? (
          <Text
            style={{
              ...subStyle,
              fontSize: DELTA_SIZE,
              display: "block",
              paddingTop: 12,
            }}
          >
            Configuration · no hourly history
          </Text>
        ) : (
          <Trendline
            values={signal.series}
            color={color}
            window={window}
            height={44}
            label={signal.label}
            max={signal.total}
          />
        )}
      </div>

      <Text
        style={{
          fontSize: DELTA_SIZE,
          color: deltaColor(signal.delta),
          fontWeight: 600,
          whiteSpace: "nowrap",
        }}
      >
        {signal.pointInTime
          ? "no trend available"
          : `${arrow} ${signal.delta > 0 ? "+" : ""}${signal.delta} vs prior 24h`}
      </Text>
    </div>
  );
};
