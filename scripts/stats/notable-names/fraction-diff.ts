import { DetailedDemographicGroupStats } from "../period";
import { biggestFractionChanges } from "./helpers";

export function processBiggestFractionChanges(
    curGroupStats: DetailedDemographicGroupStats,
    prevGroupStats: DetailedDemographicGroupStats
) {
    const fractionByName = curGroupStats.fractionByName;
    const prevFractionByName = prevGroupStats.fractionByName;

    if (!fractionByName || !prevFractionByName) {
        throw new Error("Group stats missing fractionByName");
    }

    const minFractionDiff = Math.max(
        0.00_01,
        50 / curGroupStats.populationTotal
    );

    const { rising, falling } = biggestFractionChanges(
        fractionByName,
        prevFractionByName,
        minFractionDiff
    );

    curGroupStats.risingNames = rising;
    curGroupStats.fallingNames = falling;
}
