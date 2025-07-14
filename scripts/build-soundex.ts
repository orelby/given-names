import { readFileSync, writeFileSync } from 'fs';
import { soundex } from './../src/shared/utils/soundex';
import { environment } from './../src/environments/environment';

const dataPath = `./public/${environment.dataPath}`;
const inputPath = `${dataPath}/given-names.csv`;
const outputPath = `${dataPath}/soundex.csv`;

function lexicographicalCompare(a: string, b: string): number {
    if (a < b) return -1;
    if (a > b) return 1;
    return 0;
}

function generateSoundex(names: string[]) {
    const codeBook = new Map<string, Set<string>>();
    for (const name of names) {
        if (!name) continue;

        for (const code of soundex(name)) {
            const codeNames = codeBook.get(code);
            if (codeNames) {
                codeNames.add(name);
            } else {
                codeBook.set(code, new Set([name]));
            }
        }
    }
    return codeBook;
}

async function getNames(): Promise<string[]> {
    const nameCol = 2;
    const csvText = readFileSync(inputPath, 'utf-8');
    const rows = csvText.split('\n').map(r => r.split(','));
    rows.shift(); // remove header
    return rows.map(row => row[nameCol]).filter(Boolean);
}

async function buildSoundex() {
    console.log('Building soundex...');

    const names = await getNames();

    const codeBookEntries: [code: string, names: string[]][] = Array.from(
        generateSoundex(names).entries(),
        ([code, names]) => [code, Array.from(names.values())]
    );

    codeBookEntries.sort((a, b) => lexicographicalCompare(a[0], b[0]));

    console.log(`Saving soundex at ${outputPath}...`);

    writeFileSync(
        outputPath,
        JSON.stringify({
            codes: codeBookEntries.map(e => e[0]),
            nameLists: codeBookEntries.map(e => e[1])
        }),
        'utf8'
    );
}

buildSoundex();
