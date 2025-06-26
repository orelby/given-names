/**
 * Soundex coding variant for indexing similarly sounding names written in Hebrew.
 * Loosely based on D-M Soundex (@see https://www.jewishgen.org/infofiles/soundex.html).
 * 
 * The ambiguity of Hebrew spelling without Niqqud (or with improper full spelling)
 * is generally handled by preferring a higher false positive rate,
 * and is meant to be followed by other techniques such as edit distance.
 * 
 * @param phrase Hebrew text to encode.
 * @param codeLength Output code length (`6` by default).
 * @param isFixedLength Whether to pad the end of the code with 0s (`true` by default).
 * 
 * @returns An array of digit strings (possibly multiple due to spelling ambiguity)
 *   representing the input phrase and similarly sounding phrases.
 */
export function soundex(
    phrase: string,
    codeLength: number = CODE_LENGTH,
    isFixedLength: boolean = true
): string[] {
    const str = sanitize(phrase);
    const codeSegments = [] as Segment[];
    let minCurLength = 0;
    let idx = 0;

    encoder: while (idx < str.length && minCurLength < codeLength) {
        for (const rule of rules) {
            rule.pattern.lastIndex = idx;
            const match = rule.pattern.exec(str);
            if (match === null) continue;
            const segment = idx == 0 ? rule.codeIfStart : rule.codeElse;
            codeSegments.push(segment);
            if (segment != '') minCurLength++;
            idx += match[0].length;
            rule.pattern.lastIndex = 0;
            continue encoder;
        }

        // This shouldn't happen [anymore]
        throw new Error(`No soundex rule matched at index ${idx} of "${str}"`);
    }

    const codes = joinSegments(codeSegments)
        .map(code => isFixedLength ? code.padEnd(codeLength, SUFFIX_PAD) : code)
        .map(code => code.slice(0, codeLength));

    return Array.from(new Set(codes));
}

type Segment = string | string[];

type Rule = Readonly<{
    pattern: RegExp;
    codeIfStart: Segment;
    codeElse: Segment;
}>;

const CODE_LENGTH = 6;

const SUFFIX_PAD = '0';

/**
 * Notes:
 * - Merged D-M's code 1 (Y) into 0 due to the ambiguity of Yodh (י).
 * - Dropped D-M's code 2 (SCH, SHT, etc. at start of word).
 * - Each ambiguous case of Vav (ו) is branched to 2
 *   (7 at start of word or when doubled; omitted otherwise).
*/
const rules: Rule[] = [
    { pattern: /[אהיע]+/y, codeIfStart: '0', codeElse: '' },
    { pattern: /[טתד]/y, codeIfStart: '3', codeElse: '3' },
    { pattern: /[זסשצץ]/y, codeIfStart: '4', codeElse: '4' },
    { pattern: /[חכךקג]/y, codeIfStart: '5', codeElse: '5' },
    { pattern: /[מם]/y, codeIfStart: '6', codeElse: '6' },
    { pattern: /[נן]/y, codeIfStart: '6', codeElse: '6' },
    { pattern: /[בפף]|וו+/y, codeIfStart: '7', codeElse: '7' },
    { pattern: /ו/y, codeIfStart: '7', codeElse: ['', '7'] },
    { pattern: /ל+/y, codeIfStart: '8', codeElse: '8' },
    { pattern: /ר/y, codeIfStart: '9', codeElse: '9' },
] as const;


// leave only hebrew letters
function sanitize(phrase: string): string {
    return phrase.replaceAll(/[^\u05D0-\u05EA]/g, '');
}

// join all possible combinations of branching segments
function joinSegments(segments: Segment[]): string[] {
    let results: Array<string[]> = [[]];

    for (const segment of segments) {
        if (typeof segment === 'string') {
            for (const prefix of results) {
                prefix.push(segment);
            }
        } else {
            results = results.flatMap(prefix => segment.map(
                option => [...prefix, option]
            ));
        }
    }

    return results.map(parts => parts.join(''));
}
