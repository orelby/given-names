// TODO: Cleanup 🍝
// TODO: Support dynamic year ranges
// TODO: Consider optimization *later* (e.g. quickselect variants instead of sort)
// TODO: Consider population-weighted quantiles

import { readFileSync, writeFileSync } from 'fs';
import { NameCsvRepository } from './../src/app/names/data-access/name-csv-repository';
import { environment } from './../src/environments/environment';
import { getTotalByYearPeriod, NameRecord } from '@shared/models/name-records';
import { DemographicGroup, religions, genders } from '@shared/models/demographics';
import { YearPeriod, YEAR_PERIODS, GENERATIONS } from '@shared/models/year-periods';
import { AllPeriodStats, SinglePeriodStats, QuantileLabel, NameEntry, DemographicGroupStats } from '@shared/models/stats/period-stats';


const dataPath = `./public/${environment.dataPath}`;
const repo = new NameCsvRepository();
const csvText = readFileSync(`${dataPath}/given-names.csv`, 'utf-8');
repo.loadFromCsv(csvText);

interface DemographicEntry extends NameEntry {
  demographic: DemographicGroup;
}

const quantileFractions = [
  ...Array.from({ length: 9 }, (_, i) => (i + 1) * 0.1),
  ...Array.from({ length: 10 }, (_, i) => 0.9 + (i + 1) * 0.01)
].map(num => Number(num.toFixed(2)));

const quantileLabels: QuantileLabel[] = quantileFractions.map(num => {
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
function computeQuantileThresholds(sortedValues: NameEntry[], fractions: number[]): number[] {
  return fractions.map(f =>
    sortedValues[lastIdxOfQuantile(f, sortedValues.length)].total
  );
}

function computeQuantileTotals(sortedValues: NameEntry[], fractions: number[]): number[] {
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
  const entriesByDemographic = new Map<DemographicGroup, NameEntry[]>();
  const entriesGroupedByName: DemographicEntry[][] = [];

  for (const [name, records] of byName.entries()) {
    const entries: DemographicEntry[] = [];

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

function sortEntries(entries: NameEntry[]) {
  return entries.sort((a, b) => a.total - b.total);
}

function collectEntries(
  entriesGroupedByName: DemographicEntry[][],
  demographicBitmask: number
): NameEntry[] {
  return entriesGroupedByName.reduce(
    (acc, entries) => {
      const value = getValueFromEntries(entries, demographicBitmask);
      if (value !== 0) {
        acc.push({ name: entries[0].name, total: value });
      };
      return acc;
    },
    [] as NameEntry[]
  );
}

function buildDemographicData(
  byName: ReadonlyMap<string, ReadonlyArray<NameRecord>>,
  yearPeriod: YearPeriod
): SinglePeriodStats {

  const { entriesByDemographic, entriesGroupedByName } = measure(
    () => buildEntries(byName, yearPeriod),
    'buildDemographicData__buildEntries',
    2
  );

  const byReligionAndGender = {} as SinglePeriodStats['byReligionAndGender'];

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
        entries.length > 100
        && entries.at(-20)!.total >= 50
      ) ? 20 : 10;

      const topNames = entries.slice(-topNameCount).reverse();


      byReligionAndGender[religion.slug][gender.slug] = {
        nameTotal: entries.length,
        populationTotal: entries.reduce((acc, cur) => acc + cur.total, 0),
        quantileThresholds,
        quantileTotals,
        topNames,
        entries: isGeneration(yearPeriod) ? entries : undefined,
      };
    }
  }

  const result: SinglePeriodStats = {
    yearPeriod,
    byReligionAndGender,
  };

  return result;
}

const MAX_LOG_VERBOSITY = 0;

function measure<ReturnType>(
  cb: () => ReturnType,
  label: string,
  verbosity: number = 0
): ReturnType {
  // if (global.gc) {
  //   global.gc();
  // } else {
  //   console.warn("Garbage collection not exposed. Launch Node.js with --expose-gc flag.");
  // }

  let res: ReturnType;

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

const periodsData = YEAR_PERIODS.map(period => {
  return measure(
    () => buildDemographicData(nameRecordsGroupedByName, period),
    `Built demographic stats for ${period.start}-${period.end} in`
  );
});

const periodsStats = measure(
  () => buildPeriodPeakNames(periodsData),
  `Built period peak stats in`
);

const stats: AllPeriodStats = {
  quantileLabels,
  periods: periodsStats,
};

const savePath = `${dataPath}/demographic-stats.json`;

console.log(`Saving demographic stats in ${savePath}...`)

writeFileSync(
  savePath,
  JSON.stringify(stats),
  'utf8'
);

interface GenEntry {
  fraction: number;
  genGroup: DemographicGroupStats;
}

function isGeneration(period: YearPeriod) {
  return GENERATIONS.some(g => period.start === g.start && period.end === g.end);
}

function buildPeriodPeakNames(periodsData: SinglePeriodStats[]): SinglePeriodStats[] {
  // Cleanup

  const minPeakTotal = 50;
  const minPeakFraction = 0.00_001;

  const generationsData = periodsData.filter(p => isGeneration(p.yearPeriod));

  for (const religion of religions) {
    for (const gender of genders) {
      const peakGenByName = new Map<string, GenEntry>();

      for (const genData of generationsData) {
        const genGroupData = genData.byReligionAndGender[religion.slug][gender.slug];

        for (const entry of genGroupData.entries!) {
          const curPeak = peakGenByName.get(entry.name);

          if (entry.total < minPeakTotal) continue;

          const fraction = entry.total / genGroupData.populationTotal;

          if (fraction < minPeakFraction || (
            curPeak && curPeak.fraction > fraction
          )) {
            continue;
          }


          peakGenByName.set(entry.name, {
            fraction,
            genGroup: genGroupData
          });
        }

        genGroupData.entries = undefined;
      }

      const namesByGen = Map.groupBy(
        peakGenByName.keys(),
        name => peakGenByName.get(name)!.genGroup
      );

      for (const [genGroup, names] of namesByGen.entries()) {
        names.sort((a, b) => (
          peakGenByName.get(a)!.fraction
          - peakGenByName.get(b)!.fraction)
        );

        const peakNameCount = names.length >= 20 ? 20 : 10;

        genGroup.peakNames = names
          .slice(-peakNameCount)
          .reverse()
          .map(name => ({
            name,
            total: Math.round(
              peakGenByName.get(name)!.fraction
              * genGroup.populationTotal
            )
          }));
      }
    }
  }

  return periodsData;
}
