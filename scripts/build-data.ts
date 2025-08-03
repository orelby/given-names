import { readFileSync, writeFileSync } from 'fs';
import { environment } from 'src/environments/environment';
import { NameCsvRepository } from 'src/app/names/data-access/name-csv-repository';
import { buildStats } from './build-stats';
import { buildSoundex } from './build-soundex';

const dataPath = `./public/${environment.dataPath}`;
const inputFile = `${dataPath}/given-names.csv`;
const soundexSaveFile = `${dataPath}/soundex.json`;
const statsSaveFile = `${dataPath}/demographic-stats.json`;

buildDataAssets();

function buildDataAssets() {
    const recordsByName = fetchRecordsByName();
    const names = Array.from(recordsByName.keys());

    console.log(`Generating soundex codebook...`);
    const soundexCodebook = buildSoundex(names);
    console.log(`Saving soundex codebook at ${soundexSaveFile}...`);
    writeFileSync(soundexSaveFile, JSON.stringify(soundexCodebook), 'utf8');
    console.log();

    console.log(`Generating stats for each demographic in each period...`);
    const stats = buildStats(recordsByName);
    console.log(`Saving stats in ${statsSaveFile}...`);
    writeFileSync(statsSaveFile, JSON.stringify(stats), 'utf8');
}

function fetchRecordsByName() {
    let csvText = '';

    try {
        csvText = readFileSync(inputFile, 'utf-8');
    } catch (err) {
        throw new Error(
            `File not found: ${inputFile}.\n\n`
            + 'You probably forgot to:\n'
            + '  1. Download the full Excel file from cbs.gov.il\n'
            + '  2. Run `/scripts/build_name_data.py`\n'
        );
    }

    const repo = new NameCsvRepository();
    repo.loadFromCsv(csvText);

    return repo.getAllByName();
}
