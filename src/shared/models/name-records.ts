import { Demographic } from './demographics';
import { YearPeriod, START_YEAR } from './year-periods';

export interface NameCounts {
    readonly total: number;
    readonly yearTotals: readonly number[];
}

export interface NameRecord extends NameCounts {
    readonly name: string;
    readonly demographic: Demographic;
}

export type NameRecords = readonly NameRecord[];

export function getTotalByYearPeriod(record: NameRecord, period: YearPeriod): number {
    const start = period.start - START_YEAR;
    const end = period.end - START_YEAR;

    if (start === 0 && end === record.yearTotals.length - 1) {
        return record.total;
    }

    if (start < 0 || end >= record.yearTotals.length) {
        throw RangeError("Year period out of range");
    }

    let i = start;
    let total = 0;
    while (i <= end) {
        total += record.yearTotals[i++];
    }

    return total;
}

export function getTotalByYear(record: NameRecord, year: number): number {
    return record.yearTotals[year - START_YEAR] ?? 0;
}

export function* yearsWithTotals(record: NameRecord) {
    let year = START_YEAR;
    for (const yearTotal of record.yearTotals) {
        yield [year++, yearTotal];
    }
}
