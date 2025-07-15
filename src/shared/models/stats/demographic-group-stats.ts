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
