import { Routes } from '@angular/router';
import { Home } from './home/home';
import { Name } from './names/name';

export const routes: Routes = [
    { path: '', component: Home },
    { path: 'name/:name', component: Name },
    { path: '**', redirectTo: '' }
];
