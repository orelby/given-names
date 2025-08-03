import { QuantileLabel } from "@shared/models/stats/period-stats";
import { DemographicGroup } from "@shared/models/demographics";
import { Entries } from "./demographic";

export const quantileFractions = [
    ...Array.from({ length: 9 }, (_, i) => (i + 1) * 0.1),
    ...Array.from({ length: 10 }, (_, i) => 0.9 + (i + 1) * 0.01)
].map(num => Number(num.toFixed(2)));

export const quantileLabels: QuantileLabel[] = quantileFractions.map(num => {
    const percentile = Math.round(num * 100);

    return {
        type: "percentile",
        value: percentile
    }
});

/**
 * Simple quantile threshold (higher, no interpolation)
 */
export function getQuantileThresholds(
    sortedValues: Entries,
    fractions: number[],
    demographic: DemographicGroup,
): number[] {
    return fractions.map(f => {
        const lastEntry = sortedValues[
            getLastIndexOfQuantile(f, sortedValues.length)
        ];
        return lastEntry.ofDemographicGroup(demographic);
    });
}

export function computeQuantileTotals(
    sortedValues: Entries,
    sortedFractions: number[],
    demographic: DemographicGroup,
): number[] {
    const totals = sortedFractions.map(() => 0);

    let curIdx = 0;
    for (const [i, f] of sortedFractions.entries()) {
        const lastIdx = getLastIndexOfQuantile(f, sortedValues.length);

        while (curIdx <= lastIdx) {
            totals[i] += sortedValues[curIdx++].ofDemographicGroup(demographic);
        }
    }

    return totals;
}

function getLastIndexOfQuantile(fraction: number, length: number) {
    return clamp(1, Math.ceil(fraction * length), length) - 1;
}

function clamp(minValue: number, value: number, maxValue: number) {
    return Math.max(minValue, Math.min(value, maxValue));
}
