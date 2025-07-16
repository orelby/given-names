import { Gender, GenderBitmasks, genders, Religion, ReligionBitmasks, religions, ConcreteDemographicGroup, DemographicGroup } from "../demographics";
import { getTotalByYearPeriod, NameCountsRecord } from "../name-records";
import { FULL_DATA_PERIOD, YearPeriod } from "../year-periods";

export class NameCounts implements ReadonlyNameCounts {
    private static readonly base: Readonly<Record<DemographicGroup, number>> =
        Object.freeze(Object.fromEntries(Object.values(ReligionBitmasks).flatMap(
            religion => Object.values(GenderBitmasks).map(
                gender => [religion | gender, 0]
            )
        )));

    private readonly totalsByReligionAndGender: Record<DemographicGroup, number> =
        Object.assign({}, NameCounts.base);

    withRecords(
        records: readonly NameCountsRecord[],
        period: YearPeriod = FULL_DATA_PERIOD
    ): this {
        // Calculate totals for all single demographics

        const recordTotals: Record<ConcreteDemographicGroup, number>
            = Object.assign({}, NameCounts.base);

        for (const record of records) {
            recordTotals[record.demographic] += getTotalByYearPeriod(record, period);
        }

        // Calculate totals for all demographics

        const thisTotals = this.totalsByReligionAndGender;

        for (const religion of religions) {
            for (const gender of genders) {
                const total = recordTotals[religion.bitmask | gender.bitmask];
                if (!total) continue;

                thisTotals[religion.bitmask | gender.bitmask] += total;
                thisTotals[religion.bitmask | GenderBitmasks.All] += total;
                thisTotals[ReligionBitmasks.All | gender.bitmask] += total;
                thisTotals[ReligionBitmasks.All | GenderBitmasks.All] += total;
            }
        }

        return this;
    }

    withCounts(...others: readonly NameCounts[]): this {
        const thisTotals = this.totalsByReligionAndGender;

        for (const other of others) {
            const otherTotals = other.totalsByReligionAndGender;
            for (const demographic in thisTotals) {
                thisTotals[demographic] += otherTotals[demographic];
            }
        }

        return this;
    }

    ofDemographicGroup(group: DemographicGroup): number {
        if (!(group in this.totalsByReligionAndGender)) {
            throw Error('Must be called with a demographic group.');
        }

        return this.totalsByReligionAndGender[group];
    }

    ofReligionAndGender(religion: Religion, gender: Gender): number {
        return this.totalsByReligionAndGender[
            religion.bitmask | gender.bitmask
        ];
    }

    ofReligion(religion: Religion): number {
        return this.totalsByReligionAndGender[
            religion.bitmask | GenderBitmasks.All
        ];
    }

    ofGender(gender: Gender): number {
        return this.totalsByReligionAndGender[
            ReligionBitmasks.All | gender.bitmask
        ];
    }

    ofAll(): number {
        return this.totalsByReligionAndGender[
            ReligionBitmasks.All | GenderBitmasks.All
        ];
    }

    getGenderRatioOfReligion(religion: Religion): number | undefined {
        const totalWomen = this.totalsByReligionAndGender[
            religion.bitmask | GenderBitmasks.Women
        ];

        const totalAll = this.totalsByReligionAndGender[
            religion.bitmask | GenderBitmasks.All
        ];

        return totalAll === 0 ? undefined : totalWomen / totalAll;
    }
}

export interface ReadonlyNameCounts {
    ofDemographicGroup(group: DemographicGroup): number;

    ofReligionAndGender(religion: Religion, gender: Gender): number;

    ofReligion(religion: Religion): number;

    ofGender(gender: Gender): number;

    ofAll(): number;

    getGenderRatioOfReligion(religion: Religion): number | undefined;
}
