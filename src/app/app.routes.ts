import { Routes } from '@angular/router';
import { NamePage } from './names/name-page';
import { DemographicsPage } from './demographics/demographics-page';
import { NameSearch } from './names/name-search/name-search';

export const routes: Routes = [
    { path: '', redirectTo: 'demographic', pathMatch: 'full' },
    { path: 'demographic', component: DemographicsPage },
    { path: 'name/:name', component: NamePage },
    { path: 'names', redirectTo: 'names/search' },
    { path: 'names/search', component: NameSearch },
    { path: '**', redirectTo: '' }
];
