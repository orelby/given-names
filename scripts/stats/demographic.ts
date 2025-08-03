import { DemographicGroup } from "@shared/models/demographics";
import { NameRecord } from "@shared/models/name-records";
import { SingleNameCounts } from "@shared/models/stats/name-counts";
import { YearPeriod } from "@shared/models/year-periods";

export type Entries = SingleNameCounts[];

export type EntriesByDemographic = ReadonlyMap<DemographicGroup, Entries>;

export function buildEntries(
    byName: ReadonlyMap<string, ReadonlyArray<NameRecord>>,
    yearPeriod: YearPeriod
): EntriesByDemographic {
    const nameCountsByDemographic
        = new Map<DemographicGroup, SingleNameCounts[]>();

    for (const [name, records] of byName.entries()) {
        const nameCounts = new SingleNameCounts(name)
            .withRecords(records, yearPeriod);

        for (const record of records) {
            const demographic = record.demographic;

            if (nameCounts.ofDemographicGroup(demographic) === 0) {
                continue;
            }

            if (!nameCountsByDemographic.has(demographic)) {
                nameCountsByDemographic.set(demographic, []);
            }

            nameCountsByDemographic.get(demographic)!.push(nameCounts);
        }
    }
    return nameCountsByDemographic;
}

export function collectEntries(
    entriesByDemographic: EntriesByDemographic,
    demographicBitmask: number
): Entries {
    const nameCountsArrays: Entries[] = [];

    for (const [curDemographic, curEntries] of entriesByDemographic.entries()) {
        if ((curDemographic & demographicBitmask) === curDemographic) {
            nameCountsArrays.push(curEntries);
        }
    }

    return Array.from(
        new Set(([] as Entries).concat(...nameCountsArrays))
    );
}

export function sortEntries(
    entries: Entries,
    demographic: DemographicGroup
): void {
    entries.sort((a, b) => (
        a.ofDemographicGroup(demographic)
        - b.ofDemographicGroup(demographic)
    ));
}
