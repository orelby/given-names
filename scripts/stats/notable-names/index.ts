import {
    DemographicGroup, Gender, genders, Religion, religions
} from "@shared/models/demographics";
import { SinglePeriodStats } from "@shared/models/stats/period-stats";
import { DetailedDemographicGroupStats, isGeneration } from "../period";
import { PeakEntry, processPeriodPeaks } from "./peak";
import { processBiggestFractionChanges } from "./fraction-diff";
import {
    collectCandidateGenderRatioNames, collectCandidateReligionRatioNames,
    processBiggestGenderRatioChanges, processBiggestReligionRatioChanges
} from "./ratio-diff";

export function annotateWithNotableNames(periodsData: SinglePeriodStats[]): void {
    const allGenStats = periodsData
        .filter(p => isGeneration(p.yearPeriod))
        .sort((a, b) => a.yearPeriod.end - b.yearPeriod.end);

    for (const religion of religions) {
        for (const gender of genders) {
            const peakPeriodByName = new Map<string, PeakEntry>();

            let prevPeriodStats: SinglePeriodStats | null = null;
            for (const curPeriodStats of allGenStats) {
                annotatePeriodWithNotableNames(
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

function annotatePeriodWithNotableNames(
    religion: Religion,
    gender: Gender,
    curPeriodStats: SinglePeriodStats,
    prevPeriodStats: SinglePeriodStats | null,
    peakPeriodByName: Map<string, PeakEntry>
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
    peakPeriodByName: Map<string, PeakEntry>,
): void {
    const minPeakFraction = 0.00_1;
    const minPeakTotal = Math.max(50, minPeakFraction * groupStats.populationTotal);

    const fractionByName = new Map<string, number>();

    for (const entry of groupStats.entries!) {
        const curPeak = peakPeriodByName.get(entry.name);
        const total = entry.ofDemographicGroup(demographic);
        const fraction = total / groupStats.populationTotal;

        fractionByName.set(entry.name, fraction);

        if (total >= minPeakTotal
            && (!curPeak || fraction > curPeak.fraction)) {
            peakPeriodByName.set(entry.name, { fraction, groupStats });
        }
    }

    groupStats.fractionByName = fractionByName;
}
