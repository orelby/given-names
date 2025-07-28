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
    quantileThresholds: number[];
    quantileTotals: number[];
    topNames: NameEntry[];
    peakNames?: NameEntry[];
    entries?: NameEntry[];
}

export interface NameEntry {
    name: string;
    total: number;
}

// TODO: delete
export interface QuantileLabel {
    readonly type: 'decile' | 'percentile',
    readonly value: number
}
