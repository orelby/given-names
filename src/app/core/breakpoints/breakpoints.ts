import { InjectionToken } from '@angular/core';

export const DEFAULT_BREAKPOINTS = {
    xs: 0,
    sm: 576,
    md: 768,
    lg: 992,
    xl: 1200,
    xxl: 1400,
} as const;

export const BREAKPOINTS = new InjectionToken<BreakpointMap>(
    'BREAKPOINTS',
    {
        providedIn: 'root',
        factory: () => DEFAULT_BREAKPOINTS,
    }
);

export type Breakpoint = keyof typeof DEFAULT_BREAKPOINTS;

export type BreakpointMap = Readonly<Record<Breakpoint, number>>;

export interface BreakpointDefinition {
    readonly name: Breakpoint;
    readonly minWidth: number;
}

export function getBreakpointsUp(
    breakpoints: BreakpointMap
): readonly BreakpointDefinition[] {
    return Object.entries(breakpoints)
        .map(([name, minWidth]) => ({ name, minWidth: Number(minWidth) }))
        .sort((a, b) => b.minWidth - a.minWidth) as readonly BreakpointDefinition[];
}

export function matchFirstBreakpoint(
    width: number,
    breakpoints: readonly BreakpointDefinition[]
): BreakpointDefinition {
    for (const breakpoint of breakpoints) {
        if (width >= breakpoint.minWidth) return breakpoint;
    }

    return breakpoints[breakpoints.length - 1];
}
