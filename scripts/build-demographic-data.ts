// TODO: Cleanup 🍝
// TODO: Setup data build pipeline
// TODO: Support dynamic year ranges
// TODO: Consider optimization *later* (e.g. quickselect variants instead of sort)

import { readFileSync, writeFileSync } from 'fs';

import { NameCsvRepository } from './../src/app/names/name-csv-repository';
import { environment } from './../src/environments/environment';
import { getTotalByYearPeriod, NameRecord } from '@shared/models/name-records';
import { SingleDemographic, DemographicStats, DemographicPeriodStats, religions, genders } from '@shared/models/demographics';
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

function clamp(minValue: number, value: number, maxValue: number) {
  return Math.max(minValue, Math.min(value, maxValue));
}


function lastIdxOfQuantile(fraction: number, length: number) {
  return clamp(1, Math.ceil(fraction * length), length) - 1;
}

// Simple "higher" interpolation quantile threshold
function computeQuantileThresholds(sortedValues: Entry[], fractions: number[]): number[] {
  return fractions.map(f =>
    sortedValues[lastIdxOfQuantile(f, sortedValues.length)].total
  );
}

function computeQuantileTotals(sortedValues: Entry[], fractions: number[]): number[] {
  const totals = fractions.map(() => 0);

  let curIdx = 0;
  for (const [i, f] of fractions.entries()) {
    const lastIdx = lastIdxOfQuantile(f, sortedValues.length);

    while (curIdx <= lastIdx) {
      totals[i] += sortedValues[curIdx++].total;
    }
  }

  return totals;
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
    2
  );

  const byReligionAndGender = {} as DemographicPeriodStats['byReligionAndGender'];

  for (const religion of religions) {
    byReligionAndGender[religion.slug] = Object.fromEntries(
      genders.map(gender => [gender.slug, []])
    ) as any;

    for (const gender of genders) {
      const demographicBitmask = religion.bitmask | gender.bitmask;

      const entries = entriesByDemographic.get(demographicBitmask)
        ?? collectEntries(entriesGroupedByName, demographicBitmask);

      if (entries.length < 100) {
        console.warn(
          `Less than 100 entries for [${religion.slug}][${gender.slug}}].`
          + ' Things may break.'
        );
      }

      measure(
        () => sortEntries(entries),
        `buildDemographicData__[${religion.slug}][${gender.slug}]__sortEntries`,
        2
      );

      const quantileThresholds = measure(
        () => computeQuantileThresholds(entries, quantileFractions),
        `buildDemographicData__[${religion.slug}][${gender.slug}]__computeQuantileThresholds`,
        3
      );

      const quantileTotals = measure(
        () => computeQuantileTotals(entries, quantileFractions),
        `buildDemographicData__[${religion.slug}][${gender.slug}]__computeQuantileTotals`,
        3
      );

      const topNameCount = (
        entries.length > 1000
        && quantileThresholds[quantileThresholds.length - 2] > 100
      ) ? 20 : 10;
      const topNames = entries.slice(-topNameCount).reverse();


      byReligionAndGender[religion.slug][gender.slug] = {
        nameTotal: entries.length,
        populationTotal: entries.reduce((acc, cur) => acc + cur.total, 0),
        quantileThresholds,
        quantileTotals,
        topNames,
      };
    }
  }

  const result = {
    yearPeriod,
    byReligionAndGender,
  } as DemographicPeriodStats;

  return result;
}


const MAX_LOG_VERBOSITY = 0;

function measure<T>(cb: () => T, label: string, verbosity: number = 0): T {
  // if (global.gc) {
  //   global.gc();
  // } else {
  //   console.warn("Garbage collection not exposed. Launch Node.js with --expose-gc flag.");
  // }

  let res: T;
  if (verbosity <= MAX_LOG_VERBOSITY) {
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
  periods: periodsData,
} as DemographicStats;

const savePath = `${dataPath}/demographic-stats.json`;

console.log(`Saving demographic stats in ${savePath}...`)

writeFileSync(
  savePath,
  JSON.stringify(stats),
  'utf8'
);
