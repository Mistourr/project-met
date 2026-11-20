import { describe, expect, it } from "vitest";
import { fitGrid } from "./fit-grid";

const base = { minCardWidth: 256, gap: 16, ratio: 3 / 4 };

describe("fitGrid", () => {
    it("fits as many columns as the minimum width allows, then stretches them", () => {
        // 4 x 256 + 3 x 16 = 1072 <= 1200 < 5 x 256 + 4 x 16 = 1344
        const fit = fitGrid({ ...base, width: 1200, height: 1000 });
        expect(fit.columns).toBe(4);
        expect(fit.cardWidth).toBe((1200 - 3 * 16) / 4);
        expect(fit.cardHeight).toBe(fit.cardWidth * 3 / 4);
    });

    it("fits as many rows as the height allows", () => {
        // 4 columns of 288px -> 216px tall cards: 2 rows take 448px, 3 rows 680px
        expect(fitGrid({ ...base, width: 1200, height: 679 }).rows).toBe(2);
        expect(fitGrid({ ...base, width: 1200, height: 680 }).rows).toBe(3);
    });

    it("keeps at least one card when the area is too small", () => {
        const fit = fitGrid({ ...base, width: 100, height: 10 });
        expect(fit.columns).toBe(1);
        expect(fit.rows).toBe(1);
    });
});
