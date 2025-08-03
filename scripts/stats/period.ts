import { NameRecord } from '@shared/models/name-records';
import { religions, genders, Religion, Gender } from '@shared/models/demographics';
import { YearPeriod, GENERATIONS } from '@shared/models/year-periods';
import { DemographicGroupStats, SinglePeriodStats } from '@shared/models/stats/period-stats';
import { SingleNameCounts } from '@shared/models/stats/name-counts';
import { TimingVerbosity, withTiming } from 'scripts/utils/with-timing';
import { buildEntries, collectEntries, sortEntries } from './demographic';
import { computeQuantileTotals, getQuantileThresholds, quantileFractions } from './quantile';

export function buildPeriodStats(
    yearPeriod: YearPeriod,
    byName: ReadonlyMap<string, ReadonlyArray<NameRecord>>
): DetailedSinglePeriodStats {
    const entriesByDemographic = withTiming(
        () => buildEntries(byName, yearPeriod),
        'buildPeriodStats__buildEntries',
        TimingVerbosity.MediumLow
    );

    const byReligionAndGender = {} as DetailedSinglePeriodStats['byReligionAndGender'];

    for (const religion of religions) {
        byReligionAndGender[religion.slug] = {} as any;

        for (const gender of genders) {
            const demographicBitmask = religion.bitmask | gender.bitmask;

            const groupNameCounts = entriesByDemographic.get(demographicBitmask)
                ?? collectEntries(entriesByDemographic, demographicBitmask);

            if (groupNameCounts.length < 100) {
                console.warn(
                    `Less than 100 entries for [${religion.slug}][${gender.slug}}].`
                    + ' Things may break.'
                );
            }

            withTiming(
                () => sortEntries(groupNameCounts, demographicBitmask),
                `buildPeriodStats[${religion.slug}][${gender.slug}]__sortEntries`,
                TimingVerbosity.Medium
            );

            const quantileThresholds = withTiming(
                () => getQuantileThresholds(
                    groupNameCounts,
                    quantileFractions,
                    demographicBitmask
                ),
                `buildPeriodStats[${religion.slug}][${gender.slug}]__computeQuantileThresholds`,
                TimingVerbosity.MediumHigh
            );

            const quantileTotals = withTiming(
                () => computeQuantileTotals(
                    groupNameCounts,
                    quantileFractions,
                    demographicBitmask
                ),
                `buildPeriodStats__[${religion.slug}][${gender.slug}]__computeQuantileTotals`,
                TimingVerbosity.MediumHigh
            );

            const topNameCount = (
                groupNameCounts.length > 100
                && groupNameCounts.at(-20)!.ofDemographicGroup(demographicBitmask) >= 50
            ) ? 20 : 10;

            const topNames = groupNameCounts.slice(-topNameCount).reverse()
                .map(nameCounts => ({
                    name: nameCounts.name,
                    total: nameCounts.ofDemographicGroup(demographicBitmask),
                }));

            byReligionAndGender[religion.slug][gender.slug] = {
                nameTotal: groupNameCounts.length,
                populationTotal: groupNameCounts.reduce((acc, cur) => (
                    acc + cur.ofDemographicGroup(demographicBitmask)
                ), 0),
                quantileThresholds,
                quantileTotals,
                topNames,
                entries: groupNameCounts,
            };
        }
    }

    const result: DetailedSinglePeriodStats = {
        yearPeriod,
        byReligionAndGender,
    };

    return result;
}

export function isGeneration(period: YearPeriod) {
    return GENERATIONS.some(g => period.start === g.start && period.end === g.end);
}

export function isYear(period: YearPeriod) {
    return period.start === period.end;
}

export function stripDetailedEntries(
    periodsStats: DetailedSinglePeriodStats[]
): SinglePeriodStats[] {
    for (const periodStats of periodsStats) {
        const byReligionAndGender = periodStats.byReligionAndGender;

        for (const religion of religions) {
            const byGender = byReligionAndGender[religion.slug];

            for (const gender of genders) {
                const groupStats = byGender[gender.slug];
                (groupStats as any).entries = undefined;
                groupStats.fractionByName = undefined;
                groupStats.genderRatioByName = undefined;
                groupStats.religionRatioByName = undefined;
            }
        }
    }

    return periodsStats;
}

export interface DetailedSinglePeriodStats {
    yearPeriod: YearPeriod,
    byReligionAndGender: Record<
        Religion['slug'],
        Record<Gender['slug'], DetailedDemographicGroupStats>
    >;
}

export interface DetailedDemographicGroupStats extends DemographicGroupStats {
    entries: readonly SingleNameCounts[];
    fractionByName?: ReadonlyMap<string, number>;
    genderRatioByName?: ReadonlyMap<string, number>;
    religionRatioByName?: ReadonlyMap<string, number>;
}
