import { DetailedDemographicGroupStats } from "../period";

export type PeakPeriodByName = Map<string, PeakEntry>;

export interface PeakEntry {
    fraction: number;
    groupStats: DetailedDemographicGroupStats;
}

export function processPeriodPeaks(peakPeriodByName: PeakPeriodByName): void {
    const namesByPeriod = Map.groupBy(
        peakPeriodByName.keys(),
        name => peakPeriodByName.get(name)!.groupStats
    );

    for (const [periodGroup, names] of namesByPeriod.entries()) {
        names.sort((a, b) => (
            peakPeriodByName.get(a)!.fraction
            - peakPeriodByName.get(b)!.fraction)
        );

        const peakNameCount = names.length >= 20 ? 20 : 10;

        periodGroup.peakNames = names
            .slice(-peakNameCount)
            .reverse()
            .map(name => ({
                name,
                total: Math.round(
                    peakPeriodByName.get(name)!.fraction
                    * periodGroup.populationTotal
                )
            }));
    }
}
