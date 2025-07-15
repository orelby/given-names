export const START_YEAR = 1948;
export const END_YEAR = 2023; // TODO: decouple

// TODO: sepearate required fields
export interface YearPeriod {
    start: number;
    end: number;
    slug: string;
    description: string;
}

export const FULL_DATA_PERIOD: YearPeriod = {
    start: START_YEAR,
    end: END_YEAR,
    slug: 'all',
    description: 'כל הנתונים',
};

export const GENERATIONS: readonly YearPeriod[] = [
    {
        start: 2013,
        end: Math.min(END_YEAR, 2024),
        slug: 'gen-alpha',
        description: 'דור האלפא',
    },
    {
        start: 1997,
        end: 2012,
        slug: 'gen-z',
        description: 'דור ה־Z',
    },
    {
        start: 1981,
        end: 1996,
        slug: 'gen-y',
        description: 'דור ה־Y',
    },
    {
        start: 1965,
        end: 1980,
        slug: 'gen-x',
        description: 'דור ה־X',
    },
    {
        start: START_YEAR,
        end: 1964,
        slug: 'gen-baby-boom',
        description: 'דור הבייבי בום',
    }
];

export const RECENT_YEAR_PERIODS: readonly YearPeriod[] = [
    {
        start: END_YEAR,
        end: END_YEAR,
        slug: '1y',
        description: 'שנה אחרונה',
    },
    {
        start: END_YEAR - 4,
        end: END_YEAR,
        slug: '5y',
        description: '5 שנים אחרונות'
    },
]

export const YEAR_PERIODS: readonly YearPeriod[] = [
    FULL_DATA_PERIOD,
    ...RECENT_YEAR_PERIODS,
    ...GENERATIONS
];
