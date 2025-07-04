import { Demographic } from './demographics';

export const START_YEAR = 1948;

export interface NameCounts {
    readonly total: number;
    readonly yearTotals: readonly number[];
}

export interface NameRecord extends NameCounts {
    readonly name: string;
    readonly demographic: Demographic;
}

export type NameRecords = readonly NameRecord[];

export function getTotalByYear(record: NameRecord, year: number): number {
    return record.yearTotals[year - START_YEAR] ?? 0;
}

export function* yearsWithTotals(record: NameRecord) {
    let year = START_YEAR;
    for (const yearTotal of record.yearTotals) {
        yield [year++, yearTotal];
    }
}
