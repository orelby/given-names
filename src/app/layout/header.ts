import {
  ApplicationRef, ChangeDetectionStrategy, Component, computed,
  effect, ElementRef, inject, signal, ViewChild
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { MatAutocompleteModule, MatAutocompleteTrigger } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatListItem, MatNavList } from '@angular/material/list';
import { BreakpointService } from '../core/breakpoints/breakpoint-service';
import { toSignal } from '@angular/core/rxjs-interop';
import { NameSuggestionService } from '../names/name-suggestion-service';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';

@Component({
  selector: 'app-header',
  imports: [
    CommonModule, RouterModule, FormsModule, ReactiveFormsModule,
    MatFormFieldModule, MatInputModule, MatAutocompleteModule,
    MatButtonModule, MatIcon, MatNavList, MatListItem,
  ],
  host: {
    '[class.has-drawer-open]': 'this.$isDrawerOpen()',
  },
  templateUrl: './header.html',
  styleUrl: './header.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Header {
  readonly #isDrawerOpen = signal(false);

  protected readonly $isDrawerOpen = this.#isDrawerOpen.asReadonly();

  #searchOpenStatusLocked = false;
  readonly #searchOpenStatus = signal<'closed' | 'open' | 'closing' | 'opening'>('closed');
  readonly #searchOpenRequest = signal<'open' | 'close' | null>(null);

  protected readonly searchFormControl = new FormControl('');

  protected readonly $searchInputPlaceholder = computed(() =>
    (this.$isSearchOpen() || !this.isMobile()) ? `חיפוש מהיר` : ''
  );

  protected readonly $isSearchOpen = computed(() => {
    const searchStatus = this.#searchOpenStatus();
    return searchStatus === 'open' || searchStatus === 'opening';
  });

  protected readonly $isSearchFocused = signal(false);

  protected readonly $isAutocompleteOpen = signal(false);

  readonly #autocompleteOptions = toSignal(
    inject(NameSuggestionService).suggestSimilarNamesForObservable(
      this.searchFormControl.valueChanges
    ),
    { initialValue: [] }
  );

  protected readonly $autocompleteOptions = computed(() =>
    // Hide panel when search is resizing/closed
    this.#searchOpenStatus() === 'open' ? this.#autocompleteOptions() : []
  );

  protected readonly $autocompletePanelWidth = computed<string>(() =>
    // Trigger resizing after search is fully open
    this.#searchOpenStatus() === 'open' ? undefined as any : '0'
  );

  private readonly isMobile = computed(() => {
    const thresholdBp = this.breakpointService.breakpoints.lg;
    const curBp = this.breakpointService.$breakpointUp().minWidth;
    return curBp < thresholdBp;
  });

  private readonly handleDrawerWhenResizing = effect(() => {
    if (!this.isMobile() && this.$isDrawerOpen()) {
      this.closeDrawer();
    }
  });

  private readonly handleSearchOpenStatus = effect(() => {
    const status = this.#searchOpenStatus();

    if (this.#searchOpenStatusLocked
      || (status !== 'open' && status !== 'closed')) {
      return;
    }

    const statusRequest = this.#searchOpenRequest();

    const shouldBeOpen = statusRequest === 'close' ? false : (
      statusRequest === 'open'
      || this.$isSearchFocused()
      || this.$isAutocompleteOpen()
    );

    const isOpen = status === 'open';

    if (shouldBeOpen && !isOpen) {
      this.openSearch();
    }

    if (!shouldBeOpen && isOpen) {
      this.closeSearch();
    }
  });

  private readonly appRef = inject(ApplicationRef);

  private readonly router = inject(Router);

  private readonly breakpointService = inject(BreakpointService);

  @ViewChild('navbar', { read: ElementRef })
  private navbar?: ElementRef<HTMLElement>;

  @ViewChild('searchInput', { read: ElementRef })
  private searchInput?: ElementRef<HTMLInputElement>;


  onSearch(autoCompleteTrigger?: MatAutocompleteTrigger) {
    this.router.navigate(['/name', this.searchFormControl.value]);
    autoCompleteTrigger?.closePanel();
    setTimeout(() => this.searchInput?.nativeElement.blur(), 0);
  }

  async openSearch() {
    if (this.#searchOpenStatusLocked) {
      this.#searchOpenRequest.set('open');
      return;
    }

    this.#searchOpenStatusLocked = true;
    this.#searchOpenRequest.set(null);

    if (document.startViewTransition) {
      // needs to persist before transition
      this.navbar?.nativeElement.classList.add('navbar--with-search-opening');

      await document.startViewTransition(() => {
        this.#searchOpenStatus.set('opening');
        this.appRef.tick();
      }).finished;

      this.navbar?.nativeElement.classList.remove('navbar--with-search-opening');
    }

    this.#searchOpenStatus.set('open');
    this.#searchOpenStatusLocked = false;

    setTimeout(() => {
      if (!document.activeElement || document.activeElement === document.body) {
        this.searchInput?.nativeElement.focus();
      }
    }, 0);
  }

  async closeSearch() {
    if (this.#searchOpenStatusLocked) {
      this.#searchOpenRequest.set('close');
      return;
    }

    this.#searchOpenStatusLocked = true;
    this.#searchOpenRequest.set(null);

    if (document.startViewTransition) {
      // needs to persist before transition
      this.navbar?.nativeElement.classList.add('navbar--with-search-closing');

      await document.startViewTransition(() => {
        this.#searchOpenStatus.set('closing');
        if (this.searchInput) {
          this.searchFormControl.setValue('');
        }
        this.appRef.tick();
      }).finished;

      this.navbar?.nativeElement.classList.remove('navbar--with-search-closing');
    } else {
      if (this.searchInput) {
        this.searchFormControl.setValue('');
      }
    }

    this.#searchOpenStatus.set('closed');
    this.#searchOpenStatusLocked = false;
  }

  openDrawer() {
    this.runWithViewTransition(() => {
      this.#isDrawerOpen.set(true);
    });
  }

  closeDrawer() {
    this.runWithViewTransition(() => {
      this.#isDrawerOpen.set(false);
    });
  }

  private runWithViewTransition(updateFn: () => void) {
    if (document.startViewTransition) {
      document.startViewTransition(() => {
        updateFn();
        this.appRef.tick();
      });
    } else {
      updateFn();
    }
  }
}
