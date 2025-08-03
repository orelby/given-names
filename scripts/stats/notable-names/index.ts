import {
    DemographicGroup, Gender, genders, Religion, religions
} from "@shared/models/demographics";
import { NameRecord } from "@shared/models/name-records";
import { previousYear } from "@shared/models/year-periods";
import {
    buildPeriodStats, isGeneration, isYear,
    DetailedDemographicGroupStats, DetailedSinglePeriodStats,
} from "../period";
import { PeakEntry, processPeriodPeaks } from "./peak";
import { processBiggestFractionChanges } from "./fraction-diff";
import {
    collectCandidateGenderRatioNames, collectCandidateReligionRatioNames,
    processBiggestGenderRatioChanges, processBiggestReligionRatioChanges
} from "./ratio-diff";

export function annotateWithNotableNames(
    periodsStats: readonly DetailedSinglePeriodStats[],
    recordsByName: ReadonlyMap<string, ReadonlyArray<NameRecord>>
): void {
    annotateGenerations(periodsStats);
    annotateYears(periodsStats, recordsByName);
}

function annotateGenerations(
    periodsData: readonly DetailedSinglePeriodStats[]
) {
    const allGenStats = periodsData
        .filter(p => isGeneration(p.yearPeriod))
        .sort((a, b) => a.yearPeriod.end - b.yearPeriod.end);

    for (const religion of religions) {
        for (const gender of genders) {
            const peakPeriodByName = new Map<string, PeakEntry>();

            let prevPeriodStats: DetailedSinglePeriodStats | null = null;
            for (const curPeriodStats of allGenStats) {
                annotatePeriod(
                    religion,
                    gender,
                    curPeriodStats,
                    prevPeriodStats,
                    peakPeriodByName
                );

                prevPeriodStats = curPeriodStats;
            }

            processPeriodPeaks(peakPeriodByName);
        }
    }
}

function annotateYears(
    yearsStats: readonly DetailedSinglePeriodStats[],
    recordsByName: ReadonlyMap<string, readonly NameRecord[]>
) {
    const allYearStats = yearsStats
        .filter(p => isYear(p.yearPeriod))
        .sort((a, b) => a.yearPeriod.end - b.yearPeriod.end);

    const preFirstYearPeriod = previousYear(allYearStats[0].yearPeriod);

    const preFirstYearStats = preFirstYearPeriod
        ? buildPeriodStats(preFirstYearPeriod, recordsByName)
        : null;

    if (preFirstYearStats) {
        allYearStats.unshift(preFirstYearStats);
    }

    for (const religion of religions) {
        for (const gender of genders) {
            let prevPeriodStats: DetailedSinglePeriodStats | null = null;

            for (const curPeriodStats of allYearStats) {
                annotatePeriod(
                    religion,
                    gender,
                    curPeriodStats,
                    prevPeriodStats
                );

                prevPeriodStats = curPeriodStats;
            }
        }
    }
}

function annotatePeriod(
    religion: Religion,
    gender: Gender,
    curPeriodStats: DetailedSinglePeriodStats,
    prevPeriodStats: DetailedSinglePeriodStats | null,
    peakPeriodByName?: Map<string, PeakEntry>
): void {
    const demographic = religion.bitmask | gender.bitmask;

    const curGroupStats = curPeriodStats
        .byReligionAndGender[religion.slug][gender.slug];

    collectCandidatePeriodNames(demographic, curGroupStats, peakPeriodByName);

    if (gender.slug === 'all') {
        collectCandidateGenderRatioNames(religion, curGroupStats);
    }

    // if (religion.slug !== 'all') {
    //     collectCandidateReligionRatioNames(religion, gender, curGroupStats);
    // }

    if (!prevPeriodStats) return;

    const prevGroupStats = prevPeriodStats
        .byReligionAndGender[religion.slug][gender.slug];

    processBiggestFractionChanges(curGroupStats, prevGroupStats);

    if (gender.slug === 'all') {
        processBiggestGenderRatioChanges(curGroupStats, prevGroupStats);
    }

    // if (religion.slug !== 'all') {
    //     processBiggestReligionRatioChanges(curGroupStats, prevGroupStats);
    // }
}

function collectCandidatePeriodNames(
    demographic: DemographicGroup,
    groupStats: DetailedDemographicGroupStats,
    peakPeriodByName?: Map<string, PeakEntry>,
): void {
    const minPeakFraction = 0.00_1;
    const minPeakTotal = Math.max(50, minPeakFraction * groupStats.populationTotal);

    const fractionByName = new Map<string, number>();

    for (const entry of groupStats.entries!) {
        const total = entry.ofDemographicGroup(demographic);
        const fraction = total / groupStats.populationTotal;

        fractionByName.set(entry.name, fraction);

        if (!peakPeriodByName) continue;

        const curPeak = peakPeriodByName?.get(entry.name);

        if (total >= minPeakTotal
            && (!curPeak || fraction > curPeak.fraction)) {
            peakPeriodByName.set(entry.name, { fraction, groupStats });
        }
    }

    groupStats.fractionByName = fractionByName;
}
