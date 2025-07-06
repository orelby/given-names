export const START_YEAR = 1948;
export const END_YEAR = 2023; // TODO: decouple

export interface YearPeriod {
    start: number;
    end: number;
    description?: string;
}

export const fullDataPeriod: YearPeriod = {
    start: START_YEAR,
    end: END_YEAR,
    description: "כל הנתונים",
};

export const generations: readonly YearPeriod[] = [
    {
        start: 2013,
        end: Math.min(END_YEAR, 2024),
        description: "דור האלפא"
    },
    {
        start: 1997,
        end: 2012,
        description: "דור ה־Z"
    },
    {
        start: 1981,
        end: 1996,
        description: "דור ה־Y"
    },
    {
        start: 1965,
        end: 1980,
        description: "דור ה־X"
    },
    {
        start: START_YEAR,
        end: 1964,
        description: "דור הבייבי בום"
    }
];

export const recentYearPeriods: readonly YearPeriod[] = [
    {
        start: END_YEAR,
        end: END_YEAR,
        description: "שנת נתונים אחרונה"
    },
    {
        start: END_YEAR - 4,
        end: END_YEAR,
        description: "5 שנים אחרונות"
    },
]

export const yearPeriods: readonly YearPeriod[] = [
    fullDataPeriod,
    ...recentYearPeriods,
    ...generations
];
