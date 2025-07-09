import { Routes } from '@angular/router';
import { Name } from './names/name';
import { DemographicsDashboard } from './demographics/demographics-dashboard';

export const routes: Routes = [
    { path: '', redirectTo: 'demographic', pathMatch: 'full' },
    { path: 'demographic', component: DemographicsDashboard },
    { path: 'name/:name', component: Name },
    { path: '**', redirectTo: '' }
];
