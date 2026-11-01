import { inject } from '@angular/core';
import {
  CanActivateFn,
  Router,
} from '@angular/router';

import { AdminRole } from './auth.models';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = async (
  _route,
  state
) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const authenticated =
    auth.isAuthenticated() ||
    await auth.restoreSession();

  if (!authenticated) {
    return router.createUrlTree(
      ['/login'],
      {
        queryParams: {
          returnUrl: state.url,
        },
      }
    );
  }

  if (
    auth.mustChangePassword() &&
    state.url !== '/change-password'
  ) {
    return router.createUrlTree([
      '/change-password',
    ]);
  }

  if (
    !auth.mustChangePassword() &&
    state.url === '/change-password'
  ) {
    return router.createUrlTree([
      '/dashboard',
    ]);
  }

  return true;
};

export const guestGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const authenticated =
    auth.isAuthenticated() ||
    await auth.restoreSession();

  if (!authenticated) {
    return true;
  }

  return router.createUrlTree([
    auth.mustChangePassword()
      ? '/change-password'
      : '/dashboard',
  ]);
};

export const roleGuard: CanActivateFn = (
  route
) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const allowedRoles =
    route.data['roles'] as AdminRole[] | undefined;

  if (!allowedRoles || auth.hasRole(allowedRoles)) {
    return true;
  }

  return router.createUrlTree([
    '/dashboard',
  ]);
};