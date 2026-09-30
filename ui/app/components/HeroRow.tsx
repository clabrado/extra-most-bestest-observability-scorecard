import React from "react";
import { Heading, Text } from "@dynatrace/strato-components/typography";
import Colors from "@dynatrace/strato-design-tokens/colors";
import { Trendline } from "./Sparkline";
import { colorForRatio, gradeOf, scoreOf } from "../lib/grade";
import {
  DELTA_SIZE,
  HERO_HEIGHT,
  gradeChipStyle,
  labelStyle,
  subStyle,
  tileStyle,
  valueStyle,
} from "../lib/tileStyles";
import type { Scorecard } from "../lib/types";

const HERO_VALUE_SIZE = 52;

export interface HeroRowProps {
  scorecard: Scorecard;
}

const mean = (values: number[]) =>
  values.length === 0 ? 0 : values.reduce((a, b) => a + b, 0) / values.length;

export const HeroRow = ({ scorecard }: HeroRowProps) => {
  const {
    overallRatio,
    overallSeries,
    servicesWithGaps,
    totalServices,
    rows,
    signals,
  } = scorecard;

  const accent = colorForRatio(overallRatio);
  const mid = Math.floor(overallSeries.length / 2);
  const deltaPts =
    Math.round(
      (mean(overallSeries.slice(mid)) - mean(overallSeries.slice(0, mid))) * 1000
    ) / 10;
  const deltaArrow = deltaPts > 0 ? "▲" : deltaPts < 0 ? "▼" : "—";
  const deltaTone =
    deltaPts > 0
      ? Colors.Charts.Status.Ideal.Default
      : deltaPts < 0
        ? Colors.Charts.Status.Critical.Default
        : Colors.Text.Neutral.Subdued;

  const missingCells = rows.reduce((sum, r) => sum + (5 - r.covered), 0);
  const fullyCovered = totalServices - servicesWithGaps;
  const gapAccent =
    servicesWithGaps > 0
      ? Colors.Charts.Status.Critical.Default
      : Colors.Charts.Status.Ideal.Default;

  const worst = [...signals].sort((a, b) => a.ratio - b.ratio)[0];

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
        gap: 16,
        width: "100%",
      }}
    >
      {/* Overall coverage */}
      <div style={tileStyle(accent, HERO_HEIGHT)}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span style={labelStyle}>Overall signal coverage</span>
          <span style={gradeChipStyle(accent)}>
            {`${gradeOf(overallRatio)} · ${scoreOf(overallRatio)}`}
          </span>
        </div>
        <div>
          <Heading
            level={1}
            style={{ ...valueStyle(accent), fontSize: HERO_VALUE_SIZE }}
          >
            {`${scoreOf(overallRatio)}%`}
          </Heading>
          <Text style={subStyle}>
            {`${totalServices} services × 5 signals · last 24h`}
          </Text>
        </div>
        <div style={{ height: 44 }}>
          <Trendline
            values={overallSeries.map((v) => Math.round(v * 1000) / 10)}
            color={accent}
            window={scorecard.window}
            height={44}
            label="Overall coverage"
            max={100}
          />
        </div>
        <Text
          style={{
            fontSize: DELTA_SIZE,
            color: deltaTone,
            fontWeight: 600,
            whiteSpace: "nowrap",
          }}
        >
          {`${deltaArrow} ${deltaPts > 0 ? "+" : ""}${deltaPts} pts vs prior 24h`}
        </Text>
      </div>

      {/* Fully covered services */}
      <div style={tileStyle(gapAccent, HERO_HEIGHT)}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span style={labelStyle}>Services with coverage gaps</span>
          <span style={gradeChipStyle(gapAccent)}>
            {`${fullyCovered} full`}
          </span>
        </div>
        <div>
          <Heading
            level={1}
            style={{ ...valueStyle(gapAccent), fontSize: HERO_VALUE_SIZE }}
          >
            {servicesWithGaps}
          </Heading>
          <Text style={subStyle}>
            {`of ${totalServices} services miss at least one signal`}
          </Text>
        </div>
        <div style={{ height: 44, display: "flex", alignItems: "flex-end" }}>
          <Text style={{ ...subStyle, fontSize: DELTA_SIZE }}>
            {`${missingCells} missing signal cells of ${totalServices * 5}`}
          </Text>
        </div>
        <Text
          style={{
            fontSize: DELTA_SIZE,
            color: gapAccent,
            fontWeight: 600,
            whiteSpace: "nowrap",
          }}
        >
          {fullyCovered === 0
            ? "no service reports all five signals"
            : `${scoreOf(fullyCovered / totalServices)}% of services complete`}
        </Text>
      </div>

      {/* Weakest signal */}
      <div
        style={tileStyle(
          worst ? colorForRatio(worst.ratio) : accent,
          HERO_HEIGHT
        )}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span style={labelStyle}>Weakest signal</span>
          {worst && (
            <span style={gradeChipStyle(colorForRatio(worst.ratio))}>
              {gradeOf(worst.ratio)}
            </span>
          )}
        </div>
        <div>
          <Heading
            level={1}
            style={{
              ...valueStyle(worst ? colorForRatio(worst.ratio) : accent),
              fontSize: HERO_VALUE_SIZE,
            }}
          >
            {worst ? worst.label : "—"}
          </Heading>
          <Text style={subStyle}>
            {worst
              ? `${worst.current} of ${worst.total} services · ${scoreOf(worst.ratio)}%`
              : "no signals evaluated"}
          </Text>
        </div>
        <div style={{ height: 44 }}>
          {worst && !worst.pointInTime && (
            <Trendline
              values={worst.series}
              color={colorForRatio(worst.ratio)}
              window={scorecard.window}
              height={44}
              label={worst.label}
              max={worst.total}
            />
          )}
        </div>
        <Text
          style={{
            fontSize: DELTA_SIZE,
            color: Colors.Text.Neutral.Subdued,
            fontWeight: 600,
            whiteSpace: "nowrap",
          }}
        >
          biggest coverage opportunity
        </Text>
      </div>
    </div>
  );
};
