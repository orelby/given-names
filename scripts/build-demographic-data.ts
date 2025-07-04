// TODO: Cleanup 🍝
// TODO: Setup data build pipeline
// TODO: Support dynamic year ranges
// TODO: Consider optimization *later* (e.g. quickselect variants instead of sort)

import { readFileSync, writeFileSync } from 'fs';

import { NameCsvRepository } from './../src/app/names/name-csv-repository';
import { environment } from './../src/environments/environment';
import { NameRecord, START_YEAR } from '@shared/models/name-records';
import { GenderBitmasks, ReligionBitmasks, SingleDemographic } from '@shared/models/demographics';

type ReligionName = keyof typeof ReligionBitmasks;
type GenderName = keyof typeof GenderBitmasks;

const religionNames = Array.from(Object.keys(ReligionBitmasks)) as ReligionName[];
const genderNames = Array.from(Object.keys(GenderBitmasks)) as GenderName[];

const repo = new NameCsvRepository();
const csvText = readFileSync(`.${environment.dataPath}/given-names.csv`, 'utf-8');
repo.loadFromCsv(csvText);

interface Entry {
  name: string;
  total: number;
}

interface DemographicEntry extends Entry {
  demographic: SingleDemographic;
}

const quantileFractions = [
  ...Array.from({ length: 8 }, (_, i) => (i + 1) * 0.1),
  ...Array.from({ length: 10 }, (_, i) => 0.9 + i * 0.01)
].map(num => Number(num.toFixed(2)));

const quantileLabels: DemographicStats['quantileLabels'] = quantileFractions.map(
  num => num < 0.89 ? {
    type: "decile",
    value: Math.round(num * 10)
  } : {
    type: "percentile",
    value: Math.round(num * 100)
  }
);

// Simple "lower" interpolation quantile
function computeQuantiles(sortedValues: Entry[], fractions: number[]): number[] {
  return fractions.map(f => {
    const idx = Math.max(0, Math.floor(f * (sortedValues.length - 1)));
    return sortedValues[idx].total;
  });
}

function getValueFromRecord(record: NameRecord): number {
  return record.total;
}

function getValueFromEntries(
  entries: ReadonlyArray<DemographicEntry>,
  demographicBitmask: number
): number {
  let value = 0;
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    if ((entry.demographic & demographicBitmask) === entry.demographic) {
      value += entry.total;
    }
  }
  return value;
}

function buildEntries(byName: ReadonlyMap<string, ReadonlyArray<NameRecord>>) {
  const entriesByDemographic = new Map<SingleDemographic, Entry[]>();
  const entriesGroupedByName: DemographicEntry[][] = [];

  for (const [name, records] of byName.entries()) {
    const entries = [] as DemographicEntry[];

    for (const record of records) {
      const key = record.demographic;
      if (!entriesByDemographic.has(key)) entriesByDemographic.set(key, []);
      const entry = {
        name,
        demographic: record.demographic,
        total: getValueFromRecord(record),
      };
      entriesByDemographic.get(key)!.push(entry);
      entries.push(entry);
    }

    entriesGroupedByName.push(entries);
  }
  return { entriesByDemographic, entriesGroupedByName };
}

function sortEntries(entries: Entry[]) {
  return entries.sort((a, b) => a.total - b.total);
}

function collectEntries(
  entriesGroupedByName: DemographicEntry[][],
  demographicBitmask: number
): Entry[] {
  return entriesGroupedByName.reduce(
    (acc, entries) => {
      const value = getValueFromEntries(entries, demographicBitmask);
      if (value !== 0) {
        acc.push({ name: entries[0].name, total: value });
      };
      return acc;
    },
    [] as Entry[]
  );
}

interface DemographicGroupStats {
  quantiles: number[];
  topNames: Entry[];
}

interface DemographicStats {
  startYear: number;
  endYear: number;
  quantileLabels: {
    type: 'decile' | 'percentile',
    value: number
  }[];
  byReligionAndGender: Record<
    ReligionName,
    Record<GenderName, DemographicGroupStats>
  >;
}

function buildDemographicData(byName: ReadonlyMap<string, ReadonlyArray<NameRecord>>): DemographicStats {

  const { entriesByDemographic, entriesGroupedByName } = measure(
    () => buildEntries(byName),
    'buildDemographicData__buildEntries',
    false
  );

  const byReligionAndGender = {} as DemographicStats['byReligionAndGender'];

  for (const religionName of religionNames) {
    const religionBitmask = ReligionBitmasks[religionName];

    byReligionAndGender[religionName] = Object.fromEntries(
      genderNames.map(n => [n, []])
    ) as any;

    for (const genderName of genderNames) {
      const genderBitmask = GenderBitmasks[genderName];
      const demographicBitmask = religionBitmask | genderBitmask;

      const entries = entriesByDemographic.get(demographicBitmask)
        ?? collectEntries(entriesGroupedByName, demographicBitmask);

      measure(
        () => sortEntries(entries),
        `buildDemographicData__[${religionName}][${genderName}]__sortEntries`,
        false
      );

      byReligionAndGender[religionName][genderName] = {
        quantiles: measure(
          () => computeQuantiles(entries, quantileFractions),
          `buildDemographicData__[${religionName}][${genderName}]__computeQuantiles`,
          false
        ),
        topNames: entries.slice(-10).reverse(),
      };
    }
  }

  const result = {
    startYear: START_YEAR,
    endYear: START_YEAR + byName.get(entriesGroupedByName[0][0].name)![0].yearTotals.length - 1,
    quantileLabels,
    byReligionAndGender,
  } as DemographicStats;

  return result;
}

function measure<T>(cb: () => T, label: string, shouldLog: boolean = true): T {
  // if (global.gc) {
  //   global.gc();
  // } else {
  //   console.warn("Garbage collection not exposed. Launch Node.js with --expose-gc flag.");
  // }

  let res: T;
  if (shouldLog) {
    const timeStart = performance.now();
    res = cb();
    const timeEnd = performance.now();
    console.log(`${label}: ${timeEnd - timeStart}ms`);
  } else {
    res = cb();
  }
  return res;
}

const nameRecordsGroupedByName = repo.getAllByName();

const res = measure(() => buildDemographicData(nameRecordsGroupedByName), 'buildQuantileData');

writeFileSync(
  `.${environment.dataPath}/demographic-data.json`,
  JSON.stringify(res),
  'utf8'
);
