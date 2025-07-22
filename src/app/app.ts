import { Observable, debounceTime, distinctUntilChanged, map, of, switchMap } from 'rxjs';
import { afterNextRender, Component, inject, OnInit } from '@angular/core';
import { AsyncPipe, CommonModule } from '@angular/common';
import { Router, RouterOutlet } from '@angular/router';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatAutocompleteModule, MatAutocompleteTrigger } from '@angular/material/autocomplete';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIcon } from '@angular/material/icon';
import { BREAKPOINTS } from './core/breakpoints/breakpoints';
import { Header } from "./layout/header";
import { Footer } from "./layout/footer";
import { NameSuggestionService } from './names/name-suggestion-service';


@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet,
    CommonModule,
    AsyncPipe,
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatAutocompleteModule,
    MatIcon,
    Header,
    Footer,
  ],

  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit {
  protected readonly nameControl = new FormControl('');
  protected suggestedNames$: Observable<string[]> = of([]);

  private readonly nameService = inject(NameSuggestionService);
  private readonly router = inject(Router);
  private readonly breakpoints = inject(BREAKPOINTS);

  constructor() {
    // workaround (the autofocus is quickly removed for some reason)
    afterNextRender(() => setTimeout(setInitialFocusOnSearchInput, 0));
  }

  ngOnInit() {
    this.suggestedNames$ = this.nameControl.valueChanges.pipe(
      map(value => (value || '').trim()),
      distinctUntilChanged(),
      debounceTime(200),
      switchMap(value => value.length > 1
        ? this.nameService.suggestSimilarNames(value, 20)
        : of([]))
    );
  }

  onSearch(
    inputElement: HTMLInputElement,
    autoCompleteTrigger: MatAutocompleteTrigger
  ) {
    autoCompleteTrigger.closePanel();

    const isVirtualKeyboardMaybeOpen = window.innerWidth < this.breakpoints.lg;

    if (isVirtualKeyboardMaybeOpen) {
      setTimeout(() => inputElement.blur(), 0);
    }

    this.router.navigate(['/name', this.nameControl.value]);
  }
}

function setInitialFocusOnSearchInput() {
  const targetElement = document.querySelector(
    '.search-form input'
  ) as HTMLElement | undefined;

  if (
    targetElement &&
    (document.activeElement === document.body
      || document.activeElement === null)
  ) {
    targetElement.focus();
  }
}
