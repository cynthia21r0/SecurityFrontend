import { inject }                                          from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot }  from '@angular/router';
import { AuthService }                                     from '../services/auth.service';

export const roleGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const auth   = inject(AuthService);
  const router = inject(Router);

  const allowedRoles: string[] = route.data['roles'] ?? [];

  if (allowedRoles.length === 0) return true;

  if (auth.hasAnyRole(allowedRoles)) return true;

  if (auth.isLoggedIn()) {
    router.navigate(['/dashboard']);
    return false;
  }

  router.navigate(['/login']);
  return false;
};

// Helper para usar en canActivate sin el wrapper manual
export const withRoles = (...roles: string[]): CanActivateFn =>
  (route, state) => {
    // Inyectar roles dinámicamente sin depender de route.data
    const auth   = inject(AuthService);
    const router = inject(Router);

    if (auth.hasAnyRole(roles)) return true;

    if (auth.isLoggedIn()) {
      router.navigate(['/dashboard']);
      return false;
    }

    router.navigate(['/login']);
    return false;
  };
