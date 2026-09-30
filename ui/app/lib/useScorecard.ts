import { useEffect, useMemo, useState } from "react";
import { useDql } from "@dynatrace-sdk/react-hooks";
import { serviceLevelObjectivesClient } from "@dynatrace-sdk/client-service-level-objectives";
import {
  EVENTS_QUERY,
  LOGS_QUERY,
  METRICS_QUERY,
  SERVICES_QUERY,
  TRACES_QUERY,
} from "./queries";
import {
  bucketsByService,
  buildScorecard,
  serviceIdsFromSloIndicators,
  seriesWindowOf,
} from "./coverage";
import type { Scorecard } from "./types";

/** Entities change slowly; telemetry presence does not need second-by-second freshness. */
const ENTITY_STALE_MS = 5 * 60 * 1000;
const SIGNAL_STALE_MS = 60 * 1000;

interface SloState {
  serviceIds: Set<string>;
  count: number;
  isLoading: boolean;
  error: Error | null;
}

/**
 * SLOs are read through the SLO client rather than DQL — there is no documented
 * DQL path to SLO definitions. Each SLO's custom SLI carries the service it
 * targets inside its indicator query, which is what maps an SLO to a row.
 */
function useSloCoverage(): SloState {
  const [state, setState] = useState<SloState>({
    serviceIds: new Set(),
    count: 0,
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const result = await serviceLevelObjectivesClient.getSlos({
          pageSize: 500,
        });
        if (cancelled) return;
        const indicators = result.slos.map((slo) => slo.customSli?.indicator ?? "");
        setState({
          serviceIds: serviceIdsFromSloIndicators(indicators),
          count: result.slos.length,
          isLoading: false,
          error: null,
        });
      } catch (err) {
        if (cancelled) return;
        setState({
          serviceIds: new Set(),
          count: 0,
          isLoading: false,
          error: err instanceof Error ? err : new Error(String(err)),
        });
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}

export interface ScorecardState {
  scorecard: Scorecard | null;
  isLoading: boolean;
  error: Error | null;
  sloCount: number;
}

/**
 * Runs the five coverage queries in parallel and folds them into one scorecard.
 * Each query carries its own timeframe, so no shared timeframe is passed here.
 */
export function useScorecard(): ScorecardState {
  const services = useDql(SERVICES_QUERY, { staleTime: ENTITY_STALE_MS });
  const metrics = useDql(METRICS_QUERY, { staleTime: SIGNAL_STALE_MS });
  const traces = useDql(TRACES_QUERY, { staleTime: SIGNAL_STALE_MS });
  const logs = useDql(LOGS_QUERY, { staleTime: SIGNAL_STALE_MS });
  const events = useDql(EVENTS_QUERY, { staleTime: SIGNAL_STALE_MS });
  const slos = useSloCoverage();

  const isLoading =
    services.isLoading ||
    metrics.isLoading ||
    traces.isLoading ||
    logs.isLoading ||
    events.isLoading ||
    slos.isLoading;

  const error =
    services.error ??
    metrics.error ??
    traces.error ??
    logs.error ??
    events.error ??
    slos.error;

  const scorecard = useMemo<Scorecard | null>(() => {
    if (isLoading || error) return null;
    if (!services.data?.records) return null;
    return buildScorecard({
      services: services.data.records,
      metrics: bucketsByService(metrics.data?.records),
      traces: bucketsByService(traces.data?.records),
      logs: bucketsByService(logs.data?.records),
      cloudEvents: bucketsByService(events.data?.records),
      sloServiceIds: slos.serviceIds,
      window:
        seriesWindowOf(traces.data?.records) ??
        seriesWindowOf(metrics.data?.records) ??
        seriesWindowOf(logs.data?.records),
    });
  }, [
    isLoading,
    error,
    services.data,
    metrics.data,
    traces.data,
    logs.data,
    events.data,
    slos.serviceIds,
  ]);

  return { scorecard, isLoading, error: error ?? null, sloCount: slos.count };
}
