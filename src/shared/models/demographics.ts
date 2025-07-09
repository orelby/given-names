import { YearPeriod } from "./year-periods";

/**
 * Bitmask of at least one specific gender and one specific religion.
 */
export type Demographic = number;

/**
 * Bitmask of a single specific gender with a single specific religion.
 */
export type SingleDemographic = number;

export const GenderBitmasks = {
    All: 0b11,
    Men: 1,
    Women: 2
} as const;

export const ReligionBitmasks = {
    All: 0b111100,
    Jewish: 4,
    Muslim: 8,
    Christian: 16,
    Druze: 32
} as const;

export type GenderBitmask = typeof GenderBitmasks[keyof typeof GenderBitmasks];

export type ReligionBitmask = typeof ReligionBitmasks[keyof typeof ReligionBitmasks];

export const genders = [
    {
        bitmask: GenderBitmasks.All,
        text: "כולם",
        slug: "all",
        icon: "groups",
    },
    {
        bitmask: GenderBitmasks.Men,
        text: "בנים",
        slug: "men",
        icon: "boy",
    },
    {
        bitmask: GenderBitmasks.Women,
        text: "בנות",
        slug: "women",
        icon: "girl",
    },
] as const;

export const religions = [
    {
        bitmask: ReligionBitmasks.All,
        text: "כולם",
        slug: "all",
        icon: "",
    },
    {
        bitmask: ReligionBitmasks.Jewish,
        text: "יהודים",
        slug: "jewish",
        icon: "✡",
    },
    {
        bitmask: ReligionBitmasks.Muslim,
        text: "מוסלמים",
        slug: "muslim",
        icon: "☪",
    },
    {
        bitmask: ReligionBitmasks.Druze,
        text: "דרוזים",
        slug: "druze",
        icon: "⭐",
    },
    {
        bitmask: ReligionBitmasks.Christian,
        text: "נוצרים",
        slug: "christian",
        icon: "✝",
    },
] as const;

export type Gender = typeof genders[number];

export type Religion = typeof religions[number];

export const DEFAULT_DEMOGRAPHIC: Demographic = ReligionBitmasks.Jewish | GenderBitmasks.All;

export function parseGender(value: string): GenderBitmask {
    if (!(value in GenderBitmasks)) {
        throw new Error(`Unknown gender: ${value}`);
    }
    return GenderBitmasks[value as keyof typeof GenderBitmasks];
}

export function parseReligion(value: string): ReligionBitmask {
    if (!(value in ReligionBitmasks)) {
        throw new Error(`Unknown religion: ${value}`);
    }
    return ReligionBitmasks[value as keyof typeof ReligionBitmasks];
}

export function getDemographicDescription(religion: Religion, gender: Gender) {
    const parts = [];

    if (gender.bitmask !== GenderBitmasks.All) {
        parts.push(gender.text);
    }

    if (religion.bitmask !== ReligionBitmasks.All) {
        if (gender.bitmask === GenderBitmasks.Women) {
            parts.push(religion.text.replace('ם', 'ות'));
        } else {
            parts.push(religion.text);
        }
    }

    return parts.join(' ');
}

export interface DemographicGroupStats {
    nameTotal: number;
    populationTotal: number;
    quantileThresholds: number[];
    quantileTotals: number[];
    topNames: {
        name: string;
        total: number
    }[];
}

export interface DemographicPeriodStats {
    yearPeriod: YearPeriod,
    byReligionAndGender: Record<
        Religion['slug'],
        Record<
            Gender['slug'],
            DemographicGroupStats
        >
    >;
}

export interface DemographicStats {
    quantileLabels: {
        type: 'decile' | 'percentile',
        value: number
    }[];
    periods: readonly DemographicPeriodStats[];
}
