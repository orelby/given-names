import { fromEvent, map, startWith, distinctUntilChanged, of } from 'rxjs';
import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { BreakpointDefinition, BREAKPOINTS, getBreakpointsUp, matchFirstBreakpoint } from './breakpoints';


@Injectable({ providedIn: 'root' })
export class BreakpointService {
    private readonly breakpointsUp = getBreakpointsUp(inject(BREAKPOINTS));
    private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

    readonly $breakpointUp = toSignal(
        this.isBrowser
            ? fromEvent(window, 'resize').pipe(
                startWith(null),
                map(() => this.matchBreakpointUp(window.innerWidth)),
                distinctUntilChanged()
            )
            : of(this.matchBreakpointUp(0)),
        { requireSync: true }
    );

    private matchBreakpointUp(width: number): BreakpointDefinition {
        return matchFirstBreakpoint(width, this.breakpointsUp);
    }
}
