// TODO: Cleanup 🍝
// TODO: Setup data build pipeline
// TODO: Support dynamic year ranges
// TODO: Consider optimization *later* (e.g. quickselect variants instead of sort)

import { readFileSync, writeFileSync } from 'fs';

import { NameCsvRepository } from './../src/app/names/name-csv-repository';
import { environment } from './../src/environments/environment';
import { getTotalByYearPeriod, NameRecord } from '@shared/models/name-records';
import { GenderBitmasks, ReligionBitmasks, SingleDemographic, DemographicStats, DemographicGroupStats, DemographicPeriodStats } from '@shared/models/demographics';
import { religionNames, genderNames } from '@shared/models/demographics';
import { YearPeriod, yearPeriods } from '@shared/models/year-periods';


const dataPath = `./public/${environment.dataPath}`;
const repo = new NameCsvRepository();
const csvText = readFileSync(`${dataPath}/given-names.csv`, 'utf-8');
repo.loadFromCsv(csvText);

interface Entry {
  name: string;
  total: number;
}

interface DemographicEntry extends Entry {
  demographic: SingleDemographic;
}

const quantileFractions = [
  ...Array.from({ length: 9 }, (_, i) => (i + 1) * 0.1),
  ...Array.from({ length: 10 }, (_, i) => 0.9 + (i + 1) * 0.01)
].map(num => Number(num.toFixed(2)));

const quantileLabels: DemographicStats['quantileLabels'] = quantileFractions.map(num => {
  const percentile = Math.round(num * 100);

  return {
    type: "percentile",
    value: percentile
  }
});

// Simple "higher" interpolation quantile
function computeQuantiles(sortedValues: Entry[], fractions: number[]): number[] {
  return fractions.map(f => {
    const idx = Math.min(Math.max(0, Math.ceil(f * sortedValues.length) - 1), sortedValues.length - 1);
    return sortedValues[idx].total;
  });
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

function buildEntries(
  byName: ReadonlyMap<string, ReadonlyArray<NameRecord>>,
  yearPeriod: YearPeriod
) {
  const entriesByDemographic = new Map<SingleDemographic, Entry[]>();
  const entriesGroupedByName: DemographicEntry[][] = [];

  for (const [name, records] of byName.entries()) {
    const entries = [] as DemographicEntry[];

    for (const record of records) {
      const key = record.demographic;
      if (!entriesByDemographic.has(key)) entriesByDemographic.set(key, []);

      const total = getTotalByYearPeriod(record, yearPeriod);
      if (total === 0) continue;
      const entry = {
        name,
        demographic: record.demographic,
        total,
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

function buildDemographicData(
  byName: ReadonlyMap<string, ReadonlyArray<NameRecord>>,
  yearPeriod: YearPeriod
): DemographicPeriodStats {

  const { entriesByDemographic, entriesGroupedByName } = measure(
    () => buildEntries(byName, yearPeriod),
    'buildDemographicData__buildEntries',
    false
  );

  const byReligionAndGender = {} as DemographicPeriodStats['byReligionAndGender'];

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
        nameTotal: entries.length,
        populationTotal: entries.reduce((acc, cur) => acc + cur.total, 0),
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
    yearPeriod,
    byReligionAndGender,
  } as DemographicPeriodStats;

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
    console.log(`${label}: ${(timeEnd - timeStart).toFixed(3)}ms`);
  } else {
    res = cb();
  }
  return res;
}

const nameRecordsGroupedByName = repo.getAllByName();

const periodsData = yearPeriods.map(period => {
  return measure(
    () => buildDemographicData(nameRecordsGroupedByName, period),
    `Built demographic stats for ${period.start}-${period.end} in`
  );
})

const stats = {
  quantileLabels,
  periodsData,
} as DemographicStats;

const savePath = `${dataPath}/demographic-stats.json`;

console.log(`Saving demographic stats in ${savePath}...`)

writeFileSync(
  savePath,
  JSON.stringify(stats),
  'utf8'
);
