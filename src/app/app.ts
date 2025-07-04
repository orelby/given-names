import { afterNextRender, Component, inject, OnInit } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { Header } from "./layout/header";
import { Footer } from "./layout/footer";
import { NameSuggestionService } from './names/name-suggestion-service';
import { debounceTime, distinctUntilChanged, map, of, switchMap } from 'rxjs';
import { AsyncPipe, CommonModule } from '@angular/common';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Observable } from 'rxjs';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';


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
  nameControl = new FormControl('');
  suggestedNames$!: Observable<string[]>;

  protected nameService = inject(NameSuggestionService);
  protected router = inject(Router);

  constructor() {
    afterNextRender(() => setTimeout(
      function setInitialFocusOnSearchInput() {
        const targetElement = document.querySelector('.search-form input') as HTMLElement | undefined;
        if (
          targetElement &&
          (document.activeElement === document.body || document.activeElement === null)
        ) {
          targetElement.focus();
        }
      },

      // workaround (the auto focus is quickly removed for some reason)
      100
    ));
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

  onSearch() {
    this.router.navigate(['/name', this.nameControl.value]);
  }
}
