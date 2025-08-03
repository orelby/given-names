import { soundex } from './../src/shared/utils/soundex';

export function buildSoundex(names: readonly string[]) {
    const soundexMap = generateSoundexMap(names);

    const codeBookEntries: [code: string, names: string[]][] = Array.from(
        soundexMap.entries(),
        ([code, names]) => [code, Array.from(names.values())]
    );

    codeBookEntries.sort((a, b) => lexicographicalCompare(a[0], b[0]));

    return {
        codes: codeBookEntries.map(e => e[0]),
        nameLists: codeBookEntries.map(e => e[1])
    };
}

function generateSoundexMap(names: readonly string[]) {
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

function lexicographicalCompare(a: string, b: string): number {
    if (a < b) return -1;
    if (a > b) return 1;
    return 0;
}
