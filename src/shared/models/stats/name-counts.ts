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

    protected readonly totalsByReligionAndGender: Record<DemographicGroup, number> =
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

    getReligionRatio(religion: Religion, gender?: Gender): number | undefined {
        const genderBitmask = gender ? gender.bitmask : GenderBitmasks.All;

        const totalReligion = this.totalsByReligionAndGender[
            religion.bitmask | genderBitmask
        ];

        const totalAll = this.totalsByReligionAndGender[
            ReligionBitmasks.All | genderBitmask
        ];

        return totalAll === 0 ? undefined : totalReligion / totalAll;
    }

    getGenderRatio(religion?: Religion): number | undefined {
        const religionBitmask = religion ? religion.bitmask : ReligionBitmasks.All;

        const totalWomen = this.totalsByReligionAndGender[
            religionBitmask | GenderBitmasks.Women
        ];

        const totalAll = this.totalsByReligionAndGender[
            religionBitmask | GenderBitmasks.All
        ];

        return totalAll === 0 ? undefined : totalWomen / totalAll;
    }
}

export class SingleNameCounts extends NameCounts {
    constructor(public readonly name: string) {
        super();
    }

    override withRecords(
        records: readonly NameCountsRecord[],
        period: YearPeriod = FULL_DATA_PERIOD
    ): this {
        const totals = this.totalsByReligionAndGender;

        for (const record of records) {
            const total = getTotalByYearPeriod(record, period);
            const dem = record.demographic;
            totals[dem] += total;
            totals[dem | GenderBitmasks.All] += total;
            totals[dem | ReligionBitmasks.All] += total;
            totals[ReligionBitmasks.All | GenderBitmasks.All] += total;
        }

        return this;
    }
}

export interface ReadonlyNameCounts {
    ofDemographicGroup(group: DemographicGroup): number;

    ofReligionAndGender(religion: Religion, gender: Gender): number;

    ofReligion(religion: Religion): number;

    ofGender(gender: Gender): number;

    ofAll(): number;

    getReligionRatio(religion: Religion, gender?: Gender): number | undefined;

    getGenderRatio(religion?: Religion): number | undefined;
}
