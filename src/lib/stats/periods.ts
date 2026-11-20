// Number of objects per period of time (a century, 250 years...), from the search API.
//
// `dateBegin`/`dateEnd` only match objects whose whole date range is inside
// the window, so asking for each period directly would miss every object that
// spans two of them (a vase dated 1880-1920 is in neither the 1800s nor the
// 1900s). Instead, each object is counted once, in the period it starts in:
//
//   startingFrom(y) = number of objects starting in year y or later
//   objects starting in [a, b) = startingFrom(a) - startingFrom(b)
//
// startingFrom only goes down as y grows, so when it is equal at both ends of
// a span no object starts in it and the span is skipped without looking at its
// periods one by one. That keeps it to ~200 requests for the whole collection
// rather than one per century since 1,000,000 BC.

export type Period = {
    /** First year: 1750 for 1750-1999, -500 for 500-251 BC */
    start: number;
    count: number;
};

export type CountOptions = {
    /** Objects starting in year `year` or later */
    startingFrom: (year: number) => Promise<number>;
    /** Length of a period in years. Periods start on multiples of it. */
    years?: number;
    /** Oldest year looked at, rounded down to a period start */
    from?: number;
    /** Newest year looked at, rounded up to a period end */
    to?: number;
    /** Called after each request with how many have been made */
    onProgress?: (requests: number) => void;
};

/** Periods that have at least one object, oldest first. */
export async function countPerPeriod({
    startingFrom,
    years = 100,
    from = -1_000_000,
    to = 2100,
    onProgress,
}: CountOptions): Promise<Period[]> {
    const memo = new Map<number, Promise<number>>();
    let requests = 0;
    const count = (year: number) => {
        let pending = memo.get(year);
        if (!pending) {
            pending = startingFrom(year).then((n) => {
                onProgress?.(++requests);
                return n;
            });
            memo.set(year, pending);
        }
        return pending;
    };

    const periods: Period[] = [];
    async function split(a: number, b: number): Promise<void> {
        const [na, nb] = await Promise.all([count(a), count(b)]);
        if (na === nb) return;
        if (b - a === years) {
            periods.push({ start: a, count: na - nb });
            return;
        }
        const middle = a + Math.floor((b - a) / years / 2) * years;
        // Both halves at once: the fetcher paces them if the API pushes back.
        await Promise.all([split(a, middle), split(middle, b)]);
    }

    await split(Math.floor(from / years) * years, Math.ceil(to / years) * years);
    return periods.sort((x, y) => x.start - y.start);
}

export type HistogramRow =
    | { kind: "period"; key: string; label: string; range: string; start: number; end: number; count: number }
    | { kind: "gap"; key: string; label: string; range: string; years: number };

/**
 * Rows for the chart, one per period from the oldest to the newest. Runs of
 * empty periods shorter than `maxEmptyYears` stay as empty bars, so the axis
 * keeps its scale; longer ones collapse into a single "gap" row.
 */
export function histogramRows(periods: Period[], years = 100, maxEmptyYears = 1000): HistogramRow[] {
    const rows: HistogramRow[] = [];
    const periodRow = (start: number, count: number): HistogramRow => ({
        kind: "period",
        key: String(start),
        label: formatYear(start),
        range: `${formatYear(start)} – ${formatYear(start + years - 1)}`,
        start,
        end: start + years - 1,
        count,
    });

    periods.forEach((period, i) => {
        const previous = periods[i - 1];
        if (previous) {
            const from = previous.start + years;
            const empty = period.start - from;
            if (empty >= maxEmptyYears) {
                rows.push({
                    kind: "gap",
                    key: `gap${from}`,
                    label: "⋯",
                    range: `${formatYear(from)} – ${formatYear(period.start - 1)}: no objects`,
                    years: empty,
                });
            } else {
                for (let start = from; start < period.start; start += years) rows.push(periodRow(start, 0));
            }
        }
        rows.push(periodRow(period.start, period.count));
    });
    return rows;
}

/** 1800 -> "1800", -500 -> "500 BC" (the Met has a year 0, so we keep it). */
export function formatYear(year: number): string {
    return year < 0 ? `${(-year).toLocaleString("en")} BC` : year.toLocaleString("en").replace(",", "");
}
