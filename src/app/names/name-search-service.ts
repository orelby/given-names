import {
  debounceTime, distinctUntilChanged, map, Observable,
  of, shareReplay, switchMap, forkJoin, lastValueFrom,
} from 'rxjs';
import { inject, Injectable } from '@angular/core';
import { soundex, soundexPrefix } from '@shared/utils/soundex';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { distance } from 'fastest-levenshtein';
import { NameRepository } from './data-access/name-repository';

interface SoundexCodebook {
  readonly codes: readonly string[];
  readonly nameLists: readonly string[];
};

export interface SearchOptions {
  mode?: 'soundex' | 'phrase';
  soundexMode?: SoundexSearchMode;
  maxResults?: number;
  minPopulation?: number;
  abortSignal?: AbortSignal;
}

export type SoundexSearchMode = 'exact' | 'prefix';

@Injectable({
  providedIn: 'root'
})
export class NameSearchService {
  private readonly soundexCodebook$: Observable<SoundexCodebook>;

  private readonly allRecordsByName$ = inject(NameRepository).getAllByName();

  private readonly allNames$ = this.allRecordsByName$.pipe(
    map(byName => Array.from(byName.keys())),
    shareReplay(1)
  );

  constructor() {
    this.soundexCodebook$ = inject(HttpClient)
      .get<SoundexCodebook>(`${environment.dataPath}/soundex.json`)
      .pipe(shareReplay(1));
  }

  search$(
    query$: Observable<string | null>,
    options?: {
      query?: {
        debounceDuration?: number,
        minLength?: number,
      },
      search?: Omit<SearchOptions, 'abortSignal'>,
    }
  ): Observable<string[]> {
    const {
      debounceDuration = 200,
      minLength = 2,
    } = options?.query ?? {};

    const searchOptions = Object.assign({
      mode: 'soundex',
      soundexMode: 'prefix',
    }, options?.search);

    let abortController: AbortController | null = null;

    return query$.pipe(
      map(query => {
        return options?.search?.mode === 'phrase'
          ? (query || '')
          : (query || '').trim()
      }),
      distinctUntilChanged(),
      debounceTime(debounceDuration),
      switchMap(query => {
        abortController?.abort();
        abortController = null;

        if (query.length < minLength) return of([]);

        abortController = new AbortController();

        return this.search(query, {
          ...searchOptions,
          abortSignal: abortController.signal
        });
      }),
    );
  }

  search(query: string, options?: SearchOptions,): Observable<string[]> {
    const {
      mode = 'soundex',
      soundexMode,
      maxResults = 20,
      minPopulation = 50,
      abortSignal
    } = options ?? {};

    const fullResults$ = mode === 'phrase'
      ? this.allPhraseMatches(query)
      : this.allSoundexMatches(query, soundexMode);

    return of([]).pipe(
      switchMap(_ => forkJoin([fullResults$, this.allRecordsByName$])),
      switchMap(async ([fullResults, recordsByName]) => {
        await yieldToMain();
        if (abortSignal?.aborted) {
          console.log('abort 1');
          return [];
        }
        const prefixMatches: string[] = [];
        const otherMatches: string[] = [];

        for (const result of fullResults) {
          const population = recordsByName.get(result)?.reduce(
            (acc, cur) => acc + cur.total, 0
          ) ?? 0;

          if (population < minPopulation) continue;

          if (result.startsWith(query)) {
            prefixMatches.push(result);
          } else {
            otherMatches.push(result);
          }
        }

        prefixMatches.sort();

        if (prefixMatches.length >= maxResults) {
          prefixMatches.length = maxResults;
          return prefixMatches;
        }

        await yieldToMain();
        if (abortSignal?.aborted) {
          console.log('abort 2');
          return [];
        }
        const otherMatchesWithDists = otherMatches
          .map(name => ({ name, dist: distance(query, name) }));

        await yieldToMain();
        if (abortSignal?.aborted) {
          console.log('abort 3');
          return [];
        }

        const sortedOtherMatches = otherMatchesWithDists
          .sort((a, b) => a.dist - b.dist || a.name < b.name ? -1 : 1)
          .slice(0, maxResults - prefixMatches.length)
          .map(({ name }) => name);

        const results = [...prefixMatches, ...sortedOtherMatches];

        return results;
      }),
    );
  }

  allPhraseMatches(query: string): Observable<string[]> {
    return this.allNames$.pipe(
      map(allNames => allNames.filter(name => name.includes(query)))
    );
  }

  allSoundexMatches(
    query: string,
    mode?: SoundexSearchMode,
  ): Observable<string[]> {
    const isPrefixMode = mode === 'prefix';

    return this.soundexCodebook$.pipe(
      switchMap(async codebook => {
        const queryCodes = isPrefixMode
          ? soundexPrefix(query)
          : soundex(query);

        if (queryCodes.length === 0) return [];

        if (queryCodes.includes('')) return lastValueFrom(this.allNames$);

        const results = new Set<string>();
        for (let i = 0; i < codebook.codes.length; i++) {
          const curCode = codebook.codes[i];

          const isMatch = isPrefixMode
            ? queryCodes.some(code => curCode.startsWith(code))
            : queryCodes.includes(curCode);

          if (!isMatch) continue;

          for (const name of codebook.nameLists[i]) {
            results.add(name);
          }
        }

        return Array.from(results);
      })
    );
  }
}

function yieldToMain() {
  if ((globalThis as any).scheduler?.yield) {
    return (globalThis as any).scheduler.yield();
  }

  return new Promise(resolve => setTimeout(resolve, 0));
}
