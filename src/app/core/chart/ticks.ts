export interface TickConfig {
    tickSpacing: number;
    minMultiplier: number;
    maxMultiplier: number;
    numTicks: number;
}

const EPSILON = Number.EPSILON * 1000;

export function ticks(config: TickConfig): number[] {
    const ticks = [];

    for (let i = config.minMultiplier; i <= config.maxMultiplier; i++) {
        ticks.push(i * config.tickSpacing);
    }

    return ticks;
}

export function niceLinearTicks(valueMin: number, valueMax: number, maxTicks = 6) {
    const maxSearchIterations = 10;
    const searchAcceleration = 1.5;

    if (maxTicks < 2) throw new Error("maxTicks must be at least 2");

    let bestCandidate: TickConfig | undefined = undefined;

    let lowNumTicks = maxTicks;
    let highNumTicks = Infinity;

    // Greedily search for upper bound on numTicks with numTicks <= maxTicks,
    // since the only guarantee of  calculateMaxTickSpacing} is numTicks <= maxTicks.

    let numTicksCandidate = lowNumTicks;
    for (let i = 0; i < maxSearchIterations; i++) {
        const candidate = niceLinearTickSpacing(valueMin, valueMax, numTicksCandidate);

        if (candidate.numTicks == maxTicks) {
            return ticks(candidate);
        }

        if (candidate.numTicks > maxTicks) {
            highNumTicks = numTicksCandidate;
            break;
        }

        lowNumTicks = candidate.numTicks;
        bestCandidate = candidate;
        numTicksCandidate = Math.floor(numTicksCandidate * searchAcceleration);
    }

    if (!bestCandidate) return [];

    // Binary search for maximal numTicks with numTicks <= maxTicks
    while (lowNumTicks < highNumTicks) {
        const midNumTicks = lowNumTicks + ((highNumTicks - lowNumTicks) >> 1);
        const candidate = niceLinearTickSpacing(valueMin, valueMax, midNumTicks);

        if (candidate.numTicks < maxTicks) {
            lowNumTicks = midNumTicks + 1;
            bestCandidate = candidate;
        } else if (candidate.numTicks > maxTicks) {
            highNumTicks = midNumTicks;
        } else {
            bestCandidate = candidate;
            break;
        }
    }

    return ticks(bestCandidate);
}

export function niceLogTicks(valueMin: number, valueMax: number, maxTicks = 6) {
    if (valueMax <= 0) throw new Error("Argument of log must be positive");

    if (maxTicks < 2) throw new Error("maxTicks must be at least 2");

    const maxExponent = Math.ceil(Math.log10(valueMax) - EPSILON) + 1;

    const ticks = [0];

    if (maxTicks > maxExponent) {
        const numFractionalTicks = maxTicks - maxExponent - 1;

        const minFractionalExponent = valueMin > 0
            ? Math.floor(Math.log10(valueMin) + EPSILON)
            : 0;

        console.log({ valueMin, valueMax, maxExponent, minFractionalExponent, numFractionalTicks })


        for (let i = Math.max(minFractionalExponent, -numFractionalTicks);
            i < 0 && i < maxExponent;
            i++) {
            ticks.push(10 ** i);
        }

        for (let i = 0; i < maxExponent; i++) {
            ticks.push(10 ** i);
        }
    } else {
        const logTickSpacing = Math.ceil(maxExponent / (maxTicks - 1) - EPSILON);

        for (let i = logTickSpacing - 1; i < maxExponent; i += logTickSpacing) {
            ticks.push(10 ** i);
        }
    }

    return ticks;
}

function niceLinearTickNumber(range: number): number {
    if (Math.abs(range) < EPSILON) {
        return 0;
    }

    const sign = Math.sign(range);
    const exponent = Math.floor(Math.log10(sign * range));
    const fraction = sign * range / (10 ** exponent);

    let niceFraction: number;

    if (fraction <= 1)
        niceFraction = 1;
    else if (fraction <= 2)
        niceFraction = 2;
    else if (fraction <= 2.5)
        niceFraction = 2.5;
    else if (fraction <= 5)
        niceFraction = 5;
    else
        niceFraction = 10;

    return sign * niceFraction * (10 ** exponent);
}

function niceLinearTickSpacing(
    valueMin: number,
    valueMax: number,
    maxTicks: number
): TickConfig {
    const valueRange = valueMax - valueMin;
    const valueRangeExtension = valueRange * 0.15;

    const niceValueRange = niceLinearTickNumber(valueRange);
    const tickSpacing = niceLinearTickNumber(niceValueRange / Math.max(1, (maxTicks - 1)));

    let minMultiplier = Math.ceil(valueMin / tickSpacing);

    if (valueMin < minMultiplier * tickSpacing) {
        const minTickExtension = valueMin === 0 ? 0 : valueRangeExtension;
        minMultiplier = Math.ceil((valueMin - minTickExtension) / tickSpacing);
    }

    let maxMultiplier = Math.floor(valueMax / tickSpacing);

    if (valueMax > maxMultiplier * tickSpacing) {
        const maxTickExtension = valueMax === 0 ? 0 : valueRangeExtension;
        maxMultiplier = Math.floor((valueMax + maxTickExtension) / tickSpacing);
    }

    const numTicks = maxMultiplier - minMultiplier + 1;

    return { tickSpacing, minMultiplier, maxMultiplier, numTicks };
}
