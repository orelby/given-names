import { NameDiffEntry } from "@shared/models/stats/period-stats";

export interface NameDiffCandidateEntry {
    name: string;
    fractionDiff: number;
}

export interface BiggestNameChanges {
    rising: NameDiffEntry[];
    falling: NameDiffEntry[];
}

export function biggestFractionChanges(
    fractionByName: ReadonlyMap<string, number>,
    prevFractionByName: ReadonlyMap<string, number>,
    minFractionDiff: number,
): BiggestNameChanges {
    // TODO: top new/disappeared names

    const risingCandidates = new MaxNameDiffHeap(fractionByName);
    const fallingCandidates = new MaxNameDiffHeap(fractionByName);

    // New/existing names
    for (const [name, fraction] of fractionByName.entries()) {
        const prevFraction = prevFractionByName.get(name) ?? 0;
        const fractionDiff = fraction - prevFraction;

        if (fractionDiff >= minFractionDiff) {
            risingCandidates.push({ name, fractionDiff });
        } else if (fractionDiff <= -minFractionDiff) {
            fallingCandidates.push({ name, fractionDiff: -fractionDiff });
        }
    }

    // Disappearing names
    for (const [name, fractionDiff] of prevFractionByName.entries()) {
        if (fractionDiff <= -minFractionDiff && !fractionByName.has(name)) {
            fallingCandidates.push({ name, fractionDiff: -fractionDiff });
        }
    }

    const rising = risingCandidates.topNameDiffs();
    const falling = fallingCandidates.topNameDiffs();

    return { rising, falling };
}

export function biggestNameRatioChanges(
    ratioByName: ReadonlyMap<string, number>,
    fractionByName: ReadonlyMap<string, number>,
    prevRatioByName: ReadonlyMap<string, number>,
    prevFractionByName: ReadonlyMap<string, number>,
    minRatioDiff: number,
    minFraction: number,
): BiggestNameChanges {
    const risingCandidates = new MaxNameDiffHeap(ratioByName);
    const fallingCandidates = new MaxNameDiffHeap(ratioByName);

    for (const [name, ratio] of ratioByName.entries()) {
        const prevRatio = prevRatioByName.get(name);

        if (prevRatio === undefined) {
            continue;
        }

        const ratioDiff = ratio - prevRatio;

        const curFraction = fractionByName.get(name) ?? 0;
        const prevFraction = prevFractionByName.get(name) ?? 0;
        // const fractionDiff = curFraction - prevFraction;

        if (ratioDiff >= minRatioDiff && curFraction >= minFraction) {
            risingCandidates.push({ name, fractionDiff: ratioDiff });
        } else if (ratioDiff <= -minRatioDiff && prevFraction >= minFraction) {
            fallingCandidates.push({ name, fractionDiff: -ratioDiff });
        }
    }

    const options = {
        minExtensionFraction: 0.00_01
    };

    const rising = risingCandidates.topNameDiffs(options);
    const falling = fallingCandidates.topNameDiffs(options);

    return { rising, falling };
}

class MaxNameDiffHeap {
    private readonly fakeHeap: NameDiffCandidateEntry[] = [];
    private readonly fractionByName: ReadonlyMap<string, number>;

    constructor(fractionByName: ReadonlyMap<string, number>) {
        this.fractionByName = fractionByName;
    }

    topNameDiffs(options?: {
        minExtensionFraction?: number,
    }): NameDiffEntry[] {
        const sizes = [20, 15, 10];

        const topEntries = this.fakeHeap
            .sort((a, b) => b.fractionDiff - a.fractionDiff)
            .slice(0, sizes[0])
            .map(({ name, fractionDiff }) => ({
                name,
                fraction: this.fractionByName.get(name) ?? 0,
                percentagePoints: fractionDiff * 100,
            }));

        const minExtensionFraction = options?.minExtensionFraction ?? 0.00_001;

        for (const size of sizes) {
            if (topEntries.length >= size
                && topEntries[size - 1].fraction >= minExtensionFraction) {
                topEntries.length = size;
                return topEntries;
            }
        }

        return topEntries;
    }

    push(element: NameDiffCandidateEntry) {
        this.fakeHeap.push(element);
    }

    get length(): number {
        return this.fakeHeap.length;
    }
}
