import {
    Demographic, ConcreteDemographicGroup,
    parseGender, parseReligion,
} from "@shared/models/demographics";
import { NameRecord, NameRecords } from "@shared/models/name-records";

export class NameCsvRepository {
    private byDemographic = new Map<ConcreteDemographicGroup, NameRecord[]>();

    private byName = new Map<string, NameRecord[]>();

    async loadFromCsv(
        csvText: string,
        shouldChunkLoad = false
    ): Promise<void> {
        const lines = csvText.split('\n');

        for (let i = 1; i < lines.length; i++) {
            if (shouldChunkLoad && (i & 1023) === 0) {
                await new Promise(resolve => setTimeout(resolve, 0));
                // await scheduler.yield();
            }

            const fields = lines[i].trim().split(',');

            if (fields.length < 5) continue;

            const [gender, religion, name, total, ...yearTotals] = fields;

            const demographic = parseGender(gender) | parseReligion(religion);

            const record: NameRecord = {
                demographic,
                name,
                total: Number(total),
                yearTotals: yearTotals.map(Number)
            };

            let records = this.byDemographic.get(demographic);
            if (records) {
                records.push(record);
            } else {
                this.byDemographic.set(demographic, [record]);
            }

            records = this.byName.get(name);
            if (records) {
                records.push(record);
            } else {
                this.byName.set(name, [record]);
            }
        }
    }

    getByName(name: string): NameRecords {
        return this.byName.get(name) ?? [];
    }

    getByNameAndDemographic(
        name: string,
        demographic: Demographic
    ): NameRecords | undefined {
        return this
            .getByName(name)
            .filter(r => demographic & r.demographic);
    }

    getByDemographic(demographic: ConcreteDemographicGroup): NameRecords {
        return this.byDemographic.get(demographic) ?? [];
    }

    getAllByName(): ReadonlyMap<string, readonly NameRecord[]> {
        return this.byName;
    }
}
