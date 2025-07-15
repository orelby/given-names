import { DemographicGroupStats } from "./demographic-group-stats";
import { Gender, Religion } from "../demographics";
import { YearPeriod } from "../year-periods";

export interface PeriodStats {
    yearPeriod: YearPeriod,
    byReligionAndGender: Record<
        Religion['slug'],
        Record<Gender['slug'], DemographicGroupStats>
    >;
}

export interface AllPeriodStats {
    quantileLabels: readonly QuantileLabel[];
    periods: readonly PeriodStats[];
}

export interface QuantileLabel {
    readonly type: 'decile' | 'percentile',
    readonly value: number
}
