# Extra Most Bestest Observability Scorecard

A Dynatrace AppEngine app that scores **signal coverage per service**: for every
service in a tenant, is it reporting Metrics, Traces, Logs, Cloud Events and
SLOs over the last 24 hours — and where are the gaps?

Built as a Dynatrace SE bootcamp exercise. Runs against any tenant.

## What it does

- **One row per service, one column per signal type.** Present/absent per cell,
  determined by DQL against Grail (SLOs come from the SLO client — there is no
  documented DQL path to SLO definitions).
- **Sortable** by service name, **filterable** to coverage gaps only.
- **Scored**: per-signal coverage %, letter grade, and an overall scorecard grade.
- **Trended**: each time-series signal carries an hourly trendline over 48h plus a
  delta against the preceding 24h window.

Example result on a 17-service tenant: Traces 100% (A), SLOs 88.2% (B),
Metrics 76.5% (C), Logs 58.8% (F), Cloud Events 0% (F) — 64.7% overall, Grade D,
with zero services reporting all five signals.

## How coverage is determined

Every signal query spans 48h bucketed hourly and grouped by service, so a single
query yields current coverage, prior coverage, and the trendline.

| Signal | Source |
|---|---|
| Metrics | `timeseries sum(dt.service.request.count) … by:{dt.smartscape.service}` |
| Traces | `fetch spans … makeTimeseries count() by:{dt.smartscape.service}` |
| Logs | `fetch logs … makeTimeseries count() by:{dt.smartscape.service}` |
| Cloud Events | `fetch events … makeTimeseries count() by:{dt.smartscape.service}` |
| SLOs | `serviceLevelObjectivesClient.getSlos()`, mapped to services by the `SERVICE-…` id inside each custom SLI indicator |

Rows come from `smartscapeNodes "SERVICE"`. All queries use `dt.smartscape.*` —
`dt.entity.*` is deprecated and must not be used in new queries.

Two deliberate calls worth knowing:

- **`dt.service.request.count` is the metrics marker.** Verified as the true union
  on the reference tenant — the services carrying only `dt.service.database.*` or
  `dt.service.messaging.*` metrics are already in the request-count set. Note that
  `timeseries {a, b}` *intersects* on shared dimensions rather than unioning, so
  combining metric families narrows the result instead of widening it.
- **Cloud Events reading 0% is usually a real finding, not a bug.** Events are
  commonly attributed to Kubernetes clusters and hosts rather than to services.

## Setup

```bash
npm install
export DT_APP_ENVIRONMENT_URL="https://<your-tenant>.apps.dynatrace.com"
npm run start      # dev server
npm run build      # bundle
npm run deploy     # deploy to the environment above
npm run lint
npm test           # vitest — 20 unit tests over the aggregation logic
```

`app.config.json` ships a placeholder `environmentUrl`; set
`DT_APP_ENVIRONMENT_URL` rather than committing a tenant URL.

**App id:** unsigned apps must live in the `my.` namespace. On a shared tenant,
add a personal suffix (`my.extramostbestest.<initials>`) so you don't collide
with — or overwrite — a colleague's app.

## Scopes

`storage:buckets:read`, `storage:smartscape:read`, `storage:metrics:read`,
`storage:spans:read`, `storage:logs:read`, `storage:events:read`, `slo:slos:read`

## Layout

```
ui/app/
  lib/
    queries.ts       # the five DQL queries, each validated against a live tenant
    coverage.ts      # pure aggregation: window split, presence, SLO mapping
    useScorecard.ts  # parallel useDql + SLO client, folded into one scorecard
    grade.ts         # ratio -> letter grade, status colour
    tileStyles.ts    # fixed tile geometry so rows stay symmetrical
    __tests__/       # vitest coverage of the aggregation logic
  components/        # HeroRow, SignalTile, CoverageTable, StatusBanners, Sparkline
  pages/Scorecard.tsx
```

## Notes on two rendering decisions

- **Trendlines are inline SVG, not Strato's `Sparkline`.** Strato autoscales the
  y-domain to min..max, so one partially-filled bucket renders as a full-height
  cliff and reads as an outage that never happened. Coverage needs a fixed
  0..fleet-size domain. The trailing in-progress bucket is also trimmed.
- **Tiles have fixed pixel heights and `minmax(0, 1fr)` grid tracks.** Chart
  components default to `height: 100%`, which computes to zero inside an unsized
  flex child — they then render blank while typechecking and linting cleanly.

## License

MIT
