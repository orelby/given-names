import { ConcreteDemographicGroup } from './demographics';
import { YearPeriod, START_YEAR } from './year-periods';

export interface NameCountsRecord {
    readonly total: number;
    readonly yearTotals: readonly number[];
    readonly demographic: ConcreteDemographicGroup;
}

export interface NameRecord extends NameCountsRecord {
    readonly name: string;
}

export type NameRecords = readonly NameRecord[];

export function getTotalByYearPeriod(
    record: NameCountsRecord,
    period: YearPeriod
): number {
    const first = period.start - START_YEAR;
    const last = period.end - START_YEAR;

    if (first === 0 && last === record.yearTotals.length - 1) {
        return record.total;
    }

    if (first < 0 || last >= record.yearTotals.length) {
        throw RangeError("Year period out of range");
    }

    let total = 0;
    for (let i = first; i <= last; i++) {
        total += record.yearTotals[i];
    }

    return total;
}

export function getTotalByYear(
    record: NameCountsRecord,
    year: number
): number {
    return record.yearTotals[year - START_YEAR] ?? 0;
}

export function* yearsWithTotals(record: NameCountsRecord) {
    let year = START_YEAR;
    for (const yearTotal of record.yearTotals) {
        yield [year++, yearTotal];
    }
}
