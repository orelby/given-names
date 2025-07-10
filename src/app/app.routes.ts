import { Routes } from '@angular/router';
import { NamePage } from './names/name-page';
import { DemographicsPage } from './demographics/demographics-page';

export const routes: Routes = [
    { path: '', redirectTo: 'demographic', pathMatch: 'full' },
    { path: 'demographic', component: DemographicsPage },
    { path: 'name/:name', component: NamePage },
    { path: '**', redirectTo: '' }
];
