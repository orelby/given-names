import { ReadonlyNameCounts } from "./name-counts";
import { Gender, GenderBitmasks, genders, Religion, ReligionBitmasks, religions } from '../demographics';
import { PeriodStats, QuantileLabel } from "./period-stats";
import { DemographicGroupStats } from "./demographic-group-stats";

export class NamePeriodStats {
    private stats: Record<string, NameDemographicGroupStats> = {};

    constructor(
        nameCounts: ReadonlyNameCounts,
        periodStats: PeriodStats,
        quantileLabels: readonly QuantileLabel[],
    ) {
        for (const religion of religions) {
            for (const gender of genders) {
                this.stats[religion.bitmask | gender.bitmask] =
                    new NameDemographicGroupStats(
                        nameCounts.ofDemographic(religion, gender),
                        periodStats.byReligionAndGender[religion.slug][gender.slug],
                        quantileLabels,
                    );
            }
        }
    }

    ofDemographic(religion: Religion, gender: Gender) {
        return this.stats[religion.bitmask | gender.bitmask];
    }

    ofReligion(religion: Religion) {
        return this.stats[religion.bitmask | GenderBitmasks.All];
    }

    ofGender(gender: Gender) {
        return this.stats[ReligionBitmasks.All | gender.bitmask];
    }

    ofAll() {
        return this.stats[ReligionBitmasks.All | GenderBitmasks.All];
    }
}

export class NameDemographicGroupStats {
    readonly total: number;
    readonly fraction: number;
    readonly decile?: number;
    readonly percentile?: number;

    constructor(
        total: number,
        groupStats: DemographicGroupStats,
        quantileLabels: readonly QuantileLabel[],
    ) {
        this.total = total;

        this.fraction = total / groupStats.populationTotal;

        if (total === 0) return;

        const quantileLabel = quantileLabels[
            groupStats.quantileThresholds
                .findIndex(threshold => total <= threshold)
        ];

        this.decile = quantileLabel.value / 10;

        if (quantileLabel.value > 90) {
            this.percentile = quantileLabel.value;
        }
    }
}
