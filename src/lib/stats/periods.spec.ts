import { describe, expect, it } from "vitest";
import { countPerPeriod, formatYear, histogramRows } from "./periods";

// A fake collection: each object is its start year.
function fakeApi(starts: number[]) {
    const asked: number[] = [];
    return {
        asked,
        startingFrom: async (year: number) => {
            asked.push(year);
            return starts.filter((s) => s >= year).length;
        },
    };
}

describe("countPerPeriod", () => {
    it("counts each object once, in the century it starts in", async () => {
        const api = fakeApi([1850, 1899, 1900, -450, -450, -9999]);
        const periods = await countPerPeriod({ ...api, from: -10_000, to: 2100 });
        expect(periods).toEqual([
            { start: -10_000, count: 1 },
            { start: -500, count: 2 },
            { start: 1800, count: 2 },
            { start: 1900, count: 1 },
        ]);
    });

    it("works with other period lengths, aligned on multiples of them", async () => {
        const api = fakeApi([1850, 1899, 1900, 2001, -450, -1]);
        const periods = await countPerPeriod({ ...api, years: 250, from: -1000, to: 2100 });
        expect(periods).toEqual([
            { start: -500, count: 1 }, // 500-251 BC
            { start: -250, count: 1 }, // 250-1 BC
            { start: 1750, count: 3 }, // 1750-1999
            { start: 2000, count: 1 }, // 2000-2249
        ]);
    });

    it("skips empty spans instead of asking for every century", async () => {
        const api = fakeApi([1850]);
        await countPerPeriod({ ...api, from: -1_000_000, to: 2100 });
        // ~10,000 centuries: a binary search through them, not a scan
        expect(api.asked.length).toBeLessThan(40);
        expect(new Set(api.asked).size).toBe(api.asked.length); // no year asked twice
    });
});

describe("histogramRows", () => {
    it("keeps short runs of empty periods as empty bars", () => {
        const rows = histogramRows([{ start: 1500, count: 3 }, { start: 1800, count: 5 }]);
        expect(rows.map((r) => r.kind === "period" && [r.start, r.count])).toEqual([
            [1500, 3], [1600, 0], [1700, 0], [1800, 5],
        ]);
    });

    it("collapses long runs into a single gap", () => {
        const rows = histogramRows([{ start: -300_000, count: 14 }, { start: -7000, count: 1492 }]);
        expect(rows).toHaveLength(3);
        // 299,900 BC to 7,001 BC
        expect(rows[1]).toMatchObject({ kind: "gap", years: 292_900, range: "299,900 BC – 7,001 BC: no objects" });
    });

    it("labels periods with their length", () => {
        const [row] = histogramRows([{ start: 1750, count: 1 }], 250);
        expect(row).toMatchObject({ label: "1750", range: "1750 – 1999", start: 1750, end: 1999 });
    });
});

describe("formatYear", () => {
    it("writes BC years without a minus sign", () => {
        expect(formatYear(1800)).toBe("1800");
        expect(formatYear(-500)).toBe("500 BC");
        expect(formatYear(-300_000)).toBe("300,000 BC");
        expect(formatYear(0)).toBe("0");
    });
});
