import { Gender, Religion } from "../demographics";
import { YearPeriod } from "../year-periods";

export interface AllPeriodStats {
    quantileLabels: readonly QuantileLabel[];
    periods: readonly SinglePeriodStats[];
}

export interface SinglePeriodStats {
    yearPeriod: YearPeriod,
    byReligionAndGender: Record<
        Religion['slug'],
        Record<Gender['slug'], DemographicGroupStats>
    >;
}

export interface DemographicGroupStats {
    nameTotal: number;
    populationTotal: number;

    quantileThresholds: readonly number[];
    quantileTotals: readonly number[];

    topNames: readonly NameEntry[];

    peakNames?: readonly NameEntry[];

    risingNames?: readonly NameDiffEntry[];
    fallingNames?: readonly NameDiffEntry[];

    risingWomenRatioNames?: readonly NameDiffEntry[];
    risingMenRatioNames?: readonly NameDiffEntry[];

    risingReligionRatioNames?: readonly NameDiffEntry[];
    fallingReligionRatioNames?: readonly NameDiffEntry[];
}

export interface NameEntry {
    name: string;
    total: number;
}

export interface NameDiffEntry {
    name: string;
    fraction: number;
    percentagePoints: number;
}

// TODO: delete
export interface QuantileLabel {
    readonly type: 'decile' | 'percentile',
    readonly value: number
}
