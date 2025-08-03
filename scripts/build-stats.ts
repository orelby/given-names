import { YEAR_PERIODS } from "@shared/models/year-periods";
import { AllPeriodStats } from "@shared/models/stats/period-stats";
import { withTiming } from "./utils/with-timing";
import { quantileLabels } from "./stats/quantile";
import { buildPeriodStats, stripDetailedEntries } from "./stats/period";
import { annotateWithNotableNames } from './stats/notable-names/index';
import { NameRecord } from "@shared/models/name-records";

export function buildStats(
    recordsByName: ReadonlyMap<string, readonly NameRecord[]>
) {
    let periodsStats = YEAR_PERIODS.map(period => {
        return withTiming(
            () => buildPeriodStats(recordsByName, period),
            `Built stats for ${period.start}-${period.end} in`
        );
    });

    withTiming(
        () => annotateWithNotableNames(periodsStats),
        `Built notable names for all periods`
    );

    const stats: AllPeriodStats = {
        quantileLabels,
        periods: stripDetailedEntries(periodsStats),
    };

    return stats;
}
