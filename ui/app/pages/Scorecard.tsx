import React, { useEffect, useMemo, useState } from "react";
import { Heading, Text } from "@dynatrace/strato-components/typography";
import { Switch } from "@dynatrace/strato-components/forms";
import { ProgressCircle } from "@dynatrace/strato-components/content";
import { ErrorBanner } from "../components/ErrorBanner";
import { HeroRow } from "../components/HeroRow";
import { SectionBand } from "../components/SectionBand";
import { SignalTile } from "../components/SignalTile";
import { StatusBanners } from "../components/StatusBanners";
import { CoverageTable } from "../components/CoverageTable";
import { useScorecard } from "../lib/useScorecard";
import { colorForRatio, gradeOf, scoreOf } from "../lib/grade";

export const Scorecard = () => {
  const { scorecard, isLoading, error } = useScorecard();
  const [gapsOnly, setGapsOnly] = useState(false);

  useEffect(() => {
    document.title = "Extra Most Bestest Obsevability Scorecaard";
  }, []);

  const visibleRows = useMemo(() => {
    if (!scorecard) return [];
    return gapsOnly
      ? scorecard.rows.filter((row) => row.covered < 5)
      : scorecard.rows;
  }, [scorecard, gapsOnly]);

  if (error) {
    return (
      <div style={{ padding: 28 }}>
        <ErrorBanner title="Could not build the scorecard" error={error} />
      </div>
    );
  }

  if (isLoading || !scorecard) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 16,
          minHeight: 520,
        }}
      >
        <ProgressCircle
          value="indeterminate"
          size="large"
          aria-label="Loading signal coverage"
        />
        <Text style={{ fontSize: 15 }}>
          Querying signal coverage across all services…
        </Text>
      </div>
    );
  }

  const { signals, overallRatio, totalServices, servicesWithGaps } = scorecard;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 28,
        padding: 28,
        maxWidth: "100%",
        boxSizing: "border-box",
      }}
    >
      <div>
        <Heading level={1} style={{ fontSize: 30, margin: 0 }}>
          Observability Scorecard
        </Heading>
        <Text style={{ fontSize: 15, opacity: 0.75 }}>
          {`Signal coverage for ${totalServices} services over the last 24 hours · ${servicesWithGaps} with gaps`}
        </Text>
      </div>

      <HeroRow scorecard={scorecard} />

      <StatusBanners signals={signals} />

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <SectionBand
          title="Signal coverage"
          grade={`${gradeOf(overallRatio)} · ${scoreOf(overallRatio)}`}
          gradeColor={colorForRatio(overallRatio)}
        />
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
            gap: 16,
            width: "100%",
          }}
        >
          {signals.map((signal) => (
            <SignalTile
              key={signal.key}
              signal={signal}
              window={scorecard.window}
            />
          ))}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <SectionBand title="Service detail">
          <Switch value={gapsOnly} onChange={setGapsOnly}>
            Show only coverage gaps
          </Switch>
        </SectionBand>
        <CoverageTable rows={visibleRows} />
      </div>

      <Text style={{ fontSize: 13, opacity: 0.65 }}>
        Presence is evaluated per service over the last 24 hours. Metrics,
        traces, logs and cloud events come from DQL against Grail; SLO coverage
        is derived from the service each SLO&rsquo;s indicator targets, which is
        configuration rather than a time series and so carries no trend.
      </Text>
    </div>
  );
};
