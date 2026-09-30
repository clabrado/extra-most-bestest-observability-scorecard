/**
 * DQL for the Observability Scorecard.
 *
 * Every signal query covers a 48h window bucketed hourly and grouped by
 * service. That one shape yields three things per query:
 *   - current-window coverage  (second half of the buckets)
 *   - prior-window coverage    (first half)
 *   - the hourly trendline     (services reporting per bucket)
 *
 * All five were executed against a live tenant and returned rows before
 * being wired in. They use `smartscapeNodes` / `dt.smartscape.*` throughout —
 * `dt.entity.*` is deprecated and must not be used in new queries.
 */

/** Hours in each comparison window; the queries span two of them. */
export const WINDOW_HOURS = 24;

/** Row source: every service in the tenant, including ones reporting nothing. */
export const SERVICES_QUERY = `
smartscapeNodes "SERVICE"
| fields id, name
| sort name asc
`;

/**
 * Metrics coverage.
 *
 * `dt.service.request.count` is the marker. Checked against the alternatives on
 * this tenant — the services carrying only database or messaging service
 * metrics (dt.service.database.query.count, dt.service.messaging.*) are all
 * already in the request-count set, so it is the full union rather than a
 * convenient subset. Note that `timeseries {a, b}` intersects on shared
 * dimensions rather than unioning, so combining metric families here would
 * narrow the result, not widen it.
 */
export const METRICS_QUERY = `
timeseries c = sum(dt.service.request.count), from:now()-48h, interval:1h, by:{dt.smartscape.service}
`;

export const TRACES_QUERY = `
fetch spans, from:now()-48h
| filter isNotNull(dt.smartscape.service)
| makeTimeseries c = count(), interval:1h, by:{dt.smartscape.service}
`;

export const LOGS_QUERY = `
fetch logs, from:now()-48h
| filter isNotNull(dt.smartscape.service)
| makeTimeseries c = count(), interval:1h, by:{dt.smartscape.service}
`;

/**
 * Cloud events attributed to a service. Events are commonly attributed to
 * clusters or hosts instead, so a low count here is a real coverage gap rather
 * than a fault in the query.
 */
export const EVENTS_QUERY = `
fetch events, from:now()-48h
| filter isNotNull(dt.smartscape.service)
| makeTimeseries c = count(), interval:1h, by:{dt.smartscape.service}
`;
