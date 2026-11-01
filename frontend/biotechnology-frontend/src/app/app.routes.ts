
import { Routes } from '@angular/router';

import {
  authGuard,
  guestGuard,
} from './core/auth/auth.guards';

export const routes: Routes = [

     {
    path: '',
    loadComponent: () =>
      import('./pages/Home/home/home')
        .then(m => m.PublicHome),
  },
  
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./pages/login/login').then((m) => m.Login),
  },
  {
    path: 'change-password',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/change-password/change-password/change-password').then(
        (m) => m.ChangePassword,
      ),
  },
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/dashboard/dashboard/dashboard').then((m) => m.Dashboard),
  },
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full',
  },
  {
    path: '**',
    redirectTo: 'login',
  },
];
