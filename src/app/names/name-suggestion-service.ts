import { debounceTime, distinctUntilChanged, map, Observable, of, shareReplay, switchMap, tap } from 'rxjs';
import { inject, Injectable } from '@angular/core';
import { soundexPrefix } from '@shared/utils/soundex';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { distance } from 'fastest-levenshtein';

interface SoundexCodebook {
  readonly codes: readonly string[];
  readonly nameLists: readonly string[];
};

@Injectable({
  providedIn: 'root'
})
export class NameSuggestionService {
  private readonly soundexCodebook$: Observable<SoundexCodebook>;

  constructor() {
    this.soundexCodebook$ = inject(HttpClient)
      .get<SoundexCodebook>(`${environment.dataPath}/soundex.json`)
      .pipe(shareReplay(1));
  }

  suggestSimilarNames(
    prefix: string,
    maxResults = 10
  ): Observable<string[]> {
    // Optimize as needed
    return this.soundexCodebook$.pipe(
      // tap(() => console.time(`soundex for ${prefix}`)),

      map(codebook => {
        const prefixCodes = soundexPrefix(prefix)
          .filter(code => code.length > 0);

        if (prefixCodes.length === 0) {
          return [];
        }

        // Find all names with matching soundex prefix

        const names = Array.from(new Set(codebook.codes.flatMap(
          (code, i) => prefixCodes.some(prefixCode => code.startsWith(prefixCode))
            ? codebook.nameLists[i]
            : []
        )));

        // Prioritize names with identical prefix, then by edit distance with threshold.
        // Sort each part lexicographically.

        const { exactMatches = [], inexactMatches = [] } = Object.groupBy(
          names,
          name => name.startsWith(prefix) ? "exactMatches" : "inexactMatches"
        );

        exactMatches.sort();

        if (exactMatches.length >= maxResults) {
          return exactMatches.slice(0, maxResults);
        }

        // TODO: consider adjusting threshold + designing custom edit distance costs
        // e.g. prefer addition > removal > change, 
        //   bump up vowels (perhaps also before exact matches), tax hyphen/space
        const editDistanceThreshold = Math.ceil(0.5 * prefix.length + 2);
        const extraMatches = inexactMatches
          .map(name => ({ name, dist: distance(prefix, name) }))
          .filter(({ dist }) => dist < editDistanceThreshold)
          .sort((a, b) => (a.dist - b.dist) || (a.name <= b.name ? -1 : 1))
          .slice(0, maxResults - exactMatches.length)
          .map(({ name }) => name);
        return [...exactMatches, ...extraMatches];
      }),

      // tap(() => console.timeEnd(`soundex for ${prefix}`)),
    );
  }

  suggestSimilarNamesForObservable(
    prefix$: Observable<string | null>,
    options?: {
      maxResults?: number,
      debounceDuration?: number,
      minLength?: number,
    }
  ): Observable<string[]> {
    const {
      maxResults = 10,
      debounceDuration = 200,
      minLength = 2,
    } = options ?? {};

    return prefix$.pipe(
      map(prefix => (prefix || '').trim()),
      distinctUntilChanged(),
      debounceTime(debounceDuration),
      switchMap(
        value => value.length >= minLength
          ? this.suggestSimilarNames(value, maxResults)
          : of([])
      )
    )
  }
}
