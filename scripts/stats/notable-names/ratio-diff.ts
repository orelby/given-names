import { Religion, Gender } from '@shared/models/demographics';
import { DetailedDemographicGroupStats } from '../period';
import { biggestNameRatioChanges } from './helpers';

export function collectCandidateGenderRatioNames(
    religion: Religion,
    curGroupStats: DetailedDemographicGroupStats
) {
    const minTotal = Math.max(
        25,
        0.00_005 * curGroupStats.populationTotal
    );

    const ratioByName = new Map<string, number>();

    for (const entry of curGroupStats.entries!) {
        const ratio = entry.getGenderRatio(religion);
        if (ratio !== undefined && entry.ofReligion(religion) >= minTotal) {
            ratioByName.set(entry.name, ratio);
        }
    }

    curGroupStats.genderRatioByName = ratioByName;
}

export function processBiggestGenderRatioChanges(
    curReligionStats: DetailedDemographicGroupStats,
    prevReligionStats: DetailedDemographicGroupStats
) {
    const ratioByName = curReligionStats.genderRatioByName;
    const prevRatioByName = prevReligionStats.genderRatioByName;

    if (!ratioByName || !prevRatioByName) {
        throw new TypeError("Group stats missing genderRatioByName");
    }

    const fractionByName = curReligionStats.fractionByName;
    const prevFractionByName = prevReligionStats.fractionByName;

    if (!fractionByName || !prevFractionByName) {
        throw new Error("Group stats missing fractionByName");
    }

    const minRatioDiff = 0.1;

    const minFraction = Math.max(
        0.00_005,
        25 / curReligionStats.populationTotal
    );

    const { rising, falling } = biggestNameRatioChanges(
        ratioByName,
        fractionByName,
        prevRatioByName,
        prevFractionByName,
        minRatioDiff,
        minFraction
    );

    curReligionStats.risingWomenRatioNames = rising;
    curReligionStats.risingMenRatioNames = falling;
}

export function collectCandidateReligionRatioNames(
    religion: Religion,
    gender: Gender,
    curGroupStats: DetailedDemographicGroupStats
) {
    const minTotal = Math.max(
        50,
        0.00_01 * curGroupStats.populationTotal
    );

    const ratioByName = new Map<string, number>();

    for (const entry of curGroupStats.entries!) {
        const ratio = entry.getReligionRatio(religion, gender);
        if (ratio !== undefined && entry.ofGender(gender) >= minTotal) {
            ratioByName.set(entry.name, ratio);
        }
    }

    curGroupStats.religionRatioByName = ratioByName;
}

export function processBiggestReligionRatioChanges(
    curGroupStats: DetailedDemographicGroupStats,
    prevGroupStats: DetailedDemographicGroupStats
) {
    const ratioByName = curGroupStats.religionRatioByName;
    const prevRatioByName = prevGroupStats.religionRatioByName;

    if (!ratioByName || !prevRatioByName) {
        throw new TypeError("Group stats missing religionRatioByName");
    }

    const fractionByName = curGroupStats.fractionByName;
    const prevFractionByName = prevGroupStats.fractionByName;

    if (!fractionByName || !prevFractionByName) {
        throw new Error("Group stats missing fractionByName");
    }

    const minRatioDiff = 0.1;

    const minFraction = Math.max(
        0.00_005,
        25 / curGroupStats.populationTotal
    );

    const { rising, falling } = biggestNameRatioChanges(
        ratioByName,
        fractionByName,
        prevRatioByName,
        prevFractionByName,
        minRatioDiff,
        minFraction
    );

    curGroupStats.risingReligionRatioNames = rising;
    curGroupStats.fallingReligionRatioNames = falling;
}
