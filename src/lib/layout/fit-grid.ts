export type GridFit = {
    columns: number;
    rows: number;
    cardWidth: number;
    cardHeight: number;
};

/**
 * How many cards of a fixed aspect ratio fit in a `width` x `height` area.
 *
 * Cards stretch to share the row width, but never get narrower than `minCardWidth`:
 * when they would, the row loses a column. Then as many rows as fit are kept.
 * Always at least 1x1, even in an area too small for a single card.
 */
export function fitGrid({ width, height, minCardWidth, gap, ratio }: {
    width: number;
    height: number;
    minCardWidth: number;
    gap: number;
    /** height / width, e.g. 3 / 4 for 4:3 cards */
    ratio: number;
}): GridFit {
    const columns = Math.max(1, Math.floor((width + gap) / (minCardWidth + gap)));
    const cardWidth = (width - gap * (columns - 1)) / columns;
    const cardHeight = cardWidth * ratio;
    const rows = Math.max(1, Math.floor((height + gap) / (cardHeight + gap)));
    return { columns, rows, cardWidth, cardHeight };
}
