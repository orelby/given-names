export function arraysEqual<T>(a: T[], b: T[]): boolean {
    if (a === b) return true;

    if (a.length !== b.length) return false;

    const length = a.length;

    for (let i = 0; i < length; ++i) {
        if (a[i] !== b[i]) return false;
    }

    return true;
}
