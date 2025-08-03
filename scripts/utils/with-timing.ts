export const TimingVerbosity = {
    Low: 0,
    MediumLow: 1,
    Medium: 2,
    MediumHigh: 3,
    High: 4,
} as const;

const MAX_TIMING_VERBOSITY = TimingVerbosity.Low;

export function withTiming<T>(
    cb: () => T,
    label: string,
    verbosity: number = TimingVerbosity.Low,
): T {
    // if (global.gc) {
    //   global.gc();
    // } else {
    //   console.warn("Garbage collection not exposed. Launch Node.js with --expose-gc flag.");
    // }

    let res: T;

    if (verbosity > MAX_TIMING_VERBOSITY) {
        res = cb();
    } else {
        const timeStart = performance.now();
        res = cb();
        const timeEnd = performance.now();
        console.log(`${label}: ${(timeEnd - timeStart).toFixed(3)}ms`);
    }

    return res;
}
